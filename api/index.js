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

    // 5. GET /api/documents/:id/download
    const dlMatch = pathname.match(/^\/api\/documents\/(\d+)\/download$/);
    if (dlMatch && req.method === "GET") {
      const docId = parseInt(dlMatch[1], 10);
      const resDoc = await executeTurso(
        "SELECT file_name, jump_url, file_content_base64 FROM documents_archive WHERE id = ? LIMIT 1",
        [docId]
      );
      const row = resDoc.rows[0];
      if (!row) {
        return res.status(404).json({ error: "Không tìm thấy đề thi này trong kho" });
      }
      if (row.file_content_base64) {
        const buf = Buffer.from(row.file_content_base64, "base64");
        const safeName = (row.file_name || `de_thi_${docId}.pdf`).replace(/["\r\n]/g, "");
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
        return res.status(200).send(buf);
      }
      if (row.jump_url && row.jump_url.startsWith("http")) {
        return res.redirect(302, row.jump_url);
      }
      return res.status(404).json({ error: "Không tìm thấy liên kết tải cho tệp này" });
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
