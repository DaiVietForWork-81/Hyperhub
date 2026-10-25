import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  Home,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
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
  Scale,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Target,
} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken, getStoredDiscordUser } from '../utils/discordAuth';
import {
  getApiBaseUrl,
  API_FETCH_HEADERS,
  DEFAULT_TUNNEL_URL,
  setCustomApiUrl,
} from '../utils/apiConfig';
const DocUploadZone = lazy(() =>
  import('./DocUploadZone').then((m) => ({ default: m.DocUploadZone }))
);
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
import { sound } from '../utils/audio';
import { PixelMark } from './hh/PixelMark';
import { PixelButton, SpotSurface } from './hh/Controls';
import { getNextThptExamInfo } from './ExamCountdown';
import {
  HubLayoutProvider,
  useHubLayout,
  ResizableCard,
} from './HubResizable';

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
  quorum_status?: string | null;
  quorum_arbitration?: any;
  draft_dossier_markdown?: string | null;
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
    badgeClass: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 border-slate-200 dark:border-[#241a38]',
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

const DashboardContent: React.FC<DashboardProps> = ({
  user,
  initialTab,
  onTabChange,
  onOpenAuthModal,
  onLogout,
  onBackToHome,
}) => {
  const { config } = useHubLayout();
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
  const [descriptionKeyword, setDescriptionKeyword] = useState<string>(() => {
    try {
      const prefill = sessionStorage.getItem('orbit_subject_filter');
      if (prefill) {
        sessionStorage.removeItem('orbit_subject_filter');
        return prefill;
      }
    } catch {}
    return '';
  });

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
  const [totalDocsCount, setTotalDocsCount] = useState<number>(29);
  const [stats, setStats] = useState<{
    total_real: number;
    unique_items: number;
    duplicate_items: number;
  }>({ total_real: 29, unique_items: 28, duplicate_items: 2 });
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
        signal: AbortSignal.timeout(8000),
      });

      // Nếu endpoint hiện tại lỗi, tự động thử DEFAULT_TUNNEL_URL (trên môi trường HTTPS)
      if (!res.ok && apiBase !== DEFAULT_TUNNEL_URL && (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
        try {
          const fallbackRes = await fetch(`${DEFAULT_TUNNEL_URL}/api/status`, {
            headers: API_FETCH_HEADERS,
            signal: AbortSignal.timeout(8000),
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
            signal: AbortSignal.timeout(8000),
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

  // 2. Lấy danh sách tất cả đề thi từ Kho Discord hoặc Turso Cloud (Full List)
  const fetchDocuments = useCallback(
    async (
      gradeOverride?: string,
      typeOverride?: string,
      subjectOverride?: string,
      searchOverride?: string,
      dupOverride?: 'all' | 'unique' | 'duplicate'
    ) => {
      setIsLoadingDocs(true);
      let apiResolved = false;

      // Chạy song song Turso Cloud (~95ms) để giao diện hiển thị ngay 179 đề mà không bị kẹt chờ timeout localhost:8080
      const tursoPromise = fetchDocsFromTurso(500)
        .then((tursoDocs) => {
          if (!apiResolved && tursoDocs && tursoDocs.length > 0) {
            setDocumentsList(tursoDocs as any);
            setTotalDocsCount(tursoDocs.length);
            setStats((prev) =>
              prev.total_real > 30 && prev.unique_items > 0 && prev.unique_items <= prev.total_real
                ? prev
                : {
                    total_real: tursoDocs.length,
                    unique_items: tursoDocs.length,
                    duplicate_items: 0,
                  }
            );
            setIsLoadingDocs(false);
          }
          return tursoDocs;
        })
        .catch(() => null);

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
            apiResolved = true;
            setDocumentsList(data.documents);
            setTotalDocsCount(data.total ?? data.documents.length);
          } else {
            await tursoPromise;
          }
        } else {
          await tursoPromise;
        }
      } catch {
        await tursoPromise;
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, filterDup]
  );

  // 3. Lấy thống kê số lượng tài liệu (tự động chạy song song Turso Cloud khi Bot offline)
  const fetchDocStats = useCallback(async () => {
    let apiStatsResolved = false;
    const tursoStatsPromise = getTursoStorageUsage()
      .then((tursoStats) => {
        if (!apiStatsResolved && tursoStats && tursoStats.totalDocs > 0) {
          setStats({
            total_real: tursoStats.totalDocs,
            unique_items: tursoStats.totalDocs,
            duplicate_items: 0,
          });
          setTotalDocsCount(tursoStats.totalDocs);
        }
        return tursoStats;
      })
      .catch(() => null);

    try {
      let apiBase = getApiBaseUrl();
      let res = await fetch(`${apiBase}/api/documents/stats`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok && apiBase !== DEFAULT_TUNNEL_URL && (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
        try {
          const fbRes = await fetch(`${DEFAULT_TUNNEL_URL}/api/documents/stats`, {
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
        if (data.success) {
          apiStatsResolved = true;
          setStats({
            total_real: data.total_real || data.total_items || 0,
            unique_items: data.unique_items || 0,
            duplicate_items: data.duplicate_items || 0,
          });
          setTotalDocsCount(data.total_real || data.total_items || 0);
        } else {
          await tursoStatsPromise;
        }
      } else {
        await tursoStatsPromise;
      }
    } catch {
      await tursoStatsPromise;
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

  // Giải quyết link mở/tải tệp an toàn (khi Bot offline thì ưu tiên link gốc Discord hoặc mở Hồ Sơ AI)
  const resolveExamFileUrl = useCallback(
    (doc: ExamDocument): string => {
      if (botStatus.online) {
        return `${getApiBaseUrl()}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`;
      }
      const dl = getSafeExternalUrl(doc.download_url);
      if (dl) return dl;
      const jump = getSafeExternalUrl(doc.jump_url);
      if (jump && !jump.includes('#vault')) return jump;
      return '';
    },
    [botStatus.online]
  );

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

    if (botStatus.online) {
      fetchDocuments(nextGrade, selectedExamType, nextSubject, descriptionKeyword);
    }
  };

  // Cập nhật danh sách khi đổi filter
  const handleGradeChange = (gradeId: string) => {
    setSelectedGrade(gradeId);
    if (botStatus.online) {
      fetchDocuments(gradeId, selectedExamType, selectedSubject, descriptionKeyword);
    }
  };

  const handleExamTypeChange = (typeId: string) => {
    setSelectedExamType(typeId);
    if (botStatus.online) {
      fetchDocuments(selectedGrade, typeId, selectedSubject, descriptionKeyword);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    if (botStatus.online) {
      fetchDocuments(selectedGrade, selectedExamType, subjectId, descriptionKeyword);
    }
  };

  // 4. Xử lý Lọc / Tìm kiếm form
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botStatus.online) {
      fetchDocuments(selectedGrade, selectedExamType, selectedSubject, descriptionKeyword);
    }
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

  // ============================================================================
  // POMODORO FOCUS & CHILL TIMER (LEARN • CHILL • CONNECT TRONG HUB)
  // ============================================================================
  const [pomoMode, setPomoMode] = useState<'focus' | 'chill'>('focus');
  const [pomoSeconds, setPomoSeconds] = useState<number>(25 * 60);
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!pomoRunning) return;
    const timer = window.setInterval(() => {
      setPomoSeconds((prev) => {
        if (prev <= 1) {
          setPomoRunning(false);
          sound.playClick();
          const nextMode = pomoMode === 'focus' ? 'chill' : 'focus';
          setPomoMode(nextMode);
          showInfo(
            nextMode === 'chill'
              ? 'Đã hoàn thành 25 phút tập trung! Nghỉ ngơi 5 phút nhé 🌸'
              : 'Hết giờ nghỉ! Bắt đầu phiên tập trung mới nhé ⚡',
            'Pomodoro Hub'
          );
          return nextMode === 'chill' ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomoRunning, pomoMode, showInfo]);

  const togglePomoMode = (mode: 'focus' | 'chill') => {
    setPomoRunning(false);
    setPomoMode(mode);
    setPomoSeconds(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatPomo = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const pomoTotal = pomoMode === 'focus' ? 25 * 60 : 5 * 60;
  const pomoProgress = Math.max(0, Math.min(1, 1 - pomoSeconds / pomoTotal));

  // ============================================================================
  // MỤC TIÊU TRƯỜNG MƠ ƯỚC (ĐỒNG BỘ VỚI TRANG CHỦ HYPERHUB)
  // ============================================================================
  const [dreamGoal, setDreamGoal] = useState<{ school: string; score: string } | null>(null);
  const [isEditingDream, setIsEditingDream] = useState<boolean>(false);
  const [dreamSchoolInput, setDreamSchoolInput] = useState<string>('');
  const [dreamScoreInput, setDreamScoreInput] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('orbit_user_dream_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.school) {
          setDreamGoal({ school: parsed.school, score: parsed.score || '' });
          setDreamSchoolInput(parsed.school);
          setDreamScoreInput(parsed.score || '');
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSaveDreamInHub = (e: React.FormEvent) => {
    e.preventDefault();
    const school = dreamSchoolInput.trim();
    const score = dreamScoreInput.trim();
    if (!school) return;
    const payload = { school, score, updatedAt: new Date().toISOString() };
    try {
      const serialized = JSON.stringify(payload);
      localStorage.setItem('orbit_user_dream_v2', serialized);
      setDreamGoal({ school, score });
      setIsEditingDream(false);
      showSuccess(`Đã ghim mục tiêu: ${school}`, 'Mục Tiêu Học Tập');
    } catch {
      showError('Không thể lưu mục tiêu vào trình duyệt.');
    }
  };

  // ============================================================================
  // MÁY BỐC ĐỀ VOXEL (SLOT REEL ANIMATION + BỐC THỬ TỨC THÌ TỪ KHO WEB)
  // ============================================================================
  const [isRollingReel, setIsRollingReel] = useState<boolean>(false);
  const [reelTick, setReelTick] = useState<number>(0);

  useEffect(() => {
    if (!isRollingReel && !isLoadingExam) return;
    const id = window.setInterval(() => {
      setReelTick((t) => (t + 1) % 12);
    }, 75);
    return () => window.clearInterval(id);
  }, [isRollingReel, isLoadingExam]);

  const handleInstantPracticePick = useCallback(() => {
    setExamError('');
    const pool = displayedDocuments.length > 0 ? displayedDocuments : documentsList;
    if (pool.length === 0) {
      setExamError('Hiện chưa có đề thi nào khớp với bộ lọc để bốc thử. Hãy thử đặt lại bộ lọc!');
      return;
    }
    sound.playClick();
    setIsRollingReel(true);
    window.setTimeout(() => {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setCurrentExam(picked);
      setIsRollingReel(false);
      showSuccess(`Đã bốc đề luyện tập: ${picked.title || picked.file_name}`, 'Máy Phát Đề Orbit');
    }, 520);
  }, [displayedDocuments, documentsList, showSuccess]);

  // Thống kê phân bố theo môn học thực tế trong kho (sắp xếp giảm dần theo số lượng đề thật)
  const subjectBreakdown = useMemo(() => {
    const catalog = [
      { id: 'ENGLISH', label: 'Ngoại ngữ (Tiếng Anh)', tone: '#9B5CFF' },
      { id: 'LITERATURE', label: 'Ngữ văn', tone: '#FF4FCB' },
      { id: 'GENERAL', label: 'Tài liệu & Chuyên đề chung', tone: '#9B5CFF' },
      { id: 'MATHEMATICS', label: 'Toán học', tone: '#9B5CFF' },
      { id: 'INFORMATICS', label: 'Tin học & Thuật toán', tone: '#FF4FCB' },
      { id: 'PHYSICS', label: 'Vật lí', tone: '#9B5CFF' },
      { id: 'CHEMISTRY', label: 'Hóa học', tone: '#9B5CFF' },
    ];
    const withCounts = catalog.map((item) => {
      const count = documentsList.filter((d) =>
        item.id === 'GENERAL'
          ? (d.subject || '').toUpperCase() === 'GENERAL' || !d.subject
          : isDocMatchingSubject(d.subject, item.id)
      ).length;
      return { ...item, count };
    });
    withCounts.sort((a, b) => b.count - a.count);
    return withCounts.slice(0, 6);
  }, [documentsList]);

  // Đồng bộ ngày đếm ngược kỳ thi THPT Quốc Gia với Trang chủ
  const nextThptExam = useMemo(() => getNextThptExamInfo(), []);

  const [showAdvancedDrawer, setShowAdvancedDrawer] = useState<boolean>(false);

  // ============================================================================
  // BÀN LỌC CHIẾN THUẬT GỌN GÀNG (TACTICAL FILTER CONSOLE)
  // ============================================================================
  const renderFilterControls = (showRollButton: boolean = true) => {
    const gradeOptions =
      selectedEducationLevel === 'CAP_2'
        ? CAP2_GRADE_OPTIONS
        : selectedEducationLevel === 'CAP_3'
        ? CAP3_GRADE_OPTIONS
        : ALL_GRADE_OPTIONS;

    const subjectOptions =
      selectedEducationLevel === 'CAP_2'
        ? CAP2_SUBJECT_OPTIONS
        : selectedEducationLevel === 'CAP_3'
        ? CAP3_SUBJECT_OPTIONS
        : ALL_SUBJECT_OPTIONS;

    const hasAnyFilter =
      selectedEducationLevel !== 'ALL' ||
      selectedGrade !== 'ALL' ||
      selectedExamType !== 'ALL' ||
      selectedSubject !== 'ALL' ||
      Boolean(descriptionKeyword.trim()) ||
      showBookmarksOnly ||
      activeAdvancedFilterCount > 0;

    return (
      <SpotSurface className="hh-hub-surface p-5 sm:p-6 space-y-5">
        {/* HÀNG 1: TIÊU ĐỀ CONSOLE + CHUYỂN CẤP HỌC + ĐẾM KẾT QUẢ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#241a38]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#9B5CFF]/15 border border-[#9B5CFF]/35 text-[#FFB8E6] flex items-center justify-center shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="hh-pixel text-[13px] text-[#FF4FCB] uppercase">FILTER // CONSOLE</span>
                <span className="text-[13px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  {displayedDocuments.length} / {documentsList.length || stats.total_real} đề
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Bộ Lọc Chiến Thuật & Định Vị Đề Thi
              </h3>
            </div>
          </div>

          {/* Segmented Switcher: Bậc Giáo Dục (Chung / Cấp 2 / Cấp 3) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0B0911]/90 border border-[#241a38]">
            {EDUCATION_LEVEL_OPTIONS.map((opt) => {
              const isSelected = selectedEducationLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleEducationLevelChange(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#d61f79] text-white shadow-[0_4px_14px_rgba(255,79,203,0.35)]'
                      : 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                  <span className={`hidden sm:inline text-[13px] font-mono ${isSelected ? 'text-white/90' : 'text-white/40'}`}>
                    ({opt.id === 'ALL' ? '6–12' : opt.id === 'CAP_2' ? '6–9' : '10–12'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {examError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-[13px] sm:text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{examError}</span>
            </div>
            <button
              type="button"
              onClick={handleInstantPracticePick}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-[13px] shrink-0 cursor-pointer"
            >
              ⚡ Bốc thử từ kho Web
            </button>
          </div>
        )}

        <form onSubmit={handleFilterSubmit} className="space-y-4">
          {/* HÀNG 2: THANH TÌM KIẾM ĐA TỪ KHÓA + SẮP XẾP + NÚT MỞ LỌC CHUYÊN SÂU */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-7 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A6FF]" />
              <input
                type="text"
                value={descriptionKeyword}
                onChange={(e) => {
                  setDescriptionKeyword(e.target.value);
                  fetchDocuments(selectedGrade, selectedExamType, selectedSubject, e.target.value);
                }}
                placeholder="Tìm theo tên đề, chuyên đề (hàm số, quy hoạch động, wordform, HSG Tỉnh...)"
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#0D0A14]/90 border border-[#241a38] focus:border-[#FF4FCB] text-white text-[13px] sm:text-sm placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#FF4FCB]/20 transition-all"
              />
              {descriptionKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setDescriptionKeyword('');
                    fetchDocuments(selectedGrade, selectedExamType, selectedSubject, '');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sắp xếp danh sách đề thi"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0D0A14]/90 border border-[#241a38] focus:border-[#9B5CFF] text-[13px] sm:text-sm font-bold text-white cursor-pointer focus:outline-none"
              >
                <option value="newest">⚡ Mới cập nhật nhất</option>
                <option value="confidence">🛡️ Độ tin cậy AI cao nhất</option>
                <option value="pages">📄 Nhiều trang nhất</option>
                <option value="size">📦 Dung lượng lớn nhất</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedDrawer((prev) => !prev)}
                aria-expanded={showAdvancedDrawer || activeAdvancedFilterCount > 0}
                className={`w-full h-11 px-3.5 rounded-xl border text-[13px] font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  showAdvancedDrawer || activeAdvancedFilterCount > 0
                    ? 'bg-[#FF4FCB]/15 border-[#FF4FCB]/50 text-[#FFB8E6]'
                    : 'bg-[#0D0A14]/90 border-[#241a38] text-white/75 hover:text-white hover:border-white/20'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF4FCB]" />
                <span>Lọc sâu</span>
                {activeAdvancedFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#FF4FCB] text-[#0E0C14] font-mono text-[13px] font-black">
                    {activeAdvancedFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Gợi ý từ khóa 1 chạm (Compact chips) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="hh-pixel text-[13px] text-white/40 shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#FF4FCB]" /> Từ khóa:
            </span>
            {QUICK_KEYWORD_TAGS.map((tag) => {
              const active = descriptionKeyword.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const next = active ? '' : tag;
                    setDescriptionKeyword(next);
                    fetchDocuments(selectedGrade, selectedExamType, selectedSubject, next);
                  }}
                  className={`text-[13px] font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#FF4FCB]/20 border-[#FF4FCB]/60 text-white'
                      : 'bg-white/[0.025] border-[#241a38] text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {/* HÀNG 3: DẢI KHỐI LỚP KÈM THƯỚC ĐO TỶ LỆ MÀU ROLE DISCORD */}
          <div className="p-3.5 rounded-xl bg-[#0B0911]/70 border border-[#241a38] space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-bold text-white/80 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#C4A6FF]" />
                <span>Khối Lớp</span>
              </span>
              {/* Thanh phân bố 7 khối lớp */}
              <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                  {(['12', '11', '10', '9', '8', '7', '6'] as const).map((gKey) => {
                    const cnt = gradeDistribution[gKey] || 0;
                    if (cnt <= 0) return null;
                    const colorMap: Record<string, string> = {
                      '12': '#EF4444',
                      '11': '#F97316',
                      '10': '#F59E0B',
                      '9': '#10B981',
                      '8': '#06B6D4',
                      '7': '#3B82F6',
                      '6': '#8B5CF6',
                    };
                    return (
                      <div
                        key={gKey}
                        onClick={() => handleGradeChange(gKey)}
                        style={{
                          width: `${(cnt / Math.max(1, documentsList.length)) * 100}%`,
                          backgroundColor: colorMap[gKey],
                        }}
                        className="h-full hover:opacity-80 cursor-pointer transition-opacity"
                        title={`Lớp ${gKey}: ${cnt} đề`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {gradeOptions.map((g) => {
                const isSelected = selectedGrade === g.id;
                const count = g.id === 'ALL' ? documentsList.length : gradeDistribution[g.id] ?? 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGradeChange(g.id)}
                    data-active={isSelected}
                    className="hh-hub-chip"
                  >
                    {g.id !== 'ALL' && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                    )}
                    <span>{g.label}</span>
                    <span className="text-[13px] font-mono opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HÀNG 4: THỂ LOẠI ĐỀ & MÔN HỌC (COMPACT CHIPS) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Thể loại đề */}
            <div className="xl:col-span-5 p-3.5 rounded-xl bg-[#0B0911]/70 border border-[#241a38] space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-bold text-white/80 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF4FCB]" />
                  <span>Thể Loại Đề</span>
                </span>
                <span className="font-mono text-[13px] text-white/45">Thường &lt; HSG &lt; Chuyên</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXAM_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleExamTypeChange(t.id)}
                    data-active={selectedExamType === t.id}
                    className="hh-hub-chip"
                    title={t.desc}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Môn học */}
            <div className="xl:col-span-7 p-3.5 rounded-xl bg-[#0B0911]/70 border border-[#241a38] space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-bold text-white/80 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#6FE3B0]" />
                  <span>Môn Học ({subjectOptions.length - 1} môn)</span>
                </span>
                {selectedSubject !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handleSubjectChange('ALL')}
                    className="text-[13px] text-[#FFB8E6] hover:underline cursor-pointer"
                  >
                    Chọn tất cả môn
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {subjectOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSubjectChange(s.id)}
                    data-active={selectedSubject === s.id}
                    className="hh-hub-chip"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HÀNG 5 (DRAWER): BỘ LỌC CHUYÊN SÂU (NĂM HỌC, TRƯỜNG, CHUẨN 2025, ĐÁP ÁN) */}
          {(showAdvancedDrawer || activeAdvancedFilterCount > 0) && (
            <div className="p-4 rounded-xl bg-[#141022]/90 border border-[#9B5CFF]/30 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-bold text-white/70 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#C4A6FF]" />
                    <span>Năm Học Ra Đề</span>
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0911] border border-[#241a38] text-[13px] font-bold text-white focus:outline-none focus:border-[#9B5CFF]"
                  >
                    <option value="ALL">Mọi năm học</option>
                    {availableAcademicYears.map(({ year, count }) => (
                      <option key={year} value={year}>
                        Năm học {year} ({count} đề)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[13px] font-bold text-white/70 flex items-center gap-1.5 mb-1">
                    <School className="w-3.5 h-3.5 text-[#FFB8E6]" />
                    <span>Trường / Sở GD&ĐT</span>
                  </label>
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0911] border border-[#241a38] text-[13px] font-bold text-white focus:outline-none focus:border-[#FF4FCB]"
                  >
                    <option value="ALL">Tất cả Trường & Sở GD&ĐT</option>
                    {availableSchools.map(({ school, count }) => (
                      <option key={school} value={school}>
                        {school} ({count} đề)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterMoet2025((p) => !p)}
                  data-active={filterMoet2025}
                  className="hh-hub-chip"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chuẩn Bộ GD&ĐT 2025 (3 phần)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterHasAnswers((p) => !p)}
                  data-active={filterHasAnswers}
                  className="hh-hub-chip"
                >
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Có Bảng Đáp Án</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterHasSolutions((p) => !p)}
                  data-active={filterHasSolutions}
                  className="hh-hub-chip"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Có Lời Giải Chi Tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterHasDiscordLink((p) => !p)}
                  data-active={filterHasDiscordLink}
                  className="hh-hub-chip"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Đã Đồng Bộ Discord</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextDup = filterDup === 'unique' ? 'all' : 'unique';
                    setFilterDup(nextDup);
                    fetchDocuments(selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, nextDup);
                  }}
                  data-active={filterDup === 'unique'}
                  className="hh-hub-chip"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chỉ Đề Độc Bản</span>
                </button>
              </div>
            </div>
          )}

          {/* HÀNG CUỐI: NÚT BỐC ĐỀ / ĐẶT LẠI BỘ LỌC */}
          {(showRollButton || hasAnyFilter) && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {showRollButton ? (
                <div className="flex flex-wrap items-center gap-3">
                  <PixelButton
                    variant="primary"
                    magnetic
                    loading={isLoadingExam}
                    onClick={handlePickRandomExam}
                    disabled={!botStatus.online || !user || !user.verified || isLoadingExam}
                    icon={<Dices className="w-4 h-4" />}
                  >
                    {isLoadingExam ? 'Bot Đang Bốc Đề...' : 'Bốc Ngẫu Nhiên Qua Bot Discord'}
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    onClick={handleInstantPracticePick}
                    icon={<Dices className="w-4 h-4 text-[#FFC46B]" />}
                  >
                    Bốc Thử Tức Thì ({displayedDocuments.length} đề)
                  </PixelButton>
                </div>
              ) : (
                <div className="text-[13px] text-white/55">
                  Đang lọc trực tiếp trên <strong className="text-white">{documentsList.length}</strong> hồ sơ đề thi.
                </div>
              )}

              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[13px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại toàn bộ lọc</span>
                </button>
              )}
            </div>
          )}
        </form>
      </SpotSurface>
    );
  };

  // ============================================================================
  // RENDER CARD ĐỀ THI CHUẨN DOSSIER PIXEL BLOOM
  // ============================================================================
  const renderExamDossierCard = (doc: ExamDocument) => {
    const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
    const trackInfo = getExamTrackInfo(doc);
    const eduBadge = getEducationLevelBadgeInfo(doc);
    const isBookmarked = bookmarkedIds.has(doc.id);
    const confPct = doc.confidence != null ? Math.round(Number(doc.confidence) * 100) : 95;

    return (
      <ResizableCard key={doc.id} id={`doc_${doc.id}`} allowResizeWidth={false} className="h-full">
        <SpotSurface
          as="article"
          className={`hh-hub-surface hh-hub-surface--interactive h-full p-5 sm:p-6 flex flex-col justify-between gap-4 group ${
            doc.is_duplicate_copy ? 'border-amber-500/40' : ''
          }`}
        >
          {/* Top Metadata Strip */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-black px-2.5 py-1 rounded-lg bg-[#9B5CFF]/20 text-[#E2D4FF] border border-[#9B5CFF]/40">
                  {doc.subject}
                </span>
                <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${eduBadge.badgeClass}`}>
                  <span>{eduBadge.icon}</span>
                  <span>{eduBadge.shortLabel}</span>
                </span>
                <span
                  className={`text-[13px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${trackInfo.badgeClass}`}
                  title={`${trackInfo.description} (${trackInfo.difficultyNote})`}
                >
                  <span>{trackInfo.icon}</span>
                  <span>{trackInfo.label}</span>
                </span>
                <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${gradeStyle.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
                  <span>{gradeStyle.label}</span>
                </span>
                {doc.quorum_status && (
                  <span
                    className={`text-[13px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      doc.quorum_status.includes('UNANIMOUS')
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {doc.quorum_status.includes('UNANIMOUS') ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>3/3 Quorum</span>
                      </>
                    ) : (
                      <>
                        <Scale className="w-3 h-3 text-amber-400" />
                        <span>3+1 Trọng Tài</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[13px] text-white/50">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[#FFB8E6] uppercase font-bold">
                  {doc.file_type || 'PDF'}
                </span>
                <span>{formatFileSize(doc.file_size_bytes)}</span>
              </div>
            </div>

            {/* Title & Click to Open Dossier */}
            <div
              onClick={() => {
                setSelectedDossierDoc(doc);
                setIsDossierOpen(true);
              }}
              className="cursor-pointer space-y-2"
            >
              <h4 className="font-extrabold text-base sm:text-lg text-white group-hover:text-[#FFB8E6] transition-colors line-clamp-2 leading-snug">
                {doc.title || doc.file_name}
              </h4>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/55">
                <span>📄 {doc.page_count || 1} trang</span>
                {doc.question_count > 0 && <span>• {doc.question_count} câu hỏi</span>}
                <span>• Nộp bởi {doc.author_name || 'Orbit Bot'}</span>
              </div>
            </div>

            {/* Interactive School / Year / Feature Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {doc.academic_year && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAcademicYear(doc.academic_year || 'ALL');
                  }}
                  className="text-[13px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>{doc.academic_year}</span>
                </button>
              )}
              {doc.school_or_department && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSchool(doc.school_or_department || 'ALL');
                  }}
                  className="text-[13px] font-semibold px-2.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:border-violet-400 flex items-center gap-1 truncate max-w-[220px] cursor-pointer"
                  title={doc.school_or_department}
                >
                  <School className="w-3 h-3 shrink-0" />
                  <span className="truncate">{doc.school_or_department}</span>
                </button>
              )}
              {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) && (
                <span className="text-[13px] font-extrabold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  ✨ Chuẩn 2025
                </span>
              )}
              {doc.has_answer_keys && (
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  📝 Đáp án
                </span>
              )}
              {doc.has_detailed_solutions && (
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/30">
                  💡 Lời giải
                </span>
              )}
            </div>
          </div>

          {/* Bottom Confidence Meter + Action Footer */}
          <div className="space-y-3 pt-3 border-t border-[#241a38]">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-white/45 font-mono">AI CONFIDENCE // QUORUM</span>
              <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                <div className="w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                  <div
                    className="h-full bg-[#d61f79]"
                    style={{ width: `${Math.min(100, Math.max(50, confPct))}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-[#FFB8E6]">{confPct}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const wasBookmarked = bookmarkedIds.has(doc.id);
                  toggleBookmarkExam(doc.id);
                  setBookmarkedIds(new Set(getBookmarkedExamIds()));
                  if (!wasBookmarked) {
                    showSuccess(`Đã lưu "${doc.title || doc.file_name}" vào Tủ Sách! ⭐`, 'Tủ Sách');
                  } else {
                    showInfo('Đã gỡ đề thi khỏi Tủ Sách.', 'Tủ Sách');
                  }
                }}
                aria-label={isBookmarked ? 'Bỏ lưu khỏi tủ sách' : 'Lưu vào tủ sách'}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-white/[0.04] text-white/50 border-[#241a38] hover:text-amber-300 hover:border-amber-500/30'
                }`}
                title={isBookmarked ? 'Bỏ lưu' : 'Lưu vào Tủ Sách'}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedDossierDoc(doc);
                  setIsDossierOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#241a38] text-white font-bold text-[13px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-[#C4A6FF]" />
                <span>Chi Tiết Đề</span>
              </button>

              <a
                href={resolveExamFileUrl(doc) || '#vault'}
                target={resolveExamFileUrl(doc) ? '_blank' : undefined}
                rel={resolveExamFileUrl(doc) ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  if (!resolveExamFileUrl(doc)) {
                    e.preventDefault();
                    setSelectedDossierDoc(doc);
                    setIsDossierOpen(true);
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#9B5CFF]/15 hover:bg-[#9B5CFF]/30 border border-[#9B5CFF]/35 text-[#E2D4FF] font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Tệp</span>
              </a>

              <a
                href={resolveExamFileUrl(doc) || '#vault'}
                target={resolveExamFileUrl(doc) ? '_blank' : undefined}
                rel={resolveExamFileUrl(doc) ? 'noopener noreferrer' : undefined}
                download={botStatus.online ? doc.file_name || 'de_thi.pdf' : undefined}
                onClick={(e) => {
                  if (!resolveExamFileUrl(doc)) {
                    e.preventDefault();
                    setSelectedDossierDoc(doc);
                    setIsDossierOpen(true);
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#d61f79] hover:opacity-95 text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 shadow-[0_6px_20px_-6px_rgba(255,79,203,0.6)] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Về</span>
              </a>

              {getSafeExternalUrl(doc.jump_url) && (
                <a
                  href={getSafeExternalUrl(doc.jump_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-[#5865F2] text-white/60 hover:text-white border border-[#241a38] transition-all cursor-pointer"
                  title="Mở bài đăng gốc trên Discord"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </SpotSurface>
      </ResizableCard>
    );
  };

  const hubLocked = false;

  return (
    <div className="hh-hub-shell">
      {/* ========================================================================= */}
      {/* MOBILE TOP COMMAND HEADER                                                 */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full sticky top-0 z-40 hh-hub-mobile-bar">
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-[#241a38]">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <PixelMark className="w-7 h-7" />
            <div>
              <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>Orbit</span>
                <span className="hh-pixel text-[13px] px-1.5 py-0.5 rounded bg-[#FF4FCB]/20 text-[#FFB8E6] border border-[#FF4FCB]/35">
                  HUB
                </span>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2 rounded-lg bg-white/[0.06] border border-[#241a38] text-white/80"
              aria-label="Tìm kiếm nhanh"
            >
              <Search className="w-4 h-4 text-[#FFB8E6]" />
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-white/85 bg-white/[0.06] border border-[#241a38] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Pills */}
        <div className="px-4 py-2.5 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleTabChange('overview')}
            data-active={activeTab === 'overview'}
            className="hh-hub-chip whitespace-nowrap"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tổng Quan</span>
          </button>
          <button
            onClick={() => {
              handleTabChange('vault');
              setShowBookmarksOnly(false);
            }}
            data-active={activeTab === 'vault' && !showBookmarksOnly}
            className="hh-hub-chip whitespace-nowrap tabular-nums"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kho Đề ({totalDocsCount})</span>
          </button>
          <button
            onClick={() => {
              handleTabChange('vault');
              setShowBookmarksOnly(true);
            }}
            data-active={activeTab === 'vault' && showBookmarksOnly}
            className="hh-hub-chip whitespace-nowrap tabular-nums"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Tủ Sách ({bookmarkedIds.size})</span>
          </button>
          <button
            onClick={() => handleTabChange('get_exam')}
            data-active={activeTab === 'get_exam'}
            className="hh-hub-chip whitespace-nowrap"
          >
            <Dices className="w-3.5 h-3.5 text-[#FF4FCB]" />
            <span>Máy Bốc Đề</span>
          </button>
          <button
            onClick={() => handleTabChange('submit_doc')}
            data-active={activeTab === 'submit_doc'}
            className="hh-hub-chip whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Đóng Góp Đề</span>
          </button>
          {(isAdmin || readCachedAdmin()) && (
            <button
              onClick={() => handleTabChange('admin')}
              data-active={activeTab === 'admin'}
              className="hh-hub-chip whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Quản Trị</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP COMMAND RAIL (SIDEBAR - 0.9x COMPACT FULL VIEW)                   */}
      {/* ========================================================================= */}
      <aside
        style={{ width: `${config.sidebarWidth}px` }}
        className="hidden lg:flex sticky top-0 h-[calc(100dvh/0.9)] hh-hub-sidebar flex-col justify-between shrink-0 p-3.5 z-30 overflow-y-auto no-scrollbar"
      >
        <div className="space-y-3">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#241a38]">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2.5 group cursor-pointer text-left"
              title="Quay về Trang Chủ Orbit"
            >
              <PixelMark className="w-7 h-7 shrink-0" />
              <div>
                <div className="text-base font-black text-white group-hover:text-[#FFB8E6] transition-colors flex items-center gap-2">
                  <span>Orbit</span>
                  <span className="hh-pixel text-[13px] px-1.5 py-0.5 rounded bg-[#FF4FCB]/20 text-[#FFB8E6] border border-[#FF4FCB]/40">
                    HUB
                  </span>
                </div>
                <div className="text-[13px] text-white/60 mt-0.5">
                  Different paths. One orbit.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Về Trang Chủ"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Command Search Bar */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsCommandPaletteOpen(true);
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#0B0911]/90 hover:bg-white/[0.05] border border-[#241a38] hover:border-[#9B5CFF]/50 flex items-center justify-between gap-2 text-[13px] text-white/70 hover:text-white transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#FF4FCB] shrink-0" />
              <span>Tìm nhanh đề thi &amp; lệnh</span>
            </span>
            <kbd className="text-[13px] px-1.5 py-0.5 rounded bg-white/[0.07] border border-[#241a38] text-white/65 whitespace-nowrap shrink-0">
              Ctrl K
            </kbd>
          </button>

          {/* Navigation Deck */}
          <div className="space-y-1">
            <div className="px-2 pb-1 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white/55">Điều hướng</span>
              <span className="text-[13px] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" />
                <span>{botStatus.online ? 'Bot Trực tuyến' : 'Trực tuyến'}</span>
              </span>
            </div>

            <nav className="space-y-1" aria-label="Điều hướng Hub">
              <button
                type="button"
                onClick={() => handleTabChange('overview')}
                data-active={activeTab === 'overview'}
                className="hh-hub-nav-item"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-[#C4A6FF]" />
                <span>Bàn Điều Khiển</span>
                <span className="ml-auto text-[13px] text-white/45 font-medium">Tổng quan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabChange('vault');
                  setShowBookmarksOnly(false);
                }}
                data-active={activeTab === 'vault' && !showBookmarksOnly}
                className="hh-hub-nav-item"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-[#FF4FCB]" />
                <span>Kho Đề Thẩm Định</span>
                <span className="ml-auto tabular-nums text-[13px] px-2 py-0.5 rounded-md bg-[#FF4FCB]/15 text-[#FFB8E6] border border-[#FF4FCB]/30">
                  {totalDocsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabChange('vault');
                  setShowBookmarksOnly(true);
                }}
                data-active={activeTab === 'vault' && showBookmarksOnly}
                className="hh-hub-nav-item"
              >
                <Star className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Tủ Sách Cá Nhân</span>
                <span className="ml-auto tabular-nums text-[13px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {bookmarkedIds.size}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('get_exam')}
                data-active={activeTab === 'get_exam'}
                className="hh-hub-nav-item"
              >
                <Dices className="w-4 h-4 shrink-0 text-[#5CE1E6]" />
                <span>Máy Phát Đề</span>
                <span className="ml-auto text-[13px] text-white/45 font-medium">Ngẫu nhiên</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('submit_doc')}
                data-active={activeTab === 'submit_doc'}
                className="hh-hub-nav-item"
              >
                <UploadCloud className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Đóng Góp Đề Thi</span>
                <span className="ml-auto text-[13px] text-emerald-300/75 font-medium">3+1 Quorum</span>
              </button>

              {(isAdmin || readCachedAdmin()) && (
                <button
                  type="button"
                  onClick={() => handleTabChange('admin')}
                  data-active={activeTab === 'admin'}
                  className="hh-hub-nav-item"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Quản Trị ({adminInfo?.role_name || 'ADMIN'})</span>
                  {hasSystemUpdate && (
                    <span className="ml-auto text-[13px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold">
                      Mới
                    </span>
                  )}
                  {justReconnected && !hasSystemUpdate && (
                    <span className="ml-auto w-2 h-2 rounded-xs bg-emerald-400" />
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* CHILL // POMODORO FOCUS WIDGET NGAY TRONG SIDEBAR */}
          <div className="p-3 rounded-2xl bg-[#0D0A15]/90 border border-[#241a38] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#FFB8E6] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FF4FCB]" />
                <span>{pomoMode === 'focus' ? 'Pomodoro · 25p' : 'Nghỉ giải lao · 5p'}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => togglePomoMode('focus')}
                  className={`px-2 py-0.5 rounded text-[13px] font-bold cursor-pointer ${
                    pomoMode === 'focus' ? 'bg-[#9B5CFF] text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Học
                </button>
                <button
                  type="button"
                  onClick={() => togglePomoMode('chill')}
                  className={`px-2 py-0.5 rounded text-[13px] font-bold cursor-pointer ${
                    pomoMode === 'chill' ? 'bg-[#FF4FCB] text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Nghỉ
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="hh-pixel text-xl text-white tracking-wider tabular-nums">
                {formatPomo(pomoSeconds)}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPomoRunning((r) => !r);
                  }}
                  aria-label={pomoRunning ? 'Tạm dừng đồng hồ' : 'Bắt đầu đồng hồ'}
                  className="px-2.5 py-1 rounded-lg bg-[#d61f79] text-white text-[13px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {pomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{pomoRunning ? 'Dừng' : 'Chạy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPomoRunning(false);
                    setPomoSeconds(pomoMode === 'focus' ? 25 * 60 : 5 * 60);
                  }}
                  aria-label="Đặt lại đồng hồ"
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 8-block Voxel Progress Bar */}
            <div className="grid grid-cols-8 gap-1 pt-0.5" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => {
                const lit = pomoProgress >= (i + 1) / 8 || (pomoRunning && i === Math.floor(pomoProgress * 8));
                return (
                  <span
                    key={i}
                    className={`h-1.5 rounded-xs transition-colors ${
                      lit ? 'bg-[#d61f79]' : 'bg-white/[0.08]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* NHỊP ĐỘ MÙA THI & MỤC TIÊU CÁ NHÂN TRONG SIDEBAR */}
          <div className="p-3 rounded-2xl bg-[#0D0A15]/90 border border-[#241a38] space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-bold text-[#E2CEFF] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FFA8DC]" />
                <span>Kỳ thi THPT {nextThptExam.examYear}</span>
              </span>
              <span className="font-mono font-bold text-[#FFB396] tabular-nums text-[13px]">
                Còn {nextThptExam.daysLeft} ngày
              </span>
            </div>
            <div className="pt-1.5 border-t border-[#241a38] flex items-center justify-between gap-2 text-[13px]">
              <span className="text-white/60 flex items-center gap-1.5 truncate">
                <Target className="w-3.5 h-3.5 text-[#FF3CA6] shrink-0" />
                <span className="truncate">
                  {dreamGoal ? dreamGoal.school : 'Chưa ghim trường mục tiêu'}
                </span>
              </span>
              {dreamGoal?.score && (
                <span className="px-1.5 py-0.5 rounded bg-[#FF3CA6]/15 text-[#FFA8DC] font-mono font-bold text-[13px] shrink-0">
                  {dreamGoal.score}đ
                </span>
              )}
            </div>
          </div>

          {/* LỌC NHANH THEO KHỐI LỚP NGAY TRONG SIDEBAR (TẬN DỤNG KHÔNG GIAN TRỐNG) */}
          <div className="p-3 rounded-2xl bg-[#0D0A15]/90 border border-[#241a38] space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-bold text-[#E2CEFF] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#C4A6FF]" />
                <span>Lọc nhanh khối lớp</span>
              </span>
              <span className="text-[13px] text-white/50 tabular-nums">Lớp 6–12</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: '12', label: 'Lớp 12', dot: '#EF4444', count: gradeDistribution['12'] || 0 },
                { id: '11', label: 'Lớp 11', dot: '#F97316', count: gradeDistribution['11'] || 0 },
                { id: '10', label: 'Lớp 10', dot: '#F59E0B', count: gradeDistribution['10'] || 0 },
                {
                  id: '9',
                  label: 'Khối THCS',
                  dot: '#10B981',
                  count:
                    (gradeDistribution['9'] || 0) +
                    (gradeDistribution['8'] || 0) +
                    (gradeDistribution['7'] || 0) +
                    (gradeDistribution['6'] || 0),
                },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    if (g.id === '9') {
                      setSelectedEducationLevel('CAP_2');
                      handleGradeChange('ALL');
                    } else {
                      setSelectedEducationLevel('ALL');
                      handleGradeChange(g.id);
                    }
                    setShowBookmarksOnly(false);
                    handleTabChange('vault');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-[#241a38] hover:border-[#FF4FCB]/40 flex items-center justify-between text-[13px] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-white/85">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: g.dot }} />
                    <span>{g.label}</span>
                  </span>
                  <span className="font-mono text-[13px] text-white/55 tabular-nums">{g.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Discord Identity & Back to Home */}
        <div className="pt-2.5 mt-2 border-t border-[#241a38] space-y-2">
          {user ? (
            <div className="p-2.5 rounded-xl bg-[#0D0A15]/90 border border-[#241a38] space-y-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-[#9B5CFF]/50 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="font-bold text-[13px] truncate text-white">
                    {user.global_name || user.username}
                  </div>
                  <div className="text-[13px] text-white/45 truncate font-mono">@{user.username}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[13px] pt-1.5 border-t border-[#241a38]">
                {user.verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã xác minh</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Chưa verify</span>
                  </span>
                )}
                <button
                  onClick={onLogout}
                  className="text-white/55 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Thoát</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#0D0A15]/90 border border-[#241a38] space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/80 font-semibold">Tài khoản Discord</span>
                <span className="text-[13px] text-[#FFB8E6] font-semibold">Khách</span>
              </div>
              <p className="text-[13px] text-white/50 leading-snug">
                Đồng bộ tủ sách &amp; nhận đề tự động qua Bot Orbit.
              </p>
              <PixelButton
                variant="discord"
                block
                className="!min-h-[40px] !text-[13px]"
                onClick={onOpenAuthModal}
                icon={<UserCheck className="w-4 h-4" />}
              >
                Liên Kết Discord
              </PixelButton>
            </div>
          )}

          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-[#241a38] text-[13px] font-bold text-white/75 hover:text-white flex items-center justify-between cursor-pointer transition-all"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF4FCB]" />
              <span>Về Trang Chủ Orbit</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT                                                    */}
      {/* ========================================================================= */}
      <main className="hh-hub-main flex-1 min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1640px] mx-auto w-full">
        {/* Desktop Top Telemetry Bar */}
        <div className="hidden lg:flex items-center justify-between pb-4 mb-6 border-b border-[#241a38]">
          <div className="flex items-center gap-2.5 text-sm">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-[13px] font-bold text-white/55 hover:text-[#FFB8E6] transition-colors cursor-pointer"
            >
              Orbit
            </button>
            <span className="text-white/25">/</span>
            <span className="text-[13px] font-bold text-[#FFB8E6]">
              {activeTab === 'overview' && 'Bàn điều khiển'}
              {activeTab === 'vault' && (showBookmarksOnly ? 'Tủ sách cá nhân' : 'Kho đề thẩm định')}
              {activeTab === 'get_exam' && 'Máy phát đề'}
              {activeTab === 'submit_doc' && 'Trạm nộp đề AI'}
              {activeTab === 'admin' && 'Quản trị hệ thống'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Bot Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#120F1D]/90 border border-[#241a38] text-[13px] tabular-nums">
              <span
                className={`w-2 h-2 rounded-xs ${
                  botStatus.online
                    ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-white/80 font-semibold">
                {botStatus.online ? `Bot trực tuyến (${botStatus.ping_ms || 24}ms)` : 'Kho đề Cloud trực tuyến'}
              </span>
              <span className="text-white/30">|</span>
              <span className="text-[#FFB8E6] font-bold tabular-nums">{totalDocsCount} đề</span>
            </div>

            <button
              type="button"
              onClick={() => {
                checkBotStatus();
                fetchDocStats();
                fetchDocuments();
                showInfo('Đã đồng bộ lại dữ liệu kho đề.');
              }}
              className="p-2 rounded-xl bg-[#120F1D]/90 hover:bg-white/[0.08] border border-[#241a38] text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Update Banner */}
        {hasSystemUpdate && activeTab !== 'admin' && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="hh-pixel text-[13px] px-2.5 py-1 rounded bg-amber-400 text-black font-bold">
                UPDATE
              </span>
              <div>
                <div className="text-sm font-black text-amber-200">
                  Phát hiện bản cập nhật mới trên GitHub!
                </div>
                <div className="text-[13px] text-white/70">
                  Nạp lại hệ thống 1-Click trong bảng Quản Trị.
                </div>
              </div>
            </div>
            <button
              onClick={() => handleTabChange('admin')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[13px] cursor-pointer"
            >
              Mở Quản Trị
            </button>
          </div>
        )}

        {/* TAB 01: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* HÀNG 1: BÀN ĐIỀU KHIỂN (7/12) + BẢN ĐỒ MÔN HỌC (5/12) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
              {/* Cột Trái (7/12): Lời chào, Mục tiêu nguyện vọng 1 & Đếm ngược mùa thi */}
              <SpotSurface className="xl:col-span-7 hh-hub-surface hh-voxel-frame p-6 sm:p-7 flex flex-col justify-between gap-5 h-full">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#FFB8E6] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-xs bg-[#FF4FCB]" />
                      <span>Không gian học thuật &amp; kho đề thực chiến</span>
                    </span>

                    <div className="flex items-center gap-2 text-[13px] px-3 py-1 rounded-lg bg-white/[0.04] border border-[#241a38] tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-[#FF4FCB]" />
                      <span className="text-white/70">THPT {nextThptExam.examYear}:</span>
                      <strong className="text-[#FFB8E6] tabular-nums">{nextThptExam.daysLeft} ngày</strong>
                    </div>
                  </div>

                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold tracking-tight text-white leading-snug">
                      Chào {user ? user.global_name || user.username : 'bạn'}, sẵn sàng luyện đề hôm nay?
                    </h1>
                    <p className="text-sm text-white/65 mt-1.5 max-w-2xl leading-relaxed">
                      Tra cứu nhanh <strong className="text-white tabular-nums">{totalDocsCount} đề thi</strong> đã qua kiểm duyệt cấu trúc và đáp án, bốc đề ngẫu nhiên theo đúng khối lớp hoặc ghim mục tiêu đại học để giữ nhịp ôn tập mỗi ngày.
                    </p>
                  </div>

                  {/* Mục tiêu Nguyện vọng 1 (Đồng bộ trực tiếp với Trang chủ) */}
                  <div className="p-4 rounded-2xl bg-[#0B0911]/85 border border-[#241a38]">
                    {!isEditingDream && dreamGoal ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Target className="w-5 h-5 text-[#FF4FCB] shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[13px] font-semibold text-[#FFB8E6]">
                              Mục tiêu nguyện vọng 1 đã ghim
                            </div>
                            <div className="text-base sm:text-lg font-extrabold text-white">
                              {dreamGoal.school}
                              {dreamGoal.score && (
                                <span className="ml-2 text-[13px] px-2 py-0.5 rounded bg-[#9B5CFF]/25 text-[#E2D4FF] border border-[#9B5CFF]/40 tabular-nums">
                                  Mục tiêu: {dreamGoal.score}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingDream(true)}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[13px] font-bold text-white/80 cursor-pointer self-start sm:self-center"
                        >
                          Đổi mục tiêu
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveDreamInHub} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-bold text-[#FFB8E6] flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-[#FF4FCB]" />
                            <span>Ghim mục tiêu trường mơ ước</span>
                          </span>
                          {dreamGoal && (
                            <button
                              type="button"
                              onClick={() => setIsEditingDream(false)}
                              className="text-[13px] text-white/50 hover:text-white cursor-pointer"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <input
                            type="text"
                            value={dreamSchoolInput}
                            onChange={(e) => setDreamSchoolInput(e.target.value)}
                            placeholder="VD: ĐH Bách Khoa HN, Chuyên KHTN"
                            className="sm:col-span-7 h-10 px-3 rounded-xl bg-white/[0.04] border border-[#241a38] text-[13px] sm:text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#FF4FCB]"
                          />
                          <input
                            type="text"
                            value={dreamScoreInput}
                            onChange={(e) => setDreamScoreInput(e.target.value)}
                            placeholder="Điểm (VD: 28.5+)"
                            className="sm:col-span-3 h-10 px-3 rounded-xl bg-white/[0.04] border border-[#241a38] text-[13px] sm:text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#9B5CFF]"
                          />
                          <button
                            type="submit"
                            className="sm:col-span-2 h-10 px-3 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] text-white font-bold text-[13px] cursor-pointer transition-colors"
                          >
                            Lưu
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Dải 4 lối tắt thống kê & lọc nhanh ngay trong Bàn Điều Khiển */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEducationLevel('ALL');
                        handleGradeChange('12');
                        setShowBookmarksOnly(false);
                        handleTabChange('vault');
                      }}
                      className="p-3 rounded-xl bg-[#0B0911]/80 hover:bg-white/[0.05] border border-[#241a38] hover:border-[#FF4FCB]/40 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[13px] text-white/55 font-medium">Trọng tâm Lớp 12</div>
                      <div className="text-base font-extrabold text-white mt-0.5 tabular-nums">
                        {gradeDistribution['12'] || 0} đề thi
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEducationLevel('CAP_3');
                        handleGradeChange('ALL');
                        setShowBookmarksOnly(false);
                        handleTabChange('vault');
                      }}
                      className="p-3 rounded-xl bg-[#0B0911]/80 hover:bg-white/[0.05] border border-[#241a38] hover:border-[#9B5CFF]/40 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[13px] text-white/55 font-medium">Khối THPT (10–12)</div>
                      <div className="text-base font-extrabold text-[#E2CEFF] mt-0.5 tabular-nums">
                        {(gradeDistribution['12'] || 0) +
                          (gradeDistribution['11'] || 0) +
                          (gradeDistribution['10'] || 0) || totalDocsCount}{' '}
                        đề tuyển chọn
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterHasAnswers(true);
                        setShowBookmarksOnly(false);
                        handleTabChange('vault');
                      }}
                      className="p-3 rounded-xl bg-[#0B0911]/80 hover:bg-white/[0.05] border border-[#241a38] hover:border-emerald-400/40 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[13px] text-white/55 font-medium">Đáp án &amp; Lời giải</div>
                      <div className="text-base font-extrabold text-emerald-300 mt-0.5 tabular-nums">
                        {documentsList.filter((d) => d.has_answer_keys || d.has_detailed_solutions).length || totalDocsCount} đề chuẩn
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleTabChange('submit_doc');
                      }}
                      className="p-3 rounded-xl bg-[#0B0911]/80 hover:bg-white/[0.05] border border-[#241a38] hover:border-[#FFB396]/40 text-left transition-colors cursor-pointer"
                    >
                      <div className="text-[13px] text-white/55 font-medium">Đề thi độc bản</div>
                      <div className="text-base font-extrabold text-[#FFB396] mt-0.5 tabular-nums">
                        {stats.unique_items || totalDocsCount} độc bản
                      </div>
                    </button>
                  </div>
                </div>

                {/* Primary CTA Row */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#241a38]">
                  <PixelButton
                    variant="primary"
                    magnetic
                    onClick={() => handleTabChange('get_exam')}
                    icon={<Dices className="w-4 h-4" />}
                    trailing={<ArrowRight className="w-4 h-4" />}
                  >
                    Mở Máy Phát Đề
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    onClick={() => {
                      handleTabChange('vault');
                      setShowBookmarksOnly(false);
                    }}
                    icon={<BookOpen className="w-4 h-4" />}
                  >
                    Duyệt Kho Đề ({totalDocsCount})
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    onClick={handleInstantPracticePick}
                    icon={<Dices className="w-4 h-4 text-[#FFC46B]" />}
                  >
                    Bốc Thử 1 Đề Ngay
                  </PixelButton>
                </div>
              </SpotSurface>

              {/* Cột Phải (5/12): Ma Trận Telemetry & Radar Môn Học (Bấm để lọc ngay) */}
              <SpotSurface className="xl:col-span-5 hh-hub-surface p-6 sm:p-7 flex flex-col justify-between gap-4 h-full">
                <div className="flex items-center justify-between border-b border-[#241a38] pb-3.5">
                  <div>
                    <span className="text-[13px] font-semibold text-[#C4A6FF]">
                      Phân bố tài liệu thực tế
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                      Bản Đồ Kho Đề Theo Môn Học
                    </h2>
                  </div>
                  <span className="tabular-nums text-[13px] px-2.5 py-1 rounded-lg bg-[#9B5CFF]/15 text-[#E2D4FF] border border-[#9B5CFF]/30 font-bold">
                    {stats.unique_items || totalDocsCount} độc bản
                  </span>
                </div>

                {/* Interactive Subject Radar Bars */}
                <div className="space-y-2.5">
                  {subjectBreakdown.map((subj) => {
                    const pct = Math.min(
                      100,
                      Math.round((subj.count / Math.max(1, documentsList.length)) * 100)
                    );
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => {
                          handleSubjectChange(subj.id);
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className="w-full p-2.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-[#241a38] hover:border-[#FF4FCB]/40 transition-all cursor-pointer group text-left space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-bold text-white group-hover:text-[#FFB8E6] flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-[#C4A6FF]" />
                            <span>{subj.label}</span>
                          </span>
                          <span className="tabular-nums text-[13px] text-white/65 group-hover:text-white">
                            {subj.count} đề ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(6, pct)}%`,
                              backgroundColor: subj.tone,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick 7-Grade Strip */}
                <div className="pt-2 border-t border-[#241a38] flex items-center justify-between text-[13px] text-white/60">
                  <span>Phân loại tự động chuẩn GDPT 2018</span>
                  <button
                    type="button"
                    onClick={() => handleTabChange('vault')}
                    className="text-[#FFB8E6] hover:underline font-bold cursor-pointer"
                  >
                    Xem đủ 18 môn
                  </button>
                </div>
              </SpotSurface>
            </div>

            {/* NẾU VỪA BỐC THỬ 1 ĐỀ NGAY TRÊN OVERVIEW THÌ HIỂN THỊ KẾT QUẢ TỨC THÌ */}
            {currentExam && (
              <SpotSurface className="hh-hub-surface hh-voxel-frame p-5 sm:p-6 border-[#FF4FCB]/50 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] px-2 py-0.5 rounded bg-[#FF4FCB] text-[#0E0C14] font-bold">
                        Đề vừa bốc
                      </span>
                      <span className="text-[13px] font-bold text-[#FFB8E6]">{currentExam.subject}</span>
                      <span className="text-[13px] text-white/50">• {currentExam.estimated_level}</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-white">
                      {currentExam.title || currentExam.file_name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDossierDoc(currentExam);
                        setIsDossierOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[13px] font-bold text-white cursor-pointer"
                    >
                      Xem Chi Tiết Đề
                    </button>
                    <a
                      href={resolveExamFileUrl(currentExam) || '#vault'}
                      target={resolveExamFileUrl(currentExam) ? '_blank' : undefined}
                      rel={resolveExamFileUrl(currentExam) ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (!resolveExamFileUrl(currentExam)) {
                          e.preventDefault();
                          setSelectedDossierDoc(currentExam);
                          setIsDossierOpen(true);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#9B5CFF] hover:bg-[#8A46FF] text-white text-[13px] font-extrabold"
                    >
                      Mở Đề Ngay
                    </a>
                    <button
                      type="button"
                      onClick={() => setCurrentExam(null)}
                      className="p-2 rounded-xl text-white/40 hover:text-white cursor-pointer"
                      aria-label="Đóng đề vừa bốc"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </SpotSurface>
            )}

            {/* HÀNG 2: CỘT TRÁI (ĐỀ MỚI NHẤT, 8/12) + CỘT PHẢI (TỦ SÁCH & HẠ TẦNG, 4/12) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
              {/* Đề thi mới thẩm định (8/12) */}
              <SpotSurface className="xl:col-span-8 hh-hub-surface p-6 flex flex-col justify-between gap-4 h-full">
                <div className="flex items-center justify-between border-b border-[#241a38] pb-3.5">
                  <div>
                    <span className="text-[13px] font-semibold text-[#FF4FCB]">Cập nhật mới nhất</span>
                    <h3 className="font-extrabold text-base sm:text-lg text-white">
                      Đề Thi Mới Thẩm Định Gần Đây
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      handleTabChange('vault');
                    }}
                    className="text-[13px] font-bold text-[#FFB8E6] hover:underline flex items-center gap-1 cursor-pointer tabular-nums"
                  >
                    <span>Mở toàn bộ ({documentsList.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {documentsList.length === 0 ? (
                  <div className="py-12 text-center text-sm text-white/45">
                    {isLoadingDocs ? 'Đang đồng bộ danh sách đề thi...' : 'Chưa có tài liệu nào.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {documentsList.slice(0, 5).map((doc) => {
                      const isBookmarked = bookmarkedIds.has(doc.id);
                      const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
                      const trackInfo = getExamTrackInfo(doc);

                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-xl bg-[#0B0911]/75 hover:bg-white/[0.04] border border-[#241a38] hover:border-[#9B5CFF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[13px] font-bold px-2 py-0.5 rounded bg-[#9B5CFF]/20 text-[#E2D4FF] border border-[#9B5CFF]/35">
                                {doc.subject}
                              </span>
                              <span className={`text-[13px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${trackInfo.badgeClass}`}>
                                <span>{trackInfo.label}</span>
                              </span>
                              <span className={`text-[13px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${gradeStyle.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
                                <span>{gradeStyle.label}</span>
                              </span>
                              {doc.academic_year && (
                                <span className="text-[13px] tabular-nums text-white/55">
                                  • {doc.academic_year}
                                </span>
                              )}
                            </div>

                            <h4
                              onClick={() => {
                                setSelectedDossierDoc(doc);
                                setIsDossierOpen(true);
                              }}
                              className="font-bold text-sm sm:text-base text-white group-hover:text-[#FFB8E6] transition-colors line-clamp-1 cursor-pointer"
                            >
                              {doc.title || doc.file_name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                            <div className="hidden md:flex items-center gap-1.5 text-[13px] text-white/50 tabular-nums pr-1">
                              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-[#241a38]">
                                {doc.page_count || 1} trang
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-[#241a38] uppercase font-mono">
                                {doc.file_type || 'PDF'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDossierDoc(doc);
                                setIsDossierOpen(true);
                              }}
                              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                              title="Xem chi tiết đề thi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                toggleBookmarkExam(doc.id);
                                setBookmarkedIds(new Set(getBookmarkedExamIds()));
                              }}
                              className={`p-2 rounded-lg cursor-pointer ${
                                isBookmarked ? 'text-amber-400 bg-amber-500/15' : 'text-white/45 hover:text-amber-300'
                              }`}
                              title="Lưu vào Tủ Sách"
                            >
                              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                            </button>
                            <a
                              href={resolveExamFileUrl(doc) || '#vault'}
                              target={resolveExamFileUrl(doc) ? '_blank' : undefined}
                              rel={resolveExamFileUrl(doc) ? 'noopener noreferrer' : undefined}
                              onClick={(e) => {
                                if (!resolveExamFileUrl(doc)) {
                                  e.preventDefault();
                                  setSelectedDossierDoc(doc);
                                  setIsDossierOpen(true);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#9B5CFF]/25 hover:bg-[#9B5CFF]/40 border border-[#9B5CFF]/40 text-white text-[13px] font-bold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tải</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2 border-t border-[#241a38] flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/60">
                  <span>Bấm vào tên đề để mở Hồ sơ kiểm định chi tiết</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTabChange('submit_doc')}
                      className="text-emerald-300 hover:underline font-bold cursor-pointer"
                    >
                      + Đóng góp đề mới
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookmarksOnly(false);
                        handleTabChange('vault');
                      }}
                      className="text-[#FFB8E6] hover:underline font-bold cursor-pointer"
                    >
                      Duyệt kho đề ({totalDocsCount})
                    </button>
                  </div>
                </div>
              </SpotSurface>

              {/* Cột phải (4/12): Tủ Sách Đang Lưu + Lối tắt phân ban + Trạng thái kết nối */}
              <SpotSurface className="xl:col-span-4 hh-hub-surface p-6 flex flex-col justify-between gap-4 h-full">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#241a38] pb-3.5">
                    <div>
                      <span className="text-[13px] font-semibold text-amber-300">Lưu trữ cá nhân</span>
                      <h3 className="font-extrabold text-base sm:text-lg text-white">Tủ Sách Của Bạn</h3>
                    </div>
                    <span className="tabular-nums text-[13px] px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {bookmarkedIds.size} đề
                    </span>
                  </div>

                  {bookmarkedIds.size === 0 ? (
                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-[#0B0911]/70 border border-[#241a38] flex items-center justify-between gap-3">
                        <p className="text-[13px] text-white/65 leading-snug">
                          Chưa có đề ghim. Bấm ngôi sao trên đề bất kỳ hoặc ghim nhanh đề tiêu biểu bên dưới:
                        </p>
                      </div>
                      <div className="space-y-2">
                        {documentsList.slice(0, 2).map((doc) => (
                          <div
                            key={`suggest-${doc.id}`}
                            className="p-2.5 rounded-xl bg-[#0B0911]/80 border border-[#241a38] flex items-center justify-between gap-2"
                          >
                            <div
                              onClick={() => {
                                setSelectedDossierDoc(doc);
                                setIsDossierOpen(true);
                              }}
                              className="min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="text-[13px] font-bold text-[#FFB8E6]">{doc.subject}</div>
                              <div className="text-[13px] font-semibold text-white overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,#000_85%,transparent)]">
                                {doc.title || doc.file_name}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                toggleBookmarkExam(doc.id);
                                setBookmarkedIds(new Set(getBookmarkedExamIds()));
                                showSuccess(`Đã lưu "${doc.title || doc.file_name}" vào Tủ Sách!`, 'Tủ Sách');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[13px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span>Ghim</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documentsList
                        .filter((d) => bookmarkedIds.has(d.id))
                        .slice(0, 3)
                        .map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => {
                              setSelectedDossierDoc(doc);
                              setIsDossierOpen(true);
                            }}
                            className="p-3 rounded-xl bg-[#0B0911]/80 hover:bg-white/[0.05] border border-[#241a38] cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-bold text-amber-300">{doc.subject}</div>
                              <div className="text-[13px] font-bold text-white truncate">
                                {doc.title || doc.file_name}
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
                          </div>
                        ))}
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookmarksOnly(true);
                          handleTabChange('vault');
                        }}
                        className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[13px] font-bold cursor-pointer tabular-nums"
                      >
                        Mở Tủ Sách ({bookmarkedIds.size} đề)
                      </button>
                    </div>
                  )}
                </div>

                {/* Lối tắt phân ban đề (Lấp đầy khoảng trống bằng bộ lọc 1 chạm) */}
                <div className="pt-3 border-t border-[#241a38] space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-white/75">Phân ban đề nhanh</span>
                    <span className="text-white/45">1 chạm mở kho</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'THUONG', label: 'Đề Thường & HK', tone: 'text-[#E2CEFF]' },
                      { id: 'CHUYEN', label: 'Đề Trường Chuyên', tone: 'text-[#FFA8DC]' },
                      { id: 'HSG', label: 'Đề Học Sinh Giỏi', tone: 'text-[#FFB396]' },
                      { id: 'ALL', label: 'Mở Toàn Bộ Kho', tone: 'text-emerald-300' },
                    ].map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          handleExamTypeChange(track.id);
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className={`px-3 py-2 rounded-xl bg-[#0B0911]/80 hover:bg-white/[0.06] border border-[#241a38] hover:border-[#FF4FCB]/40 text-left text-[13px] font-bold ${track.tone} transition-colors cursor-pointer`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trạng thái Hạ tầng Bot & Turso */}
                <div className="pt-3 border-t border-[#241a38] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-white/75">Hạ tầng dữ liệu</span>
                    <span
                      className={`text-[13px] font-bold px-2 py-0.5 rounded ${
                        botStatus.online
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {botStatus.online ? 'Bot trực tuyến' : 'Cloud trực tuyến'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[13px] text-white/65">
                    <div className="flex justify-between">
                      <span>Discord Bot:</span>
                      <span className="text-white font-semibold">{botStatus.bot_user || 'Orbit#0594'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cơ sở dữ liệu:</span>
                      <span className="text-emerald-400 font-semibold">Turso libSQL Live</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quy trình kiểm duyệt:</span>
                      <span className="text-[#FFB8E6] font-semibold">Đối chiếu 3 bước</span>
                    </div>
                  </div>
                </div>
              </SpotSurface>
            </div>
          </div>
        )}

        {/* TAB 04: GET_EXAM */}
        {activeTab === 'get_exam' && !hubLocked && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <SpotSurface className="hh-hub-surface p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#241a38] pb-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    Máy Phát Đề Ngẫu Nhiên Orbit
                  </h1>
                  <p className="text-[13px] sm:text-sm text-white/65 mt-1 max-w-2xl">
                    Khóa 3 thông số Khối Lớp, Môn Học và Thể Loại Đề bên dưới, sau đó bốc ngẫu nhiên qua Bot Discord hoặc bốc thử tức thì từ bộ nhớ Kho Web.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <PixelButton
                    variant="primary"
                    magnetic
                    loading={isLoadingExam}
                    onClick={handlePickRandomExam}
                    disabled={!botStatus.online || !user || !user.verified || isLoadingExam}
                    icon={<Dices className="w-4 h-4" />}
                  >
                    {isLoadingExam ? 'Đang Quay Đề...' : 'Bốc Qua Bot Discord'}
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    onClick={handleInstantPracticePick}
                    icon={<Dices className="w-4 h-4 text-[#FFC46B]" />}
                  >
                    Bốc Thử Tức Thì ({displayedDocuments.length} đề)
                  </PixelButton>
                </div>
              </div>

              {/* 3 ILLUMINATED TELEMETRY REELS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Reel 1: Cấp & Khối Lớp */}
                <div
                  data-rolling={isRollingReel || isLoadingExam}
                  className="hh-slot-window p-4 space-y-1.5"
                >
                  <div className="hh-slot-scanline" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#C4A6FF]">Khối lớp</span>
                    <span className="w-2 h-2 rounded-xs bg-[#9B5CFF]" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white truncate">
                    {isRollingReel || isLoadingExam
                      ? ALL_GRADE_OPTIONS[reelTick % ALL_GRADE_OPTIONS.length].label
                      : ALL_GRADE_OPTIONS.find((g) => g.id === selectedGrade)?.label || 'Mọi Khối (6–12)'}
                  </div>
                  <div className="text-[13px] text-white/50">
                    Bậc: {EDUCATION_LEVEL_OPTIONS.find((e) => e.id === selectedEducationLevel)?.badge}
                  </div>
                </div>

                {/* Reel 2: Môn Học */}
                <div
                  data-rolling={isRollingReel || isLoadingExam}
                  className="hh-slot-window p-4 space-y-1.5"
                >
                  <div className="hh-slot-scanline" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#FFB8E6]">Môn học</span>
                    <span className="w-2 h-2 rounded-xs bg-[#FF4FCB]" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white truncate">
                    {isRollingReel || isLoadingExam
                      ? ALL_SUBJECT_OPTIONS[(reelTick * 2) % ALL_SUBJECT_OPTIONS.length].label
                      : ALL_SUBJECT_OPTIONS.find((s) => s.id === selectedSubject)?.label || 'Tất Cả Các Môn'}
                  </div>
                  <div className="text-[13px] text-white/50 tabular-nums">
                    Khớp: {displayedDocuments.length} đề khả dụng
                  </div>
                </div>

                {/* Reel 3: Độ Khó / Thể Loại */}
                <div
                  data-rolling={isRollingReel || isLoadingExam}
                  className="hh-slot-window p-4 space-y-1.5"
                >
                  <div className="hh-slot-scanline" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#5CE1E6]">Phân ban đề</span>
                    <span className="w-2 h-2 rounded-xs bg-[#5CE1E6]" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white truncate">
                    {isRollingReel || isLoadingExam
                      ? EXAM_TYPE_OPTIONS[reelTick % EXAM_TYPE_OPTIONS.length].label
                      : EXAM_TYPE_OPTIONS.find((t) => t.id === selectedExamType)?.label || 'Mọi Thể Loại'}
                  </div>
                  <div className="text-[13px] text-white/50">
                    Thang: Thường &lt; HSG &lt; Chuyên
                  </div>
                </div>
              </div>

              {/* Thông báo gọn nếu chưa liên kết Discord (không chặn trải nghiệm vì đã có Bốc Thử Tức Thì!) */}
              {(!user || !user.verified || !botStatus.online) && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-[#241a38] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2.5 text-white/75">
                    <CheckCircle2 className="w-4 h-4 text-[#FFB8E6] shrink-0" />
                    <span>
                      {!botStatus.online
                        ? 'Bot Discord đang tạm nghỉ, bạn có thể dùng nút "Bốc Thử Tức Thì" để lấy đề trực tiếp từ kho Cloud.'
                        : 'Muốn Bot gửi đề qua Discord cá nhân? Hãy liên kết tài khoản Discord đã xác minh email (hoặc dùng "Bốc Thử Tức Thì" ngay trên web).'}
                    </span>
                  </div>
                  {(!user || !user.verified) && (
                    <button
                      type="button"
                      onClick={onOpenAuthModal}
                      className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold shrink-0 cursor-pointer"
                    >
                      Liên kết Discord
                    </button>
                  )}
                </div>
              )}
            </SpotSurface>

            {/* KẾT QUẢ ĐỀ THI VỪA QUAY ĐƯỢC */}
            {currentExam && (
              <SpotSurface className="hh-hub-surface hh-voxel-frame p-6 sm:p-8 border-[#FF4FCB]/50 space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hh-pixel text-[13px] px-2.5 py-1 rounded bg-emerald-400 text-black font-bold">
                      Đề đã sẵn sàng
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[13px] font-black bg-[#9B5CFF]/25 text-[#E2D4FF] border border-[#9B5CFF]/40">
                      {currentExam.subject}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[13px] font-bold bg-white/10 text-white">
                      {currentExam.estimated_level}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[13px] font-mono bg-white/[0.06] text-white/80">
                      {currentExam.page_count || 1} trang • {formatFileSize(currentExam.file_size_bytes)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleInstantPracticePick}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[13px] font-bold text-[#FFB8E6] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Quay đề khác</span>
                  </button>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {currentExam.title || currentExam.file_name}
                  </h2>
                  <p className="text-[13px] text-white/50 font-mono mt-1">
                    Tệp gốc: {currentExam.file_name} • Đóng góp: {currentExam.author_name || 'Admin'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <PixelButton
                    variant="primary"
                    href={resolveExamFileUrl(currentExam) || undefined}
                    target={resolveExamFileUrl(currentExam) ? '_blank' : undefined}
                    rel={resolveExamFileUrl(currentExam) ? 'noopener noreferrer' : undefined}
                    onClick={() => {
                      if (!resolveExamFileUrl(currentExam)) {
                        setSelectedDossierDoc(currentExam);
                        setIsDossierOpen(true);
                      }
                    }}
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    Mở Làm Bài Ngay
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    href={resolveExamFileUrl(currentExam) || undefined}
                    target={resolveExamFileUrl(currentExam) ? '_blank' : undefined}
                    rel={resolveExamFileUrl(currentExam) ? 'noopener noreferrer' : undefined}
                    download={botStatus.online ? currentExam.file_name || 'de_thi.pdf' : undefined}
                    onClick={() => {
                      if (!resolveExamFileUrl(currentExam)) {
                        setSelectedDossierDoc(currentExam);
                        setIsDossierOpen(true);
                      }
                    }}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Tải Về Máy ({(currentExam.file_type || 'PDF').toUpperCase()})
                  </PixelButton>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDossierDoc(currentExam);
                      setIsDossierOpen(true);
                    }}
                    className="px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-[#241a38] text-[13px] font-bold text-white cursor-pointer flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-[#C4A6FF]" />
                    <span>Xem Hồ Sơ Đề Thi</span>
                  </button>
                </div>
              </SpotSurface>
            )}

            {/* Bàn lọc chiến thuật bên dưới để khóa tiêu chí bốc */}
            {renderFilterControls(true)}
          </div>
        )}

        {/* TAB 02 & 03: VAULT */}
        {activeTab === 'vault' && !hubLocked && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Vault Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
                  <span>{showBookmarksOnly ? 'Tủ Sách Ôn Luyện Của Tôi' : 'Kho Đề Thi Đã Thẩm Định'}</span>
                  <span className="tabular-nums text-[13px] sm:text-sm px-3 py-1 rounded-xl bg-[#9B5CFF]/25 border border-[#9B5CFF]/45 text-[#E2D4FF]">
                    {displayedDocuments.length} đề
                  </span>
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBookmarksOnly((b) => !b)}
                  data-active={showBookmarksOnly}
                  className="hh-hub-chip"
                >
                  <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-amber-400 text-amber-400' : 'text-amber-400'}`} />
                  <span>{showBookmarksOnly ? 'Đang xem Tủ Sách' : `Tủ Sách (${bookmarkedIds.size})`}</span>
                </button>

                <PixelButton
                  variant="primary"
                  onClick={() => handleTabChange('submit_doc')}
                  icon={<UploadCloud className="w-4 h-4" />}
                >
                  + Nộp Đề Mới
                </PixelButton>
              </div>
            </div>

            {/* Bàn Lọc Chiến Thuật Gọn Gàng */}
            {renderFilterControls(false)}

            {/* Lưới Hồ Sơ Đề Thi */}
            {isLoadingDocs ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl hh-hub-surface space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-5 rounded skeleton-shimmer" />
                      <div className="w-20 h-5 rounded skeleton-shimmer" />
                    </div>
                    <div className="w-4/5 h-6 rounded skeleton-shimmer" />
                    <div className="w-1/2 h-4 rounded skeleton-shimmer" />
                  </div>
                ))}
              </div>
            ) : displayedDocuments.length > 0 ? (
              <div className="space-y-5">
                <div
                  className={`grid gap-4 sm:gap-5 ${
                    config.vaultGridCols === '1'
                      ? 'grid-cols-1'
                      : config.vaultGridCols === '3'
                      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                      : 'grid-cols-1 xl:grid-cols-2'
                  }`}
                >
                  {paginatedDocuments.map((doc) => renderExamDossierCard(doc))}
                </div>

                {visibleCount < displayedDocuments.length && (
                  <div className="p-4 rounded-2xl hh-hub-surface flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[13px] text-white/60">
                      Đang hiển thị <strong className="text-white">{paginatedDocuments.length}</strong> /{' '}
                      <strong className="text-[#FFB8E6]">{displayedDocuments.length}</strong> đề thi
                    </span>
                    <div className="flex items-center gap-2">
                      <PixelButton
                        variant="primary"
                        onClick={() => setVisibleCount((prev) => Math.min(prev + 24, displayedDocuments.length))}
                      >
                        Tải thêm +24 đề
                      </PixelButton>
                      <PixelButton
                        variant="ghost"
                        onClick={() => setVisibleCount(displayedDocuments.length)}
                      >
                        Mở toàn bộ
                      </PixelButton>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <SpotSurface className="hh-hub-surface p-10 text-center space-y-4">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="space-y-1">
                  <div className="text-base font-extrabold text-white">
                    {showBookmarksOnly
                      ? 'Tủ sách cá nhân của bạn đang trống'
                      : 'Không tìm thấy đề thi khớp với tiêu chí lọc'}
                  </div>
                  <p className="text-[13px] text-white/55 max-w-md mx-auto">
                    {showBookmarksOnly
                      ? 'Hãy nhấn biểu tượng ⭐ trên các thẻ đề thi để lưu vào Tủ Sách ôn luyện.'
                      : 'Hãy thử đặt lại bộ lọc hoặc đổi từ khóa tìm kiếm để xem toàn bộ kho đề.'}
                  </p>
                </div>
                <div>
                  <PixelButton variant="primary" onClick={handleResetAllFilters}>
                    Khôi phục toàn bộ kho đề ({documentsList.length || stats.total_real})
                  </PixelButton>
                </div>
              </SpotSurface>
            )}
          </div>
        )}

        {/* TAB 05: SUBMIT_DOC */}
        {activeTab === 'submit_doc' && !hubLocked && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <SpotSurface className="hh-hub-surface p-6 sm:p-8 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    Đóng Góp &amp; Kiểm Duyệt Đề Thi
                  </h1>
                  <p className="text-[13px] sm:text-sm text-white/65 mt-1 max-w-2xl">
                    Mỗi tài liệu tải lên (PDF, DOCX, TXT) hoặc liên kết Google Drive đều đi qua quy trình 5 bước kiểm định bảo mật và phân loại trước khi đồng bộ lên Kho Đề.
                  </p>
                </div>
              </div>

              {/* 5-Step Pipeline Visualizer */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                {[
                  { step: 'Bước 1', name: 'Định danh tệp', desc: 'PDF / DOCX / Drive' },
                  { step: 'Bước 2', name: 'Quét Magic Byte', desc: 'Chống mã độc' },
                  { step: 'Bước 3', name: 'Băm SHA-256', desc: 'Chống trùng lặp' },
                  { step: 'Bước 4', name: 'Đối chiếu 3 bước', desc: 'Phân loại Khối & Môn' },
                  { step: 'Bước 5', name: 'Đồng bộ Cloud', desc: 'Discord + Turso DB' },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="p-3 rounded-xl bg-[#0B0911]/85 border border-[#241a38] space-y-1"
                  >
                    <div className="text-[13px] font-semibold text-[#FFB8E6]">{item.step}</div>
                    <div className="text-[13px] font-extrabold text-white">{item.name}</div>
                    <div className="text-[13px] text-white/50">{item.desc}</div>
                  </div>
                ))}
              </div>
            </SpotSurface>

            <Suspense
              fallback={
                <div className="p-8 text-center text-[13px] text-white/50">Đang nạp Cổng Đóng Góp &amp; Kiểm Duyệt 5 Bước...</div>
              }
            >
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
            </Suspense>
          </div>
        )}

        {/* TAB 06: ADMIN */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {isAdmin || readCachedAdmin() ? (
              <Suspense
                fallback={
                  <div className="p-8 text-center text-[13px] text-white/50">Đang mở Bảng Quản Trị...</div>
                }
              >
                <AdminPanel
                  onClose={() => handleTabChange('overview')}
                  onRefreshParentDocs={() => {
                    fetchDocuments();
                    fetchDocStats();
                  }}
                />
              </Suspense>
            ) : (
              <SpotSurface className="hh-panel rounded-2xl p-6 sm:p-10 text-center max-w-2xl mx-auto my-8 space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-[#FF3CA6]/12 border border-[#FF3CA6]/35 flex items-center justify-center text-[#FFA8DC] mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <div className="text-[13px] font-semibold text-[#FFA8DC]">
                    Cổng quản trị nội bộ Orbit
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Yêu cầu quyền Quản trị viên Discord Orbit
                  </h1>
                  <p className="text-sm text-[#CEC4E8] max-w-lg mx-auto leading-relaxed">
                    Bảng Quản Trị &amp; Giám Sát Độc Lập chỉ dành cho Ban Quản Trị máy chủ Discord Orbit. Vui lòng liên kết tài khoản Discord có quyền Quản trị viên (Administrator / Manage Guild) hoặc quay về Tổng quan Orbit Hub.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <PixelButton
                    variant="primary"
                    icon={<UserCheck className="w-4 h-4" aria-hidden="true" />}
                    onClick={onOpenAuthModal}
                  >
                    {user ? 'Đổi tài khoản Discord' : 'Liên kết Discord Quản trị'}
                  </PixelButton>
                  {user && (
                    <PixelButton
                      variant="ghost"
                      icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
                      onClick={() => checkAdminStatus()}
                    >
                      Kiểm tra lại quyền Admin
                    </PixelButton>
                  )}
                  <PixelButton
                    variant="ghost"
                    icon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
                    onClick={() => handleTabChange('overview')}
                  >
                    Quay về Tổng quan Orbit Hub
                  </PixelButton>
                </div>
              </SpotSurface>
            )}
          </div>
        )}
      </main>

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
        botOnline={botStatus.online}
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
        onNavigateTab={(tab) => handleTabChange(tab)}
        onNavigateHome={onBackToHome}
        onTriggerRandomExam={handleInstantPracticePick}
      />
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <HubLayoutProvider>
      <DashboardContent {...props} />
    </HubLayoutProvider>
  );
};
