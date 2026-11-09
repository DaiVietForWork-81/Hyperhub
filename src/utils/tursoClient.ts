/**
 * utils/tursoClient.ts
 * Lớp giao tiếp dữ liệu đám mây qua Cổng API Serverless (/api/*).
 *
 * BẢO MẬT (P0 Security Fix):
 * - Tuyệt đối KHÔNG nhúng TURSO_AUTH_TOKEN hay chạy SQL trực tiếp từ trình duyệt.
 * - Mọi truy vấn đọc/ghi đều đi qua Serverless Gateway (/api/*) có kiểm soát quyền và xác thực Discord Bearer Token.
 */

import { getApiBaseUrl, DEFAULT_VERCEL_URL, API_FETCH_HEADERS } from './apiConfig';
import { getDiscordAccessToken } from './discordAuth';

export const TURSO_DATABASE_URL = 'https://daiviet-daiviet.aws-ap-northeast-1.turso.io';
export const DISCORD_DATABASE_CHANNEL_ID = '1556682296235393034';

/**
 * Helper gọi API với cơ chế tự động fallback sang Vercel Gateway khi chạy dev local
 */
async function fetchCloudApi<T = any>(
  path: string,
  init?: RequestInit,
  timeoutMs = 8000
): Promise<T | null> {
  const base = getApiBaseUrl();
  const candidates = [base];
  if (base && !base.includes('orbit-psi-black.vercel.app')) {
    candidates.push(DEFAULT_VERCEL_URL);
  }

  for (const candidateBase of candidates) {
    try {
      const url = `${candidateBase.replace(/\/+$/, '')}${path}`;
      const res = await fetch(url, {
        ...init,
        headers: {
          ...API_FETCH_HEADERS,
          ...(init?.headers || {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Thử endpoint dự phòng tiếp theo
    }
  }
  return null;
}

/**
 * 1. Kiểm tra mã băm SHA-256 có trùng lặp trong kho hay không qua /api/documents/check_hash
 */
export async function checkHashExistsTurso(
  fileHash: string
): Promise<{ exists: boolean; existingDoc?: any }> {
  if (!fileHash || fileHash.length !== 64) {
    return { exists: false };
  }
  const data = await fetchCloudApi<{
    exists?: boolean;
    is_duplicate?: boolean;
    existingDoc?: any;
    doc_id?: number;
    title?: string;
  }>(`/api/documents/check_hash?hash=${encodeURIComponent(fileHash)}`);

  if (data && (data.exists || data.is_duplicate)) {
    return {
      exists: true,
      existingDoc: data.existingDoc || {
        id: data.doc_id,
        title: data.title,
      },
    };
  }
  return { exists: false };
}

/**
 * 2. Lưu đề thi đã kiểm định qua endpoint bảo mật POST /api/documents/submit
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
    authorId?: string | number;
    authorName?: string;
    authorAvatar?: string;
    notes?: string;
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
  queueStatus: 'pending_bot' | 'synced_discord' = 'pending_bot'
): Promise<number> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getDiscordAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const data = await fetchCloudApi<{ success?: boolean; id?: number }>(
    '/api/documents/submit',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...doc,
        queueStatus,
      }),
    },
    15000
  );

  return Number(data?.id || 0);
}

/**
 * 3. Đọc danh sách đề thi qua GET /api/documents (trần tối đa 100 bản ghi/lần chống DoS)
 */
export async function fetchDocsFromTurso(limit = 100, offset = 0): Promise<any[]> {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
  const data = await fetchCloudApi<{ documents?: any[]; items?: any[] }>(
    `/api/documents?limit=${encodeURIComponent(String(safeLimit))}&offset=${encodeURIComponent(String(offset))}`,
    undefined,
    10000
  );
  const list = data?.documents || data?.items || [];
  return list.map((r) => ({
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
 * 4. Đo lường dung lượng sử dụng qua GET /api/documents/stats
 */
export async function getTursoStorageUsage(): Promise<TursoStorageStats> {
  const data = await fetchCloudApi<{
    total_real?: number;
    total_items?: number;
    total_bytes?: number;
    pending_count?: number;
    synced_count?: number;
  }>('/api/documents/stats');

  if (!data) {
    return {
      totalDocs: 0,
      totalBytes: 0,
      pendingCount: 0,
      syncedCount: 0,
      limitBytes: Number.MAX_SAFE_INTEGER,
      usedPercent: 0,
      formattedUsed: '0 B',
      formattedLimit: '∞ Vô hạn',
    };
  }

  const totalDocs = Number(data.total_real ?? data.total_items ?? 0);
  const totalBytes = Number(data.total_bytes || 0);
  const pendingCount = Number(data.pending_count || 0);
  const syncedCount = Number(data.synced_count || totalDocs);

  return {
    totalDocs,
    totalBytes,
    pendingCount,
    syncedCount,
    limitBytes: Number.MAX_SAFE_INTEGER,
    usedPercent: 0,
    formattedUsed: formatBytes(totalBytes),
    formattedLimit: '∞ Vô hạn',
  };
}

// ============================================================================
// 5. HỒ SƠ HỌC TẬP, CHUỖI NGÀY HỌC (STREAK) & BẢNG XẾP HẠNG (ĐỒNG BỘ 7 BẬC)
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

/**
 * Thang 7 bậc Học Vị Orbit đồng nhất giữa Client & Server (/api/index.js)
 */
export function computeStudyRankClient(xp: number): {
  level: number;
  title: string;
  next_xp: number;
  progress: number;
} {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const tiers: [number, number, string, number][] = [
    [0, 1, '🌱 Tân Binh Orbit', 150],
    [150, 2, '📘 Học Viên Chăm Chỉ', 400],
    [400, 3, '⚡ Chiến Binh Luyện Đề', 800],
    [800, 4, '🔥 Học Giả Tinh Anh', 1500],
    [1500, 5, '🏅 Kiện Tướng Giải Đề', 2800],
    [2800, 6, '💎 Học Bá Toàn Năng', 5000],
    [5000, 7, '👑 Thủ Khoa Orbit', 10000],
  ];
  let cur = tiers[0];
  for (const t of tiers) {
    if (safeXp >= t[0]) cur = t;
    else break;
  }
  const [minXp, level, title, nextXp] = cur;
  const span = Math.max(1, nextXp - minXp);
  const progress = Math.min(100, Math.round(((safeXp - minXp) / span) * 100));
  return { level, title, next_xp: nextXp, progress };
}

export function getVnDatesClient(nowMs: number = Date.now()): {
  todayStr: string;
  yesterdayStr: string;
} {
  const vnNow = new Date(nowMs + 7 * 3600 * 1000);
  const vnYesterday = new Date(vnNow.getTime() - 24 * 3600 * 1000);
  return {
    todayStr: vnNow.toISOString().slice(0, 10),
    yesterdayStr: vnYesterday.toISOString().slice(0, 10),
  };
}

export async function fetchStudyProfileTurso(
  discordId: string,
  username = '',
  displayName = '',
  avatarUrl = ''
): Promise<StudyProfileData | null> {
  if (!discordId) return null;
  const q = new URLSearchParams({
    discord_id: discordId,
    username,
    display_name: displayName,
    avatar_url: avatarUrl,
  });
  const headers: Record<string, string> = {};
  const token = getDiscordAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const data = await fetchCloudApi<{ success?: boolean; profile?: StudyProfileData }>(
    `/api/study/profile?${q.toString()}`,
    { headers }
  );
  return data?.profile || null;
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
  const token = getDiscordAccessToken();

  // Nếu người dùng đã đăng nhập Discord (có Bearer Token), gọi thẳng API xác thực trên Server
  if (token && params.discordId && params.discordId !== 'local_scholar') {
    const data = await fetchCloudApi<{
      success?: boolean;
      xp_gained?: number;
      streak_incremented?: boolean;
      profile?: StudyProfileData;
    }>('/api/study/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        discord_id: params.discordId,
        username: params.username || '',
        display_name: params.displayName || '',
        avatar_url: params.avatarUrl || '',
        action: params.action,
        minutes: params.minutes || 0,
        dream_school: params.dreamSchool ?? '',
        dream_score: params.dreamScore ?? '',
      }),
    });

    if (data?.success && data.profile) {
      return {
        profile: data.profile,
        xpGained: Number(data.xp_gained || 0),
        streakIncremented: Boolean(data.streak_incremented),
      };
    }
  }

  // Fallback an toàn trên localStorage cho khách chưa liên kết Discord (không ghi bẩn vào DB chung)
  try {
    const { todayStr, yesterdayStr } = getVnDatesClient();
    const rawSaved =
      typeof localStorage !== 'undefined' ? localStorage.getItem('orbit_study_profile_v1') : null;
    const current: Partial<StudyProfileData> = rawSaved ? JSON.parse(rawSaved) : {};

    let curStreak = Number(current.current_streak || 0);
    let maxStreak = Number(current.max_streak || 0);
    let lastDate = String(current.last_study_date || '');
    let studyXp = Number(current.study_xp || 0);
    let pomoCount = Number(current.pomodoro_count || 0);
    let studyMins = Number(current.study_minutes || 0);
    let examsDone = Number(current.exams_completed || 0);
    const docsContrib = Number(current.docs_contributed || 0);
    let dreamSchool = String(current.dream_school || '');
    let dreamScore = String(current.dream_score || '');

    let xpGained = 0;
    let streakIncremented = false;

    if (
      params.action === 'daily_checkin' ||
      params.action === 'pomodoro' ||
      params.action === 'exam_complete'
    ) {
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
    const rankInfo = computeStudyRankClient(studyXp);
    const profile: StudyProfileData = {
      discord_id: params.discordId || 'local_scholar',
      username: params.username || current.username || 'HocSinhOrbit',
      display_name: params.displayName || current.display_name || 'Học viên Orbit',
      avatar_url: params.avatarUrl || current.avatar_url || '',
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
      updated_at: new Date().toISOString(),
    };
    return { profile, xpGained, streakIncremented };
  } catch {
    return null;
  }
}

export async function fetchAcademicLeaderboardTurso(): Promise<AcademicScholarEntry[]> {
  const data = await fetchCloudApi<{
    success?: boolean;
    leaderboard?: AcademicScholarEntry[];
  }>('/api/study/leaderboard?limit=25');
  return data?.leaderboard || [];
}

// ============================================================================
// 6. BÓC TÁCH NỘI DUNG VĂN BẢN, CÂU HỎI & CHẤM ĐIỂM CHUẨN BỘ GD&ĐT 2025
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

  // 1. Nhận diện đáp án trắc nghiệm 4 lựa chọn (Ví dụ: 1.A, 2: B, Câu 3. C)
  const keyRegex = /\b(\d{1,3})\s*[.:\-–)\s]\s*([A-D])\b/g;
  let km: RegExpExecArray | null;
  while ((km = keyRegex.exec(tail)) !== null) {
    const qn = parseInt(km[1], 10);
    if (qn >= 1 && qn <= 120) {
      answer_keys[String(qn)] = km[2].toUpperCase();
    }
  }

  // 2. Nhận diện đáp án Đúng/Sai chuẩn 2025 (Ví dụ: "Câu 1: Đ-S-Đ-S" hoặc "1. Đ S Đ Đ")
  const tfSeqRegex = /(?:Câu|Cau)?\s*(\d{1,2})\s*[.:\-–)]\s*([ĐDSFT])\s*[-–,\s]\s*([ĐDSFT])\s*[-–,\s]\s*([ĐDSFT])\s*[-–,\s]\s*([ĐDSFT])\b/gi;
  let tfm: RegExpExecArray | null;
  while ((tfm = tfSeqRegex.exec(tail)) !== null) {
    const qn = parseInt(tfm[1], 10);
    const subKeys = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 4; i++) {
      const ch = tfm[i + 2].toUpperCase();
      const isTrue = ch === 'Đ' || ch === 'D' || ch === 'T';
      answer_keys[`tf_${qn}_${subKeys[i]}`] = isTrue ? 'T' : 'F';
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
      type:
        options.length >= 2 ? 'mcq' : statements.length >= 2 ? 'true_false' : 'short_or_essay',
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
  const data = await fetchCloudApi<{
    success?: boolean;
    raw_text?: string;
    notes?: string;
    file_content_base64?: string | null;
    questions?: ParsedExamQuestion[];
    answer_keys?: Record<string, string>;
  }>(`/api/documents/${docId}/content`, undefined, 10000);

  if (!data) return null;
  const rawText = String(data.raw_text || '');
  const notes = String(data.notes || '');
  const fallbackParsed =
    Array.isArray(data.questions) && data.questions.length > 0
      ? { questions: data.questions, answer_keys: data.answer_keys || {} }
      : parseQuestionsFromRawTextClient(rawText || notes);

  return {
    raw_text: rawText,
    notes,
    file_content_base64: data.file_content_base64 || null,
    questions: fallbackParsed.questions,
    answer_keys: fallbackParsed.answer_keys,
  };
}

/**
 * 7. Gọi Gia Sư AI gợi ý tư duy (Hint) hoặc giải thích chi tiết (Explain) cho từng câu hỏi
 */
export async function requestAiTutorGuidance(params: {
  stem?: string;
  questionText?: string;
  subject?: string;
  mode: 'hint' | 'explain';
  options?: { key: string; text: string }[] | Record<string, string>;
  statements?: { key: string; text: string }[];
  answer_key?: string;
  userAnswer?: string;
  correctAnswer?: string;
}): Promise<{ guidance: string; response: string; source: string }> {
  const normalizedOptions = Array.isArray(params.options)
    ? params.options
    : params.options
    ? Object.entries(params.options).map(([key, text]) => ({ key, text }))
    : [];
  const payload = {
    ...params,
    stem: params.stem || params.questionText || '',
    options: normalizedOptions,
    answer_key: params.answer_key || params.correctAnswer || '',
  };
  const data = await fetchCloudApi<{
    success?: boolean;
    guidance?: string;
    response?: string;
    source?: string;
  }>(
    '/api/ai/tutor',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    16000
  );

  const text =
    data?.guidance ||
    data?.response ||
    'Hãy phân tích kỹ dữ kiện trọng tâm của câu hỏi và đối chiếu từng phương án loại trừ.';
  return {
    guidance: text,
    response: text,
    source: data?.source || 'cloud_ai',
  };
}
