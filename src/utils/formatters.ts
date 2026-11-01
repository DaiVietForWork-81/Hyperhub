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
      badgeClass: 'bg-[#13242b] text-[#7dd3fc] border-[#1f3b47]',
      icon: '',
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
      badgeClass: 'bg-[#291524] text-[#ffb8e6] border-[#422039]',
      icon: '',
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
      badgeClass: 'bg-[#261f14] text-[#fcd34d] border-[#3d311e]',
      icon: '',
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
      badgeClass: 'bg-[#1a1921] text-[#b4b4b4] border-[#292733]',
      icon: '',
      difficultyNote: 'Tài liệu / Đề chung',
      description: 'Tài liệu lý thuyết, đề cương ôn tập tổng hợp chung (dễ gây hiểu lầm nếu coi là đề thi cụ thể)',
    };
  }

  // 5. Đề Thường (Đại trà, phổ thông - độ khó thấp nhất: thường < hsg < chuyên)
  return {
    tier: 'THUONG',
    label: 'Đề Thường',
    badgeClass: 'bg-[#15202b] text-[#93c5fd] border-[#213345]',
    icon: '',
    difficultyNote: 'Độ khó: Thường (Cơ bản)',
    description: 'Đề thi đại trà, phổ thông, định kỳ, thi thử THPT (thường < hsg < chuyên)',
  };
}

export interface GradeBadgeStyle {
  label: string;
  badgeClass: string;
  accentColor: string;
  dotColor: string;
}

/**
 * Lấy style badge và màu sắc đồng bộ với 7 Khối Lớp của Discord Server:
 */
export function getGradeBadgeStyle(level?: string | null): GradeBadgeStyle {
  const l = (level || '').toLowerCase();
  if (l.includes('12') || l.includes('lớp 12')) {
    return {
      label: 'Lớp 12',
      badgeClass: 'bg-[#29161a] text-[#fca5a5] border-[#402228]',
      accentColor: '#f87171',
      dotColor: 'bg-[#f87171]',
    };
  }
  if (l.includes('11') || l.includes('lớp 11')) {
    return {
      label: 'Lớp 11',
      badgeClass: 'bg-[#291c14] text-[#fdba74] border-[#402c1f]',
      accentColor: '#fb923c',
      dotColor: 'bg-[#fb923c]',
    };
  }
  if (l.includes('10') || l.includes('lớp 10')) {
    return {
      label: 'Lớp 10',
      badgeClass: 'bg-[#262014] text-[#fcd34d] border-[#3d331f]',
      accentColor: '#fbbf24',
      dotColor: 'bg-[#fbbf24]',
    };
  }
  if (l.includes('9') || l.includes('lớp 9')) {
    return {
      label: 'Lớp 9',
      badgeClass: 'bg-[#14261e] text-[#6ee7b7] border-[#1f3d30]',
      accentColor: '#34d399',
      dotColor: 'bg-[#34d399]',
    };
  }
  if (l.includes('8') || l.includes('lớp 8')) {
    return {
      label: 'Lớp 8',
      badgeClass: 'bg-[#142429] text-[#67e8f9] border-[#1f3940]',
      accentColor: '#22d3ee',
      dotColor: 'bg-[#22d3ee]',
    };
  }
  if (l.includes('7') || l.includes('lớp 7')) {
    return {
      label: 'Lớp 7',
      badgeClass: 'bg-[#15202b] text-[#93c5fd] border-[#213345]',
      accentColor: '#38bdf8',
      dotColor: 'bg-[#38bdf8]',
    };
  }
  if (l.includes('6') || l.includes('lớp 6')) {
    return {
      label: 'Lớp 6',
      badgeClass: 'bg-[#261624] text-[#f9a8d4] border-[#3d2239]',
      accentColor: '#f472b6',
      dotColor: 'bg-[#f472b6]',
    };
  }
  return {
    label: 'Chung (6–12)',
    badgeClass: 'bg-[#1a1921] text-[#b4b4b4] border-[#292733]',
    accentColor: '#94a3b8',
    dotColor: 'bg-[#94a3b8]',
  };
}
