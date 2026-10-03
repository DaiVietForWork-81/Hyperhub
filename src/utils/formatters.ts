/**
 * utils/formatters.ts
 * Tiện ích chuẩn hóa và hiển thị dữ liệu học thuật trên giao diện HyperHub.
 * Hỗ trợ 5 thể loại đề thi: Đề thường, Đề HSG, Đề chuyên, Đề quốc tế, Đề chung
 * Thang độ khó: đề thường < đề hsg < đề chuyên.
 */

/**
 * Chuẩn hóa nhãn khối lớp hiển thị thân thiện:
 * "Không rõ khối (thuong) • [C++]" hoặc "Không rõ khối" -> "Chung ( chung cho tất cả khối )"
 */
export function formatEstimatedLevel(level?: string | null): string {
  if (!level || !level.trim()) return 'Chung ( chung cho tất cả khối )';
  const trimmed = level.trim();

  // Kiểm tra nếu là các dạng tài liệu chung / không thuộc riêng một khối nào
  if (
    trimmed.includes('Không rõ') ||
    trimmed.includes('Chưa rõ') ||
    trimmed.toLowerCase().startsWith('chung /') ||
    trimmed === 'Chung' ||
    trimmed === 'ALL'
  ) {
    return 'Chung ( chung cho tất cả khối )';
  }

  return trimmed;
}

/**
 * Chuẩn hóa dung lượng file sang KB/MB dễ đọc.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Không rõ';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export type ExamTrackTierKey = 'THUONG' | 'HSG' | 'CHUYEN' | 'QUOC_TE' | 'CHUNG';

export interface ExamTrackInfo {
  tier: ExamTrackTierKey;
  label: string;
  badgeClass: string;
  icon: string;
  difficultyNote: string;
  description: string;
}

/**
 * Phân loại chính xác 5 thể loại đề thi cho Web UI:
 * 1. Đề Thường   : Phổ thông, định kỳ, thi thử THPT (độ khó thấp nhất: thường < hsg < chuyên)
 * 2. Đề HSG      : Học sinh giỏi cấp trường/quận/huyện/tỉnh (độ khó trung gian: thường < hsg < chuyên)
 * 3. Đề Chuyên   : Vào 10 Chuyên, trường THPT Chuyên (độ khó cao nhất: thường < hsg < chuyên)
 * 4. Đề Quốc Tế  : Tham gia kỳ thi quốc tế (IMO, AMC, Kangaroo/IKMC, SASMO... cả tiếng Việt và Anh)
 * 5. Đề Chung    : Đề cương, lý thuyết tổng hợp, tài liệu chung chung (có thể gây hiểu lầm)
 */
export function getExamTrackInfo(doc: {
  estimated_level?: string | null;
  title?: string | null;
  file_name?: string | null;
}): ExamTrackInfo {
  const combined = `${doc.estimated_level || ''} ${doc.title || ''} ${doc.file_name || ''}`.toLowerCase();

  // 1. Đề Quốc Tế (kỳ thi quốc tế - cả tiếng Việt và tiếng Anh)
  const isQuocTe =
    combined.includes('quốc tế') ||
    combined.includes('quoc te') ||
    combined.includes('international') ||
    /\b(imo|ioi|ipho|icho|ibo|amc|aime|ikmc|kangaroo|sasmo|asmo|simoc|seamo|wmi|wmtc|hkimo|timo|sat|act|cambridge|a-level|alevel|ielts|toefl)\b/i.test(combined);

  if (isQuocTe) {
    return {
      tier: 'QUOC_TE',
      label: 'Đề Quốc Tế',
      badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      icon: '🌍',
      difficultyNote: 'Kỳ thi Quốc Tế',
      description: 'Tham gia các kỳ thi quốc tế (IMO, AMC, Kangaroo/IKMC, SASMO, TIMO, SAT... cả tiếng Việt & Anh)',
    };
  }

  // 2. Đề Chuyên (Độ khó cao nhất: đề thường < đề hsg < đề chuyên)
  const isChuyen =
    combined.includes('chuyên') ||
    combined.includes('chuyen') ||
    combined.includes('thpt chuyên') ||
    combined.includes('vào 10 chuyên') ||
    combined.includes('olympic') ||
    combined.includes('hsgqg') ||
    combined.includes('amsterdam');

  if (isChuyen) {
    return {
      tier: 'CHUYEN',
      label: 'Đề Chuyên',
      badgeClass: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30',
      icon: '👑',
      difficultyNote: 'Độ khó: Chuyên (Cao nhất)',
      description: 'Đề thi tuyển sinh vào lớp 10 Chuyên, THPT Chuyên (thường < hsg < chuyên)',
    };
  }

  // 3. Đề HSG (Cấp độ trung gian: đề thường < đề hsg < đề chuyên)
  const isHsg =
    combined.includes('học sinh giỏi') ||
    combined.includes('hoc sinh gioi') ||
    combined.includes('hsg');

  if (isHsg) {
    return {
      tier: 'HSG',
      label: 'Đề HSG',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      icon: '🏅',
      difficultyNote: 'Độ khó: HSG (Dễ hơn chuyên)',
      description: 'Đề thi chọn Học sinh giỏi cấp trường/quận/huyện/tỉnh (thường < hsg < chuyên)',
    };
  }

  // 4. Đề Chung (Tài liệu lý thuyết, đề cương ôn tập tổng hợp, chung chung có thể gây hiểu lầm)
  const isChung =
    combined.includes('chung cho tất cả khối') ||
    combined.includes('chung / chưa rõ lớp') ||
    combined.includes('phổ thông chung') ||
    combined.includes('đề chung') ||
    combined.includes('de chung') ||
    combined.includes('tổng hợp') ||
    combined.includes('đề cương') ||
    combined.includes('lý thuyết');

  if (isChung) {
    return {
      tier: 'CHUNG',
      label: 'Đề Chung',
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      icon: '📚',
      difficultyNote: 'Tài liệu / Đề chung',
      description: 'Tài liệu lý thuyết, đề cương ôn tập tổng hợp chung (dễ gây hiểu lầm nếu coi là đề thi cụ thể)',
    };
  }

  // 5. Đề Thường (Đại trà, phổ thông - độ khó thấp nhất: thường < hsg < chuyên)
  return {
    tier: 'THUONG',
    label: 'Đề Thường',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: '📘',
    difficultyNote: 'Độ khó: Thường (Cơ bản)',
    description: 'Đề thi đại trà, phổ thông, định kỳ, thi thử THPT (thường < hsg < chuyên)',
  };
}
