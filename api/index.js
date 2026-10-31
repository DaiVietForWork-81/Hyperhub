/**
 * api/index.js — Vercel Serverless API Gateway & Turso Cloud 2-Way Bridge
 * Kết nối trực tiếp Web (https://orbit-psi-black.vercel.app) <-> Turso Cloud <-> Discord Bot
 * Không cần ngrok hay Cloudflare Tunnel.
 */

const TURSO_DATABASE_URL =
  process.env.TURSO_DATABASE_URL || "https://daiviet-daiviet.aws-ap-northeast-1.turso.io";
const TURSO_AUTH_TOKEN =
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3MzI5NDQsImlkIjoiMDFhMTJiOTktYTEwMS03OGFlLWI1ZTItNWRjODQ2ZjZjZjQ3Iiwia2lkIjoiRHBfR2JDeW01a1VKNk9NUkR4aFE5akxxdFlXR1ZTUF81ZzhZQ0xkSmVfWSIsInJpZCI6IjU0MjdjMWE1LWU3MWEtNGMzZi1iNWUxLTgwZjYwZTM3NDZjZCJ9.OuOzXvRrslun1bxyS5BZ9lDOSR97yhViOWRktdLBLrLG1a9Jmf_QlpSK1WwsLgQydNFO7IQhCJKZoyAP6o7fDA";

const BOT_OWNER_ID = "1529864608813416449";
const DISCORD_GUILD_ID = "1532265330079174697";
const DISCORD_DATABASE_CHANNEL_ID = process.env.DATABASE_ARCHIVE_CHANNEL_ID || "1548627763467128912";

async function executeTurso(sql, args = []) {
  const url = `${TURSO_DATABASE_URL.replace(/\/+$/, "")}/v2/pipeline`;
  const positionalArgs = args.map((arg) => {
    if (arg === null || arg === undefined) return { type: "null" };
    if (typeof arg === "number") {
      return Number.isInteger(arg)
        ? { type: "integer", value: arg.toString() }
        : { type: "float", value: arg };
    }
    if (typeof arg === "boolean") {
      return { type: "integer", value: arg ? "1" : "0" };
    }
    return { type: "text", value: String(arg) };
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TURSO_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: positionalArgs } },
        { type: "close" },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Turso HTTP ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const first = data?.results?.[0];
  if (first?.type === "error") {
    throw new Error(`Turso SQL Error: ${first.error?.message || "Unknown"}`);
  }
  const execResult = first?.response?.result;
  if (!execResult) return { rows: [], affectedRows: 0 };

  const cols = (execResult.cols || []).map((c) => c.name);
  const rows = (execResult.rows || []).map((rawRow) => {
    const obj = {};
    cols.forEach((colName, idx) => {
      const cell = rawRow[idx];
      if (!cell || cell.type === "null") obj[colName] = null;
      else if (cell.type === "integer") obj[colName] = parseInt(cell.value, 10);
      else if (cell.type === "float")
        obj[colName] = typeof cell.value === "number" ? cell.value : parseFloat(cell.value);
      else obj[colName] = cell.value;
    });
    return obj;
  });

  const lastInsertRowId = execResult.last_insert_rowid
    ? parseInt(execResult.last_insert_rowid, 10)
    : undefined;
  return {
    rows,
    affectedRows: execResult.affected_row_count || 0,
    lastInsertRowId,
  };
}

async function getKvValue(key) {
  try {
    const res = await executeTurso(
      "SELECT value, updated_at FROM bot_kv_store WHERE key = ? LIMIT 1",
      [key]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      data: JSON.parse(row.value),
      updated_at: Number(row.updated_at || 0),
    };
  } catch {
    return null;
  }
}

async function verifyDiscordBearerToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token.length < 10) return null;
  try {
    const r = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function verifyAdminAccess(req) {
  const userData = await verifyDiscordBearerToken(req);
  if (!userData) return { ok: false, reason: "no_token" };
  if (!userData.verified) return { ok: false, reason: "unverified" };

  const uid = String(userData.id || "");
  if (uid === BOT_OWNER_ID) {
    return {
      ok: true,
      admin: {
        is_admin: true,
        user_id: uid,
        username: userData.username || "Owner",
        display_name: userData.global_name || userData.username || "Owner",
        role_name: "👑 Owner",
      },
    };
  }

  const guildAccess = await getKvValue("guild_access");
  const adminsMap = guildAccess?.data?.admins || {};
  if (adminsMap[uid]) {
    return { ok: true, admin: adminsMap[uid] };
  }

  const memberIds = guildAccess?.data?.member_ids || [];
  if (memberIds.length > 0 && !memberIds.includes(uid)) {
    return { ok: false, reason: "not_member" };
  }
  return { ok: false, reason: "not_admin" };
}

async function forwardRpcToBot(method, path, reqHeaders, bodyObj, waitMs = 8000) {
  const nowSec = Math.floor(Date.now() / 1000);
  const bodyStr =
    typeof bodyObj === "string"
      ? bodyObj
      : bodyObj
      ? JSON.stringify(bodyObj)
      : "";

  const ins = await executeTurso(
    `INSERT INTO bot_rpc_queue (method, path, headers, body, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    [method, path, JSON.stringify(reqHeaders || {}), bodyStr, nowSec, nowSec]
  );
  const rpcId = ins.lastInsertRowId;
  if (!rpcId) {
    return {
      status: 503,
      body: { error: "Không thể khởi tạo lệnh RPC trên Turso Cloud." },
    };
  }

  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 380));
    const check = await executeTurso(
      "SELECT status, response_status, response_body FROM bot_rpc_queue WHERE id = ? LIMIT 1",
      [rpcId]
    );
    const row = check.rows[0];
    if (row && row.status === "done") {
      let parsed = {};
      try {
        parsed = JSON.parse(row.response_body || "{}");
      } catch {
        parsed = { message: row.response_body };
      }
      return { status: Number(row.response_status || 200), body: parsed };
    }
  }

  return {
    status: 202,
    body: {
      success: true,
      queued: true,
      rpc_id: rpcId,
      message:
        "Lệnh đã được ghi vào hàng đợi Turso Cloud và sẽ thực thi ngay khi Bot nhận nhịp đồng bộ tiếp theo.",
    },
  };
}

function extractAcademicMeta(doc) {
  const notes = doc.notes || "";
  let acYear = doc.academic_year || null;
  let schDept = doc.school_or_department || null;

  if (!acYear) {
    const mYr = `${doc.title || ""} ${notes}`.match(/(20\d{2}\s*[-–—]\s*20\d{2})/);
    if (mYr) acYear = mYr[1].replace(/\s+/g, "");
  }
  if (!schDept && notes) {
    const mSch = notes.match(/Nguồn:\s*([^|\n]+)/);
    if (mSch) schDept = mSch[1].trim();
  }
  return { acYear, schDept };
}

function getVnDates() {
  const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
  const yestVn = new Date(nowVn.getTime() - 24 * 3600 * 1000);
  return {
    todayStr: nowVn.toISOString().slice(0, 10),
    yesterdayStr: yestVn.toISOString().slice(0, 10),
  };
}

function computeStudyRank(xp) {
  const tiers = [
    [0, 1, "🌱 Tân Binh Orbit", 150],
    [150, 2, "📘 Học Viên Chăm Chỉ", 400],
    [400, 3, "⚡ Chiến Binh Luyện Đề", 800],
    [800, 4, "🔥 Học Giả Tinh Anh", 1500],
    [1500, 5, "🏅 Kiện Tướng Giải Đề", 2800],
    [2800, 6, "💎 Học Bá Toàn Năng", 5000],
    [5000, 7, "👑 Thủ Khoa Orbit", 10000],
  ];
  let cur = tiers[0];
  for (const t of tiers) {
    if (xp >= t[0]) cur = t;
    else break;
  }
  const [minXp, level, title, nextXp] = cur;
  const span = Math.max(1, nextXp - minXp);
  const progress = Math.min(100, Math.round(((xp - minXp) / span) * 100));
  return { level, title, next_xp: nextXp, progress };
}

function parseQuestionsAndKeys(rawText) {
  if (!rawText || !rawText.trim()) {
    return { questions: [], answer_keys: {} };
  }
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const answerKeys = {};
  const tailText = text.length > 600 ? text.slice(Math.floor(text.length * 0.55)) : text;
  const keyRegex = /\b(\d{1,3})\s*[.:\-–)\s]\s*([A-D])\b/g;
  let km;
  while ((km = keyRegex.exec(tailText)) !== null) {
    const qn = parseInt(km[1], 10);
    if (qn >= 1 && qn <= 120) {
      answerKeys[String(qn)] = km[2].toUpperCase();
    }
  }

  const qRegex = /(?:^|\n)\s*(?:Câu|Cau|Question|Bài|Bai)\s+(\d{1,3})\s*[.:)\-–]?\s*([\s\S]*?)(?=(?:\n\s*(?:Câu|Cau|Question|Bài|Bai)\s+\d{1,3}\s*[.:)\-–]?)|$)/gi;
  const questions = [];
  const seen = new Set();
  let qm;
  while ((qm = qRegex.exec(text)) !== null) {
    const qNumStr = qm[1];
    const body = (qm[2] || "").trim();
    if (!body || body.length < 4) continue;
    if (seen.has(qNumStr) && body.length < 35) continue;
    seen.add(qNumStr);

    const options = [];
    const optRegex = /(?:^|\s|\n)([A-D])\s*[.)]\s+([^\n]+)/g;
    const optMatches = [];
    let om;
    while ((om = optRegex.exec(body)) !== null) {
      optMatches.push({ index: om.index, key: om[1].toUpperCase(), text: om[2].trim() });
    }

    let stem = body;
    if (optMatches.length >= 2) {
      stem = body.slice(0, optMatches[0].index).trim();
      for (const o of optMatches.slice(0, 4)) {
        options.push({ key: o.key, text: o.text });
      }
    }

    const statements = [];
    if (!options.length) {
      const stRegex = /(?:^|\n)\s*([a-d])\)\s+([^\n]+)/g;
      const stMatches = [];
      let sm;
      while ((sm = stRegex.exec(body)) !== null) {
        stMatches.push({ index: sm.index, key: sm[1].toLowerCase(), text: sm[2].trim() });
      }
      if (stMatches.length >= 2) {
        stem = body.slice(0, stMatches[0].index).trim();
        for (const s of stMatches.slice(0, 4)) {
          statements.push({ key: s.key, text: s.text });
        }
      }
    }

    const qType = options.length
      ? "mcq"
      : statements.length
      ? "true_false"
      : "short_or_essay";

    questions.push({
      number: parseInt(qNumStr, 10),
      label: `Câu ${qNumStr}`,
      type: qType,
      stem: stem.slice(0, 1500),
      options,
      statements,
      answer_key: answerKeys[qNumStr],
    });
    if (questions.length >= 80) break;
  }

  return { questions, answer_keys: answerKeys };
}

async function resolveDocumentFileOnVercel(docId) {
  const resDoc = await executeTurso(
    `SELECT id, title, subject, estimated_level, file_name, file_size_bytes,
            file_type, channel_id, message_id, jump_url, file_content_base64
     FROM documents_archive WHERE id = ? LIMIT 1`,
    [docId]
  );
  const row = resDoc.rows[0];
  if (!row) return null;

  const fileName = row.file_name || `de_thi_${docId}.pdf`;
  const fileType = (row.file_type || "PDF").toUpperCase();

  // 1. Nếu có sẵn file_content_base64 trên Turso Cloud
  if (row.file_content_base64) {
    return {
      row,
      fileName,
      fileType,
      buffer: Buffer.from(row.file_content_base64, "base64"),
      directUrl: null,
    };
  }

  // 2. Kiểm tra cache signed Discord CDN URL trong bot_kv_store (hợp lệ trong 12 giờ)
  let directUrl = null;
  const kvCdn = await getKvValue(`doc_cdn_${docId}`);
  const nowSec = Math.floor(Date.now() / 1000);
  if (kvCdn && kvCdn.data?.direct_url && nowSec - kvCdn.updated_at < 43200) {
    directUrl = kvCdn.data.direct_url;
  }

  // 3. Nếu trên Vercel có cấu hình DISCORD_TOKEN, gọi thẳng Discord REST API lấy link CDN mới nhất (không cần bật máy tính ở nhà!)
  const botToken = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || "";
  let channelId = row.channel_id || DISCORD_DATABASE_CHANNEL_ID;
  let messageId = row.message_id;
  if ((!row.channel_id || !messageId) && row.jump_url && row.jump_url.includes("discord.com/channels/")) {
    const mj = row.jump_url.match(/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
    if (mj) {
      channelId = mj[1];
      messageId = mj[2];
    }
  }

  if (!directUrl && botToken && channelId && messageId) {
    try {
      const msgResp = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );
      if (msgResp.ok) {
        const msgData = await msgResp.json();
        const atts = msgData.attachments || [];
        const matched =
          atts.find((a) => (a.filename || "").toLowerCase() === fileName.toLowerCase()) || atts[0];
        if (matched && matched.url) {
          directUrl = matched.url;
          await executeTurso(
            `INSERT INTO bot_kv_store (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [
              `doc_cdn_${docId}`,
              JSON.stringify({ direct_url: directUrl, file_name: fileName, file_type: fileType }),
              nowSec,
            ]
          ).catch(() => {});
        }
      }
    } catch {}
  }

  // 4. Nếu chưa có directUrl, nhờ Bot giải quyết link CDN qua RPC nhẹ (chỉ lấy URL 200 bytes, Bot không phải upload cả file PDF!)
  if (!directUrl) {
    try {
      const rpcRes = await forwardRpcToBot(
        "GET",
        `/api/documents/${docId}/file_url`,
        {},
        null,
        5500
      );
      if (rpcRes.status === 200 && rpcRes.body?.direct_url?.startsWith("http")) {
        directUrl = rpcRes.body.direct_url;
      }
    } catch {}
  }

  return { row, fileName, fileType, buffer: null, directUrl };
}

export default async function handler(req, res) {
  // CORS Headers
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Bot-Secret, ngrok-skip-browser-warning, cf-skip-browser-warning"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const parsedUrl = new URL(req.url, `https://${req.headers.host || "orbit-psi-black.vercel.app"}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/api/status";
  const searchParams = parsedUrl.searchParams;

  try {
    // 1. GET /api/status
    if (pathname === "/api/status" && req.method === "GET") {
      const kv = await getKvValue("status");
      const nowSec = Math.floor(Date.now() / 1000);
      if (kv && kv.data && nowSec - kv.updated_at <= 90) {
        return res.status(200).json({
          ...kv.data,
          status: "online",
          bridge_mode: "vercel_turso_direct",
        });
      }
      // Ngay cả khi máy chủ chạy Bot chưa bật, Cổng Vercel + Turso Cloud vẫn hoạt động 24/7
      return res.status(200).json({
        status: "online",
        bot_user: "Orbit Cloud Engine (Vercel + Turso 24/7)",
        bot_id: 0,
        ping_ms: 18,
        guilds_count: 1,
        uptime_seconds: 86400,
        timestamp: nowSec,
        bridge_mode: "vercel_cloud_standby",
      });
    }

    // 1b. GET /api/health
    if (pathname === "/api/health" && req.method === "GET") {
      return res.status(200).json({ status: "ok", bridge: "vercel_turso_direct" });
    }

    // 2. GET /api/documents/stats
    if (pathname === "/api/documents/stats" && req.method === "GET") {
      const totalRes = await executeTurso(
        "SELECT COUNT(*) as cnt, COALESCE(SUM(file_size_bytes), 0) as total_bytes FROM documents_archive"
      );
      const totalItems = Number(totalRes.rows[0]?.cnt || 0);
      const totalBytes = Number(totalRes.rows[0]?.total_bytes || 0);

      const uniqueRes = await executeTurso(
        "SELECT COUNT(DISTINCT COALESCE(NULLIF(file_hash, ''), LOWER(file_name))) as ucnt FROM documents_archive"
      );
      const uniqueItems = Number(uniqueRes.rows[0]?.ucnt || totalItems);

      const dupRes = await executeTurso(
        `SELECT COUNT(*) as dcnt FROM documents_archive
         WHERE file_hash IN (SELECT file_hash FROM documents_archive WHERE file_hash IS NOT NULL AND file_hash != '' GROUP BY file_hash HAVING COUNT(*) > 1)
            OR LOWER(file_name) IN (SELECT LOWER(file_name) FROM documents_archive GROUP BY LOWER(file_name) HAVING COUNT(*) > 1)`
      );
      const duplicateItems = Number(dupRes.rows[0]?.dcnt || 0);

      const subRes = await executeTurso(
        "SELECT subject, COUNT(*) as cnt, COALESCE(SUM(file_size_bytes), 0) as sbytes FROM documents_archive GROUP BY subject ORDER BY cnt DESC"
      );
      const subjects = subRes.rows.map((r) => ({
        subject: r.subject,
        count: Number(r.cnt || 0),
        size_bytes: Number(r.sbytes || 0),
      }));

      return res.status(200).json({
        success: true,
        total_items: totalItems,
        total_real: totalItems,
        unique_items: uniqueItems,
        duplicate_items: duplicateItems,
        total_bytes: totalBytes,
        subjects,
      });
    }

    // 2b. GET /api/documents/check_hash
    if (pathname === "/api/documents/check_hash" && req.method === "GET") {
      const fileHash = (searchParams.get("hash") || "").trim();
      if (!fileHash || fileHash.length !== 64) {
        return res
          .status(400)
          .json({ error: "Mã hash không hợp lệ (yêu cầu 64 ký tự SHA-256)" });
      }
      const existingRes = await executeTurso(
        "SELECT id, title, author_name, timestamp, jump_url FROM documents_archive WHERE file_hash = ? LIMIT 1",
        [fileHash]
      );
      const existing = existingRes.rows[0];
      if (existing) {
        return res.status(200).json({
          exists: true,
          is_duplicate: true,
          message: `Tài liệu trùng lặp! Tệp '${existing.title}' đã được nộp trước đó bởi '${existing.author_name}' vào ${existing.timestamp}.`,
          doc_id: existing.id,
          title: existing.title,
        });
      }
      return res.status(200).json({ exists: false, is_duplicate: false });
    }

    // Helper: điều kiện lọc exam_type giống hệt Bot/services/api_bridge.py
    function applyExamTypeClause(examTypeRaw, clauses, sqlParams) {
      if (!examTypeRaw || examTypeRaw.toUpperCase() === "ALL") return;
      const et = examTypeRaw.toUpperCase().trim();
      if (et === "THUONG") {
        clauses.push(
          "(LOWER(estimated_level) LIKE '%thuong%' OR LOWER(estimated_level) LIKE '%thường%' OR LOWER(title) LIKE '%thường%' OR LOWER(title) LIKE '%học kỳ%' OR LOWER(title) LIKE '%định kỳ%' OR LOWER(title) LIKE '%thi thử%')"
        );
      } else if (et === "HSG") {
        clauses.push(
          "(LOWER(estimated_level) LIKE '%hsg%' OR LOWER(title) LIKE '%hsg%' OR LOWER(title) LIKE '%học sinh giỏi%')"
        );
      } else if (et === "CHUYEN") {
        clauses.push(
          "(LOWER(estimated_level) LIKE '%chuyen%' OR LOWER(estimated_level) LIKE '%chuyên%' OR LOWER(title) LIKE '%chuyên%' OR LOWER(title) LIKE '%chuyen%')"
        );
      } else if (et === "QUOC_TE" || et === "QUOCTE" || et === "INTERNATIONAL") {
        clauses.push(
          "(LOWER(estimated_level) LIKE '%quốc tế%' OR LOWER(estimated_level) LIKE '%quoc te%' OR LOWER(title) LIKE '%quốc tế%' OR LOWER(title) LIKE '%quoc te%' OR LOWER(title) LIKE '%international%' OR LOWER(title) LIKE '%imo%' OR LOWER(title) LIKE '%amc%' OR LOWER(title) LIKE '%kangaroo%' OR LOWER(title) LIKE '%ikmc%' OR LOWER(title) LIKE '%sasmo%' OR LOWER(title) LIKE '%timo%' OR LOWER(title) LIKE '%hkimo%' OR LOWER(title) LIKE '%sat%' OR LOWER(title) LIKE '%cambridge%')"
        );
      } else if (et === "CHUNG" || et === "TONG_HOP") {
        clauses.push(
          "(LOWER(estimated_level) LIKE '%chung%' OR LOWER(estimated_level) LIKE '%phổ thông chung%' OR LOWER(title) LIKE '%tổng hợp%' OR LOWER(title) LIKE '%đề cương%' OR LOWER(title) LIKE '%lý thuyết%')"
        );
      } else {
        clauses.push("(file_type LIKE ? OR estimated_level LIKE ? OR title LIKE ?)");
        sqlParams.push(`%${examTypeRaw}%`, `%${examTypeRaw}%`, `%${examTypeRaw}%`);
      }
    }

    // 3. GET /api/documents / /api/documents/archive / /api/docs/archive
    if (
      (pathname === "/api/documents" ||
        pathname === "/api/documents/archive" ||
        pathname === "/api/docs/archive") &&
      req.method === "GET"
    ) {
      const rawLimit = (searchParams.get("limit") || "20").trim().toLowerCase();
      let limit = 20;
      let page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      if (["0", "-1", "all", "unlimited"].includes(rawLimit)) {
        limit = 100000;
        page = 1;
      } else {
        limit = Math.min(10000, Math.max(1, parseInt(rawLimit, 10) || 20));
      }
      const offset = searchParams.has("offset")
        ? Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0)
        : (page - 1) * limit;

      const subject = (searchParams.get("subject") || "").trim();
      const grade = (searchParams.get("grade") || "").trim();
      const examType = (searchParams.get("exam_type") || "").trim();
      const searchKw = (searchParams.get("search") || searchParams.get("q") || "").trim();
      const filterDup = (searchParams.get("filter_dup") || "all").trim().toLowerCase();

      const whereClauses = [];
      const params = [];

      if (subject && subject.toUpperCase() !== "ALL") {
        whereClauses.push("LOWER(subject) = LOWER(?)");
        params.push(subject);
      }
      if (grade && grade.toUpperCase() !== "ALL") {
        whereClauses.push("(estimated_level LIKE ? OR title LIKE ?)");
        params.push(`%${grade}%`, `%${grade}%`);
      }
      applyExamTypeClause(examType, whereClauses, params);

      if (searchKw) {
        whereClauses.push(
          "(LOWER(title) LIKE ? OR LOWER(file_name) LIKE ? OR LOWER(COALESCE(notes, '')) LIKE ?)"
        );
        const kw = `%${searchKw.toLowerCase()}%`;
        params.push(kw, kw, kw);
      }
      if (filterDup === "unique") {
        whereClauses.push(
          "id IN (SELECT MIN(id) FROM documents_archive GROUP BY COALESCE(NULLIF(file_hash, ''), LOWER(file_name)))"
        );
      } else if (filterDup === "duplicate") {
        whereClauses.push(
          "(file_hash IN (SELECT file_hash FROM documents_archive WHERE file_hash IS NOT NULL AND file_hash != '' GROUP BY file_hash HAVING COUNT(*) > 1) OR LOWER(file_name) IN (SELECT LOWER(file_name) FROM documents_archive GROUP BY LOWER(file_name) HAVING COUNT(*) > 1))"
        );
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const cntRes = await executeTurso(
        `SELECT COUNT(*) as cnt FROM documents_archive ${whereSql}`,
        params
      );
      const total = Number(cntRes.rows[0]?.cnt || 0);

      // Map min_id và count cho từng hash / tên file để xác định bản gốc vs bản trùng giống hệt api_bridge.py
      const minIdRes = await executeTurso(
        `SELECT COALESCE(NULLIF(file_hash, ''), LOWER(file_name)) as k, MIN(id) as min_id, COUNT(*) as cnt
         FROM documents_archive
         GROUP BY COALESCE(NULLIF(file_hash, ''), LOWER(file_name))`
      );
      const docStatsMap = new Map();
      for (const mr of minIdRes.rows) {
        if (mr.k) {
          docStatsMap.set(mr.k, {
            minId: Number(mr.min_id || 0),
            cnt: Number(mr.cnt || 1),
          });
        }
      }

      const dataRes = await executeTurso(
        `SELECT id, subject, title, file_name, file_size_bytes, file_type,
                estimated_level, question_count, page_count, author_name,
                jump_url, timestamp, file_hash, notes, academic_year, school_or_department,
                verdict, exam_track, confidence, queue_status
         FROM documents_archive
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const docs = dataRes.rows.map((r) => {
        const { acYear, schDept } = extractAcademicMeta(r);
        const h = r.file_hash || "";
        const fn = (r.file_name || "").toLowerCase();
        const lookupKey = h || fn;
        const st = docStatsMap.get(lookupKey) || { minId: r.id, cnt: 1 };
        const isDup = st.cnt > 1;
        const isDupCopy = Boolean(isDup && r.id !== st.minId);

        return {
          ...r,
          academic_year: acYear,
          school_or_department: schDept,
          is_duplicate: isDup,
          is_duplicate_copy: isDupCopy,
          duplicate_count: st.cnt,
          download_url: `/api/documents/${r.id}/download`,
        };
      });

      return res.status(200).json({
        success: true,
        total,
        total_real: total,
        page,
        limit,
        documents: docs,
        items: docs,
      });
    }

    // 4. GET /api/documents/request_exam & /api/documents/random
    if (
      (pathname === "/api/documents/request_exam" || pathname === "/api/documents/random") &&
      req.method === "GET"
    ) {
      const userData = await verifyDiscordBearerToken(req);
      if (!userData) {
        return res.status(401).json({
          success: false,
          error: "Chưa liên kết Discord",
          message: "Bạn cần liên kết tài khoản Discord để lấy đề thi.",
          reason: "no_token",
        });
      }
      if (!userData.verified) {
        return res.status(403).json({
          success: false,
          error: "Tài khoản Discord chưa xác minh Email",
          message: "Vui lòng xác minh email trên Discord để nhận phát đề.",
          reason: "unverified",
        });
      }

      const subject = (searchParams.get("subject") || "").trim();
      const grade = (searchParams.get("grade") || "").trim();
      const examType = (searchParams.get("exam_type") || "").trim();
      const desc = (searchParams.get("description") || "").trim();

      const clauses = [];
      const params = [];
      if (subject && subject.toUpperCase() !== "ALL") {
        clauses.push("LOWER(subject) = LOWER(?)");
        params.push(subject);
      }
      if (grade && grade.toUpperCase() !== "ALL") {
        clauses.push("(estimated_level LIKE ? OR title LIKE ?)");
        params.push(`%${grade}%`, `%${grade}%`);
      }
      applyExamTypeClause(examType, clauses, params);
      if (desc) {
        clauses.push("(LOWER(title) LIKE ? OR LOWER(file_name) LIKE ?)");
        params.push(`%${desc.toLowerCase()}%`, `%${desc.toLowerCase()}%`);
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      let rowRes = await executeTurso(
        `SELECT id, subject, title, file_name, file_size_bytes, file_type,
                estimated_level, question_count, page_count, author_name,
                jump_url, timestamp, file_hash, notes, academic_year, school_or_department,
                verdict, exam_track, confidence
         FROM documents_archive
         ${whereSql}
         ORDER BY RANDOM() LIMIT 1`,
        params
      );
      let isExact = true;
      if (!rowRes.rows.length && clauses.length) {
        isExact = false;
        rowRes = await executeTurso(
          `SELECT id, subject, title, file_name, file_size_bytes, file_type,
                  estimated_level, question_count, page_count, author_name,
                  jump_url, timestamp, file_hash, notes, academic_year, school_or_department,
                  verdict, exam_track, confidence
           FROM documents_archive
           ORDER BY RANDOM() LIMIT 1`
        );
      }

      const doc = rowRes.rows[0];
      if (!doc) {
        return res.status(200).json({
          success: false,
          message: "Hiện chưa có đề thi nào trong kho lưu trữ.",
        });
      }
      const { acYear, schDept } = extractAcademicMeta(doc);
      return res.status(200).json({
        success: true,
        bot_online: true,
        is_exact_match: isExact,
        document: {
          ...doc,
          academic_year: acYear,
          school_or_department: schDept,
          download_url: `/api/documents/${doc.id}/download`,
        },
      });
    }

    // 5. GET /api/documents/:id/view, /api/documents/:id/pdf, /api/documents/:id/download, /api/documents/:id/file_url, /api/documents/:id/content
    const docActionMatch = pathname.match(
      /^\/api\/documents\/(\d+)\/(download|view|pdf|file_url|content)$/
    );
    if (docActionMatch && req.method === "GET") {
      const docId = parseInt(docActionMatch[1], 10);
      const action = docActionMatch[2];

      // 5a. Nội dung văn bản & câu hỏi bóc tách (xử lý trực tiếp trên Vercel + Turso)
      if (action === "content") {
        const resDoc = await executeTurso(
          `SELECT id, subject, title, file_name, file_size_bytes, file_type,
                  estimated_level, question_count, page_count, raw_text, notes,
                  academic_year, school_or_department
           FROM documents_archive WHERE id = ? LIMIT 1`,
          [docId]
        );
        const row = resDoc.rows[0];
        if (!row) {
          return res.status(404).json({ error: "Không tìm thấy đề thi này trong kho" });
        }

        let rawText = (row.raw_text || "").trim();
        let pageCount = Number(row.page_count || 1);

        // Nếu chưa có raw_text trên Turso, nhờ Bot trích xuất 1 lần duy nhất và lưu vĩnh viễn lên Turso
        if (rawText.length < 60) {
          try {
            const rpcContent = await forwardRpcToBot(
              "GET",
              `/api/documents/${docId}/content`,
              {},
              null,
              6500
            );
            if (rpcContent.status === 200 && rpcContent.body?.raw_text) {
              rawText = rpcContent.body.raw_text;
              pageCount = rpcContent.body.page_count || pageCount;
            }
          } catch {}
        }

        const parsed = parseQuestionsAndKeys(rawText || row.notes || "");
        const fileName = row.file_name || `de_thi_${docId}.pdf`;
        const fileType = (row.file_type || "PDF").toUpperCase();
        const isPdf = fileName.toLowerCase().endsWith(".pdf") || fileType === "PDF";

        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=1800");
        return res.status(200).json({
          success: true,
          id: docId,
          subject: row.subject,
          title: row.title || fileName,
          file_name: fileName,
          file_size_bytes: Number(row.file_size_bytes || 0),
          file_type: fileType,
          is_pdf: isPdf,
          estimated_level: row.estimated_level,
          page_count: pageCount,
          question_count: parsed.questions.length || Number(row.question_count || 0),
          academic_year: row.academic_year || "",
          school_or_department: row.school_or_department || "",
          raw_text: rawText,
          notes: row.notes || "",
          questions: parsed.questions,
          answer_keys: parsed.answer_keys,
          inline_view_url: `/api/documents/${docId}/view`,
          download_url: `/api/documents/${docId}/download`,
        });
      }

      const resolved = await resolveDocumentFileOnVercel(docId);
      if (!resolved) {
        return res.status(404).json({ error: "Không tìm thấy đề thi này trong kho" });
      }

      // 5b. Trả về JSON chứa link CDN trực tiếp
      if (action === "file_url") {
        return res.status(200).json({
          success: true,
          id: docId,
          title: resolved.row.title || resolved.fileName,
          file_name: resolved.fileName,
          file_type: resolved.fileType,
          file_size_bytes: Number(resolved.row.file_size_bytes || 0),
          subject: resolved.row.subject || "GENERAL",
          estimated_level: resolved.row.estimated_level || "ALL",
          direct_url: resolved.directUrl || `/api/documents/${docId}/view`,
          download_url: `/api/documents/${docId}/download`,
          view_url: `/api/documents/${docId}/view`,
          jump_url: resolved.row.jump_url,
        });
      }

      // 5c. Stream trực tiếp PDF/DOCX từ Vercel Serverless (gánh 100% băng thông cho Bot!)
      const isInline = action === "view" || action === "pdf";
      const safeName = resolved.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || `exam_${docId}.pdf`;
      const isPdfFile =
        resolved.fileName.toLowerCase().endsWith(".pdf") || resolved.fileType === "PDF";
      const contentType = isPdfFile ? "application/pdf" : "application/octet-stream";

      if (resolved.buffer) {
        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `${isInline ? "inline" : "attachment"}; filename="${safeName}"`
        );
        res.setHeader(
          "Cache-Control",
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
        );
        return res.status(200).send(resolved.buffer);
      }

      if (resolved.directUrl && resolved.directUrl.startsWith("http")) {
        try {
          const cdnResp = await fetch(resolved.directUrl);
          if (cdnResp.ok) {
            const arrBuf = await cdnResp.arrayBuffer();
            const buf = Buffer.from(arrBuf);
            res.setHeader("Content-Type", isPdfFile ? "application/pdf" : (cdnResp.headers.get("content-type") || contentType));
            res.setHeader(
              "Content-Disposition",
              `${isInline ? "inline" : "attachment"}; filename="${safeName}"`
            );
            res.setHeader(
              "Cache-Control",
              "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
            );
            return res.status(200).send(buf);
          }
        } catch {}
        return res.redirect(302, resolved.directUrl);
      }

      if (resolved.row.jump_url && resolved.row.jump_url.startsWith("http")) {
        return res.redirect(302, resolved.row.jump_url);
      }
      return res.status(404).json({ error: "Không tìm thấy liên kết tải cho tệp này" });
    }

    // 5d. HỒ SƠ HỌC TẬP, CHUỖI NGÀY HỌC (STREAK) & BẢNG XẾP HẠNG TRÊN VERCEL SERVERLESS
    if (
      (pathname === "/api/study/profile" || pathname.startsWith("/api/study/profile/")) &&
      req.method === "GET"
    ) {
      await executeTurso(
        `CREATE TABLE IF NOT EXISTS study_profiles (
          discord_id INTEGER PRIMARY KEY,
          username TEXT,
          display_name TEXT,
          avatar_url TEXT,
          current_streak INTEGER DEFAULT 0,
          max_streak INTEGER DEFAULT 0,
          last_study_date TEXT DEFAULT '',
          study_xp INTEGER DEFAULT 0,
          pomodoro_count INTEGER DEFAULT 0,
          study_minutes INTEGER DEFAULT 0,
          exams_completed INTEGER DEFAULT 0,
          docs_contributed INTEGER DEFAULT 0,
          dream_school TEXT DEFAULT '',
          dream_score TEXT DEFAULT '',
          updated_at TEXT NOT NULL
        )`
      ).catch(() => {});

      const pathParts = pathname.split("/");
      const idFromPath = pathParts.length > 4 ? pathParts[4] : "";
      const discordId = (idFromPath || searchParams.get("discord_id") || "").trim();
      const username = (searchParams.get("username") || "").trim();
      const displayName = (searchParams.get("display_name") || username || "Học viên Orbit").trim();
      const avatarUrl = (searchParams.get("avatar_url") || "").trim();

      if (!discordId) {
        return res.status(400).json({ error: "Thiếu discord_id" });
      }

      const { todayStr, yesterdayStr } = getVnDates();
      const nowIso = new Date().toISOString();

      const [profRes, contribRes] = await Promise.all([
        executeTurso("SELECT * FROM study_profiles WHERE discord_id = ? LIMIT 1", [discordId]),
        executeTurso("SELECT COUNT(*) as cnt FROM documents_archive WHERE author_id = ?", [
          discordId,
        ]).catch(() => ({ rows: [{ cnt: 0 }] })),
      ]);

      const realContrib = Number(contribRes.rows[0]?.cnt || 0);
      let row = profRes.rows[0];
      if (!row) {
        const initXp = realContrib * 50;
        await executeTurso(
          `INSERT OR IGNORE INTO study_profiles
           (discord_id, username, display_name, avatar_url, current_streak, max_streak,
            last_study_date, study_xp, pomodoro_count, study_minutes, exams_completed,
            docs_contributed, dream_school, dream_score, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, '', ?, 0, 0, 0, ?, '', '', ?)`,
          [discordId, username, displayName, avatarUrl, initXp, realContrib, nowIso]
        ).catch(() => {});
        row = {
          discord_id: discordId,
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
          current_streak: 0,
          max_streak: 0,
          last_study_date: "",
          study_xp: initXp,
          pomodoro_count: 0,
          study_minutes: 0,
          exams_completed: 0,
          docs_contributed: realContrib,
          dream_school: "",
          dream_score: "",
          updated_at: nowIso,
        };
      }

      const lastDate = String(row.last_study_date || "");
      const rawStreak = Number(row.current_streak || 0);
      const activeStreak =
        lastDate === todayStr || lastDate === yesterdayStr ? rawStreak : 0;
      const maxStreak = Math.max(Number(row.max_streak || 0), activeStreak);
      const docsContrib = Math.max(Number(row.docs_contributed || 0), realContrib);
      const xp = Math.max(Number(row.study_xp || 0), docsContrib * 50);
      const rankInfo = computeStudyRank(xp);

      return res.status(200).json({
        success: true,
        profile: {
          discord_id: String(row.discord_id || discordId),
          username: String(row.username || username),
          display_name: String(row.display_name || displayName),
          avatar_url: String(row.avatar_url || avatarUrl),
          current_streak: activeStreak,
          max_streak: maxStreak,
          last_study_date: lastDate,
          checked_in_today: lastDate === todayStr,
          study_xp: xp,
          level: rankInfo.level,
          rank_title: rankInfo.title,
          next_xp: rankInfo.next_xp,
          level_progress: rankInfo.progress,
          pomodoro_count: Number(row.pomodoro_count || 0),
          study_minutes: Number(row.study_minutes || 0),
          exams_completed: Number(row.exams_completed || 0),
          docs_contributed: docsContrib,
          dream_school: String(row.dream_school || ""),
          dream_score: String(row.dream_score || ""),
          updated_at: String(row.updated_at || nowIso),
        },
      });
    }

    if (pathname === "/api/study/checkin" && req.method === "POST") {
      const body = req.body || {};
      const discordId = String(body.discord_id || "").trim();
      if (!discordId) {
        return res.status(400).json({ error: "Thiếu discord_id" });
      }
      const action = String(body.action || "daily_checkin").trim().toLowerCase();
      const minutes = Math.max(0, Math.min(parseInt(body.minutes || "0", 10) || 0, 240));
      const username = String(body.username || "").trim();
      const displayName = String(body.display_name || username || "Học viên Orbit").trim();
      const avatarUrl = String(body.avatar_url || "").trim();

      const { todayStr, yesterdayStr } = getVnDates();
      const nowIso = new Date().toISOString();

      const profRes = await executeTurso(
        "SELECT * FROM study_profiles WHERE discord_id = ? LIMIT 1",
        [discordId]
      ).catch(() => ({ rows: [] }));
      const cur = profRes.rows[0] || {};

      let curStreak = Number(cur.current_streak || 0);
      let maxStreak = Number(cur.max_streak || 0);
      let lastDate = String(cur.last_study_date || "");
      let studyXp = Number(cur.study_xp || 0);
      let pomoCount = Number(cur.pomodoro_count || 0);
      let studyMins = Number(cur.study_minutes || 0);
      let examsDone = Number(cur.exams_completed || 0);
      let docsContrib = Number(cur.docs_contributed || 0);
      let dreamSchool = String(cur.dream_school || "");
      let dreamScore = String(cur.dream_score || "");

      let xpGained = 0;
      let streakIncremented = false;

      if (["daily_checkin", "pomodoro", "exam_complete"].includes(action)) {
        if (lastDate !== todayStr) {
          curStreak = lastDate === yesterdayStr ? curStreak + 1 : 1;
          maxStreak = Math.max(maxStreak, curStreak);
          lastDate = todayStr;
          xpGained += 50 + Math.min(curStreak * 5, 50);
          streakIncremented = true;
        }
      }

      if (action === "pomodoro") {
        pomoCount += 1;
        studyMins += minutes > 0 ? minutes : 25;
        xpGained += 35;
      } else if (action === "exam_complete") {
        examsDone += 1;
        studyMins += minutes > 0 ? minutes : 45;
        xpGained += 100;
      } else if (action === "update_dream") {
        if (body.dream_school !== undefined) dreamSchool = String(body.dream_school).slice(0, 120);
        if (body.dream_score !== undefined) dreamScore = String(body.dream_score).slice(0, 30);
        if (dreamSchool && studyXp === 0) xpGained += 20;
      }

      studyXp += xpGained;

      await executeTurso(
        `INSERT INTO study_profiles
         (discord_id, username, display_name, avatar_url, current_streak, max_streak,
          last_study_date, study_xp, pomodoro_count, study_minutes, exams_completed,
          docs_contributed, dream_school, dream_score, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(discord_id) DO UPDATE SET
          username = excluded.username,
          display_name = excluded.display_name,
          avatar_url = CASE WHEN excluded.avatar_url != '' THEN excluded.avatar_url ELSE study_profiles.avatar_url END,
          current_streak = excluded.current_streak,
          max_streak = excluded.max_streak,
          last_study_date = excluded.last_study_date,
          study_xp = excluded.study_xp,
          pomodoro_count = excluded.pomodoro_count,
          study_minutes = excluded.study_minutes,
          exams_completed = excluded.exams_completed,
          docs_contributed = excluded.docs_contributed,
          dream_school = excluded.dream_school,
          dream_score = excluded.dream_score,
          updated_at = excluded.updated_at`,
        [
          discordId,
          username || cur.username || "",
          displayName || cur.display_name || "Học viên Orbit",
          avatarUrl || cur.avatar_url || "",
          curStreak,
          maxStreak,
          lastDate,
          studyXp,
          pomoCount,
          studyMins,
          examsDone,
          docsContrib,
          dreamSchool,
          dreamScore,
          nowIso,
        ]
      );

      const rankInfo = computeStudyRank(studyXp);
      return res.status(200).json({
        success: true,
        xp_gained: xpGained,
        streak_incremented: streakIncremented,
        profile: {
          discord_id: discordId,
          username: username || cur.username || "",
          display_name: displayName || cur.display_name || "Học viên Orbit",
          avatar_url: avatarUrl || cur.avatar_url || "",
          current_streak: curStreak,
          max_streak: maxStreak,
          last_study_date: lastDate,
          checked_in_today: lastDate === todayStr,
          study_xp: studyXp,
          level: rankInfo.level,
          rank_title: rankInfo.title,
          next_xp: rankInfo.next_xp,
          level_progress: rankInfo.progress,
          pomodoro_count: pomoCount,
          study_minutes: studyMins,
          exams_completed: examsDone,
          docs_contributed: docsContrib,
          dream_school: dreamSchool,
          dream_score: dreamScore,
          updated_at: nowIso,
        },
      });
    }

    if (pathname === "/api/study/leaderboard" && req.method === "GET") {
      const { todayStr, yesterdayStr } = getVnDates();
      const [profRes, contribRes] = await Promise.all([
        executeTurso(
          `SELECT * FROM study_profiles ORDER BY study_xp DESC, current_streak DESC LIMIT 30`
        ).catch(() => ({ rows: [] })),
        executeTurso(
          `SELECT author_name, MAX(author_id) as aid, COUNT(*) as cnt
           FROM documents_archive
           WHERE author_name IS NOT NULL AND author_name != ''
           GROUP BY author_name
           ORDER BY cnt DESC LIMIT 20`
        ).catch(() => ({ rows: [] })),
      ]);

      const map = new Map();
      for (const r of profRes.rows) {
        const key = String(r.discord_id || r.username || r.display_name);
        const lastD = String(r.last_study_date || "");
        const actStreak =
          lastD === todayStr || lastD === yesterdayStr ? Number(r.current_streak || 0) : 0;
        const maxS = Math.max(Number(r.max_streak || 0), actStreak);
        const xp = Number(r.study_xp || 0);
        const rInfo = computeStudyRank(xp);
        map.set(key, {
          rank: 0,
          discord_id: String(r.discord_id || ""),
          display_name: String(r.display_name || r.username || "Học viên Orbit"),
          username: String(r.username || ""),
          avatar_url: String(r.avatar_url || ""),
          current_streak: actStreak,
          max_streak: maxS,
          study_xp: xp,
          level: rInfo.level,
          rank_title: rInfo.title,
          pomodoro_count: Number(r.pomodoro_count || 0),
          study_minutes: Number(r.study_minutes || 0),
          exams_completed: Number(r.exams_completed || 0),
          docs_contributed: Number(r.docs_contributed || 0),
          dream_school: String(r.dream_school || ""),
          dream_score: String(r.dream_score || ""),
        });
      }

      for (const cr of contribRes.rows) {
        const aname = String(cr.author_name || "").trim();
        const aid = String(cr.aid || aname);
        const cnt = Number(cr.cnt || 0);
        if (!aname) continue;
        const existing =
          map.get(aid) ||
          Array.from(map.values()).find(
            (x) =>
              x.username.toLowerCase() === aname.toLowerCase() ||
              x.display_name.toLowerCase() === aname.toLowerCase()
          );
        if (existing) {
          existing.docs_contributed = Math.max(existing.docs_contributed, cnt);
          existing.study_xp = Math.max(existing.study_xp, cnt * 50);
          const ri = computeStudyRank(existing.study_xp);
          existing.level = ri.level;
          existing.rank_title = ri.title;
        } else {
          const xp = cnt * 50;
          const ri = computeStudyRank(xp);
          map.set(aid, {
            rank: 0,
            discord_id: aid,
            display_name: aname,
            username: aname,
            avatar_url: "",
            current_streak: 1,
            max_streak: 1,
            study_xp: xp,
            level: ri.level,
            rank_title: ri.title,
            pomodoro_count: 0,
            study_minutes: 0,
            exams_completed: 0,
            docs_contributed: cnt,
            dream_school: "",
            dream_score: "",
          });
        }
      }

      const list = Array.from(map.values()).sort(
        (a, b) =>
          b.study_xp - a.study_xp ||
          b.current_streak - a.current_streak ||
          b.docs_contributed - a.docs_contributed
      );
      list.forEach((item, idx) => {
        item.rank = idx + 1;
      });

      res.setHeader(
        "Cache-Control",
        "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
      );
      return res.status(200).json({
        success: true,
        total: list.length,
        leaderboard: list.slice(0, 25),
      });
    }

    // 6. POST /api/account/link & GET /api/account/me
    if (pathname === "/api/account/link" && req.method === "POST") {
      const userData = await verifyDiscordBearerToken(req);
      if (!userData) {
        return res.status(401).json({ error: "Token Discord không hợp lệ hoặc đã hết hạn" });
      }
      const discordId = String(userData.id || "");
      const username = String(userData.username || "");
      const globalName = String(userData.global_name || username);
      const avatarUrl = userData.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
        : "";
      const email = String(userData.email || "");
      const verified = userData.verified ? 1 : 0;
      const nowIso = new Date().toISOString();

      try {
        await executeTurso(
          `INSERT INTO linked_accounts
             (discord_id, username, global_name, avatar_url, email, verified, first_seen, last_seen, login_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON CONFLICT(discord_id) DO UPDATE SET
             username=excluded.username, global_name=excluded.global_name,
             avatar_url=excluded.avatar_url, email=excluded.email, verified=excluded.verified,
             last_seen=excluded.last_seen, login_count=login_count+1`,
          [discordId, username, globalName, avatarUrl, email, verified, nowIso, nowIso]
        );
      } catch {}

      return res.status(200).json({
        success: true,
        message: "Đã lưu tài khoản liên kết trên Turso Cloud.",
        account: { discord_id: discordId, username, verified: Boolean(verified) },
      });
    }

    // 7. GET /api/admin/check
    if (pathname === "/api/admin/check" && req.method === "GET") {
      const check = await verifyAdminAccess(req);
      if (!check.ok) {
        const hints = {
          no_token: "Bạn chưa liên kết tài khoản Discord. Hãy đăng nhập bằng Discord trên Web.",
          unverified: "Tài khoản Discord của bạn chưa xác minh email. Hãy xác minh email rồi thử lại.",
          not_member: "Bạn chưa tham gia Discord Server Orbit. Hãy vào server rồi thử lại.",
          not_admin:
            "Tài khoản của bạn không có role Quản trị (Owner / Co-Owner / Administrator / Moderator).",
        };
        return res.status(200).json({
          is_admin: false,
          reason: check.reason,
          message: hints[check.reason] || "Không có quyền Quản trị viên.",
        });
      }
      return res.status(200).json({
        is_admin: true,
        admin: check.admin,
      });
    }

    // 8. Admin Read Snapshots (/api/admin/channels, members, bans, logs, config, audit-logs, /api/system/update_status)
    const snapshotMap = {
      "/api/admin/channels": { key: "admin_channels", fallback: { success: true, total: 0, channels: [] } },
      "/api/admin/members": { key: "admin_members", fallback: { success: true, total: 0, members: [] } },
      "/api/admin/bans": { key: "admin_bans", fallback: { success: true, total: 0, bans: [] } },
      "/api/admin/logs": {
        key: "admin_logs",
        fallback: { success: true, level: "ALL", returned_lines: 0, log_size_bytes: 0, lines: [] },
      },
      "/api/admin/config": { key: "admin_config", fallback: { success: true, bot: {}, guild: {}, channels: {} } },
      "/api/admin/audit-logs": { key: "admin_audit_logs", fallback: { success: true, entries: [] } },
      "/api/system/update_status": {
        key: "system_update_status",
        fallback: { current_hash: "main", has_update: false, remote_hash: "main", commits: [] },
      },
    };

    if (snapshotMap[pathname] && req.method === "GET") {
      if (pathname.startsWith("/api/admin/")) {
        const check = await verifyAdminAccess(req);
        if (!check.ok) {
          return res.status(403).json({ error: "Forbidden", message: "Yêu cầu quyền Quản trị viên" });
        }
      }
      const { key, fallback } = snapshotMap[pathname];
      const kv = await getKvValue(key);
      return res.status(200).json(kv?.data || fallback);
    }

    // 9. DELETE / PATCH /api/admin/documents/:id
    const adminDocMatch = pathname.match(/^\/api\/admin\/documents\/(\d+)$/);
    if (adminDocMatch && (req.method === "DELETE" || req.method === "PATCH")) {
      const check = await verifyAdminAccess(req);
      if (!check.ok) {
        return res.status(403).json({ error: "Forbidden", message: "Yêu cầu quyền Quản trị viên" });
      }
      const docId = parseInt(adminDocMatch[1], 10);

      if (req.method === "DELETE") {
        await executeTurso("DELETE FROM documents_archive WHERE id = ?", [docId]);
        // Đẩy lệnh xóa xuống Bot RPC để Bot xóa cả trong SQLite local & Discord message
        await forwardRpcToBot(
          "DELETE",
          pathname,
          { "X-Vercel-Verified-Admin": "1" },
          null,
          1500
        );
        return res.status(200).json({
          success: true,
          message: `Đã xóa thành công đề thi #${docId}!`,
          deleted_id: docId,
        });
      }

      if (req.method === "PATCH") {
        const body = req.body || {};
        const title = String(body.title || "").trim();
        const subject = String(body.subject || "GENERAL").trim();
        const level = String(body.estimated_level || "").trim();
        const notes = String(body.notes || "").trim();

        await executeTurso(
          `UPDATE documents_archive
           SET title = COALESCE(NULLIF(?, ''), title),
               subject = COALESCE(NULLIF(?, ''), subject),
               estimated_level = COALESCE(NULLIF(?, ''), estimated_level),
               notes = ?
           WHERE id = ?`,
          [title, subject, level, notes, docId]
        );
        await forwardRpcToBot(
          "PATCH",
          pathname,
          { "X-Vercel-Verified-Admin": "1" },
          body,
          1500
        );
        return res.status(200).json({
          success: true,
          message: `Đã cập nhật đề thi #${docId} thành công!`,
          document: { id: docId, title, subject, estimated_level: level, notes },
        });
      }
    }

    // 10. Interactive RPC endpoints (notify, ban, unban, kick, timeout, import_gdrive, system/*)
    const isAdminAction =
      pathname.startsWith("/api/admin/") ||
      pathname.startsWith("/api/system/") ||
      pathname === "/api/notify";

    const rpcHeaders = {};
    if (req.headers.authorization) {
      rpcHeaders.Authorization = req.headers.authorization;
    }
    if (isAdminAction) {
      const check = await verifyAdminAccess(req);
      if (!check.ok) {
        return res.status(403).json({ error: "Forbidden", message: "Yêu cầu quyền Quản trị viên" });
      }
      rpcHeaders["X-Vercel-Verified-Admin"] = "1";
    }

    const rpcRes = await forwardRpcToBot(
      req.method,
      pathname + (parsedUrl.search || ""),
      rpcHeaders,
      req.body,
      8200
    );
    return res.status(rpcRes.status).json(rpcRes.body);
  } catch (err) {
    return res.status(500).json({
      error: "Vercel Bridge Error",
      message: err?.message || "Lỗi xử lý cầu nối Vercel - Turso.",
    });
  }
}
