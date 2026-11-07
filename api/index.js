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
let localEnvToken = "";
try {
  const _fs = require("fs");
  const _path = require("path");
  const _envFile = _path.resolve(__dirname, "../../Bot/.env");
  if (_fs.existsSync(_envFile)) {
    const _raw = _fs.readFileSync(_envFile, "utf8");
    const _m = _raw.match(/DISCORD_TOKEN=([^\r\n]+)/);
    if (_m) localEnvToken = _m[1].trim();
  }
} catch {}

const DISCORD_BOT_TOKEN =
  process.env.DISCORD_TOKEN ||
  process.env.DISCORD_BOT_TOKEN ||
  localEnvToken;
const DISCORD_FORUM_CHANNEL_ID = "1535557885721841744";

const FORUM_CATEGORY_TO_TAG = {
  "Góc thắc mắc": "1566808758728786134",
  "Facts": "1566808758728786135",
  "Hỏi đáp": "1566808758728786136",
  "Ôn thi": "1566808758728786137",
};

const FORUM_TAG_TO_CATEGORY = {
  "1566808758728786134": "Góc thắc mắc",
  "1566808758728786135": "Facts",
  "1566808758728786136": "Hỏi đáp",
  "1566808758728786137": "Ôn thi",
};

async function callDiscordRest(endpoint, method = "GET", body = null) {
  const url = `https://discord.com/api/v10${endpoint}`;
  const headers = {
    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    "User-Agent": "OrbitWebGateway/2.0",
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const opts = {
    method,
    headers,
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(url, opts);
  const data = await resp.json().catch(() => null);
  return { status: resp.status, ok: resp.ok, data };
}

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
        `SELECT d.id, d.subject, d.title, d.file_name, d.file_size_bytes, d.file_type,
                d.estimated_level, d.question_count, d.page_count, d.author_name, d.author_id,
                d.jump_url, d.timestamp, d.file_hash, d.notes, d.academic_year, d.school_or_department,
                d.verdict, d.exam_track, d.confidence, d.queue_status,
                la.avatar_url as author_avatar
         FROM documents_archive d
         LEFT JOIN linked_accounts la ON d.author_id = la.discord_id
         ${whereSql}
         ORDER BY d.id DESC
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

        let authorAvatar = r.author_avatar || null;
        if (!authorAvatar && r.author_id) {
          try {
            const aid = String(r.author_id);
            if (aid && aid.length > 10) {
              const disc = (BigInt(aid) >> 22n) % 6n;
              authorAvatar = `https://cdn.discordapp.com/embed/avatars/${Number(disc)}.png`;
            }
          } catch {}
        }

        return {
          ...r,
          author_avatar: authorAvatar,
          academic_year: acYear,
          school_or_department: schDept,
          is_duplicate: isDup,
          is_duplicate_copy: isDupCopy,
          duplicate_count: st.cnt,
          jump_url: 'https://orbit-psi-black.vercel.app/#vault',
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
      // Mở tự do tính năng bốc đề ngẫu nhiên 100% Free cho mọi học giả trên Web

      const subject = (searchParams.get("subject") || "").trim();
      const grade = (searchParams.get("grade") || "").trim();
      const examType = (searchParams.get("exam_type") || "").trim();
      const desc = (searchParams.get("description") || "").trim();

      const clauses = [];
      const params = [];
      if (subject && subject.toUpperCase() !== "ALL") {
        clauses.push("LOWER(d.subject) = LOWER(?)");
        params.push(subject);
      }
      if (grade && grade.toUpperCase() !== "ALL") {
        clauses.push("(d.estimated_level LIKE ? OR d.title LIKE ?)");
        params.push(`%${grade}%`, `%${grade}%`);
      }
      applyExamTypeClause(examType, clauses, params);
      if (desc) {
        clauses.push("(LOWER(d.title) LIKE ? OR LOWER(d.file_name) LIKE ?)");
        params.push(`%${desc.toLowerCase()}%`, `%${desc.toLowerCase()}%`);
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      let rowRes = await executeTurso(
        `SELECT d.id, d.subject, d.title, d.file_name, d.file_size_bytes, d.file_type,
                d.estimated_level, d.question_count, d.page_count, d.author_name, d.author_id,
                d.jump_url, d.timestamp, d.file_hash, d.notes, d.academic_year, d.school_or_department,
                d.verdict, d.exam_track, d.confidence,
                la.avatar_url as author_avatar
         FROM documents_archive d
         LEFT JOIN linked_accounts la ON d.author_id = la.discord_id
         ${whereSql}
         ORDER BY RANDOM() LIMIT 1`,
        params
      );
      let isExact = true;
      if (!rowRes.rows.length && clauses.length) {
        isExact = false;
        rowRes = await executeTurso(
          `SELECT d.id, d.subject, d.title, d.file_name, d.file_size_bytes, d.file_type,
                  d.estimated_level, d.question_count, d.page_count, d.author_name, d.author_id,
                  d.jump_url, d.timestamp, d.file_hash, d.notes, d.academic_year, d.school_or_department,
                  d.verdict, d.exam_track, d.confidence,
                  la.avatar_url as author_avatar
           FROM documents_archive d
           LEFT JOIN linked_accounts la ON d.author_id = la.discord_id
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
      let authorAvatar = doc.author_avatar || null;
      if (!authorAvatar && doc.author_id) {
        try {
          const aid = String(doc.author_id);
          if (aid && aid.length > 10) {
            const disc = (BigInt(aid) >> 22n) % 6n;
            authorAvatar = `https://cdn.discordapp.com/embed/avatars/${Number(disc)}.png`;
          }
        } catch {}
      }

      return res.status(200).json({
        success: true,
        bot_online: true,
        is_exact_match: isExact,
        document: {
          ...doc,
          author_avatar: authorAvatar,
          academic_year: acYear,
          school_or_department: schDept,
          jump_url: 'https://orbit-psi-black.vercel.app/#vault',
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
          jump_url: 'https://orbit-psi-black.vercel.app/#vault',
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

    // 6b. POST /api/account/verify-member (Xác thực thành viên Discord Server Orbit để mở khóa Hub & Diễn Đàn 24/7)
    if (pathname === "/api/account/verify-member" && req.method === "POST") {
      const body = req.body || {};
      const identifier = String(body.identifier || "").trim();
      if (!identifier) {
        return res.status(400).json({
          error: "Missing identifier",
          message: "Vui lòng nhập Discord Username hoặc Discord ID của bạn.",
        });
      }

      const cleanId = identifier.replace(/^<@!?/, "").replace(/>$/, "").trim();
      const qLower = identifier.replace(/^@/, "").trim().toLowerCase();

      // Kiểm tra nhanh trong snapshot admin_members trên Turso Cloud (<50ms, hoạt động cả khi tắt PC)
      const kvMembers = await getKvValue("admin_members");
      const memberList = kvMembers?.data?.members || [];
      const matchedSnapshot = memberList.find(
        (m) =>
          !m.is_bot &&
          (String(m.user_id) === cleanId ||
            String(m.username || "").toLowerCase() === qLower ||
            String(m.display_name || "").toLowerCase() === qLower)
      );

      if (matchedSnapshot) {
        try {
          const nowIsoLa = new Date().toISOString();
          await executeTurso(
            `INSERT INTO linked_accounts (discord_id, username, global_name, avatar_url, email, verified, first_seen, last_seen, login_count)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1)
             ON CONFLICT(discord_id) DO UPDATE SET
               username = excluded.username,
               global_name = excluded.global_name,
               avatar_url = CASE WHEN excluded.avatar_url != '' THEN excluded.avatar_url ELSE linked_accounts.avatar_url END,
               last_seen = excluded.last_seen,
               login_count = linked_accounts.login_count + 1`,
            [
              String(matchedSnapshot.user_id),
              String(matchedSnapshot.username || matchedSnapshot.user_id),
              String(matchedSnapshot.display_name || matchedSnapshot.username || matchedSnapshot.user_id),
              matchedSnapshot.avatar_url || "https://orbit-psi-black.vercel.app/server_icon.png",
              `${matchedSnapshot.username || matchedSnapshot.user_id}@discord.orbit.vn`,
              nowIsoLa,
              nowIsoLa,
            ]
          );
        } catch {}
        return res.status(200).json({
          success: true,
          user: {
            id: String(matchedSnapshot.user_id),
            username: String(matchedSnapshot.username || matchedSnapshot.user_id),
            global_name: String(matchedSnapshot.display_name || matchedSnapshot.username || matchedSnapshot.user_id),
            avatar:
              matchedSnapshot.avatar_url ||
              "https://orbit-psi-black.vercel.app/server_icon.png",
            email: `${matchedSnapshot.username || matchedSnapshot.user_id}@discord.orbit.vn`,
            verified: true,
            roles: ["Member"],
            connectedAt: new Date().toISOString(),
          },
        });
      }

      // Kiểm tra trong bảng linked_accounts trên Turso Cloud
      try {
        const linkedRes = await executeTurso(
          `SELECT discord_id, username, global_name, avatar_url, email
           FROM linked_accounts
           WHERE CAST(discord_id AS TEXT) = ? OR LOWER(username) = ? OR LOWER(global_name) = ?
           LIMIT 1`,
          [cleanId, qLower, qLower]
        );
        const linkedRow = linkedRes.rows?.[0];
        if (linkedRow) {
          return res.status(200).json({
            success: true,
            user: {
              id: String(linkedRow.discord_id),
              username: String(linkedRow.username || linkedRow.discord_id),
              global_name: String(linkedRow.global_name || linkedRow.username || linkedRow.discord_id),
              avatar:
                linkedRow.avatar_url ||
                "https://orbit-psi-black.vercel.app/server_icon.png",
              email: String(linkedRow.email || `${linkedRow.username}@discord.orbit.vn`),
              verified: true,
              roles: ["Member"],
              connectedAt: new Date().toISOString(),
            },
          });
        }
      } catch {}

      // Nếu thành viên mới vào server chưa kịp có trong snapshot, hỏi trực tiếp Bot qua RPC
      const rpcVerify = await forwardRpcToBot(
        "POST",
        "/api/account/verify-member",
        {},
        body,
        5500
      );
      if (rpcVerify.status === 202) {
        return res.status(404).json({
          error: "Member not found",
          message: `Không tìm thấy thành viên '${identifier}' trong danh sách đồng bộ máy chủ Discord Orbit | Vietnam. Hãy chắc chắn bạn đã tham gia server Discord Orbit và nhập đúng Username hoặc ID!`,
        });
      }
      return res.status(rpcVerify.status).json(rpcVerify.body);
    }

    // 6b-2. POST /api/account/verify-code (Xác thực mã OTP 6 số hiệu lực 5 phút từ kênh #🔐・verify)
    if (pathname === "/api/account/verify-code" && req.method === "POST") {
      const body = req.body || {};
      const discordId = String(body.discord_id || "").trim();
      const cleanCode = String(body.code || "").trim().replace(/\s+/g, "");

      if (!discordId || !cleanCode) {
        return res.status(400).json({
          error: "Missing parameters",
          message: "Vui lòng nhập đầy đủ mã xác minh 6 số từ kênh #🔐・verify.",
        });
      }

      try {
        await executeTurso(
          `CREATE TABLE IF NOT EXISTS web_verify_codes (
            discord_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL,
            avatar_url TEXT NOT NULL,
            code TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
          )`
        ).catch(() => {});

        const codeRes = await executeTurso(
          `SELECT code, expires_at, username, display_name, avatar_url
           FROM web_verify_codes
           WHERE discord_id = ? LIMIT 1`,
          [discordId]
        );
        const row = codeRes.rows?.[0];

        if (row) {
          const nowSec = Math.floor(Date.now() / 1000);
          const expiresAt = Number(row.expires_at || 0);
          const savedCode = String(row.code || "").trim();

          if (nowSec > expiresAt) {
            await executeTurso("DELETE FROM web_verify_codes WHERE discord_id = ?", [discordId]).catch(() => {});
            return res.status(400).json({
              error: "Code expired",
              message: "Mã xác minh đã hết hạn (quá 5 phút). Vui lòng bấm nút lấy mã mới trong kênh #🔐・verify!",
            });
          }

          if (savedCode !== cleanCode) {
            return res.status(400).json({
              error: "Invalid code",
              message: "Mã xác minh không chính xác (hoặc đã bị hủy do bạn vừa ấn tạo mã mới). Vui lòng nhập mã 6 số mới nhất!",
            });
          }

          // Mã hợp lệ -> Hủy mã ngay sau khi dùng 1 lần
          await executeTurso("DELETE FROM web_verify_codes WHERE discord_id = ?", [discordId]).catch(() => {});
          forwardRpcToBot("POST", "/api/account/verify-code", {}, body, 1500).catch(() => {});

          return res.status(200).json({
            success: true,
            verified_code: true,
            user: {
              id: discordId,
              username: String(row.username || discordId),
              global_name: String(row.display_name || row.username || discordId),
              avatar: row.avatar_url || "https://orbit-psi-black.vercel.app/server_icon.png",
              email: `${row.username || discordId}@discord.orbit.vn`,
              verified: true,
              connectedAt: new Date().toISOString(),
            },
          });
        }
      } catch {}

      // Fallback hỏi trực tiếp Bot qua RPC nếu Turso chưa kịp đồng bộ
      const rpcCode = await forwardRpcToBot("POST", "/api/account/verify-code", {}, body, 4500);
      if (rpcCode.status === 202) {
        return res.status(400).json({
          error: "No active code",
          message: "Bạn chưa lấy mã xác minh hoặc mã đã được sử dụng. Hãy vào kênh #🔐・verify trên Discord và bấm nút 'Lấy Mã Đăng Nhập Web (5 Phút) 🔑'!",
        });
      }
      return res.status(rpcCode.status).json(rpcCode.body);
    }

    // 6c. GET /api/forum/threads (Đồng bộ Diễn Đàn Orbit 2 chiều Web <-> Discord #💡・diễn-đàn)
    if (pathname === "/api/forum/threads" && req.method === "GET") {
      // 1. Thử gọi RPC sang Bot nếu Bot online trên localhost/VPS
      const rpcForum = await forwardRpcToBot("GET", "/api/forum/threads", {}, null, 3000);
      if (rpcForum.status === 200 && rpcForum.body?.threads?.length) {
        return res.status(200).json(rpcForum.body);
      }

      // 2. Trực tiếp gọi Discord REST API 24/7
      try {
        const [activeRes, archivedRes] = await Promise.all([
          callDiscordRest(`/guilds/${DISCORD_GUILD_ID}/threads/active`),
          callDiscordRest(`/channels/${DISCORD_FORUM_CHANNEL_ID}/threads/archived/public`).catch(() => ({ ok: false, data: {} })),
        ]);

        const allThreads = [
          ...(activeRes.ok && Array.isArray(activeRes.data?.threads) ? activeRes.data.threads : []),
          ...(archivedRes.ok && Array.isArray(archivedRes.data?.threads) ? archivedRes.data.threads : []),
        ].filter((t) => String(t.parent_id) === String(DISCORD_FORUM_CHANNEL_ID));

        const threadsList = allThreads.map((t) => {
          let category = "Góc thắc mắc";
          if (Array.isArray(t.applied_tags)) {
            for (const tagId of t.applied_tags) {
              if (FORUM_TAG_TO_CATEGORY[tagId]) {
                category = FORUM_TAG_TO_CATEGORY[tagId];
                break;
              }
            }
          }
          if (category === "Góc thắc mắc") {
            const nameLower = (t.name || "").toLowerCase();
            if (nameLower.includes("facts") || nameLower.includes("sự thật")) category = "Facts";
            else if (nameLower.includes("hỏi đáp") || nameLower.includes("bài tập")) category = "Hỏi đáp";
            else if (nameLower.includes("ôn thi") || nameLower.includes("chiến thuật")) category = "Ôn thi";
          }

          return {
            id: t.id,
            title: t.name,
            category,
            author_id: t.owner_id || "",
            author_name: "Thành viên Orbit",
            author_avatar: "",
            excerpt: `Chủ đề [${category}] trên diễn đàn Orbit Discord Server.`,
            message_count: t.message_count || 1,
            reply_count: Math.max(0, (t.total_message_sent || t.message_count || 1) - 1),
            created_at: t.thread_metadata?.create_timestamp || new Date().toISOString(),
            jump_url: `https://discord.com/channels/${DISCORD_GUILD_ID}/${t.id}`,
          };
        });

        return res.status(200).json({
          channel_id: DISCORD_FORUM_CHANNEL_ID,
          channel_name: "💡・diễn-đàn",
          categories: ["Góc thắc mắc", "Facts", "Hỏi đáp", "Ôn thi"],
          threads: threadsList,
        });
      } catch (err) {
        console.warn("Lỗi đọc threads từ Discord API:", err);
        return res.status(200).json({
          channel_id: DISCORD_FORUM_CHANNEL_ID,
          channel_name: "💡・diễn-đàn",
          categories: ["Góc thắc mắc", "Facts", "Hỏi đáp", "Ôn thi"],
          threads: [],
        });
      }
    }

    // 6d. GET /api/forum/threads/:id (Lấy chi tiết thread và tin nhắn thảo luận)
    const forumThreadMatch = pathname.match(/^\/api\/forum\/threads\/(\d+)(?:\/messages)?$/);
    if (forumThreadMatch && req.method === "GET") {
      const threadId = forumThreadMatch[1];
      // 1. Thử gọi RPC sang Bot
      const rpcDetail = await forwardRpcToBot("GET", `/api/forum/threads/${threadId}`, {}, null, 3000);
      if (rpcDetail.status === 200 && Array.isArray(rpcDetail.body?.messages)) {
        return res.status(200).json(rpcDetail.body);
      }

      // 2. Trực tiếp gọi Discord REST API
      try {
        const [threadRes, msgsRes] = await Promise.all([
          callDiscordRest(`/channels/${threadId}`),
          callDiscordRest(`/channels/${threadId}/messages?limit=50`),
        ]);

        const rawMsgs = msgsRes.ok && Array.isArray(msgsRes.data) ? msgsRes.data : [];
        rawMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const parsedMessages = rawMsgs.map((m) => {
          const isBot = Boolean(m.webhook_id || m.author?.bot);
          let authorName = m.author?.global_name || m.author?.username || "Thành viên Orbit";
          let authorAvatar = m.author?.avatar
            ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png`
            : "https://assets.codeforces.com/favicon-96x96.png";
          let content = m.content || "";

          // Bóc tách nếu là tin nhắn do Web gửi qua Bot
          const webMatch = content.match(/^💬 \*\*\[Web — ([^\]]+)\]:\*\*\s*([\s\S]*)$/);
          if (webMatch) {
            authorName = webMatch[1];
            content = webMatch[2];
          }

          return {
            id: m.id,
            author_id: m.author?.id || "",
            author_name: authorName,
            author_avatar: authorAvatar,
            content,
            created_at: m.timestamp,
            source: webMatch ? "web" : (isBot ? "bot" : "discord"),
            attachments: (m.attachments || []).map((a) => ({
              id: a.id,
              filename: a.filename,
              url: a.url,
              size: a.size,
            })),
          };
        });

        const threadInfo = threadRes.ok ? threadRes.data : {};
        return res.status(200).json({
          thread: {
            id: threadId,
            title: threadInfo.name || "Chủ đề thảo luận",
            message_count: parsedMessages.length,
          },
          messages: parsedMessages,
        });
      } catch (err) {
        console.warn("Lỗi đọc messages từ Discord API:", err);
        return res.status(200).json({ thread: { id: threadId }, messages: [] });
      }
    }

    // 6e. POST /api/forum/threads (Tạo bài viết mới từ Web -> Đẩy thẳng lên Discord #💡・diễn-đàn)
    if (pathname === "/api/forum/threads" && req.method === "POST") {
      let bodyData = {};
      try {
        bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch {
        bodyData = {};
      }

      const title = (bodyData.title || "").trim();
      const content = (bodyData.content || "").trim();
      const category = (bodyData.category || "Góc thắc mắc").trim();
      const authorName = (bodyData.author_name || "Thành viên Web").trim();
      const authorId = bodyData.author_id ? String(bodyData.author_id) : "";

      if (!title || !content) {
        return res.status(400).json({ error: "Tiêu đề và nội dung bài viết không được để trống." });
      }

      // 1. Thử gọi RPC sang Bot
      const rpcCreate = await forwardRpcToBot("POST", "/api/forum/threads", {}, bodyData, 4500);
      if (rpcCreate.status >= 200 && rpcCreate.status < 300 && rpcCreate.body?.thread_id) {
        return res.status(201).json(rpcCreate.body);
      }

      // 2. Trực tiếp gọi Discord REST API
      const tagId = FORUM_CATEGORY_TO_TAG[category] || FORUM_CATEGORY_TO_TAG["Góc thắc mắc"];
      const starterContent = [
        `🪐 **[Orbit Web Forum]**`,
        `👤 **Người đăng:** **${authorName}** ${authorId ? `(<@${authorId}>)` : ""}`,
        `🏷️ **Chuyên mục:** \`${category}\``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        content,
      ].join("\n");

      const createRes = await callDiscordRest(`/channels/${DISCORD_FORUM_CHANNEL_ID}/threads`, "POST", {
        name: `[${category}] ${title.slice(0, 80)}`,
        auto_archive_duration: 4320, // 3 ngày
        applied_tags: tagId ? [tagId] : [],
        message: {
          content: starterContent,
        },
      });

      if (createRes.ok && createRes.data?.id) {
        const createdThread = {
          id: createRes.data.id,
          title: createRes.data.name,
          category,
          author_id: authorId,
          author_name: authorName,
          author_avatar: "",
          excerpt: content.slice(0, 160),
          message_count: 1,
          reply_count: 0,
          created_at: new Date().toISOString(),
          jump_url: `https://discord.com/channels/${DISCORD_GUILD_ID}/${createRes.data.id}`,
        };
        return res.status(201).json({
          success: true,
          thread: createdThread,
          thread_id: createRes.data.id,
          title: createRes.data.name,
          category,
          jump_url: createdThread.jump_url,
        });
      }

      return res.status(createRes.status || 500).json({
        error: "Không thể tạo bài thảo luận trên Discord.",
        details: createRes.data,
      });
    }

    // 6f. POST /api/forum/threads/:id/messages (Gửi bình luận phản hồi từ Web -> Đẩy thẳng vào Thread Discord)
    const forumPostMsgMatch = pathname.match(/^\/api\/forum\/threads\/(\d+)\/messages$/);
    if (forumPostMsgMatch && req.method === "POST") {
      const threadId = forumPostMsgMatch[1];
      let bodyData = {};
      try {
        bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch {
        bodyData = {};
      }

      const content = (bodyData.content || "").trim();
      const authorName = (bodyData.author_name || "Thành viên Web").trim();
      if (!content) {
        return res.status(400).json({ error: "Nội dung bình luận không được để trống." });
      }

      // 1. Thử gọi RPC sang Bot
      const rpcMsg = await forwardRpcToBot("POST", `/api/forum/threads/${threadId}/messages`, {}, bodyData, 4500);
      if (rpcMsg.status >= 200 && rpcMsg.status < 300 && rpcMsg.body?.message_id) {
        return res.status(201).json(rpcMsg.body);
      }

      // 2. Trực tiếp gọi Discord REST API
      const replyContent = `💬 **[Web — ${authorName}]:**\n${content}`;
      const msgRes = await callDiscordRest(`/channels/${threadId}/messages`, "POST", {
        content: replyContent,
      });

      if (msgRes.ok && msgRes.data?.id) {
        const createdMsg = {
          id: msgRes.data.id,
          author_id: bodyData.author_id || "",
          author_name: authorName,
          author_avatar: bodyData.author_avatar || "",
          content,
          created_at: msgRes.data.timestamp,
          source: "web",
        };
        return res.status(201).json({
          success: true,
          message: createdMsg,
          message_id: msgRes.data.id,
          thread_id: threadId,
          content,
          created_at: msgRes.data.timestamp,
        });
      }

      return res.status(msgRes.status || 500).json({
        error: "Không thể gửi bình luận vào Discord thread.",
        details: msgRes.data,
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

    // 9b. POST /api/documents/deep_verify — Đối chiếu sâu đề thi 4 bước qua Cloud Engine
    // Tích hợp Cache (globalThis) + Bảo vệ trần 34 req/phút & 9.500 req/ngày
    if (pathname === "/api/documents/deep_verify" && req.method === "POST") {
      const body = req.body || {};
      const fileName = String(body.file_name || "").trim();
      const rawText = String(body.text_snippet || "").trim();
      if (!rawText || rawText.length < 20) {
        return res.status(200).json({ success: false, reason: "short_text" });
      }

      if (!globalThis._deepVerifyCache) globalThis._deepVerifyCache = new Map();
      if (!globalThis._deepVerifyMinuteTs) globalThis._deepVerifyMinuteTs = [];

      const fpKey = `${fileName.toLowerCase()}::${rawText.length}::${rawText.slice(0, 300).toLowerCase()}`;
      if (globalThis._deepVerifyCache.has(fpKey)) {
        return res.status(200).json({
          success: true,
          cached: true,
          verified: globalThis._deepVerifyCache.get(fpKey),
        });
      }

      const nowMs = Date.now();
      globalThis._deepVerifyMinuteTs = globalThis._deepVerifyMinuteTs.filter(
        (t) => nowMs - t < 60000
      );
      if (globalThis._deepVerifyMinuteTs.length >= 34) {
        return res.status(200).json({ success: false, reason: "rate_guard_34rpm" });
      }
      globalThis._deepVerifyMinuteTs.push(nowMs);

      let apiKey = process.env.NVIDIA_API_KEY || "";
      let baseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
      let primaryModel = "nvidia/nemotron-3-ultra-550b-a55b";
      let fallbackModel = "nvidia/nemotron-3.5-super-vl-120b-a12b";

      if (!apiKey) {
        const kvCfg = await getKvValue("nvidia_cloud_config");
        if (kvCfg?.data?.api_key) {
          apiKey = kvCfg.data.api_key;
          baseUrl = kvCfg.data.base_url || baseUrl;
          primaryModel = kvCfg.data.primary_model || primaryModel;
          fallbackModel = kvCfg.data.fallback_model || fallbackModel;
        }
      }

      if (!apiKey) {
        return res.status(200).json({ success: false, reason: "no_config" });
      }

      const snippet =
        rawText.length > 32000
          ? rawText.slice(0, 16000) +
            "\n...[PHẦN GIỮA ĐỀ]...\n" +
            rawText.slice(Math.floor(rawText.length / 2) - 4000, Math.floor(rawText.length / 2) + 4000) +
            "\n...[PHẦN CUỐI ĐỀ & ĐÁP ÁN]...\n" +
            rawText.slice(-8000)
          : rawText;

      const sysPrompt = `Bạn là Hội đồng Thẩm định & Phân loại Học thuật Quốc gia (Chương trình GDPT 2018 - Bộ GD&ĐT Việt Nam).
Nhiệm vụ của bạn là đọc tên tệp và nội dung đề thi, thực hiện QUY TRÌNH TƯ DUY ĐỌC ĐỀ 6 BƯỚC và trả về DUY NHẤT 1 đối tượng JSON hợp lệ.

=====================================================================
QUY TRÌNH TƯ DUY ĐỌC ĐỀ 6 BƯỚC (BẮT BUỘC SUY LUẬN TRƯỚC KHI KẾT LUẬN)
=====================================================================
BƯỚC 1 — QUÉT TIÊU ĐỀ HÀNH CHÍNH (15-25 DÒNG ĐẦU TIÊN):
- Tìm cơ quan ban hành: "SỞ GD&ĐT ...", "PHÒNG GD&ĐT ...", "TRƯỜNG THPT ...", "TRƯỜNG THCS ...", "ĐẠI HỌC QUỐC GIA ...".
- Tìm tên kỳ thi chính thức: "ĐỀ THI THỬ TỐT NGHIỆP THPT", "ĐỀ KIỂM TRA GIỮA HỌC KỲ 1", "ĐỀ KIỂM TRA CUỐI HỌC KỲ 2", "KỲ THI TUYỂN SINH VÀO LỚP 10 THPT", "KỲ THI CHỌN HỌC SINH GIỎI".
- Tìm dòng khai báo môn thi & khối lớp: "MÔN: ...", "LỚP 12 / 11 / 10 / 9 / 8 / 7 / 6".

BƯỚC 2 — GIẢI BẪY NGỮ CẢNH PHỔ BIẾN (CỰC KỲ QUAN TRỌNG):
- BẪY 1 ("Trường THPT Chuyên" vs "Đề thi Chuyên/HSG"):
  + Nếu đầu đề ghi "TRƯỜNG THPT CHUYÊN ..." nhưng kỳ thi là "ĐỀ THI THỬ TỐT NGHIỆP THPT", "KHẢO SÁT CHẤT LƯỢNG", "ĐỀ KIỂM TRA GIỮA KỲ / HỌC KỲ" -> exam_type PHẢI LÀ "THI_THU_THPT" hoặc "KIEM_TRA_DINH_KY" (TUYỆT ĐỐI KHÔNG xếp vào "DE_CHUYEN_HSG").
  + Chỉ xếp "DE_CHUYEN_HSG" khi bản thân kỳ thi là "CHỌN HỌC SINH GIỎI", "TUYỂN SINH VÀO LỚP 10 CHUYÊN", "MÔN: ... (CHUYÊN)", hoặc "OLYMPIC".
- BẪY 2 ("Tuyển sinh vào lớp 10" vs "Lớp 10 THPT"):
  + Đề ghi "KỲ THI TUYỂN SINH VÀO LỚP 10 THPT", "THI VÀO LỚP 10", "ÔN THI VÀO 10" -> Đối tượng dự thi là HỌC SINH LỚP 9 (Cấp THCS). Do đó: estimated_level = "Khối 9 (Ôn Vào 10)", educational_level = "CAP_2", exam_type = "TUYEN_SINH_10".
- BẪY 3 ("Trường THPT Chuyên Khoa học Tự nhiên" vs "Môn Khoa học tự nhiên"):
  + "Trường THPT Chuyên Khoa học Tự nhiên (ĐHQGHN)" là TÊN TRƯỜNG CẤP 3. KHÔNG ĐƯỢC vì chữ "Khoa học Tự nhiên" trong tên trường mà gán nhầm môn "NATURAL_SCIENCE". Môn "NATURAL_SCIENCE" chỉ tồn tại ở Cấp 2 (Lớp 6, 7, 8, 9).
- BẪY 4 ("Ký hiệu Toán học trong đề Vật lí / Hóa học / Sinh học"):
  + Đề Vật lí (dao động điều hòa cos/sin, mạch điện, hạt nhân) và Hóa học (pH, tốc độ phản ứng, mol) chứa rất nhiều công thức. Phải ưu tiên dòng "MÔN: ..." ở tiêu đề và bản chất hiện tượng khoa học, KHÔNG gán nhầm sang Toán.

BƯỚC 3 — ĐỐI CHIẾU BẢN ĐỒ KIẾN THỨC CHƯƠNG TRÌNH GDPT 2018 (DÙNG KHI TIÊU ĐỀ KHUYẾT LỚP HOẶC MÔN):
1. MÔN TOÁN (MATHEMATICS):
   - Lớp 12: Khảo sát & đồ thị hàm số (cực trị, tiệm cận, đơn điệu), Nguyên hàm - Tích phân, Vectơ & Tọa độ Oxyz trong không gian, Xác suất có điều kiện (công thức Bayes).
   - Lớp 11: Lượng giác, Dãy số - Cấp số cộng - Cấp số nhân, Giới hạn - Hàm số liên tục, Hàm số mũ & Lôgarit, Đạo hàm, Quan hệ vuông góc trong không gian.
   - Lớp 10: Mệnh đề - Tập hợp, Bất phương trình bậc nhất hai ẩn, Hệ thức lượng trong tam giác, Vectơ mặt phẳng Oxy, Đại số tổ hợp (hoán vị, chỉnh hợp, tổ hợp, nhị thức Newton).
   - Lớp 9 (Ôn vào 10): Căn bậc hai - căn bậc ba, Hệ hai phương trình bậc nhất hai ẩn, Phương trình bậc hai & Định lý Vi-ét, Đường tròn & Tứ giác nội tiếp.
   - Lớp 8: Đa thức nhiều biến, Hằng đẳng thức đáng nhớ, Phân thức đại số, Định lý Thalès, Hình chóp tam giác đều / tứ giác đều.
   - Lớp 7: Số hữu tỉ, Số thực, Tỉ lệ thức & Dãy tỉ số bằng nhau, Hai tam giác bằng nhau.
   - Lớp 6: Tập hợp số tự nhiên, Số nguyên, Phân số, Số thập phân, ƯCLN & BCNN.
2. MÔN VẬT LÍ (PHYSICS - Cấp 3: Lớp 10-12):
   - Lớp 12: Vật lí nhiệt (nội năng, nhiệt nóng chảy, nhiệt hóa hơi), Khí lí tưởng (Boyle, Charles, pV=nRT), Từ trường (lực từ, cảm ứng từ, từ thông, dòng điện xoay chiều), Vật lí hạt nhân (độ hụt khối, phóng xạ, phản ứng hạt nhân).
   - Lớp 11: Dao động điều hòa (con lắc lò xo, con lắc đơn), Sóng cơ & Sóng điện từ, Giao thoa ánh sáng, Điện trường (định luật Coulomb, tụ điện), Dòng điện không đổi.
   - Lớp 10: Động học (chuyển động thẳng biến đổi đều, rơi tự do), Động lực học (3 định luật Newton), Năng lượng - Công - Công suất, Động lượng.
3. MÔN HÓA HỌC (CHEMISTRY - Cấp 3: Lớp 10-12):
   - Lớp 12: Ester - Lipid, Carbohydrate (Glucose, Fructose, Saccharose, Tinh bột, Cellulose), Hợp chất chứa Nitrogen (Amine, Amino acid, Peptide, Protein), Polymer, Pin điện & Điện phân, Đại cương Kim loại, Nguyên tố nhóm IA, IIA, Kim loại chuyển tiếp dãy thứ nhất & Phức chất.
   - Lớp 11: Cân bằng hóa học, pH, Nitrogen - Sulfur, Đại cương Hóa hữu cơ, Hydrocarbon (Alkane, Alkene, Alkyne, Arene), Dẫn xuất Halogen - Alcohol - Phenol, Hợp chất Carbonyl (Aldehyde, Ketone) - Carboxylic acid.
   - Lớp 10: Cấu tạo nguyên tử (orbital, cấu hình electron), Bảng tuần hoàn, Liên kết hóa học, Phản ứng oxi hóa - khử, Enthalpy (nhiệt phản ứng), Tốc độ phản ứng, Nhóm Halogen.
4. MÔN SINH HỌC (BIOLOGY - Cấp 3: Lớp 10-12):
   - Lớp 12: Di truyền phân tử (DNA, phiên mã, dịch mã, điều hòa biểu hiện gene - Operon Lac, đột biến gene), Di truyền nhiễm sắc thể (Quy luật Mendel, liên kết gene & hoán vị gene Morgan, di truyền giới tính), Di truyền quần thể (Hardy-Weinberg), Tiến hóa, Sinh thái học.
   - Lớp 11: Trao đổi chất và chuyển hóa năng lượng (quang hợp, hô hấp ở thực vật/động vật), Cảm ứng, Sinh trưởng và phát triển, Sinh sản.
   - Lớp 10: Thành phần hóa học của tế bào, Cấu trúc tế bào nhân sơ/nhân thực, Chu kỳ tế bào & Nguyên phân - Giảm phân, Vi sinh vật & Virus.
5. MÔN KHOA HỌC TỰ NHIÊN (NATURAL_SCIENCE - Chỉ Cấp 2: Lớp 6-9):
   - Tích hợp Lí - Hóa - Sinh ở THCS (Khối lượng riêng, Áp suất, Acid - Base - Oxide - Muối, Quang hợp, Điện từ, Năng lượng cơ học, Khúc xạ ánh sáng, Di truyền cơ bản).
6. MÔN LỊCH SỬ & ĐỊA LÍ:
   - Cấp 2 (Lớp 6-9): Môn tích hợp "Lịch sử và Địa lí" -> "HISTORY_GEOGRAPHY".
   - Cấp 3 (Lớp 10-12): Tách riêng Lịch sử -> "HISTORY", Địa lí -> "GEOGRAPHY".
7. MÔN GIÁO DỤC CÔNG DÂN / KINH TẾ & PHÁP LUẬT:
   - Cấp 2 (Lớp 6-9): Giáo dục công dân -> "CIVIC_EDUCATION".
   - Cấp 3 (Lớp 10-12): Giáo dục kinh tế và pháp luật -> "ECONOMIC_LEGAL_EDU".

BƯỚC 4 — KIỂM ĐỊNH CẤU TRÚC ĐỀ:
- Kiểm tra cấu trúc chuẩn Bộ GD&ĐT 2025 (Phần I Trắc nghiệm 4 lựa chọn, Phần II Trắc nghiệm Đúng/Sai a,b,c,d, Phần III Trả lời ngắn) và sự hiện diện của bảng đáp án / lời giải.

BƯỚC 5 — TỰ PHẢN BIỆN CHÉO:
- Lớp 10-12 KHÔNG BAO GIỜ có môn NATURAL_SCIENCE, HISTORY_GEOGRAPHY, CIVIC_EDUCATION.
- Lớp 6-9 KHÔNG BAO GIỜ có môn ECONOMIC_LEGAL_EDU.
- Trường THPT Chuyên nhưng thi thử tốt nghiệp / học kỳ -> KHÔNG BAO GIỜ là DE_CHUYEN_HSG.

BƯỚC 6 — XUẤT JSON CHUẨN XÁC:
- Trong trường verification_note: Viết 1 câu tiếng Việt tự nhiên xác nhận lý do phân loại (tuyệt đối KHÔNG nhắc chữ AI hay thuật ngữ kỹ thuật).

Trả về đúng 1 JSON:
{
  "subject": "MATHEMATICS | PHYSICS | CHEMISTRY | BIOLOGY | INFORMATICS | LITERATURE | ENGLISH | HISTORY | GEOGRAPHY | NATURAL_SCIENCE | HISTORY_GEOGRAPHY | CIVIC_EDUCATION | ECONOMIC_LEGAL_EDU | TECHNOLOGY | DEFENSE_SECURITY_EDU | GENERAL",
  "estimated_level": "Khối 12 (Ôn thi THPT) | Khối 11 | Khối 10 | Khối 9 (Ôn Vào 10) | Khối 8 | Khối 7 | Khối 6 | Khối THCS",
  "educational_level": "CAP_2 | CAP_3 | CHUNG",
  "exam_type": "THI_THU_THPT | KIEM_TRA_DINH_KY | TUYEN_SINH_10 | DE_CHUYEN_HSG | TAI_LIEU_ON_TAP",
  "school_or_department": "Tên Trường hoặc Sở GD&ĐT nếu có, hoặc null",
  "academic_year": "YYYY-YYYY nếu có, hoặc null",
  "confidence": 0.98,
  "verification_note": "1 câu xác nhận ngắn gọn bằng tiếng Việt"
}`;

      const userPrompt = `Tên tệp: ${fileName}\nNội dung đề:\n${snippet}\n\nChỉ trả về JSON:`;

      const postAuditWebResult = (parsed) => {
        if (!parsed || typeof parsed !== "object") return parsed;
        const headerNorm = `${fileName}\n${rawText.slice(0, 3500)}`.toLowerCase();
        // Rule 1: Tuyển sinh vào lớp 10 -> Lớp 9 (CAP_2, TUYEN_SINH_10)
        if (
          /(tuyển\s+sinh\s+(?:vào\s+)?lớp\s*10|thi\s+vào\s+lớp\s*10|ôn\s+thi\s+vào\s*(?:lớp\s*)?10)/i.test(headerNorm) &&
          !/(giữa\s+(?:học\s+)?k[ỳì]|cuối\s+(?:học\s+)?k[ỳì]|học\s+k[ỳì]\s*[12i]|khảo\s+sát\s+chất\s+lượng\s+lớp\s*10)/i.test(headerNorm)
        ) {
          parsed.estimated_level = "Khối 9 (Ôn Vào 10)";
          parsed.educational_level = "CAP_2";
          if (!/(chuyên|môn\s+chuyên|hệ\s+chuyên)/i.test(headerNorm)) {
            parsed.exam_type = "TUYEN_SINH_10";
          } else {
            parsed.exam_type = "DE_CHUYEN_HSG";
          }
        }
        // Rule 2: Trường THPT Chuyên nhưng thi thử tốt nghiệp / học kỳ / giữa kỳ -> không phải DE_CHUYEN_HSG
        const isRegularExam = /(thi\s+thử\s+tốt\s+nghiệp|tốt\s+nghiệp\s+thpt|giữa\s+(?:học\s+)?k[ỳì]|cuối\s+(?:học\s+)?k[ỳì]|kiểm\s+tra\s+học\s+k[ỳì]|khảo\s+sát\s+chất\s+lượng)/i.test(headerNorm);
        const isTrueHsg = /(học\s+sinh\s+giỏi|chọn\s+hsg|đội\s+tuyển|olympic|tuyển\s+sinh\s+vào\s+lớp\s*10\s+chuyên)/i.test(headerNorm);
        if (isRegularExam && !isTrueHsg && parsed.exam_type === "DE_CHUYEN_HSG") {
          parsed.exam_type = /tốt\s+nghiệp|thi\s+thử/i.test(headerNorm) ? "THI_THU_THPT" : "KIEM_TRA_DINH_KY";
        }
        // Rule 3: Đồng bộ môn học theo cấp học GDPT 2018
        const isCap2 = parsed.educational_level === "CAP_2" || /Khối [6789]|THCS/i.test(String(parsed.estimated_level || ""));
        const isCap3 = parsed.educational_level === "CAP_3" || /Khối 1[012]/i.test(String(parsed.estimated_level || ""));
        if (isCap2 && parsed.subject === "ECONOMIC_LEGAL_EDU") {
          parsed.subject = "CIVIC_EDUCATION";
        }
        if (isCap3 && parsed.subject === "CIVIC_EDUCATION") {
          parsed.subject = "ECONOMIC_LEGAL_EDU";
        }
        return parsed;
      };

      const modelChain = Array.from(
        new Set([
          primaryModel,
          fallbackModel,
          "nvidia/nemotron-3-ultra-550b-a55b",
          "nvidia/nemotron-3.5-super-vl-120b-a12b",
          "google/gemma-4-31b-it",
          "z-ai/glm-5.3-flash",
          "nvidia/nemotron-3.5-bolt-e4b",
        ].filter(Boolean))
      );

      for (const model of modelChain) {
        try {
          const isDeepReasoning =
            model.includes("ultra-550b") ||
            model.includes("glm-5.3") ||
            model.includes("deepseek");
          const reqPayload = {
            model,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: isDeepReasoning ? 16384 : 2048,
            temperature: 0.0,
            chat_template_kwargs: {
              thinking: isDeepReasoning,
              enable_thinking: isDeepReasoning,
            },
          };

          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 28000);
          const r = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(reqPayload),
            signal: controller.signal,
          });
          clearTimeout(tId);
          if (!r.ok) continue;
          const j = await r.json();
          const msg = j?.choices?.[0]?.message || {};
          const content = String(msg.content || msg.reasoning_content || "").trim();
          const allJsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          const jsonCandidate = allJsonMatches
            ? allJsonMatches[allJsonMatches.length - 1]
            : (content.match(/\{[\s\S]*\}/) || [])[0];
          if (jsonCandidate) {
            const parsed = postAuditWebResult(JSON.parse(jsonCandidate));
            if (parsed && parsed.subject) {
              if (globalThis._deepVerifyCache.size > 1500) {
                const firstKey = globalThis._deepVerifyCache.keys().next().value;
                globalThis._deepVerifyCache.delete(firstKey);
              }
              globalThis._deepVerifyCache.set(fpKey, parsed);
              return res.status(200).json({ success: true, verified: parsed });
            }
          }
        } catch {
          // Thử model tiếp theo
        }
      }
      return res.status(200).json({ success: false, reason: "timeout" });
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
