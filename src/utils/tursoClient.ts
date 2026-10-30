/**
 * utils/tursoClient.ts
 * Client kết nối trực tiếp Turso libSQL Cloud Database từ Trình duyệt (Browser).
 * 
 * Tối ưu hoàn hảo cho gói Turso Free:
 * - 5 GB Storage
 * - 10M Writes / tháng
 * - 500M Reads / tháng
 * - Zero CPU load cho VPS
 */

export const TURSO_DATABASE_URL = "https://daiviet-daiviet.aws-ap-northeast-1.turso.io";
export const TURSO_AUTH_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3MzI5NDQsImlkIjoiMDFhMTJiOTktYTEwMS03OGFlLWI1ZTItNWRjODQ2ZjZjZjQ3Iiwia2lkIjoiRHBfR2JDeW01a1VKNk9NUkR4aFE5akxxdFlXR1ZTUF81ZzhZQ0xkSmVfWSIsInJpZCI6IjU0MjdjMWE1LWU3MWEtNGMzZi1iNWUxLTgwZjYwZTM3NDZjZCJ9.OuOzXvRrslun1bxyS5BZ9lDOSR97yhViOWRktdLBLrLG1a9Jmf_QlpSK1WwsLgQydNFO7IQhCJKZoyAP6o7fDA";

interface TursoValue {
  type: "text" | "integer" | "float" | "null" | "blob";
  value?: string | number | null;
}

interface TursoRow {
  [key: string]: any;
}

/**
 * Thực thi câu lệnh SQL trên Turso qua HTTP v2 Pipeline
 */
export async function executeTurso(
  sql: string,
  args: (string | number | boolean | null | undefined)[] = []
): Promise<{ rows: TursoRow[]; affectedRows: number; lastInsertRowId?: number }> {
  const url = `${TURSO_DATABASE_URL}/v2/pipeline`;

  // Chuyển đổi tham số sang chuẩn Hrana v2 format
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

  const body = {
    requests: [
      {
        type: "execute",
        stmt: {
          sql,
          args: positionalArgs,
        },
      },
      { type: "close" },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TURSO_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Turso HTTP Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const execResult = data?.results?.[0]?.response?.result;

  if (!execResult) {
    if (data?.results?.[0]?.type === "error") {
      throw new Error(`Turso SQL Error: ${data.results[0].error?.message || "Unknown error"}`);
    }
    return { rows: [], affectedRows: 0 };
  }

  const cols: string[] = (execResult.cols || []).map((c: any) => c.name);
  const rows: TursoRow[] = (execResult.rows || []).map((rawRow: TursoValue[]) => {
    const rowObj: TursoRow = {};
    cols.forEach((colName, idx) => {
      const cell = rawRow[idx];
      if (!cell || cell.type === "null") {
        rowObj[colName] = null;
      } else if (cell.type === "integer") {
        rowObj[colName] = parseInt(cell.value as string, 10);
      } else if (cell.type === "float") {
        rowObj[colName] = typeof cell.value === "number" ? cell.value : parseFloat(cell.value as string);
      } else {
        rowObj[colName] = cell.value;
      }
    });
    return rowObj;
  });

  const lastId = execResult.last_insert_rowid ? parseInt(execResult.last_insert_rowid, 10) : undefined;
  return {
    rows,
    affectedRows: execResult.affected_row_count || 0,
    lastInsertRowId: lastId,
  };
}

/**
 * 1. Kiểm tra mã băm SHA-256 có trùng lặp trong kho Turso hay không (< 50ms)
 */
export async function checkHashExistsTurso(fileHash: string): Promise<{ exists: boolean; existingDoc?: any }> {
  try {
    const sql = `
      SELECT id, title, file_name, author_name, timestamp, jump_url 
      FROM documents_archive 
      WHERE file_hash = ? 
      LIMIT 1
    `;
    const res = await executeTurso(sql, [fileHash]);
    if (res.rows.length > 0) {
      return { exists: true, existingDoc: res.rows[0] };
    }
    return { exists: false };
  } catch (err) {
    console.warn("Lỗi kiểm tra trùng lặp trên Turso:", err);
    return { exists: false };
  }
}

/**
 * 2. Lưu trực tiếp đề thi vào Turso Cloud khi bot đang offline (Hàng đợi đệm)
 */
export async function saveDocumentToTurso(
  doc: {
    subject: string;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    fileType: string;
    estimatedLevel: string;
    questionCount: number;
    pageCount: number;
    authorId?: number;
    authorName?: string;
    fileHash: string;
    rawTextSnippet: string;
    academicYear?: string;
    schoolOrDepartment?: string;
    moet2025Compliant: boolean;
    moetPart1Count: number;
    moetPart2Count: number;
    moetPart3Count: number;
    hasAnswerKeys: boolean;
    hasDetailedSolutions: boolean;
    fileContentBase64?: string;
  },
  queueStatus: "pending_bot" | "synced_discord" = "pending_bot"
): Promise<number> {
  const nowIso = new Date().toISOString();
  const sql = `
    INSERT INTO documents_archive (
      subject, title, file_name, file_size_bytes, file_type,
      estimated_level, question_count, page_count, author_id,
      author_name, channel_id, message_id, jump_url, timestamp,
      file_hash, raw_text, notes, academic_year, school_or_department,
      verdict, exam_track, confidence, moet_2025_compliant,
      moet_part1_count, moet_part2_count, moet_part3_count,
      has_answer_keys, has_detailed_solutions, queue_status,
      client_pre_parsed, file_content_base64, created_via
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )
  `;

  const args = [
    doc.subject,
    doc.title,
    doc.fileName,
    doc.fileSizeBytes,
    doc.fileType,
    doc.estimatedLevel,
    doc.questionCount,
    doc.pageCount,
    doc.authorId || 0,
    doc.authorName || "Khách (Web)",
    0, // channel_id
    0, // message_id
    "https://orbit-psi-black.vercel.app/#vault",
    nowIso,
    doc.fileHash,
    doc.rawTextSnippet.slice(0, 50000),
    `[Pre-parsed by Client] ${doc.title}`,
    doc.academicYear || null,
    doc.schoolOrDepartment || null,
    "XAC_MINH",
    "THI_THU_THPT",
    0.95,
    doc.moet2025Compliant ? 1 : 0,
    doc.moetPart1Count,
    doc.moetPart2Count,
    doc.moetPart3Count,
    doc.hasAnswerKeys ? 1 : 0,
    doc.hasDetailedSolutions ? 1 : 0,
    queueStatus,
    1, // client_pre_parsed
    doc.fileContentBase64 || null,
    "web",
  ];

  const res = await executeTurso(sql, args);
  return res.lastInsertRowId || 0;
}

/**
 * 3. Đọc danh sách đề thi trực tiếp từ Turso Cloud (Phục vụ Web Vault khi bot tắt)
 */
export async function fetchDocsFromTurso(limit = 500, offset = 0): Promise<any[]> {
  const sql = `
    SELECT 
      id, subject, title, file_name, file_size_bytes, file_type,
      estimated_level, question_count, page_count, author_name,
      jump_url, timestamp, file_hash, notes, academic_year, school_or_department,
      verdict, exam_track, confidence,
      moet_2025_compliant, moet_part1_count, moet_part2_count, moet_part3_count,
      has_answer_keys, has_detailed_solutions, queue_status
    FROM documents_archive
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  const res = await executeTurso(sql, [limit, offset]);
  return res.rows.map((r) => ({
    ...r,
    moet_2025_compliant: Boolean(r.moet_2025_compliant),
    has_answer_keys: Boolean(r.has_answer_keys),
    has_detailed_solutions: Boolean(r.has_detailed_solutions),
  }));
}

export interface TursoStorageStats {
  totalDocs: number;
  totalBytes: number;
  pendingCount: number;
  syncedCount: number;
  limitBytes: number;
  usedPercent: number;
  formattedUsed: string;
  formattedLimit: string;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 4. Đo lường dung lượng sử dụng trên Turso Cloud (Chuẩn hạn mức 5 GB Free)
 */
export async function getTursoStorageUsage(): Promise<TursoStorageStats> {
  const FIVE_GB_BYTES = 5 * 1024 * 1024 * 1024; // 5,368,709,120 bytes
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_docs,
        COALESCE(SUM(file_size_bytes), 0) as total_bytes,
        COALESCE(SUM(CASE WHEN queue_status = 'pending_bot' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN queue_status = 'synced_discord' THEN 1 ELSE 0 END), 0) as synced_count
      FROM documents_archive
    `;
    const res = await executeTurso(sql);
    const row = res.rows[0] || {};
    const totalDocs = Number(row.total_docs || 0);
    const totalBytes = Number(row.total_bytes || 0);
    const pendingCount = Number(row.pending_count || 0);
    const syncedCount = Number(row.synced_count || 0);
    const usedPercent = Math.min(100, Math.max(0, (totalBytes / FIVE_GB_BYTES) * 100));

    return {
      totalDocs,
      totalBytes,
      pendingCount,
      syncedCount,
      limitBytes: FIVE_GB_BYTES,
      usedPercent: parseFloat(usedPercent.toFixed(2)),
      formattedUsed: formatBytes(totalBytes),
      formattedLimit: "5.00 GB",
    };
  } catch (err) {
    console.warn("Lỗi đọc dung lượng Turso:", err);
    return {
      totalDocs: 0,
      totalBytes: 0,
      pendingCount: 0,
      syncedCount: 0,
      limitBytes: FIVE_GB_BYTES,
      usedPercent: 0,
      formattedUsed: "0 B",
      formattedLimit: "5.00 GB",
    };
  }
}

// ============================================================================
// 5. ĐỒNG BỘ HỒ SƠ HỌC TẬP, CHUỖI NGÀY HỌC (STREAK) & BẢNG XẾP HẠNG TRÊN TURSO
// ============================================================================
export interface StudyProfileData {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  current_streak: number;
  max_streak: number;
  last_study_date: string;
  checked_in_today: boolean;
  study_xp: number;
  level: number;
  rank_title: string;
  next_xp: number;
  level_progress: number;
  pomodoro_count: number;
  study_minutes: number;
  exams_completed: number;
  docs_contributed: number;
  dream_school: string;
  dream_score: string;
  updated_at?: string;
}

export interface AcademicScholarEntry {
  rank: number;
  discord_id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  current_streak: number;
  max_streak: number;
  study_xp: number;
  level: number;
  rank_title: string;
  pomodoro_count: number;
  study_minutes: number;
  exams_completed: number;
  docs_contributed: number;
  dream_school: string;
  dream_score: string;
}

export function computeStudyRankClient(xp: number): {
  level: number;
  title: string;
  next_xp: number;
  progress: number;
} {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  if (safeXp >= 3000) {
    return { level: 6, title: '🌌 Huyền Thoại Orbit', next_xp: 5000, progress: Math.min(100, Math.floor((safeXp - 3000) / 20)) };
  }
  if (safeXp >= 1500) {
    return { level: 5, title: '👑 Thủ Khoa Khối', next_xp: 3000, progress: Math.floor(((safeXp - 1500) / 1500) * 100) };
  }
  if (safeXp >= 700) {
    return { level: 4, title: '🏅 Học Giả Tinh Anh', next_xp: 1500, progress: Math.floor(((safeXp - 700) / 800) * 100) };
  }
  if (safeXp >= 300) {
    return { level: 3, title: '⚡ Chiến Binh Luyện Đề', next_xp: 700, progress: Math.floor(((safeXp - 300) / 400) * 100) };
  }
  if (safeXp >= 100) {
    return { level: 2, title: '📘 Học Viên Chăm Chỉ', next_xp: 300, progress: Math.floor(((safeXp - 100) / 200) * 100) };
  }
  return { level: 1, title: '🌱 Tân Binh Orbit', next_xp: 100, progress: Math.floor((safeXp / 100) * 100) };
}

export function getVnDatesClient(): { todayStr: string; yesterdayStr: string } {
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 3600 * 1000);
  const vnYesterday = new Date(vnNow.getTime() - 24 * 3600 * 1000);
  return {
    todayStr: vnNow.toISOString().slice(0, 10),
    yesterdayStr: vnYesterday.toISOString().slice(0, 10),
  };
}

let _studyTableEnsured = false;
async function ensureStudyProfilesTableTurso(): Promise<void> {
  if (_studyTableEnsured) return;
  try {
    await executeTurso(`
      CREATE TABLE IF NOT EXISTS study_profiles (
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
      )
    `);
    _studyTableEnsured = true;
  } catch {
    // ignore
  }
}

export async function fetchStudyProfileTurso(
  discordId: string,
  username = '',
  displayName = '',
  avatarUrl = ''
): Promise<StudyProfileData | null> {
  try {
    await ensureStudyProfilesTableTurso();
    const { todayStr, yesterdayStr } = getVnDatesClient();
    const res = await executeTurso(
      `SELECT discord_id, username, display_name, avatar_url,
              current_streak, max_streak, last_study_date, study_xp,
              pomodoro_count, study_minutes, exams_completed, docs_contributed,
              dream_school, dream_score, updated_at
       FROM study_profiles
       WHERE CAST(discord_id AS TEXT) = ?
       LIMIT 1`,
      [String(discordId)]
    );

    const contribRes = await executeTurso(
      `SELECT COUNT(*) as cnt FROM documents_archive WHERE CAST(author_id AS TEXT) = ? OR LOWER(author_name) = LOWER(?)`,
      [String(discordId), username || displayName || '__none__']
    ).catch(() => ({ rows: [] }));
    const realContrib = Number(contribRes.rows[0]?.cnt || 0);

    if (res.rows.length === 0) {
      const initXp = realContrib * 50;
      const rankInfo = computeStudyRankClient(initXp);
      return {
        discord_id: String(discordId),
        username,
        display_name: displayName || username || 'Học viên Orbit',
        avatar_url: avatarUrl,
        current_streak: 0,
        max_streak: 0,
        last_study_date: '',
        checked_in_today: false,
        study_xp: initXp,
        level: rankInfo.level,
        rank_title: rankInfo.title,
        next_xp: rankInfo.next_xp,
        level_progress: rankInfo.progress,
        pomodoro_count: 0,
        study_minutes: 0,
        exams_completed: 0,
        docs_contributed: realContrib,
        dream_school: '',
        dream_score: '',
      };
    }

    const r = res.rows[0];
    const lastDate = String(r.last_study_date || '');
    const rawStreak = Number(r.current_streak || 0);
    const activeStreak = lastDate === todayStr || lastDate === yesterdayStr ? rawStreak : 0;
    const maxStreak = Math.max(Number(r.max_streak || 0), activeStreak);
    const docsContrib = Math.max(Number(r.docs_contributed || 0), realContrib);
    const xp = Math.max(Number(r.study_xp || 0), docsContrib * 50);
    const rankInfo = computeStudyRankClient(xp);

    return {
      discord_id: String(r.discord_id || discordId),
      username: String(r.username || username),
      display_name: String(r.display_name || displayName || username || 'Học viên Orbit'),
      avatar_url: String(r.avatar_url || avatarUrl),
      current_streak: activeStreak,
      max_streak: maxStreak,
      last_study_date: lastDate,
      checked_in_today: lastDate === todayStr,
      study_xp: xp,
      level: rankInfo.level,
      rank_title: rankInfo.title,
      next_xp: rankInfo.next_xp,
      level_progress: rankInfo.progress,
      pomodoro_count: Number(r.pomodoro_count || 0),
      study_minutes: Number(r.study_minutes || 0),
      exams_completed: Number(r.exams_completed || 0),
      docs_contributed: docsContrib,
      dream_school: String(r.dream_school || ''),
      dream_score: String(r.dream_score || ''),
      updated_at: String(r.updated_at || ''),
    };
  } catch (err) {
    console.warn('Lỗi đọc study_profiles từ Turso:', err);
    return null;
  }
}

export async function recordStudyCheckinTurso(params: {
  discordId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  action: 'daily_checkin' | 'pomodoro' | 'exam_complete' | 'update_dream';
  minutes?: number;
  dreamSchool?: string;
  dreamScore?: string;
}): Promise<{ profile: StudyProfileData; xpGained: number; streakIncremented: boolean } | null> {
  try {
    await ensureStudyProfilesTableTurso();
    const { todayStr, yesterdayStr } = getVnDatesClient();
    const current = await fetchStudyProfileTurso(
      params.discordId,
      params.username,
      params.displayName,
      params.avatarUrl
    );

    let curStreak = current?.current_streak || 0;
    let maxStreak = current?.max_streak || 0;
    let lastDate = current?.last_study_date || '';
    let studyXp = current?.study_xp || 0;
    let pomoCount = current?.pomodoro_count || 0;
    let studyMins = current?.study_minutes || 0;
    let examsDone = current?.exams_completed || 0;
    const docsContrib = current?.docs_contributed || 0;
    let dreamSchool = current?.dream_school || '';
    let dreamScore = current?.dream_score || '';

    let xpGained = 0;
    let streakIncremented = false;

    if (params.action === 'daily_checkin' || params.action === 'pomodoro' || params.action === 'exam_complete') {
      if (lastDate !== todayStr) {
        curStreak = lastDate === yesterdayStr ? curStreak + 1 : 1;
        maxStreak = Math.max(maxStreak, curStreak);
        lastDate = todayStr;
        xpGained += 50 + Math.min(curStreak * 5, 50);
        streakIncremented = true;
      }
    }

    if (params.action === 'pomodoro') {
      pomoCount += 1;
      studyMins += params.minutes && params.minutes > 0 ? params.minutes : 25;
      xpGained += 35;
    } else if (params.action === 'exam_complete') {
      examsDone += 1;
      studyMins += params.minutes && params.minutes > 0 ? params.minutes : 45;
      xpGained += 100;
    } else if (params.action === 'update_dream') {
      if (params.dreamSchool !== undefined) dreamSchool = params.dreamSchool;
      if (params.dreamScore !== undefined) dreamScore = params.dreamScore;
      if (dreamSchool && studyXp === 0) xpGained += 20;
    }

    studyXp += xpGained;
    const nowIso = new Date().toISOString();

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
        params.discordId,
        params.username || current?.username || '',
        params.displayName || current?.display_name || params.username || 'Học viên Orbit',
        params.avatarUrl || current?.avatar_url || '',
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

    const rankInfo = computeStudyRankClient(studyXp);
    return {
      xpGained,
      streakIncremented,
      profile: {
        discord_id: params.discordId,
        username: params.username || current?.username || '',
        display_name: params.displayName || current?.display_name || 'Học viên Orbit',
        avatar_url: params.avatarUrl || current?.avatar_url || '',
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
    };
  } catch (err) {
    console.warn('Lỗi ghi nhận study checkin lên Turso:', err);
    return null;
  }
}

export async function fetchAcademicLeaderboardTurso(): Promise<AcademicScholarEntry[]> {
  try {
    await ensureStudyProfilesTableTurso();
    const { todayStr, yesterdayStr } = getVnDatesClient();

    const [profRes, contribRes] = await Promise.all([
      executeTurso(
        `SELECT discord_id, username, display_name, avatar_url,
                current_streak, max_streak, last_study_date, study_xp,
                pomodoro_count, study_minutes, exams_completed, docs_contributed,
                dream_school, dream_score
         FROM study_profiles
         ORDER BY study_xp DESC, current_streak DESC
         LIMIT 30`
      ).catch(() => ({ rows: [] })),
      executeTurso(
        `SELECT author_name, MAX(author_id) as aid, COUNT(*) as cnt
         FROM documents_archive
         WHERE author_name IS NOT NULL AND author_name != ''
         GROUP BY author_name
         ORDER BY cnt DESC
         LIMIT 20`
      ).catch(() => ({ rows: [] })),
    ]);

    const map = new Map<string, AcademicScholarEntry>();

    for (const r of profRes.rows) {
      const idStr = String(r.discord_id || r.username || r.display_name);
      const lastDate = String(r.last_study_date || '');
      const activeStreak = lastDate === todayStr || lastDate === yesterdayStr ? Number(r.current_streak || 0) : 0;
      const maxS = Math.max(Number(r.max_streak || 0), activeStreak);
      const xp = Number(r.study_xp || 0);
      const rankInfo = computeStudyRankClient(xp);
      map.set(idStr, {
        rank: 0,
        discord_id: idStr,
        display_name: String(r.display_name || r.username || 'Học viên Orbit'),
        username: String(r.username || ''),
        avatar_url: String(r.avatar_url || ''),
        current_streak: activeStreak,
        max_streak: maxS,
        study_xp: xp,
        level: rankInfo.level,
        rank_title: rankInfo.title,
        pomodoro_count: Number(r.pomodoro_count || 0),
        study_minutes: Number(r.study_minutes || 0),
        exams_completed: Number(r.exams_completed || 0),
        docs_contributed: Number(r.docs_contributed || 0),
        dream_school: String(r.dream_school || ''),
        dream_score: String(r.dream_score || ''),
      });
    }

    for (const c of contribRes.rows) {
      const aname = String(c.author_name || 'Thành viên Orbit');
      const cnt = Number(c.cnt || 0);
      const aid = c.aid ? String(c.aid) : `contrib_${aname.toLowerCase()}`;
      const existing = map.get(aid) || Array.from(map.values()).find((x) => x.display_name.toLowerCase() === aname.toLowerCase());
      if (existing) {
        existing.docs_contributed = Math.max(existing.docs_contributed, cnt);
        existing.study_xp = Math.max(existing.study_xp, cnt * 50);
        const ri = computeStudyRankClient(existing.study_xp);
        existing.level = ri.level;
        existing.rank_title = ri.title;
      } else {
        const xp = cnt * 50;
        const ri = computeStudyRankClient(xp);
        map.set(aid, {
          rank: 0,
          discord_id: aid,
          display_name: aname,
          username: aname.toLowerCase().replace(/\s+/g, '_'),
          avatar_url: '',
          current_streak: 1,
          max_streak: 1,
          study_xp: xp,
          level: ri.level,
          rank_title: ri.title,
          pomodoro_count: 0,
          study_minutes: 0,
          exams_completed: 0,
          docs_contributed: cnt,
          dream_school: '',
          dream_score: '',
        });
      }
    }

    const list = Array.from(map.values()).sort(
      (a, b) => b.study_xp - a.study_xp || b.current_streak - a.current_streak || b.docs_contributed - a.docs_contributed
    );
    return list.slice(0, 25).map((item, idx) => ({ ...item, rank: idx + 1 }));
  } catch (err) {
    console.warn('Lỗi lấy bảng xếp hạng Turso:', err);
    return [];
  }
}

// ============================================================================
// 6. BÓC TÁCH NỘI DUNG VĂN BẢN & CÂU HỎI ĐỀ THI TRỰC TIẾP TỪ TURSO CLOUD
// ============================================================================
export interface ParsedExamQuestion {
  number: number;
  label: string;
  type: 'mcq' | 'true_false' | 'short_or_essay';
  stem: string;
  options: { key: string; text: string }[];
  statements: { key: string; text: string }[];
  answer_key?: string;
}

export function parseQuestionsFromRawTextClient(rawText: string): {
  questions: ParsedExamQuestion[];
  answer_keys: Record<string, string>;
} {
  if (!rawText || !rawText.trim()) {
    return { questions: [], answer_keys: {} };
  }
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const answer_keys: Record<string, string> = {};
  const tail = text.length > 600 ? text.slice(Math.floor(text.length * 0.55)) : text;
  const keyRegex = /\b(\d{1,3})\s*[.:\-–)\s]\s*([A-D])\b/g;
  let km: RegExpExecArray | null;
  while ((km = keyRegex.exec(tail)) !== null) {
    const qn = parseInt(km[1], 10);
    if (qn >= 1 && qn <= 120) {
      answer_keys[String(qn)] = km[2].toUpperCase();
    }
  }

  const lines = text.split('\n');
  const questions: ParsedExamQuestion[] = [];
  const seen = new Set<string>();
  let currentNum: string | null = null;
  let currentLines: string[] = [];

  const flushQuestion = () => {
    if (!currentNum || currentLines.length === 0) return;
    const body = currentLines.join('\n').trim();
    if (body.length < 4 || (seen.has(currentNum) && body.length < 35)) return;
    seen.add(currentNum);

    const optRegex = /(?:^|\s|\n)([A-D])\s*[.)]\s+([^\n]+)/g;
    const options: { key: string; text: string }[] = [];
    let firstOptIdx = -1;
    let om: RegExpExecArray | null;
    while ((om = optRegex.exec(body)) !== null) {
      if (firstOptIdx === -1) firstOptIdx = om.index;
      if (options.length < 4) {
        options.push({ key: om[1].toUpperCase(), text: om[2].trim() });
      }
    }

    let stem = firstOptIdx > 0 && options.length >= 2 ? body.slice(0, firstOptIdx).trim() : body;
    const statements: { key: string; text: string }[] = [];
    if (options.length < 2) {
      const stmtRegex = /(?:^|\n)\s*([a-d])\)\s+([^\n]+)/g;
      let firstStmtIdx = -1;
      let sm: RegExpExecArray | null;
      while ((sm = stmtRegex.exec(body)) !== null) {
        if (firstStmtIdx === -1) firstStmtIdx = sm.index;
        if (statements.length < 4) {
          statements.push({ key: sm[1].toLowerCase(), text: sm[2].trim() });
        }
      }
      if (firstStmtIdx > 0 && statements.length >= 2) {
        stem = body.slice(0, firstStmtIdx).trim();
      }
    }

    questions.push({
      number: parseInt(currentNum, 10),
      label: `Câu ${currentNum}`,
      type: options.length >= 2 ? 'mcq' : statements.length >= 2 ? 'true_false' : 'short_or_essay',
      stem: stem.slice(0, 1500),
      options: options.length >= 2 ? options : [],
      statements: statements.length >= 2 ? statements : [],
      answer_key: answer_keys[currentNum],
    });
  };

  const headRegex = /^\s*(?:Câu|Cau|Question|Bài|Bai)\s+(\d{1,3})\s*[.:)\-–]?\s*(.*)$/i;
  for (const line of lines) {
    const m = headRegex.exec(line);
    if (m) {
      flushQuestion();
      currentNum = m[1];
      currentLines = m[2] ? [m[2]] : [];
    } else if (currentNum) {
      currentLines.push(line);
    }
  }
  flushQuestion();

  return { questions: questions.slice(0, 80), answer_keys };
}

export async function fetchDocContentFromTurso(docId: number): Promise<{
  raw_text: string;
  notes: string;
  file_content_base64?: string | null;
  questions: ParsedExamQuestion[];
  answer_keys: Record<string, string>;
} | null> {
  try {
    const res = await executeTurso(
      `SELECT raw_text, notes, file_content_base64 FROM documents_archive WHERE id = ? LIMIT 1`,
      [docId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    const rawText = String(r.raw_text || '');
    const notes = String(r.notes || '');
    const parsed = parseQuestionsFromRawTextClient(rawText || notes);
    return {
      raw_text: rawText,
      notes,
      file_content_base64: r.file_content_base64 ? String(r.file_content_base64) : null,
      questions: parsed.questions,
      answer_keys: parsed.answer_keys,
    };
  } catch (err) {
    console.warn('Lỗi đọc nội dung đề thi từ Turso:', err);
    return null;
  }
}


