import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  BookOpen,
  GraduationCap,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  LogOut,
  X,
  Download,
  Filter,
  UploadCloud,
  Dices,
  Star,
  Calendar,
  School,
  SlidersHorizontal,
  FileCheck,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken, getStoredDiscordUser } from '../utils/discordAuth';
import {
  getApiBaseUrl,
  API_FETCH_HEADERS,
  DEFAULT_TUNNEL_URL,
  setCustomApiUrl,
} from '../utils/apiConfig';
import { DocUploadZone } from './DocUploadZone';
// AdminPanel tải lười (lazy): người thường không bao giờ tải code admin
const AdminPanel = lazy(() =>
  import('./AdminPanel').then((m) => ({ default: m.AdminPanel }))
);
import { getExamTrackInfo, getGradeBadgeStyle } from '../utils/formatters';
import { getBookmarkedExamIds, toggleBookmarkExam } from '../utils/bookmarkStorage';
import { useToast } from '../context/ToastContext';
import { ExamDossierModal } from './ExamDossierModal';
import { CommandPalette } from './CommandPalette';
import { fetchDocsFromTurso, getTursoStorageUsage } from '../utils/tursoClient';

interface DashboardProps {
  user: DiscordUser | null;
  initialTab?: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin';
  onTabChange?: (tab: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin') => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onBackToHome: () => void;
}

interface BotStatus {
  online: boolean;
  bot_user?: string;
  ping_ms?: number;
  uptime_seconds?: number;
  guilds_count?: number;
}

export interface ExamDocument {
  id: number;
  subject: string;
  title: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  estimated_level: string;
  question_count: number;
  page_count: number;
  author_name: string;
  jump_url?: string;
  download_url?: string;
  timestamp: string;
  file_hash?: string;
  notes?: string;
  academic_year?: string;
  school_or_department?: string;
  verdict?: string | null;
  exam_track?: string | null;
  confidence?: number | null;
  moet_2025_compliant?: boolean;
  moet_part1_count?: number;
  moet_part2_count?: number;
  moet_part3_count?: number;
  has_answer_keys?: boolean;
  has_detailed_solutions?: boolean;
  is_duplicate?: boolean;
  is_duplicate_copy?: boolean;
  original_id?: number | null;
  duplicate_count?: number;
  educational_level?: 'CHUNG' | 'CAP_2' | 'CAP_3' | string;
}

// ============================================================================
// PHÂN LOẠI THEO 3 BẬC GIÁO DỤC: CHUNG, CẤP 2, CẤP 3
// ============================================================================
export type EducationLevel = 'ALL' | 'CAP_2' | 'CAP_3';

export const EDUCATION_LEVEL_OPTIONS: {
  id: EducationLevel;
  label: string;
  badge: string;
  icon: string;
  color: string;
  desc: string;
}[] = [
  {
    id: 'ALL',
    label: 'Chung',
    badge: 'Cả Cấp 2 & Cấp 3',
    icon: '🌐',
    color: '#8B5CF6',
    desc: 'Hiển thị gộp tất cả khối lớp (6 → 12) và toàn bộ môn học',
  },
  {
    id: 'CAP_2',
    label: 'Cấp 2',
    badge: 'THCS (Lớp 6 - 9)',
    icon: '🏫',
    color: '#10B981',
    desc: '9 môn học chính thức theo chương trình GDPT 2018',
  },
  {
    id: 'CAP_3',
    label: 'Cấp 3',
    badge: 'THPT (Lớp 10 - 12)',
    icon: '🎓',
    color: '#EF4444',
    desc: '8 môn bắt buộc + 7 môn tự chọn theo GDPT 2018',
  },
];

// Danh mục Khối Lớp cho chế độ Chung (Cả Cấp 2 & 3)
export const ALL_GRADE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Khối', subtitle: 'Tất cả lớp', color: '#8B5CF6' },
  { id: '12', label: 'Lớp 12', subtitle: 'Ôn TN & ĐH', color: '#EF4444' },
  { id: '11', label: 'Lớp 11', subtitle: 'THPT', color: '#F97316' },
  { id: '10', label: 'Lớp 10', subtitle: 'THPT', color: '#F59E0B' },
  { id: '9', label: 'Lớp 9', subtitle: 'Ôn Vào 10', color: '#10B981' },
  { id: '8', label: 'Lớp 8', subtitle: 'THCS', color: '#06B6D4' },
  { id: '7', label: 'Lớp 7', subtitle: 'THCS', color: '#3B82F6' },
  { id: '6', label: 'Lớp 6', subtitle: 'THCS', color: '#8B5CF6' },
];

// Danh mục Khối Lớp riêng cho Cấp 2 (THCS)
export const CAP2_GRADE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Khối Cấp 2', subtitle: 'Lớp 6 → 9', color: '#10B981' },
  { id: '9', label: 'Lớp 9', subtitle: 'Ôn Vào 10', color: '#10B981' },
  { id: '8', label: 'Lớp 8', subtitle: 'THCS', color: '#06B6D4' },
  { id: '7', label: 'Lớp 7', subtitle: 'THCS', color: '#3B82F6' },
  { id: '6', label: 'Lớp 6', subtitle: 'THCS', color: '#8B5CF6' },
];

// Danh mục Khối Lớp riêng cho Cấp 3 (THPT)
export const CAP3_GRADE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Khối Cấp 3', subtitle: 'Lớp 10 → 12', color: '#EF4444' },
  { id: '12', label: 'Lớp 12', subtitle: 'Ôn TN & ĐH', color: '#EF4444' },
  { id: '11', label: 'Lớp 11', subtitle: 'THPT', color: '#F97316' },
  { id: '10', label: 'Lớp 10', subtitle: 'THPT', color: '#F59E0B' },
];

// 5 Thể Loại Đề Thi Chuẩn (thường < hsg < chuyên)
const EXAM_TYPE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Thể Loại', badge: 'Tất cả ✨', icon: '✨', desc: 'Toàn bộ kho đề' },
  { id: 'THUONG', label: 'Đề Thường', badge: 'Cơ bản 📘', icon: '📘', desc: 'Đại trà, định kỳ, thi thử (thường < hsg < chuyên)' },
  { id: 'HSG', label: 'Đề HSG', badge: 'Nâng cao 🏅', icon: '🏅', desc: 'Học sinh giỏi cấp trường/tỉnh (thường < hsg < chuyên)' },
  { id: 'CHUYEN', label: 'Đề Chuyên', badge: 'Chuyên sâu 👑', icon: '👑', desc: 'Tuyển sinh 10 Chuyên, THPT Chuyên (cao nhất)' },
  { id: 'QUOC_TE', label: 'Đề Quốc Tế', badge: 'Quốc tế 🌍', icon: '🌍', desc: 'IMO, AMC, Kangaroo/IKMC, SASMO... (tiếng Việt & Anh)' },
  { id: 'CHUNG', label: 'Đề Chung', badge: 'Tổng hợp 📚', icon: '📚', desc: 'Đề cương, lý thuyết tổng hợp (dễ gây hiểu lầm)' },
];

// ============================================================================
// DANH MỤC MÔN HỌC THEO TỪNG CẤP (CHUẨN CHƯƠNG TRÌNH GDPT 2018)
// ============================================================================

// CẤP 2 (THCS): ĐÚNG 9 MÔN THEO YÊU CẦU
export const CAP2_SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Môn Cấp 2', icon: '🌐' },
  { id: 'LITERATURE', label: 'Ngữ văn', icon: '📖' },
  { id: 'MATHEMATICS', label: 'Toán', icon: '📐' },
  { id: 'ENGLISH', label: 'Ngoại ngữ 1', icon: '🇬🇧' },
  { id: 'CIVIC_EDUCATION', label: 'Giáo dục công dân', icon: '⚖️' },
  { id: 'HISTORY_GEOGRAPHY', label: 'Lịch sử và Địa lý', icon: '🗺️' },
  { id: 'NATURAL_SCIENCE', label: 'Khoa học tự nhiên', icon: '🔬' },
  { id: 'TECHNOLOGY', label: 'Công nghệ', icon: '⚙️' },
  { id: 'INFORMATICS', label: 'Tin học', icon: '💻' },
  { id: 'PHYSICAL_EDUCATION', label: 'Giáo dục thể chất', icon: '🏃' },
];

// CẤP 3 (THPT): 8 MÔN BẮT BUỘC THEO YÊU CẦU
export const CAP3_MANDATORY_SUBJECTS = [
  { id: 'LITERATURE', label: 'Ngữ văn', icon: '📖', group: 'mandatory' },
  { id: 'MATHEMATICS', label: 'Toán', icon: '📐', group: 'mandatory' },
  { id: 'ENGLISH', label: 'Ngoại ngữ 1', icon: '🇬🇧', group: 'mandatory' },
  { id: 'HISTORY', label: 'Lịch sử', icon: '🏛️', group: 'mandatory' },
  { id: 'PHYSICAL_EDUCATION', label: 'Giáo dục thể chất', icon: '🏃', group: 'mandatory' },
  { id: 'DEFENSE_SECURITY_EDU', label: 'Giáo dục quốc phòng và an ninh', icon: '🛡️', group: 'mandatory' },
  { id: 'EXPERIENTIAL_CAREER_ACT', label: 'Hoạt động trải nghiệm, hướng nghiệp', icon: '🧭', group: 'mandatory' },
  { id: 'LOCAL_EDUCATION', label: 'Nội dung giáo dục của địa phương', icon: '🏘️', group: 'mandatory' },
];

// CẤP 3 (THPT): 7 MÔN TỰ CHỌN THEO YÊU CẦU
export const CAP3_ELECTIVE_SUBJECTS = [
  { id: 'GEOGRAPHY', label: 'Địa lí', icon: '🗺️', group: 'elective' },
  { id: 'ECONOMIC_LEGAL_EDU', label: 'Giáo dục kinh tế và pháp luật', icon: '⚖️', group: 'elective' },
  { id: 'PHYSICS', label: 'Vật lí', icon: '⚡', group: 'elective' },
  { id: 'CHEMISTRY', label: 'Hóa học', icon: '🧪', group: 'elective' },
  { id: 'BIOLOGY', label: 'Sinh học', icon: '🧬', group: 'elective' },
  { id: 'TECHNOLOGY', label: 'Công nghệ', icon: '⚙️', group: 'elective' },
  { id: 'INFORMATICS', label: 'Tin học', icon: '💻', group: 'elective' },
];

export const CAP3_SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Môn Cấp 3', icon: '🌐' },
  ...CAP3_MANDATORY_SUBJECTS,
  ...CAP3_ELECTIVE_SUBJECTS,
];

// CHẾ ĐỘ CHUNG: TỔNG HỢP CẢ 2 CẤP
export const ALL_SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Các Môn', icon: '🌐' },
  { id: 'MATHEMATICS', label: 'Toán', icon: '📐' },
  { id: 'LITERATURE', label: 'Ngữ văn', icon: '📖' },
  { id: 'ENGLISH', label: 'Ngoại ngữ 1', icon: '🇬🇧' },
  { id: 'INFORMATICS', label: 'Tin học', icon: '💻' },
  { id: 'TECHNOLOGY', label: 'Công nghệ', icon: '⚙️' },
  { id: 'PHYSICAL_EDUCATION', label: 'Giáo dục thể chất', icon: '🏃' },
  { id: 'NATURAL_SCIENCE', label: 'Khoa học tự nhiên (Cấp 2)', icon: '🔬' },
  { id: 'HISTORY_GEOGRAPHY', label: 'Lịch sử và Địa lý (Cấp 2)', icon: '🗺️' },
  { id: 'CIVIC_EDUCATION', label: 'Giáo dục công dân (Cấp 2)', icon: '⚖️' },
  { id: 'PHYSICS', label: 'Vật lí (Cấp 3)', icon: '⚡' },
  { id: 'CHEMISTRY', label: 'Hóa học (Cấp 3)', icon: '🧪' },
  { id: 'BIOLOGY', label: 'Sinh học (Cấp 3)', icon: '🧬' },
  { id: 'HISTORY', label: 'Lịch sử (Cấp 3)', icon: '🏛️' },
  { id: 'GEOGRAPHY', label: 'Địa lí (Cấp 3)', icon: '🗺️' },
  { id: 'ECONOMIC_LEGAL_EDU', label: 'Giáo dục kinh tế & pháp luật (Cấp 3)', icon: '⚖️' },
  { id: 'DEFENSE_SECURITY_EDU', label: 'GD Quốc phòng & An ninh (Cấp 3)', icon: '🛡️' },
  { id: 'EXPERIENTIAL_CAREER_ACT', label: 'HĐ trải nghiệm, hướng nghiệp (Cấp 3)', icon: '🧭' },
  { id: 'LOCAL_EDUCATION', label: 'Nội dung GD địa phương (Cấp 3)', icon: '🏘️' },
];

// ============================================================================
// HÀM HELPER XÁC ĐỊNH BẬC GIÁO DỤC CỦA ĐỀ THI
// ============================================================================
export function getDocumentEducationLevel(doc: {
  estimated_level?: string;
  subject?: string;
  educational_level?: string;
}): 'CAP_2' | 'CAP_3' | 'CHUNG' {
  if (doc.educational_level === 'CAP_2') return 'CAP_2';
  if (doc.educational_level === 'CAP_3') return 'CAP_3';

  const level = (doc.estimated_level || '').toLowerCase();
  const subj = (doc.subject || '').toUpperCase();

  // 1. Phân loại theo Khối lớp
  if (
    /(?:lớp|khối|\b)\s*(?:[6-9])\b/i.test(level) ||
    /k[6-9]\b|[6-9]th\b|thcs|vào\s*10/i.test(level)
  ) {
    return 'CAP_2';
  }
  if (
    /(?:lớp|khối|\b)\s*(?:10|11|12)\b/i.test(level) ||
    /k(?:10|11|12)\b|(?:10|11|12)th\b|thpt|đại\s*học|tốt\s*nghiệp/i.test(level)
  ) {
    return 'CAP_3';
  }

  // 2. Phân loại theo Môn học đặc thù
  // Môn đặc thù Cấp 2: KHTN, Lịch sử và Địa lý, GDCD
  if (
    subj.includes('NATURAL_SCIENCE') ||
    subj.includes('KHTN') ||
    subj.includes('HISTORY_GEOGRAPHY') ||
    subj.includes('LS_DL') ||
    subj.includes('CIVIC_EDUCATION') ||
    subj.includes('GDCD')
  ) {
    return 'CAP_2';
  }

  // Môn đặc thù Cấp 3: Vật lí, Hóa học, Sinh học, GDQP-AN, GDKT&PL, HĐTN-HN, GDĐP
  if (
    subj.includes('PHYSICS') ||
    subj.includes('VAT_LY') ||
    subj.includes('CHEMISTRY') ||
    subj.includes('HOA_HOC') ||
    subj.includes('BIOLOGY') ||
    subj.includes('SINH_HOC') ||
    subj.includes('ECONOMIC_LEGAL_EDU') ||
    subj.includes('GDKT') ||
    subj.includes('DEFENSE_SECURITY_EDU') ||
    subj.includes('GDQP') ||
    subj.includes('EXPERIENTIAL_CAREER_ACT') ||
    subj.includes('HDTN') ||
    subj.includes('LOCAL_EDUCATION') ||
    subj.includes('GDDP')
  ) {
    return 'CAP_3';
  }

  return 'CHUNG';
}

// Khớp nối linh hoạt giữa mã môn và môn thực tế của tài liệu
export function isDocMatchingSubject(docSubject: string, filterSubjectId: string): boolean {
  if (filterSubjectId === 'ALL') return true;
  const s = (docSubject || '').toUpperCase();
  const fid = filterSubjectId.toUpperCase();

  switch (fid) {
    case 'MATHEMATICS':
      return s.includes('TOAN') || s.includes('MATH');
    case 'LITERATURE':
      return s.includes('VAN') || s.includes('LIT') || s.includes('NGU_VAN');
    case 'ENGLISH':
      return s.includes('ENG') || s.includes('ANH') || s.includes('NGOAI_NGU');
    case 'INFORMATICS':
      return s.includes('INFO') || s.includes('TIN');
    case 'PHYSICS':
      return s.includes('PHYS') || s.includes('LY') || s.includes('VAT_LY');
    case 'CHEMISTRY':
      return s.includes('CHEM') || s.includes('HOA');
    case 'BIOLOGY':
      return s.includes('BIO') || s.includes('SINH');
    case 'HISTORY':
      return (s.includes('HIST') || s.includes('SU')) && !s.includes('GEO') && !s.includes('DIA');
    case 'GEOGRAPHY':
      return (s.includes('GEO') || s.includes('DIA')) && !s.includes('HIST') && !s.includes('SU');
    case 'CIVIC_EDUCATION':
      return s.includes('CIVIC') || s.includes('GDCD') || s.includes('CONG_DAN');
    case 'ECONOMIC_LEGAL_EDU':
      return s.includes('GDKT') || s.includes('KINH_TE') || s.includes('PHAP_LUAT') || s.includes('ECONOMIC');
    case 'NATURAL_SCIENCE':
      return s.includes('NATURAL') || s.includes('KHTN') || s.includes('TU_NHIEN');
    case 'HISTORY_GEOGRAPHY':
      return s.includes('HISTORY_GEOGRAPHY') || s.includes('LS_DL') || (s.includes('SU') && s.includes('DIA'));
    case 'TECHNOLOGY':
      return s.includes('TECH') || s.includes('CONG_NGHE');
    case 'PHYSICAL_EDUCATION':
      return s.includes('THE_CHAT') || s.includes('GDTC') || s.includes('PHYSICAL') || s.includes('THE_DUC');
    case 'DEFENSE_SECURITY_EDU':
      return s.includes('DEFENSE') || s.includes('GDQP') || s.includes('QUOC_PHONG') || s.includes('AN_NINH');
    case 'EXPERIENTIAL_CAREER_ACT':
      return s.includes('EXPERIENTIAL') || s.includes('HDTN') || s.includes('TRAI_NGHIEM') || s.includes('HUONG_NGHIEP');
    case 'LOCAL_EDUCATION':
      return s.includes('LOCAL') || s.includes('GDDP') || s.includes('DIA_PHUONG');
    default:
      return s === fid;
  }
}

// Lấy style & nhãn badge Cấp Học
export function getEducationLevelBadgeInfo(doc: { estimated_level?: string; subject?: string; educational_level?: string }) {
  const lvl = getDocumentEducationLevel(doc);
  if (lvl === 'CAP_2') {
    return {
      id: 'CAP_2',
      label: 'Cấp 2 (THCS)',
      shortLabel: 'Cấp 2',
      icon: '🏫',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
    };
  }
  if (lvl === 'CAP_3') {
    return {
      id: 'CAP_3',
      label: 'Cấp 3 (THPT)',
      shortLabel: 'Cấp 3',
      icon: '🎓',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      dotColor: 'bg-purple-500',
    };
  }
  return {
    id: 'CHUNG',
    label: 'Chung (Cả 2 cấp)',
    shortLabel: 'Chung',
    icon: '🌐',
    badgeClass: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/15',
    dotColor: 'bg-slate-400',
  };
}

// Gợi ý từ khóa nhanh
const QUICK_KEYWORD_TAGS = [
  'Đề thi thử 2025',
  'Có đáp án chi tiết',
  'Hàm số mũ & Logarit',
  'Quy hoạch động',
  'Word formation',
  'Hình học không gian',
  'Bất đẳng thức',
  'Đọc hiểu & Nghị luận',
  'Chuyên Tin C++',
];

// Hàm làm sạch URL bên ngoài, chống JavaScript URI scheme (javascript: / data:)
const getSafeExternalUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return '';
};

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  initialTab,
  onTabChange,
  onOpenAuthModal,
  onLogout,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin'>(
    initialTab || 'overview'
  );
  const { showSuccess, showInfo, showError } = useToast();

  const handleTabChange = useCallback(
    (tab: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin') => {
      setActiveTab(tab);
      onTabChange?.(tab);
    },
    [onTabChange]
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Đồng bộ URL với tab Admin để có link trực tiếp /admin chia sẻ được
  useEffect(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      if (activeTab === 'admin' && path !== '/admin') {
        window.history.replaceState(null, '', '/admin');
      } else if (activeTab !== 'admin' && path === '/admin') {
        window.history.replaceState(null, '', '/hub');
      }
    } catch {
      /* bỏ qua khi không có window */
    }
  }, [activeTab]);

  // Quyền Quản trị viên (Admin)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminInfo, setAdminInfo] = useState<{
    role_name?: string;
    username?: string;
    user_id?: number | string;
  } | null>(null);
  const [hasSystemUpdate, setHasSystemUpdate] = useState<boolean>(false);

  // Cache quyền admin theo user (dùng khi backend chết vẫn nhận diện admin để mở Hub)
  const readCachedAdmin = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem('hyperhub_admin_cache');
      if (!raw) return false;
      const cached = JSON.parse(raw) as { userId?: string; isAdmin?: boolean; at?: number };
      const stored = getStoredDiscordUser();
      if (!stored || !cached.isAdmin || cached.userId !== stored.id) return false;
      if (Date.now() - (cached.at || 0) > 7 * 24 * 3600 * 1000) return false;
      return true;
    } catch {
      return false;
    }
  }, []);

  const writeCachedAdmin = useCallback((isAdminValue: boolean) => {
    try {
      const stored = getStoredDiscordUser();
      if (!stored) {
        localStorage.removeItem('hyperhub_admin_cache');
        return;
      }
      localStorage.setItem(
        'hyperhub_admin_cache',
        JSON.stringify({ userId: stored.id, isAdmin: isAdminValue, at: Date.now() })
      );
    } catch {
      /* bỏ qua */
    }
  }, []);

  const checkAdminStatus = useCallback(async () => {    // Gọi tối đa 2 lần khi timeout/lỗi 5xx (ngrok lạnh) để không mất oan quyền Admin
    let confirmed = false;
    for (let attempt = 0; attempt < 2 && !confirmed; attempt++) {
      try {
        const apiBase = getApiBaseUrl();
        const token = getDiscordAccessToken();
        const headers: Record<string, string> = { ...API_FETCH_HEADERS };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${apiBase}/api/admin/check`, {
          headers,
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.is_admin) {
            setIsAdmin(true);
            setAdminInfo(data.admin || null);
            writeCachedAdmin(true);
            confirmed = true;
            // Kiểm tra trạng thái cập nhật hệ thống
            try {
              const updRes = await fetch(`${apiBase}/api/system/update_status`, {
                headers,
                signal: AbortSignal.timeout(6000),
              });
              if (updRes.ok) {
                const updData = await updRes.json();
                setHasSystemUpdate(!!updData.has_update);
              }
            } catch {
              // Bỏ qua nếu lỗi
            }
          } else {
            writeCachedAdmin(false);
          }
          break; // server đã trả lời → không thử lại
        }
        if (res.status < 500) break; // lỗi 4xx thật → không thử lại
      } catch {
        // timeout/lỗi mạng → vòng lặp tự thử lại 1 lần
      }
    }
    if (!confirmed) {
      setIsAdmin(false);
      setAdminInfo(null);
    }
  }, [writeCachedAdmin]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus, user]);

  const [botStatus, setBotStatus] = useState<BotStatus>({ online: false });

  // Tính năng Bookmark / Lưu tài liệu yêu thích
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => new Set(getBookmarkedExamIds()));

  useEffect(() => {
    const handleBookmarkChange = () => {
      setBookmarkedIds(new Set(getBookmarkedExamIds()));
    };
    window.addEventListener('hyperhub_bookmark_changed', handleBookmarkChange);
    return () => window.removeEventListener('hyperhub_bookmark_changed', handleBookmarkChange);
  }, []);

  // Form Lọc & Tìm Kiếm Đề Thi (Mặc định ALL để hiển thị danh sách đầy đủ)
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<EducationLevel>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedExamType, setSelectedExamType] = useState<string>('ALL');
  const [descriptionKeyword, setDescriptionKeyword] = useState<string>('');

  // BỘ LỌC ĐỀ NÂNG CAO (NĂM HỌC, TRƯỜNG/SỞ RA ĐỀ, CHUẨN 2025, ĐÁP ÁN & LỜI GIẢI)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('ALL');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [filterMoet2025, setFilterMoet2025] = useState<boolean>(false);
  const [filterHasAnswers, setFilterHasAnswers] = useState<boolean>(false);
  const [filterHasSolutions, setFilterHasSolutions] = useState<boolean>(false);
  const [filterHasDiscordLink, setFilterHasDiscordLink] = useState<boolean>(false);

  // Danh Sách Đề Thi Trong Kho (Full Catalog List)
  const [documentsList, setDocumentsList] = useState<ExamDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [totalDocsCount, setTotalDocsCount] = useState<number>(178);
  const [stats, setStats] = useState<{
    total_real: number;
    unique_items: number;
    duplicate_items: number;
  }>({ total_real: 178, unique_items: 178, duplicate_items: 0 });
  const [filterDup, setFilterDup] = useState<'all' | 'unique' | 'duplicate'>('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'pages' | 'size' | 'confidence'>('newest');
  // Phân trang & Tối ưu Render danh sách đề (Mặc định 24 đề/trang, chống nghẽn DOM)
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Modal Hồ Sơ Chi Tiết & Command Palette
  const [selectedDossierDoc, setSelectedDossierDoc] = useState<ExamDocument | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Phím tắt toàn cục Ctrl+K hoặc Cmd+K để mở thanh tìm kiếm siêu tốc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Danh sách các Năm Học trích xuất động từ CSDL
  const availableAcademicYears = useMemo(() => {
    const yearCounts: Record<string, number> = {};
    documentsList.forEach((d) => {
      let y = d.academic_year?.trim();
      if (!y) {
        const m = (d.title + ' ' + d.file_name).match(/(?:20\d{2}\s*[-–—]\s*20\d{2})|(?:20\d{2})/);
        if (m) y = m[0].replace(/\s+/g, '');
      }
      if (y && y.length >= 4) {
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });
    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [documentsList]);

  // Danh sách các Trường / Sở GD&ĐT trích xuất động từ CSDL
  const availableSchools = useMemo(() => {
    const schoolCounts: Record<string, number> = {};
    documentsList.forEach((d) => {
      const s = d.school_or_department?.trim();
      if (s && s.length >= 2) {
        schoolCounts[s] = (schoolCounts[s] || 0) + 1;
      }
    });
    return Object.entries(schoolCounts)
      .map(([school, count]) => ({ school, count }))
      .sort((a, b) => b.count - a.count);
  }, [documentsList]);

  // Đếm tổng số bộ lọc nâng cao đang bật
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedAcademicYear !== 'ALL') count++;
    if (selectedSchool !== 'ALL') count++;
    if (filterMoet2025) count++;
    if (filterHasAnswers) count++;
    if (filterHasSolutions) count++;
    if (filterHasDiscordLink) count++;
    return count;
  }, [
    selectedAcademicYear,
    selectedSchool,
    filterMoet2025,
    filterHasAnswers,
    filterHasSolutions,
    filterHasDiscordLink,
  ]);

  // Đặt lại toàn bộ bộ lọc
  const handleResetAllFilters = useCallback(() => {
    setShowBookmarksOnly(false);
    setSelectedEducationLevel('ALL');
    setSelectedGrade('ALL');
    setSelectedExamType('ALL');
    setSelectedSubject('ALL');
    setDescriptionKeyword('');
    setSelectedAcademicYear('ALL');
    setSelectedSchool('ALL');
    setFilterMoet2025(false);
    setFilterHasAnswers(false);
    setFilterHasSolutions(false);
    setFilterHasDiscordLink(false);
  }, []);

  // Danh sách đề thi được hiển thị (có lọc theo Bậc học, Khối lớp, Thể loại, Môn học, Năm học, Trường ra đề, Chuẩn 2025, Tủ Sách, Tìm kiếm)
  const displayedDocuments = useMemo(() => {
    let list = showBookmarksOnly
      ? documentsList.filter((doc) => bookmarkedIds.has(doc.id))
      : [...documentsList];

    // 1. Lọc theo Bậc Giáo Dục: Chung (hiện cả 2), Cấp 2 (hiện riêng), Cấp 3 (hiện riêng)
    if (selectedEducationLevel === 'CAP_2') {
      list = list.filter((doc) => {
        const lvl = getDocumentEducationLevel(doc);
        return lvl === 'CAP_2' || lvl === 'CHUNG';
      });
    } else if (selectedEducationLevel === 'CAP_3') {
      list = list.filter((doc) => {
        const lvl = getDocumentEducationLevel(doc);
        return lvl === 'CAP_3' || lvl === 'CHUNG';
      });
    }

    // 2. Lọc theo Khối Lớp nếu đang chọn cụ thể
    if (selectedGrade && selectedGrade !== 'ALL') {
      list = list.filter((doc) => {
        const l = (doc.estimated_level || '').toLowerCase();
        if (selectedGrade === '9') {
          return l.includes('9') || l.includes('vào 10');
        }
        return l.includes(selectedGrade);
      });
    }

    // 3. Lọc theo Thể Loại Đề Thi (dùng chuẩn getExamTrackInfo quét title + file_name + level)
    if (selectedExamType && selectedExamType !== 'ALL') {
      list = list.filter((doc) => {
        const trackTier = getExamTrackInfo(doc).tier;
        return trackTier === selectedExamType;
      });
    }

    // 4. Lọc theo Môn Học
    if (selectedSubject && selectedSubject !== 'ALL') {
      list = list.filter((doc) => isDocMatchingSubject(doc.subject, selectedSubject));
    }

    // 5. Lọc theo Năm Học
    if (selectedAcademicYear && selectedAcademicYear !== 'ALL') {
      list = list.filter((doc) => {
        if (doc.academic_year === selectedAcademicYear) return true;
        const text = (doc.title + ' ' + doc.file_name).toLowerCase();
        return text.includes(selectedAcademicYear.toLowerCase());
      });
    }

    // 6. Lọc theo Nguồn Trường / Sở GD&ĐT
    if (selectedSchool && selectedSchool !== 'ALL') {
      list = list.filter((doc) => {
        const sch = (doc.school_or_department || '').toLowerCase();
        return sch.includes(selectedSchool.toLowerCase());
      });
    }

    // 7. Lọc Cấu Trúc Chuẩn Bộ GD&ĐT 2025 (3 Phần)
    if (filterMoet2025) {
      list = list.filter(
        (doc) =>
          doc.moet_2025_compliant ||
          (doc.moet_part1_count != null && doc.moet_part1_count > 0) ||
          (doc.moet_part2_count != null && doc.moet_part2_count > 0) ||
          (doc.moet_part3_count != null && doc.moet_part3_count > 0)
      );
    }

    // 8. Lọc Có Bảng Đáp Án
    if (filterHasAnswers) {
      list = list.filter((doc) => doc.has_answer_keys);
    }

    // 9. Lọc Có Lời Giải Chi Tiết
    if (filterHasSolutions) {
      list = list.filter((doc) => doc.has_detailed_solutions);
    }

    // 10. Lọc Đã Có Link Discord / CDN
    if (filterHasDiscordLink) {
      list = list.filter((doc) => Boolean(doc.jump_url || doc.download_url));
    }

    // 11. Lọc theo Từ Khóa Tìm Kiếm (Tối ưu Multi-Token: gõ "Toán 12 Chuyên" quét linh hoạt từng từ)
    if (descriptionKeyword && descriptionKeyword.trim()) {
      const tokens = descriptionKeyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        list = list.filter((doc) => {
          const text = `${doc.title || ''} ${doc.file_name || ''} ${doc.subject || ''} ${doc.school_or_department || ''} ${doc.academic_year || ''} ${doc.notes || ''}`.toLowerCase();
          return tokens.every((t) => text.includes(t));
        });
      }
    }

    // Sắp xếp nâng cao
    if (sortBy === 'newest') {
      list.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'pages') {
      list.sort((a, b) => (b.page_count || 0) - (a.page_count || 0));
    } else if (sortBy === 'size') {
      list.sort((a, b) => (b.file_size_bytes || 0) - (a.file_size_bytes || 0));
    } else if (sortBy === 'confidence') {
      list.sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
    }

    return list;
  }, [
    documentsList,
    showBookmarksOnly,
    bookmarkedIds,
    selectedEducationLevel,
    selectedGrade,
    selectedExamType,
    selectedSubject,
    selectedAcademicYear,
    selectedSchool,
    filterMoet2025,
    filterHasAnswers,
    filterHasSolutions,
    filterHasDiscordLink,
    descriptionKeyword,
    sortBy,
  ]);

  // Tự động reset trang về 24 mỗi khi người dùng thay đổi bộ lọc
  useEffect(() => {
    setVisibleCount(24);
  }, [
    selectedEducationLevel,
    selectedGrade,
    selectedExamType,
    selectedSubject,
    descriptionKeyword,
    selectedAcademicYear,
    selectedSchool,
    filterMoet2025,
    filterHasAnswers,
    filterHasSolutions,
    filterHasDiscordLink,
    showBookmarksOnly,
    sortBy,
  ]);

  // Danh sách đề phân trang (Chống giật lag DOM trên thiết bị di động / máy cấu hình yếu)
  const paginatedDocuments = useMemo(() => {
    return displayedDocuments.slice(0, visibleCount);
  }, [displayedDocuments, visibleCount]);


  // Thống kê phân bố tài liệu theo Khối Lớp tương ứng với Bậc Học đang chọn
  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      '12': 0,
      '11': 0,
      '10': 0,
      '9': 0,
      '8': 0,
      '7': 0,
      '6': 0,
    };

    const targetDocs =
      selectedEducationLevel === 'CAP_2'
        ? documentsList.filter((d) => getDocumentEducationLevel(d) === 'CAP_2')
        : selectedEducationLevel === 'CAP_3'
        ? documentsList.filter((d) => getDocumentEducationLevel(d) === 'CAP_3')
        : documentsList;

    targetDocs.forEach((d) => {
      const l = (d.estimated_level || '').toLowerCase();
      if (l.includes('12')) dist['12']++;
      else if (l.includes('11')) dist['11']++;
      else if (l.includes('10')) dist['10']++;
      else if (l.includes('9') || l.includes('vào 10')) dist['9']++;
      else if (l.includes('8')) dist['8']++;
      else if (l.includes('7')) dist['7']++;
      else if (l.includes('6')) dist['6']++;
    });
    return dist;
  }, [documentsList, selectedEducationLevel]);

  // Trạng thái đề ngẫu nhiên được chọn
  const [isLoadingExam, setIsLoadingExam] = useState<boolean>(false);
  const [currentExam, setCurrentExam] = useState<ExamDocument | null>(null);
  const [examError, setExamError] = useState<string>('');

  // (Cài đặt endpoint API đã chuyển hẳn vào Admin Hub → tab Cấu Hình Bot)

  // 1. Kiểm tra trạng thái Discord Bot
  const checkBotStatus = useCallback(async () => {
    let apiBase = getApiBaseUrl();
    try {
      let res = await fetch(`${apiBase}/api/status`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(4000),
      });

      // Nếu endpoint hiện tại lỗi, tự động thử DEFAULT_TUNNEL_URL (trên môi trường HTTPS)
      if (!res.ok && apiBase !== DEFAULT_TUNNEL_URL && (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
        try {
          const fallbackRes = await fetch(`${DEFAULT_TUNNEL_URL}/api/status`, {
            headers: API_FETCH_HEADERS,
            signal: AbortSignal.timeout(4000),
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
            apiBase = DEFAULT_TUNNEL_URL;
            setCustomApiUrl(null);
          }
        } catch {}
      }

      if (res.ok) {
        const data = await res.json();
        const isOnline = data.status === 'online';
        setBotStatus({
          online: isOnline,
          bot_user: data.bot_user,
          ping_ms: data.ping_ms,
          uptime_seconds: data.uptime_seconds,
          guilds_count: data.guilds_count,
        });
      } else {
        setBotStatus({ online: false });
      }
    } catch {
      // Trường hợp kết nối thất bại (lỗi mạng, URL tùy biến cũ bị chết), thử lại với DEFAULT_TUNNEL_URL
      if (apiBase !== DEFAULT_TUNNEL_URL && (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
        try {
          const fallbackRes = await fetch(`${DEFAULT_TUNNEL_URL}/api/status`, {
            headers: API_FETCH_HEADERS,
            signal: AbortSignal.timeout(4000),
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const isOnline = data.status === 'online';
            setBotStatus({
              online: isOnline,
              bot_user: data.bot_user,
              ping_ms: data.ping_ms,
              uptime_seconds: data.uptime_seconds,
              guilds_count: data.guilds_count,
            });
            setCustomApiUrl(null);
            return;
          }
        } catch {}
      }
      setBotStatus({ online: false });
    }
  }, []);

  // 2. Lấy danh sách tất cả đề thi từ Kho Discord (Không giới hạn - Full List)
  const fetchDocuments = useCallback(
    async (
      gradeOverride?: string,
      typeOverride?: string,
      subjectOverride?: string,
      searchOverride?: string,
      dupOverride?: 'all' | 'unique' | 'duplicate'
    ) => {
      setIsLoadingDocs(true);
      try {
        let apiBase = getApiBaseUrl();
        const q = new URLSearchParams();
        // Không giới hạn số lượng đề thi khi Bot online (lấy toàn bộ từ CSDL Discord)
        q.set('limit', '5000');

        const g = gradeOverride !== undefined ? gradeOverride : selectedGrade;
        const t = typeOverride !== undefined ? typeOverride : selectedExamType;
        const s = subjectOverride !== undefined ? subjectOverride : selectedSubject;
        const search = searchOverride !== undefined ? searchOverride : descriptionKeyword;
        const dup = dupOverride !== undefined ? dupOverride : filterDup;

        if (g && g !== 'ALL') q.set('grade', g);
        if (t && t !== 'ALL') q.set('exam_type', t);
        if (s && s !== 'ALL') q.set('subject', s);
        if (search && search.trim()) q.set('search', search.trim());
        if (dup) q.set('filter_dup', dup);

        let res = await fetch(`${apiBase}/api/documents?${q.toString()}`, {
          headers: API_FETCH_HEADERS,
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok && apiBase !== DEFAULT_TUNNEL_URL && (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
          try {
            const fbRes = await fetch(`${DEFAULT_TUNNEL_URL}/api/documents?${q.toString()}`, {
              headers: API_FETCH_HEADERS,
              signal: AbortSignal.timeout(8000),
            });
            if (fbRes.ok) {
              res = fbRes;
              apiBase = DEFAULT_TUNNEL_URL;
              setCustomApiUrl(null);
            }
          } catch {}
        }

        if (res.ok) {
          const data = await res.json();
          if (data && data.documents) {
            setDocumentsList(data.documents);
            setTotalDocsCount(data.total ?? data.documents.length);
          }
        } else {
          // Khi bot tắt: Tự động fallback sang Turso libSQL Cloud (5GB)
          const tursoDocs = await fetchDocsFromTurso(5000);
          if (tursoDocs && tursoDocs.length > 0) {
            setDocumentsList(tursoDocs as any);
            setTotalDocsCount(tursoDocs.length);
          } else {
            setDocumentsList([]);
            setTotalDocsCount(0);
          }
        }
      } catch {
        // Khi bot tắt / mất kết nối: Tự động fallback sang Turso libSQL Cloud
        try {
          const tursoDocs = await fetchDocsFromTurso(5000);
          if (tursoDocs && tursoDocs.length > 0) {
            setDocumentsList(tursoDocs as any);
            setTotalDocsCount(tursoDocs.length);
          } else {
            setDocumentsList([]);
            setTotalDocsCount(0);
          }
        } catch {
          setDocumentsList([]);
          setTotalDocsCount(0);
        }
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, filterDup]
  );

  // 3. Lấy thống kê số lượng tài liệu
  const fetchDocStats = useCallback(async () => {
    try {
      let apiBase = getApiBaseUrl();
      let res = await fetch(`${apiBase}/api/documents/stats`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok && apiBase !== DEFAULT_TUNNEL_URL && (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
        try {
          const fbRes = await fetch(`${DEFAULT_TUNNEL_URL}/api/documents/stats`, {
            headers: API_FETCH_HEADERS,
            signal: AbortSignal.timeout(4000),
          });
          if (fbRes.ok) {
            res = fbRes;
            apiBase = DEFAULT_TUNNEL_URL;
            setCustomApiUrl(null);
          }
        } catch {}
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats({
            total_real: data.total_real || data.total_items || 0,
            unique_items: data.unique_items || 0,
            duplicate_items: data.duplicate_items || 0,
          });
          setTotalDocsCount(data.total_real || data.total_items || 0);
        }
      } else {
        try {
          const tursoStats = await getTursoStorageUsage();
          const total = tursoStats?.totalDocs || 0;
          setStats({ total_real: total, unique_items: total, duplicate_items: 0 });
          if (total > 0) setTotalDocsCount(total);
        } catch {
          setStats({ total_real: 0, unique_items: 0, duplicate_items: 0 });
        }
      }
    } catch {
      // Khi bot offline: fallback sang Turso Cloud storage
      try {
        const tursoStats = await getTursoStorageUsage();
        const total = tursoStats?.totalDocs || 0;
        setStats({ total_real: total, unique_items: total, duplicate_items: 0 });
        if (total > 0) setTotalDocsCount(total);
      } catch {
        setStats({ total_real: 0, unique_items: 0, duplicate_items: 0 });
      }
    }
  }, []);

  useEffect(() => {
    checkBotStatus();
    fetchDocStats();
    fetchDocuments();
    const timer = setInterval(() => {
      checkBotStatus();
    }, 15000);
    return () => clearInterval(timer);
  }, [checkBotStatus, fetchDocStats]);

  // Cập nhật Bậc Giáo Dục: Chung, Cấp 2, Cấp 3
  const handleEducationLevelChange = (level: EducationLevel) => {
    setSelectedEducationLevel(level);

    // Tự động chuyển Khối Lớp nếu không thuộc cấp vừa chọn
    let nextGrade = selectedGrade;
    if (level === 'CAP_2' && ['12', '11', '10'].includes(selectedGrade)) {
      nextGrade = 'ALL';
      setSelectedGrade('ALL');
    } else if (level === 'CAP_3' && ['9', '8', '7', '6'].includes(selectedGrade)) {
      nextGrade = 'ALL';
      setSelectedGrade('ALL');
    }

    // Tự động chuyển Môn Học nếu môn hiện tại không thuộc cấp vừa chọn
    let nextSubject = selectedSubject;
    const cap2SubjectIds = CAP2_SUBJECT_OPTIONS.map((s) => s.id);
    const cap3SubjectIds = CAP3_SUBJECT_OPTIONS.map((s) => s.id);

    if (level === 'CAP_2' && selectedSubject !== 'ALL' && !cap2SubjectIds.includes(selectedSubject)) {
      nextSubject = 'ALL';
      setSelectedSubject('ALL');
    } else if (level === 'CAP_3' && selectedSubject !== 'ALL' && !cap3SubjectIds.includes(selectedSubject)) {
      nextSubject = 'ALL';
      setSelectedSubject('ALL');
    }

    fetchDocuments(nextGrade, selectedExamType, nextSubject, descriptionKeyword);
  };

  // Cập nhật danh sách khi đổi filter
  const handleGradeChange = (gradeId: string) => {
    setSelectedGrade(gradeId);
    fetchDocuments(gradeId, selectedExamType, selectedSubject, descriptionKeyword);
  };

  const handleExamTypeChange = (typeId: string) => {
    setSelectedExamType(typeId);
    fetchDocuments(selectedGrade, typeId, selectedSubject, descriptionKeyword);
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    fetchDocuments(selectedGrade, selectedExamType, subjectId, descriptionKeyword);
  };

  // 4. Xử lý Lọc / Tìm kiếm form
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments(selectedGrade, selectedExamType, selectedSubject, descriptionKeyword);
  };

  // 5. Xử lý Bốc Đề Ngẫu Nhiên (Random Pick)
  const handlePickRandomExam = async () => {
    setExamError('');
    setCurrentExam(null);

    // Kiểm tra Bot online
    if (!botStatus.online) {
      setExamError(
        'Discord Bot hiện đang không hoạt động (Offline). Vui lòng khởi động Bot Discord để hệ thống có thể bốc đề thi!'
      );
      return;
    }

    // Kiểm tra đăng nhập
    if (!user) {
      setExamError('Bạn cần liên kết tài khoản Discord trước khi bốc đề thi.');
      onOpenAuthModal();
      return;
    }

    if (!user.verified) {
      setExamError(
        'Tài khoản Discord của bạn chưa xác minh Email (Unverified). Discord Bot chỉ phát đề cho tài khoản đã xác minh email.'
      );
      return;
    }

    setIsLoadingExam(true);
    try {
      // Luôn bốc qua server để Bot kiểm tra: đã vào server + verify email
      // (không bốc client-side để tránh lách gate thành viên)
      // Fallback gọi API request_exam
      const queryParams = new URLSearchParams({
        grade: selectedGrade,
        exam_type: selectedExamType,
        subject: selectedSubject,
        description: descriptionKeyword.trim(),
      });

      const apiBase = getApiBaseUrl();
      const examHeaders: Record<string, string> = {
        ...API_FETCH_HEADERS,
      };
      const token = user?.accessToken || getDiscordAccessToken();
      if (token) {
        examHeaders['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/api/documents/request_exam?${queryParams.toString()}`, {
        headers: examHeaders,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 403 && errorData?.message) {
          throw new Error(errorData.message);
        }
        throw new Error(`Bot phản hồi mã lỗi HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.document) {
        setCurrentExam(data.document);
        showSuccess(`Đã bốc đề: ${data.document.title || data.document.file_name}`, 'Bốc Đề Thành Công');
        window.scrollTo({ top: 350, behavior: 'smooth' });
      } else {
        const msg =
          data.message ||
          'Không tìm thấy đề thi phù hợp với tiêu chí hiện tại. Hãy thử chọn môn học hoặc loại đề khác!';
        setExamError(msg);
        showError(msg, 'Bốc Đề');
      }
    } catch (err: any) {
      const errMsg = `Lỗi kết nối tới Bot phát đề: ${err.message || 'Hết thời gian chờ phản hồi'}`;
      setExamError(errMsg);
      showError(errMsg, 'Bốc Đề');
    } finally {
      setIsLoadingExam(false);
    }
  };

  // Lắng nghe thay đổi endpoint API từ Admin Hub → tải lại trạng thái + dữ liệu
  useEffect(() => {
    const onApiChanged = () => {
      checkBotStatus();
      fetchDocStats();
      fetchDocuments();
    };
    window.addEventListener('hyperhub_api_changed', onApiChanged);
    return () => window.removeEventListener('hyperhub_api_changed', onApiChanged);
  }, [checkBotStatus, fetchDocStats, fetchDocuments]);

  // Tự nhận diện bot vừa bật (offline → online): tải lại toàn bộ dữ liệu
  const prevOnlineRef = useRef<boolean>(false);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = botStatus.online;
    if (!wasOnline && botStatus.online) {
      fetchDocStats();
      fetchDocuments();
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 8000);
      return () => clearTimeout(t);
    }
  }, [botStatus.online, fetchDocStats, fetchDocuments]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFilterControls = (showRollButton: boolean = true) => (
    <div className="p-5 sm:p-6 rounded-2xl liquid-glass border border-white/10 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg">Bộ Lọc & Tìm Kiếm Đề Thi</h3>
            <p className="text-xs text-slate-400 dark:text-white/40">
              {showRollButton
                ? 'Chọn tiêu chí để bot bốc ngẫu nhiên hoặc lọc đề thi bên dưới'
                : 'Lọc danh sách đề thi theo khối lớp, thể loại, môn học và từ khóa'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {documentsList.length} đề thi phù hợp
          </span>
        </div>
      </div>

      {examError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{examError}</span>
        </div>
      )}

      <form onSubmit={handleFilterSubmit} className="space-y-6">
        {/* 0. BẬC GIÁO DỤC: CHUNG, CẤP 2, CẤP 3 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              <span>Bậc Giáo Dục & Cấp Học</span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-white/40">
              Đang chọn:{' '}
              <strong className="text-purple-600 dark:text-purple-400">
                {EDUCATION_LEVEL_OPTIONS.find((e) => e.id === selectedEducationLevel)?.label}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {EDUCATION_LEVEL_OPTIONS.map((opt) => {
              const isSelected = selectedEducationLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleEducationLevelChange(opt.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 group ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30 scale-[1.02] border-purple-400 ring-2 ring-purple-500/40'
                      : 'liquid-glass border-white/10 text-slate-700 dark:text-white/70 hover:border-purple-300 dark:hover:border-purple-500/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{opt.icon}</span>
                      <span className="font-extrabold text-sm sm:text-base">{opt.label}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] leading-tight ${
                      isSelected ? 'text-purple-100' : 'text-slate-400 dark:text-white/40'
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. KHỐI LỚP */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              <span>
                1. Khối Lớp Học Sinh{' '}
                {selectedEducationLevel === 'CAP_2'
                  ? '(Cấp 2: Lớp 6 - 9)'
                  : selectedEducationLevel === 'CAP_3'
                  ? '(Cấp 3: Lớp 10 - 12)'
                  : '(Toàn Bộ Khối 6 - 12)'}
              </span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-white/40">
              Đang chọn:{' '}
              <strong className="text-purple-600 dark:text-purple-400">
                {(selectedEducationLevel === 'CAP_2'
                  ? CAP2_GRADE_OPTIONS
                  : selectedEducationLevel === 'CAP_3'
                  ? CAP3_GRADE_OPTIONS
                  : ALL_GRADE_OPTIONS
                ).find((g) => g.id === selectedGrade)?.label || 'Mọi Khối'}
              </strong>
            </span>
          </div>

          <div
            className={`grid gap-2 ${
              selectedEducationLevel === 'CAP_2'
                ? 'grid-cols-2 sm:grid-cols-5'
                : selectedEducationLevel === 'CAP_3'
                ? 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-8'
            }`}
          >
            {(selectedEducationLevel === 'CAP_2'
              ? CAP2_GRADE_OPTIONS
              : selectedEducationLevel === 'CAP_3'
              ? CAP3_GRADE_OPTIONS
              : ALL_GRADE_OPTIONS
            ).map((g) => {
              const isSelected = selectedGrade === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGradeChange(g.id)}
                  style={{
                    borderColor: isSelected ? g.color : undefined,
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 group relative overflow-hidden ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 scale-[1.03] ring-2 ring-purple-500/40'
                      : 'liquid-glass border-white/10 text-slate-700 dark:text-white/70 hover:border-purple-300 dark:hover:border-purple-500/40 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {g.id !== 'ALL' && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: g.color }}
                      />
                    )}
                    <span className="font-bold text-xs sm:text-sm">{g.label}</span>
                  </div>
                  <span
                    className={`text-[10px] ${
                      isSelected ? 'text-purple-100 font-medium' : 'text-slate-400 dark:text-white/40'
                    }`}
                  >
                    {g.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. LOẠI ĐỀ THI */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-pink-500" />
              <span>2. Thể Loại Đề Thi</span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-white/40">
              Đang chọn:{' '}
              <strong className="text-pink-600 dark:text-pink-400">
                {EXAM_TYPE_OPTIONS.find((t) => t.id === selectedExamType)?.label}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {EXAM_TYPE_OPTIONS.map((t) => {
              const isSelected = selectedExamType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleExamTypeChange(t.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-500 text-white shadow-lg shadow-pink-900/30 scale-[1.01]'
                      : 'liquid-glass border-white/10 text-slate-700 dark:text-white/70 hover:border-pink-300 dark:hover:border-pink-500/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <span className="font-bold text-xs truncate">{t.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-slate-300 dark:text-white/60'
                    }`}
                  >
                    {t.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ghi chú độ khó và 5 thể loại */}
          <div className="p-3 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 text-xs text-slate-600 dark:text-white/70 space-y-1">
            <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 flex-wrap">
              <span>⚖️ Thang độ khó học thuật:</span>
              <span className="font-mono text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-500/20">
                Đề thường &lt; Đề HSG &lt; Đề chuyên
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-white/50">
              • <strong>Đề quốc tế:</strong> Kỳ thi quốc tế (IMO, AMC, Kangaroo/IKMC, SASMO, TIMO, SAT...) cả bản dịch tiếng Việt & quốc tế.<br />
              • <strong>Đề chung:</strong> Đề cương, lý thuyết tổng hợp chung (dễ gây hiểu lầm nếu coi là một đề thi cụ thể).
            </p>
          </div>
        </div>

        {/* 3. MÔN HỌC */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>
                3. Môn Học Ôn Tập{' '}
                {selectedEducationLevel === 'CAP_2'
                  ? '(9 Môn Chuẩn GDPT 2018 THCS)'
                  : selectedEducationLevel === 'CAP_3'
                  ? '(8 Môn Bắt Buộc + 7 Môn Tự Chọn)'
                  : '(Gộp Cả Cấp 2 & Cấp 3)'}
              </span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-white/40">
              Đang chọn:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {(selectedEducationLevel === 'CAP_2'
                  ? CAP2_SUBJECT_OPTIONS
                  : selectedEducationLevel === 'CAP_3'
                  ? CAP3_SUBJECT_OPTIONS
                  : ALL_SUBJECT_OPTIONS
                ).find((s) => s.id === selectedSubject)?.label || 'Tất Cả Các Môn'}
              </strong>
            </span>
          </div>

          {selectedEducationLevel === 'CAP_3' ? (
            <div className="space-y-3.5">
              {/* Nút Chọn Tất Cả Môn Cấp 3 */}
              <div>
                <button
                  type="button"
                  onClick={() => handleSubjectChange('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedSubject === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 scale-105'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-300 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span>🌐</span>
                  <span>Tất Cả Môn Cấp 3 (8 Bắt buộc + 7 Tự chọn)</span>
                </button>
              </div>

              {/* Nhóm 1: 8 Môn Bắt Buộc */}
              <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <span>📌 8 Môn Học Bắt Buộc (Chuẩn Cấp 3):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CAP3_MANDATORY_SUBJECTS.map((s) => {
                    const isSelected = selectedSubject === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSubjectChange(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 scale-105'
                            : 'bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white/80 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-600 dark:hover:text-purple-300 border border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhóm 2: 7 Môn Tự Chọn */}
              <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                  <span>🎨 7 Môn Học Tự Chọn (Chuẩn Cấp 3):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CAP3_ELECTIVE_SUBJECTS.map((s) => {
                    const isSelected = selectedSubject === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSubjectChange(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-pink-600 text-white shadow-md shadow-pink-900/30 scale-105'
                            : 'bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white/80 hover:bg-pink-50 dark:hover:bg-pink-950/20 hover:text-pink-600 dark:hover:text-pink-300 border border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(selectedEducationLevel === 'CAP_2' ? CAP2_SUBJECT_OPTIONS : ALL_SUBJECT_OPTIONS).map((s) => {
                const isSelected = selectedSubject === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSubjectChange(s.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 scale-105'
                        : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-300 border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. TỪ KHÓA MÔ TẢ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-purple-500" />
              <span>4. Tìm Kiếm & Từ Khóa Nội Dung</span>
            </label>
            {descriptionKeyword && (
              <span className="text-[11px] text-purple-500 dark:text-purple-400">
                Đang tìm: "{descriptionKeyword}"
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={descriptionKeyword}
              onChange={(e) => {
                setDescriptionKeyword(e.target.value);
                fetchDocuments(selectedGrade, selectedExamType, selectedSubject, e.target.value);
              }}
              placeholder="VD: hàm số mũ, wordform, quy hoạch động, phân tích thơ, đề có lời giải, chuyên KHTN..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-white/30"
            />
            {descriptionKeyword && (
              <button
                type="button"
                onClick={() => {
                  setDescriptionKeyword('');
                  fetchDocuments(selectedGrade, selectedExamType, selectedSubject, '');
                }}
                className="absolute right-3.5 top-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Xóa nội dung"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Gợi Ý Nhanh 1 Chạm */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-slate-400 dark:text-white/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>Gợi ý từ khóa nhanh (bấm để lọc ngay):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_KEYWORD_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setDescriptionKeyword(tag);
                    fetchDocuments(selectedGrade, selectedExamType, selectedSubject, tag);
                  }}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <span>+ {tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NÚT THAO TÁC */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {showRollButton && (
            <button
              type="button"
              onClick={handlePickRandomExam}
              disabled={!botStatus.online || !user || !user.verified || isLoadingExam}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-900/30 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoadingExam ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Bot Đang Bốc Đề...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>🎲 Bốc Ngẫu Nhiên 1 Đề Thi</span>
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Lọc Danh Sách Đề</span>
          </button>
        </div>
      </form>
    </div>
  );

  // Hub mở cho mọi người (kể cả khi bot offline): xem + nộp đề tự do.
  // Bốc đề và Admin vẫn giữ cổng riêng. Biến giữ lại để khỏi sửa nhiều chỗ.
  const hubLocked = false;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#070810] text-white">
      {/* ========================================================================= */}
      {/* SIDEBAR BÊN HÔNG TRÁI (Sleek, Compact, Liquid Glass, Không Phải Scroll)   */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MOBILE TABS DOCK (Lucian UX/UI Sliding Pill Tabs - Gọn nhẹ, không thừa thãi)*/}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full px-3 py-2 liquid-glass border-b border-white/10 sticky top-16 z-30 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-md">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm font-bold'
              : 'text-white/70 hover:text-white bg-white/[0.04]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
          <span>Trang chính</span>
        </button>

        <button
          onClick={() => {
            handleTabChange('vault');
            setShowBookmarksOnly(false);
          }}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'vault' && !showBookmarksOnly
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm font-bold'
              : 'text-white/70 hover:text-white bg-white/[0.04]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>Kho Đề</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
            {totalDocsCount}
          </span>
        </button>

        <button
          onClick={() => {
            handleTabChange('vault');
            setShowBookmarksOnly(true);
          }}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'vault' && showBookmarksOnly
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm'
              : 'text-white/70 hover:text-white bg-white/[0.04]'
          }`}
        >
          <Star className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'vault' && showBookmarksOnly ? 'fill-current text-slate-950' : 'text-amber-400'}`} />
          <span>Tủ Sách</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            {bookmarkedIds.size}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('get_exam')}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'get_exam'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm font-bold'
              : 'text-white/70 hover:text-white bg-white/[0.04]'
          }`}
        >
          <Dices className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          <span>Lấy Đề</span>
        </button>

        <button
          onClick={() => handleTabChange('submit_doc')}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'submit_doc'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm font-bold'
              : 'text-white/70 hover:text-white bg-white/[0.04]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Kho Nộp Đề</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
            Bot AI
          </span>
        </button>

        {/* Nút Admin trên Mobile nếu có quyền */}
        {(isAdmin || readCachedAdmin()) && (
          <button
            onClick={() => handleTabChange('admin')}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-600 text-white shadow-sm font-bold'
                : 'text-rose-400 hover:text-rose-300 bg-rose-500/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Quản Trị</span>
          </button>
        )}

        <button
          onClick={onBackToHome}
          className="px-3 py-1.5 rounded-xl font-medium text-xs text-white/50 hover:text-white bg-white/[0.03] transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về Trang Chủ</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Sleek, Compact w-56, Liquid Glass, Profile Card Luôn Hiện) */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex lg:w-56 sticky top-16 h-[calc(100dvh-4rem)] liquid-glass border-r border-white/10 flex-col justify-between shrink-0 p-2.5 z-20 overflow-hidden shadow-2xl shadow-purple-950/10">
        {/* Top: Section Header & Nav items */}
        <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 mb-0.5">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutDashboard className="w-3 h-3 text-purple-400" />
              <span>Bảng Điều Khiển</span>
            </span>
            <span className="text-[10px] text-white/30 font-mono">v2.5</span>
          </div>

          {/* Navigation Sidebar Buttons (Vừa vặn, thanh thoát, góc bo rounded-xl) */}
          <nav className="flex flex-col gap-1 overflow-y-auto no-scrollbar flex-1 py-0.5">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>Trang chính</span>
            </button>

            <button
              onClick={() => {
                handleTabChange('vault');
                setShowBookmarksOnly(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                activeTab === 'vault' && !showBookmarksOnly
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Kho Đề</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-md bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                {totalDocsCount} Đề
              </span>
            </button>

            <button
              onClick={() => {
                handleTabChange('vault');
                setShowBookmarksOnly(true);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                activeTab === 'vault' && showBookmarksOnly
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'vault' && showBookmarksOnly ? 'fill-current text-slate-950' : 'text-amber-400'}`} />
              <span>Tủ Sách</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {bookmarkedIds.size}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('get_exam')}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                activeTab === 'get_exam'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Dices className="w-3.5 h-3.5 shrink-0" />
              <span>Lấy Đề</span>
            </button>

            <button
              onClick={() => handleTabChange('submit_doc')}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                activeTab === 'submit_doc'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30 font-bold'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>Kho Nộp Đề</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                Bot AI
              </span>
            </button>

            {/* Nút Admin - CHỈ HIỂN THỊ KHI CÓ QUYỀN ADMIN */}
            {(isAdmin || readCachedAdmin()) && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-600 text-white shadow-md shadow-rose-900/30 font-bold'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Quản Trị</span>
                {hasSystemUpdate && (
                  <span className="animate-pulse px-1 py-0.2 rounded-md bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider">
                    Update
                  </span>
                )}
                <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {adminInfo?.role_name || 'ADMIN'}
                </span>
              </button>
            )}

            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-xs text-white/50 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer mt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Về Trang Chủ</span>
            </button>
          </nav>
        </div>

        {/* Bottom: Discord User Profile Card (Gọn nhẹ, luôn hiện, không bao giờ phải cuộn) */}
        <div className="pt-2 mt-auto border-t border-white/10 shrink-0">
          {user ? (
            <div className="p-2 rounded-xl liquid-glass border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-purple-500/30 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="font-bold text-xs truncate text-white leading-tight">
                    {user.global_name || user.username}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Status & Logout */}
              <div className="flex items-center justify-between text-[10px] pt-0.5">
                {user.verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Xác minh</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>Chưa xác minh</span>
                  </span>
                )}

                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-[10px] text-white/50 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Đăng xuất tài khoản"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Thoát</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl liquid-glass border border-[#5865F2]/30 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="font-bold text-xs truncate text-white leading-tight">
                    Khách vãng lai
                  </div>
                  <div className="text-[10px] text-white/50 truncate">
                    Chưa đăng nhập
                  </div>
                </div>
              </div>
              <button
                onClick={onOpenAuthModal}
                className="w-full py-1.5 px-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Liên Kết Ngay</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT AREA                                                    */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full">
        {/* Banner Thông Báo Bản Cập Nhật GitHub Dành Cho Admin */}
        {hasSystemUpdate && activeTab !== 'admin' && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 text-base">🚀</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-amber-300">
                  Phát hiện bản cập nhật mới trên GitHub!
                </div>
                <div className="text-[11px] text-slate-300 dark:text-white/70">
                  Mã nguồn mới đã sẵn sàng. Bạn có thể cài đặt và nạp lại hệ thống chỉ với 1 cú click.
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('admin')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer shadow-md shadow-amber-950/40 shrink-0"
            >
              Mở Hub Cập Nhật (1-Click)
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>Hệ Thống Quản Trị Học Thuật & Phát Đề</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Chào mừng trở lại{user ? `, ${user.global_name || user.username}` : ''}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                  Bảng điều khiển kết nối trực tiếp với Discord Bot Orbit và kho lưu trữ đề thi tự động.
                </p>
              </div>

              {/* Quick Utility Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="ux-btn-liquid px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-white/80 hover:text-purple-500 flex items-center gap-1.5 cursor-pointer"
                  title="Mở thanh tìm kiếm siêu tốc (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tìm kiếm (Ctrl+K)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    checkBotStatus();
                    fetchDocStats();
                    fetchDocuments();
                    showInfo('Đang làm mới dữ liệu...');
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-white/60 transition-colors cursor-pointer"
                  title="Làm mới trạng thái"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Toolbar (Lucian UX/UI Micro-Interactions) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('get_exam')}
                className="ux-btn-liquid p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Dices className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-400 transition-colors truncate">
                    Bốc Đề Nhanh
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/50 truncate">
                    Bốc ngẫu nhiên theo môn
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('vault');
                  setShowBookmarksOnly(false);
                }}
                className="ux-btn-liquid p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-pink-500/15 text-pink-500 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-pink-400 transition-colors truncate">
                    Mở Kho Đề Thi
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/50 truncate">
                    {totalDocsCount} đề thi có sẵn
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('submit_doc')}
                className="ux-btn-liquid p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-400 transition-colors truncate">
                    Nộp Đề Mới
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/50 truncate">
                    AI thẩm định tức thì
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('vault');
                  setShowBookmarksOnly(true);
                }}
                className="ux-btn-liquid p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Star className="w-4 h-4 fill-amber-400/30" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-400 transition-colors truncate">
                    Tủ Sách Yêu Thích
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/50 truncate">
                    {bookmarkedIds.size} đề đã đánh dấu
                  </div>
                </div>
              </button>
            </div>

            {/* Status Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {/* Card 1: Discord Bot Live Status */}
              <div className="p-5 sm:p-6 rounded-2xl liquid-glass border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        botStatus.online
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          botStatus.online ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'
                        }`}
                      />
                      {botStatus.online ? 'Đang Hoạt Động' : 'Đang Ngoại Tuyến'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white mb-1">
                    Bot Discord Orbit
                  </h3>
                  <p className="text-xs text-white/50 mb-3">
                    {botStatus.online
                      ? `Đang kết nối WebSocket (Độ trễ: ${botStatus.ping_ms || 0}ms)`
                      : 'Bot Discord hiện không phản hồi. Các tính năng lấy đề sẽ tạm dừng.'}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-white/40 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span>User: {botStatus.bot_user || 'Orbit#0594'}</span>
                  {botStatus.online && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      ● Live
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Kho Tài Liệu */}
              <div className="p-5 sm:p-6 rounded-2xl liquid-glass border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                      Đã Thẩm Định
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white mb-0.5">
                    Kho Đề Thi Sẵn Sàng
                  </h3>
                  <div className="text-2xl sm:text-3xl font-black text-white mb-2">
                    {totalDocsCount} Đề
                  </div>
                  <p className="text-xs text-white/50">
                    Đầy đủ các môn Toán, Tin, Văn, Anh, Lý, Hóa... bóc tách và phân loại tự động.
                  </p>
                </div>
                <div className="text-[11px] text-white/40 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span>Độc bản: {stats.unique_items || 0}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('vault')}
                    className="text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Xem kho →
                  </button>
                </div>
              </div>

              {/* Card 3: Tài Khoản Liên Kết */}
              <div className="p-5 sm:p-6 rounded-2xl liquid-glass border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#5865F2]/15 text-[#5865F2] flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    {user ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Đã Kết Nối
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Chưa Kết Nối
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white mb-1">
                    Xác Thực Discord
                  </h3>
                  <p className="text-xs text-white/50 mb-3">
                    {user
                      ? `Email: ${user.email || 'Ẩn'} (${user.verified ? 'Đã verify ✅' : 'Chưa verify ❌'})`
                      : 'Yêu cầu liên kết tài khoản Discord để nhận phát đề.'}
                  </p>
                </div>
                <div className="pt-2.5 border-t border-white/10">
                  {!user ? (
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className="w-full py-2 px-3 rounded-xl bg-[#5865F2] text-white text-xs font-semibold hover:bg-[#4752c4] transition-colors cursor-pointer"
                    >
                      Liên Kết Ngay
                    </button>
                  ) : (
                    <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between">
                      <span>Đủ điều kiện nhận đề thi tự động</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Exams Feed */}
            <div className="p-5 sm:p-6 rounded-2xl liquid-glass border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Đề Thi Mới Nhất Vừa Cập Nhật
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-white/50">
                      Top 5 đề thi mới nhất được thẩm định tự động từ Discord
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('vault')}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem tất cả ({documentsList.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {documentsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-white/40">
                  {isLoadingDocs ? 'Đang tải danh sách đề thi...' : 'Chưa có tài liệu nào trong kho.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documentsList.slice(0, 5).map((doc) => {
                    const isBookmarked = bookmarkedIds.has(doc.id);
                    const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
                    const trackInfo = getExamTrackInfo(doc);
                    const eduBadge = getEducationLevelBadgeInfo(doc);

                    return (
                      <div
                        key={doc.id}
                        className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.015] hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                              {doc.subject}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${eduBadge.badgeClass}`}>
                              <span>{eduBadge.shortLabel}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${trackInfo.badgeClass}`}>
                              <span>{trackInfo.label}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${gradeStyle.badgeClass}`}>
                              <span className={`w-1 h-1 rounded-full ${gradeStyle.dotColor}`} />
                              <span>{gradeStyle.label}</span>
                            </span>
                            {doc.academic_year && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                📅 {doc.academic_year}
                              </span>
                            )}
                          </div>

                          <h4
                            onClick={() => {
                              setSelectedDossierDoc(doc);
                              setIsDossierOpen(true);
                            }}
                            className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white/90 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-1 cursor-pointer"
                          >
                            {doc.title || doc.file_name}
                          </h4>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-white/40">
                            {doc.school_or_department && (
                              <span className="truncate max-w-[200px]">🏫 {doc.school_or_department}</span>
                            )}
                            <span>{formatFileSize(doc.file_size_bytes)}</span>
                            {doc.page_count ? <span>{doc.page_count} trang</span> : null}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDossierDoc(doc);
                              setIsDossierOpen(true);
                            }}
                            className="p-2 rounded-lg text-slate-500 hover:text-purple-500 hover:bg-purple-500/10 transition-colors cursor-pointer"
                            title="Xem chi tiết hồ sơ đề thi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const nextState = toggleBookmarkExam(doc.id);
                              if (nextState) {
                                setBookmarkedIds((prev) => new Set([...prev, doc.id]));
                                showSuccess('Đã thêm vào Tủ Sách cá nhân!');
                              } else {
                                setBookmarkedIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(doc.id);
                                  return next;
                                });
                                showInfo('Đã bỏ lưu đề thi.');
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'text-amber-400 bg-amber-400/10'
                                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-400/10'
                            }`}
                            title={isBookmarked ? 'Bỏ lưu đề thi' : 'Lưu vào Tủ Sách'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                          </button>

                          {(doc.download_url || doc.jump_url) && (
                            <a
                              href={getSafeExternalUrl(doc.download_url || doc.jump_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Tải tệp đề thi"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tải về</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: LẤY ĐỀ & DANH SÁCH TẤT CẢ ĐỀ THI                              */}
        {/* ===================================================================== */}
        {activeTab === 'get_exam' && !hubLocked && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 mb-3">
                <Dices className="w-3.5 h-3.5 text-purple-500" />
                <span>Trạm Phát Đề Tự Động</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Lấy Đề Thi Ngẫu Nhiên
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1">
                Chọn khối lớp, môn học và nhấn nút "🎲 Bốc Ngẫu Nhiên 1 Đề Thi" để Bot bốc đề thi thích hợp nhất cho bạn từ kho dữ liệu.
              </p>
            </div>

            {/* 1. Bot Offline Warning Barrier */}
            {!botStatus.online && (
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base">
                    DISCORD BOT HIỆN ĐANG KHÔNG HOẠT ĐỘNG (OFFLINE)
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                    Bot đang ngoại tuyến nên tính năng bốc đề tạm dừng. Bạn vẫn xem kho đề
                    và nộp đề mới bình thường — đề nộp lúc này được lưu tạm và tự gửi khi
                    bot hoạt động trở lại.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={checkBotStatus}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử Kiểm Tra Lại Trạng Thái Bot</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bot vừa bật lại: báo đã tự nhận diện + đồng bộ */}
            {justReconnected && botStatus.online && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-xs sm:text-sm font-semibold">
                  Bot đã online trở lại — danh sách đề và kho lưu tạm đang tự đồng bộ.
                </p>
              </div>
            )}

            {/* 2. User Unverified Email Warning Barrier */}
            {(!user || !user.verified) && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-bold text-sm sm:text-base">
                    BỐC ĐỀ CẦN TÀI KHOẢN DISCORD ĐÃ XÁC MINH EMAIL
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60">
                    {!user
                      ? 'Xem kho đề và nộp đề mới thì không cần đăng nhập. Chỉ khi bốc đề làm bài mới cần liên kết Discord đã verify email.'
                      : 'Xem và nộp đề không cần verify. Chỉ khi bốc đề làm bài mới cần email Discord đã xác minh.'}
                  </p>
                  <button
                    onClick={onOpenAuthModal}
                    className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {!user ? 'Liên Kết Discord Ngay' : 'Xác Minh / Đổi Tài Khoản'}
                  </button>
                </div>
              </div>
            )}

            {/* 3. BỘ LỌC ĐỀ THI VỚI NÚT BỐC ĐỀ NGẪU NHIÊN */}
            {renderFilterControls(true)}

            {/* 4. KHUNG KẾT QUẢ ĐỀ BỐC ĐƯỢC (NẾU CÓ BỐC NGẪU NHIÊN) */}
            {currentExam && (
              <div className="p-6 sm:p-7 rounded-2xl liquid-glass border-2 border-amber-500/40 shadow-2xl space-y-6 animate-in slide-in-from-bottom-6 duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40">
                      Môn: {currentExam.subject}
                    </span>
                    {(() => {
                      const eduBadge = getEducationLevelBadgeInfo(currentExam);
                      return (
                        <span className={`px-3 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 ${eduBadge.badgeClass}`}>
                          <span>{eduBadge.icon}</span>
                          <span>{eduBadge.label}</span>
                        </span>
                      );
                    })()}
                    {(() => {
                      const gradeStyle = getGradeBadgeStyle(currentExam.estimated_level);
                      return (
                        <span className={`px-3 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 ${gradeStyle.badgeClass}`}>
                          <span className={`w-2 h-2 rounded-full ${gradeStyle.dotColor}`} />
                          <span>{gradeStyle.label}</span>
                        </span>
                      );
                    })()}
                    {(() => {
                      const tr = getExamTrackInfo(currentExam);
                      return (
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-bold border flex items-center gap-1 ${tr.badgeClass}`}
                          title={`${tr.description} (${tr.difficultyNote})`}
                        >
                          <span>{tr.icon}</span>
                          <span>{tr.label}</span>
                        </span>
                      );
                    })()}
                    {currentExam.academic_year && (
                      <span className="px-3 py-1 rounded-md text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <span>📅</span>
                        <span>{currentExam.academic_year}</span>
                      </span>
                    )}
                    {currentExam.school_or_department && (
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30 flex items-center gap-1 truncate max-w-[220px]" title={currentExam.school_or_department}>
                        <span>🏫</span>
                        <span className="truncate">{currentExam.school_or_department}</span>
                      </span>
                    )}
                    {currentExam.verdict && (
                      <span
                        className="px-3 py-1 rounded-md text-xs font-bold border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80"
                        title="Kết quả thẩm định quét kỹ của Bot"
                      >
                        {currentExam.verdict === 'XAC_MINH'
                          ? '✅ Xác minh'
                          : currentExam.verdict === 'CHUA_RO_RANG'
                            ? '⚠️ Chưa rõ ràng'
                            : currentExam.verdict === 'KO_RO_RANG'
                              ? '❓ Không rõ ràng'
                              : currentExam.verdict === 'KO_XAC_MINH'
                                ? '⛔ Không xác minh'
                                : `🛡️ ${currentExam.verdict}`}
                        {currentExam.confidence != null && ` • ${Math.round(Number(currentExam.confidence) * 100)}%`}
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 border border-slate-300 dark:border-white/10">
                      {currentExam.page_count} trang
                    </span>
                  </div>

                  <span className="text-xs text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã bốc đề ngẫu nhiên thành công!</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
                    {currentExam.title || currentExam.file_name}
                  </h3>
                  <div className="text-xs text-slate-400 dark:text-white/50 mt-1">
                    Tên tệp gốc:{' '}
                    <span className="font-mono text-purple-300">{currentExam.file_name}</span> (
                    {formatFileSize(currentExam.file_size_bytes)})
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                  <div>
                    <span className="text-white/40 block">Người đóng góp:</span>
                    <span className="font-semibold text-white/90">
                      {currentExam.author_name || 'Admin'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Số câu hỏi:</span>
                    <span className="font-semibold text-white/90">
                      {currentExam.question_count || 'N/A'} câu
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Định dạng file:</span>
                    <span className="font-semibold text-white/90 uppercase">
                      {currentExam.file_type || 'PDF'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Thời gian nộp:</span>
                    <span className="font-semibold text-white/90">
                      {currentExam.timestamp ? currentExam.timestamp.slice(0, 10) : 'Gần đây'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  {/* Nút ⭐ Lưu Vào Tủ Sách */}
                  <button
                    type="button"
                    onClick={() => {
                      const isBookmarked = bookmarkedIds.has(currentExam.id);
                      toggleBookmarkExam(currentExam.id);
                      setBookmarkedIds(new Set(getBookmarkedExamIds()));
                      if (!isBookmarked) {
                        showSuccess(
                          `Đã lưu "${currentExam.title || currentExam.file_name}" vào Tủ Sách Cá Nhân! ⭐`,
                          'Tủ Sách'
                        );
                      } else {
                        showInfo(
                          `Đã gỡ "${currentExam.title || currentExam.file_name}" khỏi Tủ Sách.`,
                          'Tủ Sách'
                        );
                      }
                    }}
                    aria-label={
                      bookmarkedIds.has(currentExam.id)
                        ? 'Bỏ lưu đề thi khỏi tủ sách cá nhân'
                        : 'Lưu đề thi vào tủ sách cá nhân'
                    }
                    className={`inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer ${
                      bookmarkedIds.has(currentExam.id)
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 shrink-0 ${
                        bookmarkedIds.has(currentExam.id) ? 'fill-current text-amber-400' : ''
                      }`}
                    />
                    <span>{bookmarkedIds.has(currentExam.id) ? 'Đã Lưu Vào Tủ Sách' : '⭐ Lưu Vào Tủ Sách'}</span>
                  </button>

                  {/* Nút Mở Tệp Trực Tiếp */}
                  <a
                    href={`${getApiBaseUrl()}/api/documents/${currentExam.id}/download?ngrok-skip-browser-warning=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-950/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0 stroke-[2.5]" />
                    <span>Mở Tệp Trực Tiếp</span>
                  </a>

                  {/* Nút 1: Tải Đề Trực Tiếp Về Máy */}
                  <a
                    href={`${getApiBaseUrl()}/api/documents/${currentExam.id}/download?ngrok-skip-browser-warning=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={currentExam.file_name || 'de_thi.pdf'}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0 stroke-[2.5]" />
                    <span>
                      Tải Đề Trực Tiếp Về Máy ({(currentExam.file_type || 'PDF').toUpperCase()})
                    </span>
                  </a>

                  {/* Nút 2: Mở Trên Discord */}
                  {getSafeExternalUrl(currentExam.jump_url) && (
                    <a
                      href={getSafeExternalUrl(currentExam.jump_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-[#5865F2]/20 hover:-translate-y-0.5 active:scale-95 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Xem Bài Đăng Discord</span>
                    </a>
                  )}

                  {/* Nút 3: Bốc Đề Khác */}
                  <button
                    onClick={handlePickRandomExam}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Bốc Đề Khác</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: KHO ĐỀ (TÁCH RIÊNG 28+ ĐỀ ĐANG CÓ)                             */}
        {/* ===================================================================== */}
        {activeTab === 'vault' && !hubLocked && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-pink-500" />
                <span>Kho Lưu Trữ Đề Thi Đã Thẩm Định</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-3">
                    <span>Kho Đề Thi</span>
                    <span className="text-sm sm:text-base font-bold px-3 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30">
                      {stats.total_real} Đề
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                    Duyệt toàn bộ tài liệu & đề thi đã qua thẩm định tự động. Hệ thống hỗ trợ lọc xem đề trùng lặp và đề độc bản.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-4 h-4 text-purple-400" />
                    <span>Tìm Siêu Tốc (Ctrl+K)</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('submit_doc')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-900/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>+ Nộp Đề Mới Vào Kho</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Thước Đo Phân Bố Tài Liệu Theo 7 Khối Lớp */}
            <div className="p-4 sm:p-5 rounded-2xl liquid-glass border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  Phân Bố Tài Liệu 7 Khối Lớp (Đồng Bộ Mã Màu Discord Roles)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tổng {documentsList.length} đề thi
                </span>
              </div>

              {/* Multi-segmented visual bar */}
              <div className="w-full h-3 rounded-md bg-white/5 overflow-hidden flex">
                {gradeDistribution['12'] > 0 && (
                  <div
                    className="h-full bg-red-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['12'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 12: ${gradeDistribution['12']} đề`}
                    onClick={() => handleGradeChange('GRADE_12')}
                  />
                )}
                {gradeDistribution['11'] > 0 && (
                  <div
                    className="h-full bg-orange-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['11'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 11: ${gradeDistribution['11']} đề`}
                    onClick={() => handleGradeChange('GRADE_11')}
                  />
                )}
                {gradeDistribution['10'] > 0 && (
                  <div
                    className="h-full bg-amber-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['10'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 10: ${gradeDistribution['10']} đề`}
                    onClick={() => handleGradeChange('GRADE_10')}
                  />
                )}
                {gradeDistribution['9'] > 0 && (
                  <div
                    className="h-full bg-emerald-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['9'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 9: ${gradeDistribution['9']} đề`}
                    onClick={() => handleGradeChange('GRADE_9')}
                  />
                )}
                {gradeDistribution['8'] > 0 && (
                  <div
                    className="h-full bg-cyan-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['8'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 8: ${gradeDistribution['8']} đề`}
                    onClick={() => handleGradeChange('GRADE_8')}
                  />
                )}
                {gradeDistribution['7'] > 0 && (
                  <div
                    className="h-full bg-blue-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['7'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 7: ${gradeDistribution['7']} đề`}
                    onClick={() => handleGradeChange('GRADE_7')}
                  />
                )}
                {gradeDistribution['6'] > 0 && (
                  <div
                    className="h-full bg-purple-500 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ width: `${(gradeDistribution['6'] / Math.max(1, documentsList.length)) * 100}%` }}
                    title={`Lớp 6: ${gradeDistribution['6']} đề`}
                    onClick={() => handleGradeChange('GRADE_6')}
                  />
                )}
              </div>

              {/* Legend labels */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_12')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Lớp 12 ({gradeDistribution['12']})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_11')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Lớp 11 ({gradeDistribution['11']})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_10')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Lớp 10 ({gradeDistribution['10']})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_9')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Lớp 9 ({gradeDistribution['9']})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_8')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Lớp 8 ({gradeDistribution['8']})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_7')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Lớp 7 ({gradeDistribution['7']})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGradeChange('GRADE_6')}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Lớp 6 ({gradeDistribution['6']})</span>
                </button>
              </div>
            </div>

            {/* Bộ Lọc Danh Sách Đề (Không hiển thị nút Bốc Đề Ngẫu Nhiên) */}
            {renderFilterControls(false)}

            {/* ========================================================================= */}
            {/* DANH SÁCH TẤT CẢ CÁC ĐỀ THI TRONG KHO (FULL CATALOG LIST)                 */}
            {/* ========================================================================= */}
            <div className="space-y-5 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">
                      {showBookmarksOnly ? '⭐ Tủ Sách Ôn Luyện Của Tôi' : 'Danh Sách Tất Cả Các Đề Thi Trong Kho'}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-white/40">
                      {showBookmarksOnly
                        ? `Hiển thị ${displayedDocuments.length} đề thi bạn đã đánh dấu ⭐ yêu thích`
                        : `Hiển thị ${displayedDocuments.length} đề thi • ${stats.unique_items} đề độc bản • ${stats.duplicate_items} đề trùng lặp`}
                    </p>
                  </div>
                </div>

                {/* Bộ Lọc Trùng Lặp & Tủ Sách (Tất cả, Đề độc bản, Đề trùng lặp, ⭐ Tủ Sách) */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      setFilterDup('all');
                      fetchDocuments(selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, 'all');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !showBookmarksOnly && filterDup === 'all'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tất Cả ({stats.total_real})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      setFilterDup('unique');
                      fetchDocuments(selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, 'unique');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      !showBookmarksOnly && filterDup === 'unique'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-300'
                    }`}
                  >
                    <span>Đề Độc Bản</span>
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-emerald-500/20 text-emerald-300">
                      {stats.unique_items}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      setFilterDup('duplicate');
                      fetchDocuments(selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, 'duplicate');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      !showBookmarksOnly && filterDup === 'duplicate'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300'
                    }`}
                  >
                    <span>Đề Trùng Lặp</span>
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-amber-500/20 text-amber-300">
                      {stats.duplicate_items}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBookmarksOnly((prev) => !prev)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      showBookmarksOnly
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300'
                    }`}
                    title="Xem các đề thi bạn đã bấm ⭐ lưu vào tủ sách cá nhân"
                  >
                    <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current text-slate-950' : 'text-amber-400'}`} />
                    <span>Tủ Sách</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      showBookmarksOnly ? 'bg-black/20 text-slate-950' : 'bg-amber-500/20 text-amber-500 dark:text-amber-300'
                    }`}>
                      {bookmarkedIds.size}
                    </span>
                  </button>
                </div>

                {/* Sắp Xếp Nâng Cao */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 px-3 py-1 rounded-xl">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                    Sắp xếp:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900 text-white">Mới Nhất</option>
                    <option value="pages" className="bg-slate-900 text-white">Nhiều Trang Nhất</option>
                    <option value="size" className="bg-slate-900 text-white">Dung Lượng Lớn</option>
                    <option value="confidence" className="bg-slate-900 text-white">Độ Tin Cậy AI</option>
                  </select>
                </div>

                {/* Nút Xem Tất Cả / Reset Nhanh */}
                {(selectedEducationLevel !== 'ALL' ||
                  selectedGrade !== 'ALL' ||
                  selectedExamType !== 'ALL' ||
                  selectedSubject !== 'ALL' ||
                  descriptionKeyword ||
                  showBookmarksOnly ||
                  activeAdvancedFilterCount > 0) && (
                  <button
                    onClick={handleResetAllFilters}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 w-fit border border-purple-500/20"
                    title="Khôi phục trạng thái xem toàn bộ kho đề"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đặt Lại Bộ Lọc ({stats.total_real} đề)</span>
                  </button>
                )}
              </div>

              {/* BỘ LỌC ĐỀ NÂNG CAO (NĂM HỌC, TRƯỜNG/SỞ RA ĐỀ, CHUẨN BỘ GD&ĐT 2025, ĐÁP ÁN) */}
              <div className="p-4 sm:p-5 rounded-2xl liquid-glass border border-white/10 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                    <span>Bộ Lọc Chuyên Sâu (Năm Học, Nguồn Ra Đề, Cấu Trúc 2025 & Đáp Án)</span>
                    {activeAdvancedFilterCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-pink-500 text-white animate-pulse">
                        {activeAdvancedFilterCount} đang chọn
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Tìm thấy:</span>
                    <span className="text-white font-bold px-2 py-0.5 rounded-lg bg-white/10 font-mono">
                      {displayedDocuments.length} / {documentsList.length} đề
                    </span>
                  </div>
                </div>

                {/* Hàng 1: Chọn Năm Học & Trường / Sở GD&ĐT Ra Đề */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Lọc Năm Học */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Năm Học Ra Đề:</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAcademicYear}
                        onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                      >
                        <option value="ALL">Mọi Năm Học (Toàn bộ)</option>
                        {availableAcademicYears.map(({ year, count }) => (
                          <option key={year} value={year}>
                            📅 Năm học {year} ({count} đề)
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Lọc Trường / Sở GD&ĐT Ra Đề */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-violet-400" />
                      <span>Trường / Sở GD&ĐT Ra Đề:</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSchool}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-violet-500 cursor-pointer appearance-none"
                      >
                        <option value="ALL">Tất Cả Trường & Sở GD&ĐT</option>
                        {availableSchools.map(({ school, count }) => (
                          <option key={school} value={school}>
                            🏫 {school} ({count} đề)
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: Các Toggle Pills Chuyên Sâu */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    Đặc điểm đề thi:
                  </span>

                  {/* Pill 1: Chuẩn Bộ GD&ĐT 2025 */}
                  <button
                    type="button"
                    onClick={() => setFilterMoet2025((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterMoet2025
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/30 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-cyan-950/30 hover:text-cyan-300 border border-white/10'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${filterMoet2025 ? 'text-slate-950' : 'text-cyan-400'}`} />
                    <span>✨ Chuẩn Bộ GD&ĐT 2025 (3 Phần)</span>
                  </button>

                  {/* Pill 2: Có Bảng Đáp Án */}
                  <button
                    type="button"
                    onClick={() => setFilterHasAnswers((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterHasAnswers
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-emerald-950/30 hover:text-emerald-300 border border-white/10'
                    }`}
                  >
                    <FileCheck className={`w-3.5 h-3.5 ${filterHasAnswers ? 'text-slate-950' : 'text-emerald-400'}`} />
                    <span>📝 Có Bảng Đáp Án</span>
                  </button>

                  {/* Pill 3: Có Lời Giải Chi Tiết */}
                  <button
                    type="button"
                    onClick={() => setFilterHasSolutions((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterHasSolutions
                        ? 'bg-purple-500 text-white shadow-md shadow-purple-900/30 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-purple-950/30 hover:text-purple-300 border border-white/10'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${filterHasSolutions ? 'text-white' : 'text-purple-400'}`} />
                    <span>💡 Có Lời Giải Chi Tiết</span>
                  </button>

                  {/* Pill 4: Đã Có Link Discord / CDN */}
                  <button
                    type="button"
                    onClick={() => setFilterHasDiscordLink((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterHasDiscordLink
                        ? 'bg-[#5865F2] text-white shadow-md shadow-[#5865F2]/30 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-[#5865F2]/20 hover:text-indigo-300 border border-white/10'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>🚀 Đã Đồng Bộ Kênh Discord</span>
                  </button>

                  {/* Clear All Advanced Filters */}
                  {activeAdvancedFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAcademicYear('ALL');
                        setSelectedSchool('ALL');
                        setFilterMoet2025(false);
                        setFilterHasAnswers(false);
                        setFilterHasSolutions(false);
                        setFilterHasDiscordLink(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer ml-auto"
                    >
                      ✕ Bỏ {activeAdvancedFilterCount} bộ lọc
                    </button>
                  )}
                </div>
              </div>

              {/* Grid các đề thi */}
              {isLoadingDocs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl liquid-glass border border-white/10 space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-5 rounded-md skeleton-shimmer" />
                          <div className="w-20 h-5 rounded-md skeleton-shimmer" />
                          <div className="w-14 h-5 rounded-md skeleton-shimmer" />
                        </div>
                        <div className="w-12 h-4 rounded-md skeleton-shimmer" />
                      </div>
                      <div className="space-y-2">
                        <div className="w-5/6 h-5 rounded-lg skeleton-shimmer" />
                        <div className="w-1/2 h-3.5 rounded-lg skeleton-shimmer" />
                      </div>
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-white/5">
                        <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
                        <div className="flex-1 h-9 rounded-xl skeleton-shimmer" />
                        <div className="flex-1 h-9 rounded-xl skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : showBookmarksOnly && displayedDocuments.length === 0 ? (
                <div className="p-12 rounded-3xl bg-amber-500/5 dark:bg-amber-500/[0.03] border border-dashed border-amber-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6" />
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-white">
                    Tủ sách ôn luyện của bạn đang trống!
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/60 max-w-md mx-auto">
                    Hãy bấm biểu tượng ngôi sao ⭐ trên các đề thi bạn quan tâm để lưu vào tủ sách cá nhân và ôn luyện lại bất kỳ lúc nào.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBookmarksOnly(false)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Xem Tất Cả {stats.total_real} Đề Thi
                  </button>
                </div>
              ) : displayedDocuments.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedDocuments.map((doc) => {
                    const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
                    const trackInfo = getExamTrackInfo(doc);

                    return (
                      <div
                        key={doc.id}
                        className={`p-5 rounded-2xl liquid-glass border transition-all shadow-sm space-y-3.5 flex flex-col justify-between group ${
                          doc.is_duplicate_copy
                            ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/70'
                            : 'border-white/10 hover:border-purple-500/50'
                        }`}
                      >
                        {/* Top Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {doc.subject}
                            </span>
                            {/* Bậc giáo dục: Chung, Cấp 2, Cấp 3 */}
                            {(() => {
                              const eduBadge = getEducationLevelBadgeInfo(doc);
                              return (
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${eduBadge.badgeClass}`}
                                >
                                  <span>{eduBadge.icon}</span>
                                  <span>{eduBadge.shortLabel}</span>
                                </span>
                              );
                            })()}
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${trackInfo.badgeClass}`}
                              title={`${trackInfo.description} (${trackInfo.difficultyNote})`}
                            >
                              <span>{trackInfo.icon}</span>
                              <span>{trackInfo.label}</span>
                            </span>
                            {/* Khối lớp chuẩn 7 Role Discord Server */}
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${gradeStyle.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
                              <span>{gradeStyle.label}</span>
                            </span>
                            {/* Duplicate badge */}
                            {doc.is_duplicate_copy ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                ⚠️ Bản Trùng (#{doc.id})
                              </span>
                            ) : doc.is_duplicate ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                📌 Bản Gốc
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✨ Độc Bản
                              </span>
                            )}
                            {/* Năm học bóc tách (Bấm để lọc theo năm) */}
                            {doc.academic_year && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAcademicYear(doc.academic_year || 'ALL');
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 flex items-center gap-1 transition-all cursor-pointer"
                                title={`Lọc nhanh các đề thuộc năm học ${doc.academic_year}`}
                              >
                                <span>📅</span>
                                <span>{doc.academic_year}</span>
                              </button>
                            )}
                            {/* Trường / Tỉnh bóc tách (Bấm để lọc theo trường) */}
                            {doc.school_or_department && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSchool(doc.school_or_department || 'ALL');
                                }}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:border-violet-400 flex items-center gap-1 truncate max-w-[170px] transition-all cursor-pointer"
                                title={`Lọc nhanh các đề thuộc ${doc.school_or_department}`}
                              >
                                <span>🏫</span>
                                <span className="truncate">{doc.school_or_department}</span>
                              </button>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/30 uppercase font-bold">
                              {doc.file_type || 'PDF'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
                            {formatFileSize(doc.file_size_bytes)}
                          </span>
                        </div>

                        {/* Tiêu đề & Thông tin đề (Nhấn để mở Hồ Sơ Chi Tiết) */}
                        <div
                          onClick={() => {
                            setSelectedDossierDoc(doc);
                            setIsDossierOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                            {doc.title || doc.file_name}
                          </h4>
                          <div className="text-[11px] text-slate-400 dark:text-white/40 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>{doc.page_count} trang</span>
                            {doc.question_count > 0 && <span>• {doc.question_count} câu</span>}
                            <span>• Nộp bởi {doc.author_name || 'Admin'}</span>
                          </div>
                          {doc.notes && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-300 flex items-start gap-1.5">
                              <span className="font-bold shrink-0">📝 Ghi chú:</span>
                              <span className="line-clamp-2">{doc.notes}</span>
                            </div>
                          )}
                          {(doc.verdict || doc.exam_track || doc.confidence != null) && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                              {doc.verdict && (
                                <span
                                  title="Kết quả thẩm định quét kỹ của Bot"
                                  className={`font-bold px-1.5 py-0.5 rounded-md border ${
                                    doc.verdict === 'XAC_MINH'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : doc.verdict === 'KO_XAC_MINH'
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                  }`}
                                >
                                  {doc.verdict === 'XAC_MINH'
                                    ? '✅ Xác minh'
                                    : doc.verdict === 'CHUA_RO_RANG'
                                      ? '⚠️ Chưa rõ ràng'
                                      : doc.verdict === 'KO_RO_RANG'
                                        ? '❓ Không rõ ràng'
                                        : doc.verdict === 'KO_XAC_MINH'
                                          ? '⛔ Không xác minh'
                                          : `🛡️ ${doc.verdict}`}
                                </span>
                              )}
                              {doc.exam_track && (
                                <span
                                  title="Thể loại đề (thường < hsg < chuyên)"
                                  className="font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase"
                                >
                                  {doc.exam_track === 'thuong'
                                    ? '📚 Thường'
                                    : doc.exam_track === 'hsg'
                                      ? '🏅 HSG'
                                      : doc.exam_track === 'chuyen'
                                        ? '🏆 Chuyên'
                                        : doc.exam_track === 'quoc_te'
                                          ? '🌍 Quốc tế'
                                          : `🏷️ ${doc.exam_track}`}
                                </span>
                              )}
                              {doc.confidence != null && (
                                <span
                                  title="Độ tin cậy phân loại của Bot"
                                  className="font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20"
                                >
                                  {Math.round(Number(doc.confidence) * 100)}%
                                </span>
                              )}
                              {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) && (
                                <span
                                  title="Đề thi cấu trúc chuẩn mới Bộ GD&ĐT 2025 (3 phần: Trắc nghiệm 4 lựa chọn, Đúng/Sai, Trả lời ngắn)"
                                  className="font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30"
                                >
                                  ✨ Chuẩn 2025
                                </span>
                              )}
                              {doc.has_answer_keys && (
                                <span
                                  title="Đề thi đã kèm bảng đáp án"
                                  className="font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20"
                                >
                                  📝 Có đáp án
                                </span>
                              )}
                              {doc.has_detailed_solutions && (
                                <span
                                  title="Đề thi có hướng dẫn giải / lời giải chi tiết"
                                  className="font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20"
                                >
                                  ✨ Lời giải chi tiết
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Nút thao tác trên từng đề */}
                        <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-white/5">
                          {/* Nút ⭐ Bookmark / Lưu vào tủ sách */}
                          <button
                            type="button"
                            onClick={() => {
                              const isBookmarked = bookmarkedIds.has(doc.id);
                              toggleBookmarkExam(doc.id);
                              setBookmarkedIds(new Set(getBookmarkedExamIds()));
                              if (!isBookmarked) {
                                showSuccess(
                                  `Đã lưu "${doc.title || doc.file_name}" vào Tủ Sách! ⭐`,
                                  'Tủ Sách'
                                );
                              } else {
                                showInfo(
                                  `Đã gỡ "${doc.title || doc.file_name}" khỏi Tủ Sách.`,
                                  'Tủ Sách'
                                );
                              }
                            }}
                            aria-label={
                              bookmarkedIds.has(doc.id)
                                ? 'Bỏ lưu đề thi khỏi tủ sách cá nhân'
                                : 'Lưu đề thi vào tủ sách cá nhân'
                            }
                            className={`p-2.5 rounded-xl font-bold text-xs border flex items-center justify-center transition-all cursor-pointer ${
                              bookmarkedIds.has(doc.id)
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 border-transparent hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                            title={bookmarkedIds.has(doc.id) ? 'Bỏ lưu khỏi tủ sách cá nhân' : '⭐ Lưu vào tủ sách ôn luyện của tôi'}
                          >
                            <Star className={`w-3.5 h-3.5 ${bookmarkedIds.has(doc.id) ? 'fill-current text-amber-400' : ''}`} />
                          </button>

                          {/* Nút Xem Hồ Sơ Kiểm Định AI */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDossierDoc(doc);
                              setIsDossierOpen(true);
                            }}
                            className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                            title="Xem hồ sơ phân tích kiểm định chi tiết của AI"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Hồ Sơ</span>
                          </button>

                          {/* Mở xem trực tiếp trong tab mới */}
                          <a
                            href={`${getApiBaseUrl()}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-bold text-xs transition-all cursor-pointer"
                            title="Mở xem trực tiếp tệp trong tab mới"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mở Tệp</span>
                          </a>

                          <a
                            href={`${getApiBaseUrl()}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.file_name || 'de_thi.pdf'}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Tải Về</span>
                          </a>

                          {getSafeExternalUrl(doc.jump_url) && (
                            <a
                              href={getSafeExternalUrl(doc.jump_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-[#5865F2] hover:text-white text-slate-600 dark:text-white/70 transition-all cursor-pointer"
                              title="Mở bài đăng trên Discord"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Phân trang / Lazy load chống nghẽn DOM */}
                  {visibleCount < displayedDocuments.length && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-900/10 border border-purple-500/20 backdrop-blur-md">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Đang hiển thị <span className="font-bold text-purple-600 dark:text-purple-400">{paginatedDocuments.length}</span> / <span className="font-bold">{displayedDocuments.length}</span> đề thi phù hợp
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVisibleCount((prev) => Math.min(prev + 24, displayedDocuments.length))}
                          className="ux-btn-liquid px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-purple-950/30 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>⚡ Tải Thêm (+24 Đề)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibleCount(displayedDocuments.length)}
                          className="ux-btn-liquid px-4 py-2.5 rounded-2xl text-slate-700 dark:text-white/90 font-semibold text-xs transition-all cursor-pointer"
                        >
                          <span>Xem Toàn Bộ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : !botStatus.online ? (
                <div className="p-10 rounded-3xl bg-rose-500/10 dark:bg-rose-500/[0.05] border border-rose-500/30 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/20">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      🔴 Máy Chủ Bot Discord Đang Offline
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-white/70 max-w-md mx-auto leading-relaxed">
                      Kho đề thi được đồng bộ trực tiếp thời gian thực từ Discord Server.
                      Khi Discord Bot tắt, danh sách đề thi trên Web sẽ tạm ẩn để đảm bảo tính xác thực.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        checkBotStatus();
                        fetchDocStats();
                        fetchDocuments();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Kiểm Tra Lại Kết Nối</span>
                    </button>
                    <a
                      href="https://discord.gg/D34HX87bGe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Máy Chủ Discord</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 text-center space-y-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                      Không tìm thấy đề thi phù hợp với tiêu chí lọc
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm mx-auto">
                      Hãy thử chọn "Mọi Khối", "Mọi Loại Đề" hoặc nhấn nút bên dưới để khôi phục toàn bộ danh sách đề thi.
                    </p>
                  </div>

                  {(activeAdvancedFilterCount > 0 || selectedGrade !== 'ALL' || selectedExamType !== 'ALL' || selectedSubject !== 'ALL' || selectedEducationLevel !== 'ALL' || descriptionKeyword) && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">Đang lọc theo:</span>
                      {selectedEducationLevel !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          {selectedEducationLevel === 'CAP_2' ? 'Cấp 2 (THCS)' : 'Cấp 3 (THPT)'}
                        </span>
                      )}
                      {selectedGrade !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                          Lớp {selectedGrade}
                        </span>
                      )}
                      {selectedExamType !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          {selectedExamType}
                        </span>
                      )}
                      {selectedSubject !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {selectedSubject}
                        </span>
                      )}
                      {selectedAcademicYear !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          Năm {selectedAcademicYear}
                        </span>
                      )}
                      {selectedSchool !== 'ALL' && (
                        <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                          {selectedSchool}
                        </span>
                      )}
                      {filterMoet2025 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          Chuẩn 2025
                        </span>
                      )}
                      {descriptionKeyword && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-300 text-[10px] font-bold">
                          "{descriptionKeyword}"
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Xem Toàn Bộ Kho Đề Thi ({documentsList.length || stats.total_real} Đề)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: KHO NỘP ĐỀ (DOC UPLOAD & AUTO-INSPECT)                         */}
        {/* ===================================================================== */}
        {activeTab === 'submit_doc' && !hubLocked && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 mb-3">
                <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                <span>Trạm Nộp Đề & Thẩm Định Tài Liệu</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Kho Nộp Đề Thi
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                Kéo thả hoặc tải lên tài liệu / đề thi (PDF, DOCX). Bot sẽ tự động phân tích môn học, khối lớp, loại đề, số câu hỏi và kiểm tra chống trùng lặp.
              </p>
            </div>

            {/* Upload Zone Component */}
            <DocUploadZone
              apiBase={getApiBaseUrl()}
              user={user}
              botOnline={botStatus.online}
              onOpenAuthModal={onOpenAuthModal}
              onUploadSuccess={() => {
                fetchDocuments();
                fetchDocStats();
              }}
            />
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 5: QUẢN TRỊ VIÊN DISCORD & KHO ĐỀ (ADMIN PORTAL)                  */}
        {/* ===================================================================== */}
        {activeTab === 'admin' && (isAdmin || readCachedAdmin()) && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Suspense
              fallback={
                <div className="p-8 text-center text-xs text-slate-400">Đang tải Admin Hub...</div>
              }
            >
              <AdminPanel
                onClose={() => setActiveTab('overview')}
                onRefreshParentDocs={() => {
                  fetchDocuments();
                  fetchDocStats();
                }}
              />
            </Suspense>
          </div>
        )}
      </main>

      {/* [ARCHIVED]: Trình đọc PDF/Word modal đã chuyển vào src/archived/DocPreviewModal.tsx */}

      {/* Modal Hồ Sơ Kiểm Định Đề Thi Toàn Diện */}
      <ExamDossierModal
        doc={selectedDossierDoc}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        isBookmarked={selectedDossierDoc ? bookmarkedIds.has(selectedDossierDoc.id) : false}
        onToggleBookmark={(id) => {
          const isB = bookmarkedIds.has(id);
          toggleBookmarkExam(id);
          setBookmarkedIds(new Set(getBookmarkedExamIds()));
          if (!isB) {
            showSuccess('Đã lưu đề thi vào Tủ Sách Cá Nhân! ⭐', 'Tủ Sách');
          } else {
            showInfo('Đã bỏ lưu khỏi Tủ Sách.', 'Tủ Sách');
          }
        }}
        apiBase={getApiBaseUrl()}
      />

      {/* Thanh Tìm Kiếm Siêu Tốc & Lệnh Nhanh (Ctrl+K / ⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documentsList}
        onSelectExam={(doc) => {
          setSelectedDossierDoc(doc);
          setIsDossierOpen(true);
        }}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onNavigateHome={onBackToHome}
        onTriggerRandomExam={handlePickRandomExam}
      />
    </div>
  );
};
