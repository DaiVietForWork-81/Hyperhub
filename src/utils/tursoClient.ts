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

