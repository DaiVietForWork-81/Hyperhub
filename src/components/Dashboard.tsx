import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  Home,
  ArrowLeft,
  CheckCircle2,
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
  Flame,
  Trophy,
  PenTool,
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
import { ExamDossierModal, DossierModalTab } from './ExamDossierModal';
import { CommandPalette } from './CommandPalette';
import {
  fetchDocsFromTurso,
  getTursoStorageUsage,
  StudyProfileData,
  AcademicScholarEntry,
  fetchStudyProfileTurso,
  recordStudyCheckinTurso,
  fetchAcademicLeaderboardTurso,
} from '../utils/tursoClient';
import { sound } from '../utils/audio';
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
        if (!token) {
          writeCachedAdmin(false);
          break;
        }
        const headers: Record<string, string> = { ...API_FETCH_HEADERS };
        headers['Authorization'] = `Bearer ${token}`;
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
  const [dossierInitialTab, setDossierInitialTab] = useState<DossierModalTab>('pdf_reader');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const openExamModal = useCallback((doc: ExamDocument, tab: DossierModalTab = 'pdf_reader') => {
    setSelectedDossierDoc(doc);
    setDossierInitialTab(tab);
    setIsDossierOpen(true);
  }, []);

  // Tự động mở Trình đọc đề PDF nếu URL có hash #exam-{id} (từ lệnh /luyende trên Discord)
  useEffect(() => {
    if (documentsList.length === 0) return;
    try {
      const hash = window.location.hash;
      const m = hash.match(/^#exam-(\d+)$/i);
      if (m) {
        const docId = Number(m[1]);
        const target = documentsList.find((d) => d.id === docId);
        if (target) {
          openExamModal(target, 'pdf_reader');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    } catch {
      /* ignore */
    }
  }, [documentsList, openExamModal]);

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

  // ============================================================================
  // HỒ SƠ HỌC TẬP, CHUỖI NGÀY HỌC (STREAK) & BẢNG XẾP HẠNG ĐỒNG BỘ DISCORD ↔ WEB
  // ============================================================================
  const [studyProfile, setStudyProfile] = useState<StudyProfileData | null>(() => {
    try {
      const cached = localStorage.getItem('orbit_study_profile_v1');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [leaderboardList, setLeaderboardList] = useState<AcademicScholarEntry[]>([]);
  const [leaderboardSort, setLeaderboardSort] = useState<'xp' | 'streak' | 'contrib'>('xp');
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);

  const fetchStudyProfileAndLeaderboard = useCallback(async () => {
    const apiBase = getApiBaseUrl();
    const uid = user?.id || '';
    const uname = user?.username || 'Học Sinh Orbit';
    const dname = user?.global_name || user?.username || 'Học Sinh Orbit';
    const avatar = user?.avatar || '';

    // 1. Tải Bảng Xếp Hạng Học Thuật (Song song Bot API & Turso Cloud)
    let lbResolved = false;
    fetchAcademicLeaderboardTurso()
      .then((tursoLb) => {
        if (!lbResolved && tursoLb && tursoLb.length > 0) {
          setLeaderboardList(tursoLb);
        }
      })
      .catch(() => {});

    try {
      const lbRes = await fetch(`${apiBase}/api/study/leaderboard?limit=12`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        if (lbData.success && Array.isArray(lbData.leaderboard) && lbData.leaderboard.length > 0) {
          lbResolved = true;
          setLeaderboardList(lbData.leaderboard);
        }
      }
    } catch {
      /* Turso fallback already running */
    }

    // 2. Tải Hồ Sơ & Chuỗi Ngày Học cá nhân
    if (!uid) return;
    let profResolved = false;
    fetchStudyProfileTurso(uid, uname, dname, avatar)
      .then((tursoProf) => {
        if (!profResolved && tursoProf) {
          setStudyProfile(tursoProf);
          try {
            localStorage.setItem('orbit_study_profile_v1', JSON.stringify(tursoProf));
          } catch {}
        }
      })
      .catch(() => {});

    try {
      const headers: Record<string, string> = { ...API_FETCH_HEADERS };
      const token = getDiscordAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const q = new URLSearchParams({
        discord_id: uid,
        username: uname,
        display_name: dname,
        avatar_url: avatar,
      });
      const profRes = await fetch(`${apiBase}/api/study/profile?${q.toString()}`, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData.success && profData.profile) {
          profResolved = true;
          setStudyProfile(profData.profile);
          try {
            localStorage.setItem('orbit_study_profile_v1', JSON.stringify(profData.profile));
          } catch {}
        }
      }
    } catch {
      /* Turso fallback handles it */
    }
  }, [user]);

  useEffect(() => {
    fetchStudyProfileAndLeaderboard();
  }, [fetchStudyProfileAndLeaderboard]);

  const triggerStudyCheckin = useCallback(
    async (
      action: 'daily_checkin' | 'pomodoro' | 'exam_complete' | 'update_dream',
      minutes: number = 0,
      dreamSchoolOverride?: string,
      dreamScoreOverride?: string
    ) => {
      const uid = user?.id || 'local_scholar';
      const uname = user?.username || 'HocSinhOrbit';
      const dname = user?.global_name || user?.username || 'Học Sinh Orbit';
      const avatar = user?.avatar || '';

      setIsCheckingIn(true);
      try {
        // Đồng bộ trực tiếp lên Turso Cloud trước để đảm bảo cả khi Bot tắt vẫn lưu
        const tursoUpdated = await recordStudyCheckinTurso({
          discordId: uid,
          username: uname,
          displayName: dname,
          avatarUrl: avatar,
          action,
          minutes,
          dreamSchool: dreamSchoolOverride ?? dreamGoal?.school,
          dreamScore: dreamScoreOverride ?? dreamGoal?.score,
        });
        if (tursoUpdated && tursoUpdated.profile) {
          setStudyProfile(tursoUpdated.profile);
          try {
            localStorage.setItem('orbit_study_profile_v1', JSON.stringify(tursoUpdated.profile));
          } catch {}
        }

        // Đồng bộ song song về Bot SQLite (nếu Bot đang bật)
        try {
          const apiBase = getApiBaseUrl();
          const headers: Record<string, string> = {
            ...API_FETCH_HEADERS,
            'Content-Type': 'application/json',
          };
          const token = getDiscordAccessToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${apiBase}/api/study/checkin`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              discord_id: uid,
              username: uname,
              display_name: dname,
              avatar_url: avatar,
              action,
              minutes,
              dream_school: dreamSchoolOverride ?? dreamGoal?.school ?? '',
              dream_score: dreamScoreOverride ?? dreamGoal?.score ?? '',
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              setStudyProfile(data.profile);
              try {
                localStorage.setItem('orbit_study_profile_v1', JSON.stringify(data.profile));
              } catch {}
            }
          }
        } catch {
          /* Turso already saved */
        }

        if (action === 'daily_checkin') {
          showSuccess('🔥 Đã điểm danh chuỗi học tập hôm nay (+50 XP)! Đồng bộ Discord & Web.', 'Chuỗi Học Tập');
        } else if (action === 'pomodoro') {
          showSuccess('🍅 Hoàn thành phiên Pomodoro 25 phút (+40 XP)!', 'Pomodoro Đồng Bộ');
        } else if (action === 'exam_complete') {
          showSuccess('🏆 Đã ghi nhận hoàn thành luyện đề (+100 XP) vào Bảng Xếp Hạng!', 'Phòng Thi Thực Chiến');
        }

        fetchStudyProfileAndLeaderboard();
      } finally {
        setIsCheckingIn(false);
      }
    },
    [user, dreamGoal, showSuccess, fetchStudyProfileAndLeaderboard]
  );

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
          if (pomoMode === 'focus') {
            triggerStudyCheckin('pomodoro', 25);
          }
          setPomoMode(nextMode);
          showInfo(
            nextMode === 'chill'
              ? 'Đã hoàn thành 25 phút tập trung (+40 XP)! Nghỉ ngơi 5 phút nhé 🌸'
              : 'Hết giờ nghỉ! Bắt đầu phiên tập trung mới nhé ⚡',
            'Pomodoro Hub'
          );
          return nextMode === 'chill' ? 5 * 60 : 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomoRunning, pomoMode, showInfo, triggerStudyCheckin]);

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

  // Nhận bộ lọc khởi hành nhanh từ Trang Chủ (Hero Quickbar & Subject Streams)
  useEffect(() => {
    try {
      const rawFilter = sessionStorage.getItem('orbit_hub_prefilter');
      if (!rawFilter) return;
      sessionStorage.removeItem('orbit_hub_prefilter');
      const parsed = JSON.parse(rawFilter);
      if (parsed && typeof parsed === 'object') {
        if (parsed.educationLevel) setSelectedEducationLevel(parsed.educationLevel);
        if (parsed.grade) setSelectedGrade(parsed.grade);
        if (parsed.subject) setSelectedSubject(parsed.subject);
        if (parsed.examType) setSelectedExamType(parsed.examType);
        if (typeof parsed.search === 'string') setDescriptionKeyword(parsed.search);
        setShowBookmarksOnly(false);
        setActiveTab('vault');
        onTabChange?.('vault');
      }
    } catch {
      /* ignore */
    }
  }, [onTabChange]);

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
      triggerStudyCheckin('update_dream', 0, school, score);
      showSuccess(`Đã ghim mục tiêu: ${school} (Đồng bộ Discord & Web)`, 'Mục Tiêu Học Tập');
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
      { id: 'ENGLISH', label: 'Ngoại ngữ (Tiếng Anh)', shortLabel: 'Tiếng Anh', tone: '#38BDF8' },
      { id: 'LITERATURE', label: 'Ngữ văn', shortLabel: 'Ngữ văn', tone: '#F472B6' },
      { id: 'GENERAL', label: 'Tài liệu & Chuyên đề chung', shortLabel: 'Chuyên đề chung', tone: '#818CF8' },
      { id: 'MATHEMATICS', label: 'Toán học', shortLabel: 'Toán học', tone: '#FF4FCB' },
      { id: 'INFORMATICS', label: 'Tin học & Thuật toán', shortLabel: 'Tin học', tone: '#FBBF24' },
      { id: 'PHYSICS', label: 'Vật lí', shortLabel: 'Vật lí', tone: '#A78BFA' },
      { id: 'CHEMISTRY', label: 'Hóa học', shortLabel: 'Hóa học', tone: '#34D399' },
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

  // Đồng bộ ngày & giờ đếm ngược kỳ thi THPT Quốc Gia theo thời gian thực
  const nextThptExam = useMemo(() => getNextThptExamInfo(), []);
  const [countdownParts, setCountdownParts] = useState<{
    days: number;
    hours: string;
    minutes: string;
    seconds: string;
  }>(() => {
    const diff = Math.max(0, new Date(nextThptExam.targetIso).getTime() - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return {
      days: d,
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0'),
    };
  });

  useEffect(() => {
    const targetMs = new Date(nextThptExam.targetIso).getTime();
    const tick = () => {
      const diff = Math.max(0, targetMs - Date.now());
      setCountdownParts({
        days: Math.floor(diff / 86400000),
        hours: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
        minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      });
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [nextThptExam.targetIso]);

  const [vaultViewMode, setVaultViewMode] = useState<'cards' | 'table'>('cards');

  // Thống kê nhanh được memo hóa (tránh tính lại mỗi lần render)
  const thptDocsCount = useMemo(
    () =>
      (gradeDistribution['12'] || 0) +
        (gradeDistribution['11'] || 0) +
        (gradeDistribution['10'] || 0) || totalDocsCount,
    [gradeDistribution, totalDocsCount]
  );

  const withAnswersDocsCount = useMemo(
    () =>
      documentsList.filter((d) => d.has_answer_keys || d.has_detailed_solutions).length ||
      totalDocsCount,
    [documentsList, totalDocsCount]
  );

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
              onClick={() => openExamModal(doc, 'pdf_reader')}
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
                onClick={() => openExamModal(doc, 'pdf_reader')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#d61f79] hover:opacity-95 text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 shadow-[0_6px_20px_-6px_rgba(255,79,203,0.6)] transition-all cursor-pointer"
                title="Đọc đề PDF trực tiếp trên Web"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 Đọc PDF</span>
              </button>

              <button
                type="button"
                onClick={() => openExamModal(doc, 'practice_room')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-[13px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Mở phòng thi thực chiến (Đếm giờ + Phiếu tô đáp án 2025)"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>✍️ Làm Đề</span>
              </button>

              <button
                type="button"
                onClick={() => openExamModal(doc, 'overview')}
                className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#241a38] text-white/80 hover:text-white font-bold text-[13px] transition-all cursor-pointer flex items-center gap-1"
                title="Xem Hồ Sơ Kiểm Định AI"
              >
                <Eye className="w-3.5 h-3.5 text-[#C4A6FF]" />
                <span className="hidden sm:inline">Hồ Sơ</span>
              </button>

              <a
                href={resolveExamFileUrl(doc) || '#vault'}
                target={resolveExamFileUrl(doc) ? '_blank' : undefined}
                rel={resolveExamFileUrl(doc) ? 'noopener noreferrer' : undefined}
                download={botStatus.online ? doc.file_name || 'de_thi.pdf' : undefined}
                onClick={(e) => {
                  if (!resolveExamFileUrl(doc)) {
                    e.preventDefault();
                    openExamModal(doc, 'pdf_reader');
                  }
                }}
                className="p-2.5 rounded-xl bg-[#9B5CFF]/15 hover:bg-[#9B5CFF]/30 border border-[#9B5CFF]/35 text-[#E2D4FF] transition-all cursor-pointer"
                title="Tải tệp gốc về máy"
              >
                <Download className="w-4 h-4" />
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

  // ===========================================================================
  // SUB-RENDER: COMPACT TABLE ROW FOR HIGH-DENSITY WORKBENCH / VAULT TABLE VIEW
  // ===========================================================================
  const renderExamCompactRow = (doc: ExamDocument) => {
    const isBookmarked = bookmarkedIds.has(doc.id);
    const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
    const trackInfo = getExamTrackInfo(doc);
    const resolvedDownloadUrl = resolveExamFileUrl(doc);

    return (
      <div
        key={`row-${doc.id}`}
        className="hh-dossier-row px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
      >
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[12px] font-extrabold px-2 py-0.5 rounded bg-[#9B5CFF]/15 text-[#E2D4FF] border border-[#9B5CFF]/35">
              {doc.subject}
            </span>
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${gradeStyle.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
              <span>{gradeStyle.label}</span>
            </span>
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded border ${trackInfo.badgeClass}`}>
              {trackInfo.label}
            </span>
            {(doc.has_answer_keys || doc.has_detailed_solutions) && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Đáp án
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => openExamModal(doc, 'pdf_reader')}
            className="text-left min-w-0 flex-1 font-bold text-[13px] sm:text-sm text-white group-hover:text-[#FFB8E6] transition-colors truncate cursor-pointer"
          >
            {doc.title || doc.file_name}
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-[12px] text-white/50 font-mono tabular-nums pr-1">
            {doc.academic_year && <span>{doc.academic_year}</span>}
            <span>•</span>
            <span>{doc.page_count || 1}tr</span>
            <span>•</span>
            <span>{formatFileSize(doc.file_size_bytes)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openExamModal(doc, 'pdf_reader')}
              className="px-2.5 py-1 rounded-lg bg-[#d61f79]/25 hover:bg-[#d61f79] border border-[#FF4FCB]/40 text-white text-[12px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Đọc PDF</span>
            </button>

            <button
              type="button"
              onClick={() => openExamModal(doc, 'practice_room')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/35 text-emerald-300 text-[12px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Làm Bài</span>
            </button>

            {resolvedDownloadUrl && (
              <a
                href={resolvedDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={botStatus.online ? doc.file_name || 'de_thi.pdf' : undefined}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/75 hover:text-white transition-colors"
                title="Tải tệp gốc"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                toggleBookmarkExam(doc.id);
                setBookmarkedIds(new Set(getBookmarkedExamIds()));
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/45 hover:text-amber-300'
              }`}
              title="Lưu vào Tủ Sách"
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const hubLocked = false;

  return (
    <div className="hh-hub-shell">
      {/* ========================================================================= */}
      {/* MOBILE TOP COMMAND HEADER                                                 */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full sticky top-0 z-40 hh-hub-mobile-bar">
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <span className="hh-orbit-logo-halo w-8 h-8 shrink-0">
              <img
                src="/orbit_logo_transparent.png"
                alt="Orbit | Vietnam"
                className="w-6 h-6 object-contain"
              />
            </span>
            <div>
              <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>Orbit | Vietnam</span>
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#FF4FCB]/20 text-[#FFB8E6] border border-[#FF4FCB]/35">
                  COMMAND
                </span>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80"
              aria-label="Tìm kiếm nhanh"
            >
              <Search className="w-4 h-4 text-[#FFB8E6]" />
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-white/85 bg-white/[0.06] border border-white/[0.1] flex items-center gap-1.5 cursor-pointer"
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
            <span>Bàn Điều Khiển</span>
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
            <span>Nộp Đề AI</span>
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
      {/* DESKTOP COMMAND RAIL (SIDEBAR - ARCHITECTURAL PRECISION, NO ZOOM SLOP)   */}
      {/* ========================================================================= */}
      <aside
        style={{ width: `${Math.max(256, config.sidebarWidth)}px` }}
        className="hidden lg:flex sticky top-0 h-dvh hh-hub-sidebar flex-col justify-between shrink-0 p-4 z-30 overflow-y-auto no-scrollbar"
      >
        <div className="space-y-4">
          {/* Brand Header with Crystal Ring Emblem */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-3 group cursor-pointer text-left min-w-0"
              title="Quay về Trang Chủ Orbit | Vietnam"
            >
              <span className="hh-orbit-logo-halo w-10 h-10 shrink-0">
                <img
                  src="/orbit_logo_transparent.png"
                  alt="Orbit | Vietnam"
                  className="w-7 h-7 object-contain"
                />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-black text-white group-hover:text-[#FFB8E6] transition-colors flex items-center gap-1.5 truncate">
                  <span>Orbit | Vietnam</span>
                </div>
                <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#C4A6FF]/75 mt-0.5">
                  COMMAND DECK v2.5
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer shrink-0"
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
            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.09] hover:border-[#FF4FCB]/45 flex items-center justify-between gap-2 text-[13px] text-white/75 hover:text-white transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[#FF4FCB] shrink-0" />
              <span className="truncate">Tìm nhanh đề thi &amp; lệnh...</span>
            </span>
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/[0.07] border border-white/[0.1] text-white/70 whitespace-nowrap shrink-0">
              Ctrl K
            </kbd>
          </button>

          {/* Navigation Deck */}
          <div className="space-y-1.5">
            <div className="px-2 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-white/45 font-bold">
                TRẠM ĐIỀU HÀNH
              </span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                <span>{botStatus.online ? 'BOT LIVE' : 'CLOUD LIVE'}</span>
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
                <span className="ml-auto font-mono text-[11px] text-white/40">01</span>
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
                <span className="ml-auto font-mono tabular-nums text-[12px] px-2 py-0.5 rounded-md bg-[#FF4FCB]/15 text-[#FFB8E6] border border-[#FF4FCB]/30">
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
                <span className="ml-auto font-mono tabular-nums text-[12px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {bookmarkedIds.size}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('get_exam')}
                data-active={activeTab === 'get_exam'}
                className="hh-hub-nav-item"
              >
                <Dices className="w-4 h-4 shrink-0 text-[#38BDF8]" />
                <span>Máy Bốc Đề Ngẫu Nhiên</span>
                <span className="ml-auto font-mono text-[11px] text-[#38BDF8]/80">RNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('submit_doc')}
                data-active={activeTab === 'submit_doc'}
                className="hh-hub-nav-item"
              >
                <UploadCloud className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Trạm Nộp Đề AI</span>
                <span className="ml-auto font-mono text-[11px] text-emerald-300/80">+XP</span>
              </button>

              {(isAdmin || readCachedAdmin()) && (
                <button
                  type="button"
                  onClick={() => handleTabChange('admin')}
                  data-active={activeTab === 'admin'}
                  className="hh-hub-nav-item"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Quản Trị Hệ Thống</span>
                  {hasSystemUpdate ? (
                    <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold">
                      Mới
                    </span>
                  ) : (
                    <span className="ml-auto font-mono text-[11px] text-amber-300/75 flex items-center gap-1">
                      {justReconnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      <span>{adminInfo?.role_name || 'ROOT'}</span>
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* LỌC NHANH THEO KHỐI LỚP (GỌN GÀNG, SẮC NÉT) */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2">
            <div className="px-1 flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-white/45 font-bold">
                KHỐI LỚP TRỌNG ĐIỂM
              </span>
              <span className="text-[11px] font-mono text-white/40 tabular-nums">Lớp 6–12</span>
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
                  className="px-2.5 py-2 rounded-lg bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.07] hover:border-[#FF4FCB]/40 flex items-center justify-between text-[13px] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-white/85">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: g.dot }} />
                    <span>{g.label}</span>
                  </span>
                  <span className="font-mono text-[12px] text-white/55 tabular-nums">{g.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MINI LIVE ORBIT TELEMETRY PILL (POMODORO + STREAK LUÔN HIỂN THỊ KHI CHUYỂN TAB) */}
          <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPomoRunning((r) => !r);
                }}
                className="flex items-center gap-1.5 font-bold text-[#FFB8E6] hover:text-white cursor-pointer"
                title="Bấm để Chạy/Dừng Pomodoro"
              >
                <Clock className="w-3.5 h-3.5 text-[#FF4FCB]" />
                <span className="font-mono tabular-nums">{formatPomo(pomoSeconds)}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#FF4FCB]/20 text-[#FFB8E6]">
                  {pomoRunning ? 'ĐANG CHẠY' : 'POMO'}
                </span>
              </button>

              <span className="font-mono font-bold text-amber-300 tabular-nums flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400/30" />
                <span>{studyProfile?.current_streak || 0}d</span>
              </span>
            </div>

            <button
              type="button"
              disabled={isCheckingIn}
              onClick={() => triggerStudyCheckin('daily_checkin', 15)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-[#d61f79]/25 hover:from-orange-500/30 hover:to-[#d61f79]/40 border border-orange-400/35 text-amber-200 font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{isCheckingIn ? 'Đang đồng bộ...' : 'Điểm danh hôm nay (+50 XP)'}</span>
            </button>
          </div>
        </div>

        {/* Bottom: Discord Identity & Storage Channel Status */}
        <div className="pt-3 mt-3 border-t border-white/[0.08] space-y-2.5">
          {user ? (
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#9B5CFF]/50 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="font-bold text-[13px] truncate text-white">
                    {user.global_name || user.username}
                  </div>
                  <div className="text-[11px] text-white/45 truncate font-mono">
                    {studyProfile?.rank_title || `@${user.username}`}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-white/45 hover:text-rose-300 hover:bg-white/[0.05] cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-white/[0.06] text-white/50">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Turso + Discord Sync</span>
                </span>
                <span className="tabular-nums text-[#FFB8E6] font-bold">{studyProfile?.study_xp || 0} XP</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-white/85 font-bold">Đồng bộ Discord</span>
                <span className="font-mono text-[11px] text-[#FFB8E6]">Khách</span>
              </div>
              <PixelButton
                variant="discord"
                block
                className="!min-h-[38px] !text-[12px]"
                onClick={onOpenAuthModal}
                icon={<UserCheck className="w-3.5 h-3.5" />}
              >
                Liên Kết Discord
              </PixelButton>
            </div>
          )}

          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-2 px-3 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.08] text-[12px] font-bold text-white/70 hover:text-white flex items-center justify-between cursor-pointer transition-all"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF4FCB]" />
              <span>Về Trang Chủ Orbit</span>
            </span>
            <span className="font-mono text-[11px] text-white/35">ESC</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT                                                    */}
      {/* ========================================================================= */}
      <main className="hh-hub-main flex-1 min-w-0 p-4 sm:p-6 lg:p-7 xl:p-8 max-w-[1640px] mx-auto w-full">
        {/* Desktop Top Telemetry & Quick Filter Bar */}
        <div className="hidden lg:flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={onBackToHome}
                className="text-[13px] font-bold text-white/55 hover:text-[#FFB8E6] transition-colors cursor-pointer"
              >
                Orbit | Vietnam
              </button>
              <span className="text-white/25">/</span>
              <span className="text-[13px] font-extrabold text-white">
                {activeTab === 'overview' && 'Bàn điều khiển trung tâm'}
                {activeTab === 'vault' && (showBookmarksOnly ? 'Tủ sách cá nhân' : 'Kho đề thẩm định')}
                {activeTab === 'get_exam' && 'Máy bốc đề ngẫu nhiên'}
                {activeTab === 'submit_doc' && 'Trạm nộp đề AI'}
                {activeTab === 'admin' && 'Quản trị hệ thống'}
              </span>
            </div>

            {/* 1-Click Quick Filter Strip right in the header */}
            <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setSelectedEducationLevel('ALL');
                  handleGradeChange('12');
                  setShowBookmarksOnly(false);
                  handleTabChange('vault');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[12px] font-semibold text-white/75 hover:text-white cursor-pointer transition-colors"
              >
                🔥 Đề Lớp 12 ({gradeDistribution['12'] || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterHasAnswers(true);
                  setShowBookmarksOnly(false);
                  handleTabChange('vault');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[12px] font-semibold text-emerald-300/90 hover:text-emerald-200 cursor-pointer transition-colors"
              >
                ✓ Có Đáp Án ({withAnswersDocsCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExamTypeChange('CHUYEN');
                  setShowBookmarksOnly(false);
                  handleTabChange('vault');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-[12px] font-semibold text-[#FFB8E6] hover:text-white cursor-pointer transition-colors"
              >
                🏅 Trường Chuyên
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Database & Bot Telemetry Pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[12px] font-mono tabular-nums">
              <span
                className={`w-2 h-2 rounded-full ${
                  botStatus.online
                    ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                    : 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                }`}
              />
              <span className="text-white/80 font-sans font-semibold">
                {botStatus.online ? `Orbit Bot (${botStatus.ping_ms || 24}ms)` : 'Turso + Discord CDN'}
              </span>
              <span className="text-white/20">|</span>
              <span className="text-[#FFB8E6] font-bold">{totalDocsCount} đề</span>
              <span className="text-white/20">|</span>
              <span className="text-emerald-300 font-bold" title="Kênh lưu trữ #database trên Discord">
                DB #154862...
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                checkBotStatus();
                fetchDocStats();
                fetchDocuments();
                showInfo('Đã đồng bộ lại dữ liệu kho đề từ Turso Cloud & Discord CDN.');
              }}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white transition-colors cursor-pointer"
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

        {/* TAB 01: OVERVIEW — ORBIT | VIETNAM COMMAND DECK V2 */}
        {activeTab === 'overview' && (
          <div key="tab-overview" className="space-y-6 hh-swap-panel">
            {/* ===================================================================== */}
            {/* ZONE 1: THE ORBIT COMMAND DECK (UNIFIED HERO + POMODORO/STREAK COCKPIT)*/}
            {/* ===================================================================== */}
            <div className="hh-command-deck p-5 sm:p-7 lg:p-8">
              <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                {/* LEFT 7/12: ACADEMIC MISSION CONTROL, LIVE THPT COUNTDOWN & TYPOGRAPHY KPIs */}
                <div className="xl:col-span-7 flex flex-col justify-between gap-5">
                  <div className="space-y-5">
                    {/* Top Eyebrow + Live 4-Cell Second-by-Second THPT Countdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <span className="hh-orbit-logo-halo w-8 h-8 shrink-0">
                          <img
                            src="/orbit_logo_transparent.png"
                            alt="Orbit | Vietnam"
                            className="w-6 h-6 object-contain"
                          />
                        </span>
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#FFB8E6] font-bold">
                            ORBIT | VIETNAM • ACADEMIC COMMAND
                          </div>
                          <div className="text-[12px] text-white/60">
                            Đồng bộ trực tiếp Turso Cloud &amp; Discord Bot
                          </div>
                        </div>
                      </div>

                      {/* Real-time Second-by-Second THPT Countdown Strip */}
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 mr-1 hidden sm:inline">
                          THPT {nextThptExam.examYear}:
                        </span>
                        {[
                          { val: String(countdownParts.days).padStart(2, '0'), unit: 'NGÀY' },
                          { val: String(countdownParts.hours).padStart(2, '0'), unit: 'GIỜ' },
                          { val: String(countdownParts.minutes).padStart(2, '0'), unit: 'PHÚT' },
                          { val: String(countdownParts.seconds).padStart(2, '0'), unit: 'GIÂY' },
                        ].map((cell, i) => (
                          <div
                            key={cell.unit}
                            className={`px-2 py-1 rounded-lg border text-center tabular-nums ${
                              i === 3
                                ? 'bg-[#FF4FCB]/15 border-[#FF4FCB]/40 text-[#FFB8E6]'
                                : 'bg-white/[0.04] border-white/[0.09] text-white'
                            }`}
                          >
                            <div className="font-mono font-black text-xs sm:text-sm leading-none">
                              {cell.val}
                            </div>
                            <div className="text-[9px] font-mono text-white/50 mt-0.5">{cell.unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hero Headline & Context */}
                    <div className="space-y-2">
                      <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-white leading-[1.18]">
                        Chào {user ? user.global_name || user.username : 'bạn'}, sẵn sàng bứt phá quỹ đạo điểm số hôm nay?
                      </h1>
                      <p className="text-[13px] sm:text-sm text-white/65 max-w-2xl leading-relaxed">
                        Truy cập tức thì <strong className="text-white tabular-nums">{totalDocsCount} đề thi</strong> đã kiểm định cấu trúc, mở phòng luyện đề bấm giờ nhận XP hoặc bốc ngẫu nhiên theo đúng tổ hợp môn mục tiêu.
                      </p>
                    </div>

                    {/* Nguyện Vọng 1 Target Bar */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-black/35 border border-white/[0.09]">
                      {!isEditingDream && dreamGoal ? (
                        <div
                          key="hub-dream-saved"
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 hh-swap-panel"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#FF4FCB]/15 border border-[#FF4FCB]/35 flex items-center justify-center shrink-0">
                              <Target className="w-4 h-4 text-[#FF4FCB]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#FFB8E6]">
                                MỤC TIÊU NGUYỆN VỌNG 1 ĐÃ KHÓA
                              </div>
                              <div className="text-sm sm:text-base font-black text-white truncate flex flex-wrap items-center gap-2">
                                <span>{dreamGoal.school}</span>
                                {dreamGoal.score && (
                                  <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-[#9B5CFF]/25 text-[#E2D4FF] border border-[#9B5CFF]/40 tabular-nums">
                                    Chỉ tiêu: {dreamGoal.score}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingDream(true)}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[12px] font-bold text-white/85 cursor-pointer self-start sm:self-center shrink-0"
                          >
                            Đổi mục tiêu
                          </button>
                        </div>
                      ) : (
                        <form key="hub-dream-form" onSubmit={handleSaveDreamInHub} className="space-y-2.5 hh-swap-panel">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-mono uppercase tracking-wider font-bold text-[#FFB8E6] flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-[#FF4FCB]" />
                              <span>Thiết lập mục tiêu trường Đại học / Chuyên</span>
                            </span>
                            {dreamGoal && (
                              <button
                                type="button"
                                onClick={() => setIsEditingDream(false)}
                                className="text-[12px] text-white/50 hover:text-white cursor-pointer"
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="text"
                              value={dreamSchoolInput}
                              onChange={(e) => setDreamSchoolInput(e.target.value)}
                              placeholder="VD: ĐH Bách Khoa Hà Nội, ĐH Ngoại Thương, Chuyên KHTN..."
                              className="sm:col-span-7 h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[#FF4FCB]"
                            />
                            <input
                              type="text"
                              value={dreamScoreInput}
                              onChange={(e) => setDreamScoreInput(e.target.value)}
                              placeholder="Điểm (VD: 28.5+)"
                              className="sm:col-span-3 h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[#9B5CFF]"
                            />
                            <button
                              type="submit"
                              className="sm:col-span-2 h-9 px-3 rounded-lg bg-[#d61f79] hover:bg-[#e11d84] text-white font-bold text-[12px] cursor-pointer transition-colors"
                            >
                              Ghim
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* TYPOGRAPHY-FIRST 4-COLUMN KPI STRIP (NO IDENTICAL BOX SLOP) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-xl bg-black/30 border border-white/[0.08] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className="p-3.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/45 group-hover:text-white/70">
                          KHO ĐỀ CHUẨN
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{totalDocsCount}</span>
                          <span className="text-[11px] font-mono text-[#FFB8E6] font-semibold">tệp</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEducationLevel('ALL');
                          handleGradeChange('12');
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className="p-3.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/45 group-hover:text-white/70">
                          TRỌNG ĐIỂM 12
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-[#FF4FCB] mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{gradeDistribution['12'] || 0}</span>
                          <span className="text-[11px] font-mono text-white/50 font-semibold">đề thi</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterHasAnswers(true);
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className="p-3.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/45 group-hover:text-white/70">
                          CÓ ĐÁP ÁN
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{withAnswersDocsCount}</span>
                          <span className="text-[11px] font-mono text-emerald-300/70 font-semibold">đề giải</span>
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
                        className="p-3.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/45 group-hover:text-white/70">
                          KHỐI THPT 10–12
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-[#38BDF8] mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{thptDocsCount}</span>
                          <span className="text-[11px] font-mono text-sky-300/70 font-semibold">tài liệu</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Bar */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/[0.08]">
                    <PixelButton
                      variant="primary"
                      magnetic
                      className="hh-btn--sm"
                      onClick={() => handleTabChange('get_exam')}
                      icon={<Dices className="w-4 h-4" />}
                      trailing={<ArrowRight className="w-4 h-4" />}
                    >
                      Mở Máy Bốc Đề
                    </PixelButton>

                    <PixelButton
                      variant="ghost"
                      className="hh-btn--sm"
                      onClick={handleInstantPracticePick}
                      icon={<Dices className="w-4 h-4 text-[#FFC46B]" />}
                    >
                      Bốc Thử 1 Đề Ngay
                    </PixelButton>

                    <PixelButton
                      variant="ghost"
                      className="hh-btn--sm"
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
                      className="hh-btn--sm"
                      onClick={() => handleTabChange('submit_doc')}
                      icon={<UploadCloud className="w-4 h-4 text-emerald-400" />}
                    >
                      + Đóng Góp Đề
                    </PixelButton>
                  </div>
                </div>

                {/* RIGHT 5/12: ORBITAL FOCUS & STREAK COCKPIT (SVG RADIAL RING + STREAK/XP) */}
                <div className="xl:col-span-5 rounded-2xl bg-black/40 border border-white/[0.1] p-5 sm:p-6 flex flex-col justify-between gap-4">
                  {/* Top Bar: Pomodoro Mode Switcher & Streak Pill */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#C4A6FF] font-bold">
                        BUỒNG LÁI TẬP TRUNG • ORBIT TIMER
                      </div>
                      <div className="text-sm font-extrabold text-white mt-0.5">
                        Đồng Hồ Pomodoro &amp; Chuỗi Học Thuật
                      </div>
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => togglePomoMode('focus')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                          pomoMode === 'focus'
                            ? 'bg-[#9B5CFF] text-white'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        25P HỌC
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePomoMode('chill')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                          pomoMode === 'chill'
                            ? 'bg-[#FF4FCB] text-white'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        5P NGHỈ
                      </button>
                    </div>
                  </div>

                  {/* Middle: SVG Radial Orbit Ring + Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Radial SVG Dial */}
                    <div className="sm:col-span-5 flex justify-center">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="8"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke={pomoMode === 'focus' ? '#FF4FCB' : '#38BDF8'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 50}
                            strokeDashoffset={2 * Math.PI * 50 * (1 - Math.min(1, Math.max(0.04, pomoProgress)))}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="font-mono text-2xl font-black text-white tabular-nums tracking-tight">
                            {formatPomo(pomoSeconds)}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFB8E6] mt-0.5">
                            {pomoRunning ? 'ĐANG TẬP TRUNG' : pomoMode === 'focus' ? 'SẴN SÀNG' : 'GIẢI LAO'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Controls + Live Rank & XP Progress */}
                    <div className="sm:col-span-7 space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setPomoRunning((r) => !r);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] text-white text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {pomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{pomoRunning ? 'Tạm dừng' : 'Bắt đầu phiên'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPomoRunning(false);
                            setPomoSeconds(pomoMode === 'focus' ? 25 * 60 : 5 * 60);
                          }}
                          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/75 hover:text-white cursor-pointer"
                          title="Đặt lại đồng hồ"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Rank & XP Bar */}
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-extrabold text-[#FFB8E6] truncate">
                            {studyProfile?.rank_title || '🌱 Tân Binh Orbit'}
                          </span>
                          <span className="font-mono font-black text-emerald-300 tabular-nums">
                            {studyProfile?.study_xp || 0} XP
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#9B5CFF] via-[#FF4FCB] to-amber-400 transition-all duration-500"
                            style={{
                              width: `${Math.max(8, Math.round((((studyProfile?.study_xp || 0) % 500) / 500) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-white/45 tabular-nums">
                          <span>🔥 Chuỗi {studyProfile?.current_streak || 0} ngày</span>
                          <span>✍️ {studyProfile?.exams_completed || 0} đề đã luyện</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: 4 Compact Telemetry Metrics + Daily Checkin CTA */}
                  <div className="pt-3 border-t border-white/[0.08] space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white/[0.025] border border-white/[0.06]">
                        <div className="text-[10px] font-mono uppercase text-white/45">CHUỖI</div>
                        <div className="text-sm font-black text-amber-300 tabular-nums mt-0.5">
                          {studyProfile?.current_streak || 0}d
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.025] border border-white/[0.06]">
                        <div className="text-[10px] font-mono uppercase text-white/45">KỶ LỤC</div>
                        <div className="text-sm font-black text-orange-300 tabular-nums mt-0.5">
                          {studyProfile?.max_streak || 0}d
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.025] border border-white/[0.06]">
                        <div className="text-[10px] font-mono uppercase text-white/45">POMODORO</div>
                        <div className="text-sm font-black text-[#E2CEFF] tabular-nums mt-0.5">
                          {studyProfile?.pomodoro_count || 0}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.025] border border-white/[0.06]">
                        <div className="text-[10px] font-mono uppercase text-white/45">ĐÓNG GÓP</div>
                        <div className="text-sm font-black text-emerald-300 tabular-nums mt-0.5">
                          {studyProfile?.docs_contributed || 0}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCheckingIn}
                      onClick={() => triggerStudyCheckin('daily_checkin', 15)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-[#d61f79] hover:opacity-95 text-white font-extrabold text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-opacity"
                    >
                      <Flame className="w-4 h-4" />
                      <span>{isCheckingIn ? 'Đang đồng bộ Turso Cloud...' : '🔥 Điểm Danh Hôm Nay (+50 XP)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* NẾU VỪA BỐC THỬ 1 ĐỀ NGAY TRÊN OVERVIEW THÌ HIỂN THỊ KẾT QUẢ TỨC THÌ */}
            {currentExam && (
              <SpotSurface className="hh-hub-surface p-5 sm:p-6 border-[#FF4FCB]/50 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono px-2 py-0.5 rounded bg-[#FF4FCB] text-[#0E0C14] font-bold">
                        ĐỀ VỪA BỐC TỨC THÌ
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
                      onClick={() => openExamModal(currentExam, 'pdf_reader')}
                      className="px-4 py-2 rounded-xl bg-[#d61f79] hover:opacity-95 text-white text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>📖 Đọc Đề PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openExamModal(currentExam, 'practice_room')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>✍️ Làm Bài (+100 XP)</span>
                    </button>
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

            {/* ===================================================================== */}
            {/* ZONE 2: 6-CELL SUBJECT MATRIX (ARCHITECTURAL CELLS WITH 3PX BAR)      */}
            {/* ===================================================================== */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#C4A6FF] font-bold">
                    MA TRẬN MÔN HỌC TRỌNG ĐIỂM
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-[12px] text-white/55">
                    Bấm vào môn bất kỳ để mở kho đề đã phân loại chuẩn GDPT 2018
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSubjectChange('ALL');
                    setShowBookmarksOnly(false);
                    handleTabChange('vault');
                  }}
                  className="text-[12px] font-bold text-[#FFB8E6] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem toàn bộ 18 môn học</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {subjectBreakdown.map((subj) => {
                  const pct = Math.min(
                    100,
                    Math.round((subj.count / Math.max(1, documentsList.length)) * 100)
                  );
                  return (
                    <button
                      key={subj.id}
                      type="button"
                      style={{ '--subject-accent': subj.tone } as React.CSSProperties}
                      onClick={() => {
                        handleSubjectChange(subj.id);
                        setShowBookmarksOnly(false);
                        handleTabChange('vault');
                      }}
                      className="hh-subject-cell p-4 text-left cursor-pointer group flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-wider text-white/45">
                            MÔN HỌC
                          </div>
                          <div className="text-sm sm:text-base font-extrabold text-white group-hover:text-[#FFB8E6] transition-colors mt-0.5">
                            {subj.label}
                          </div>
                        </div>
                        <span
                          className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded tabular-nums"
                          style={{
                            backgroundColor: `${subj.tone}20`,
                            color: subj.tone,
                          }}
                        >
                          {pct}%
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-black text-white tabular-nums">{subj.count}</span>
                          <span className="text-[11px] text-white/45 font-mono">đề thẩm định</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/[0.07] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(8, pct)}%`,
                              backgroundColor: subj.tone,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===================================================================== */}
            {/* ZONE 3: HIGH-DENSITY EXAM WORKBENCH (8/12) + STUDY VAULT/DB DOCK (4/12)*/}
            {/* ===================================================================== */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
              {/* Left 8/12: High-Density Exam Workbench with Table/Card Switcher */}
              <SpotSurface className="xl:col-span-8 hh-hub-surface p-5 sm:p-6 flex flex-col justify-between gap-4 h-full">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#FF4FCB] font-bold">
                      BÀN THẨM ĐỊNH &amp; LUYỆN ĐỀ MỚI NHẤT
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                      Đề Thi Vừa Kiểm Duyệt Lên Kho Cloud
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setVaultViewMode('table')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                          vaultViewMode === 'table'
                            ? 'bg-[#9B5CFF] text-white'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        Dạng Bảng
                      </button>
                      <button
                        type="button"
                        onClick={() => setVaultViewMode('cards')}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                          vaultViewMode === 'cards'
                            ? 'bg-[#9B5CFF] text-white'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        Dạng Thẻ
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBookmarksOnly(false);
                        handleTabChange('vault');
                      }}
                      className="text-[12px] font-bold text-[#FFB8E6] hover:underline flex items-center gap-1 cursor-pointer tabular-nums pl-1"
                    >
                      <span>Mở kho ({documentsList.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {documentsList.length === 0 ? (
                  <div className="py-12 text-center text-sm text-white/45">
                    {isLoadingDocs ? 'Đang đồng bộ danh sách đề thi...' : 'Chưa có tài liệu nào.'}
                  </div>
                ) : vaultViewMode === 'table' ? (
                  <div className="space-y-2">
                    {documentsList.slice(0, 6).map((doc) => renderExamCompactRow(doc))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {documentsList.slice(0, 4).map((doc) => renderExamDossierCard(doc))}
                  </div>
                )}

                <div className="pt-2.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/55">
                  <span>Bấm trực tiếp vào tên đề để mở trình đọc PDF hoặc Phòng Thi Thực Chiến (+100 XP)</span>
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
                      Xem tất cả ({totalDocsCount})
                    </button>
                  </div>
                </div>
              </SpotSurface>

              {/* Right 4/12: Personal Study Vault + 1-Click Track Matrix + Database Channel Link */}
              <SpotSurface className="xl:col-span-4 hh-hub-surface p-5 sm:p-6 flex flex-col justify-between gap-4 h-full">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-amber-300 font-bold">
                        LƯU TRỮ CÁ NHÂN
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                        Tủ Sách Đang Ghim
                      </h3>
                    </div>
                    <span className="font-mono tabular-nums text-[12px] px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {bookmarkedIds.size} đề
                    </span>
                  </div>

                  {bookmarkedIds.size === 0 ? (
                    <div className="space-y-2.5">
                      <p className="text-[12px] text-white/60 leading-relaxed">
                        Chưa có đề ghim. Bấm biểu tượng ngôi sao trên bất kỳ đề thi nào hoặc ghim nhanh đề gợi ý dưới đây:
                      </p>
                      <div className="space-y-2">
                        {documentsList.slice(0, 2).map((doc) => (
                          <div
                            key={`suggest-${doc.id}`}
                            className="p-2.5 rounded-xl bg-black/35 border border-white/[0.08] flex items-center justify-between gap-2"
                          >
                            <div
                              onClick={() => openExamModal(doc, 'pdf_reader')}
                              className="min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="text-[11px] font-mono font-bold text-[#FFB8E6]">{doc.subject}</div>
                              <div className="text-[13px] font-bold text-white truncate">
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
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[12px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
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
                            onClick={() => openExamModal(doc, 'pdf_reader')}
                            className="p-2.5 rounded-xl bg-black/35 hover:bg-white/[0.05] border border-white/[0.08] cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono font-bold text-amber-300">{doc.subject}</div>
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
                        className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[12px] font-bold cursor-pointer tabular-nums"
                      >
                        Mở Tủ Sách ({bookmarkedIds.size} đề)
                      </button>
                    </div>
                  )}
                </div>

                {/* 1-Click Exam Track Filter Matrix */}
                <div className="pt-3 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-white/50">
                    <span>PHÂN BAN ĐỀ NHANH</span>
                    <span>1 CHẠM MỞ KHO</span>
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
                        className={`px-3 py-2 rounded-xl bg-black/35 hover:bg-white/[0.06] border border-white/[0.08] hover:border-[#FF4FCB]/40 text-left text-[12px] font-bold ${track.tone} transition-colors cursor-pointer`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Data & Discord #database Archive Telemetry */}
                <div className="pt-3 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                      LIÊN KẾT HẠ TẦNG DỮ LIỆU
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      SYNCED
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[12px] text-white/65 font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans text-white/55">Discord Bot:</span>
                      <span className="text-white font-bold">{botStatus.bot_user || 'Orbit#0594'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-white/55">Cloud Database:</span>
                      <span className="text-emerald-400 font-bold">Turso libSQL AWS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-white/55">Kênh lưu trữ #database:</span>
                      <span className="text-[#FFB8E6] font-bold tabular-nums">1548627763467128912</span>
                    </div>
                  </div>
                </div>
              </SpotSurface>
            </div>

            {/* ===================================================================== */}
            {/* ZONE 4: BẢNG VÀNG HỌC THUẬT ORBIT (TOP 3 PODIUM + TABLE ROWS)          */}
            {/* ===================================================================== */}
            <SpotSurface className="hh-hub-surface p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-amber-300 font-bold flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>BẢNG VÀNG HỌC THUẬT LIÊN THÔNG DISCORD ↔ WEB</span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                    Top Học Giả Luyện Đề, Giữ Chuỗi Streak &amp; Đóng Góp Tài Liệu
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08] self-start sm:self-center">
                  {[
                    { id: 'xp', label: '🏆 Điểm XP' },
                    { id: 'streak', label: '🔥 Chuỗi Ngày' },
                    { id: 'contrib', label: '📚 Đóng Góp' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLeaderboardSort(t.id as any)}
                      className={`px-3 py-1 rounded-lg text-[12px] font-extrabold cursor-pointer transition-all ${
                        leaderboardSort === t.id
                          ? 'bg-[#9B5CFF] text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const sortedScholars = [...leaderboardList].sort((a, b) => {
                  if (leaderboardSort === 'streak')
                    return b.current_streak - a.current_streak || b.study_xp - a.study_xp;
                  if (leaderboardSort === 'contrib')
                    return b.docs_contributed - a.docs_contributed || b.study_xp - a.study_xp;
                  return b.study_xp - a.study_xp;
                });
                const podium = sortedScholars.slice(0, 3);
                const runnersUp = sortedScholars.slice(3, 7);

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                    {/* Top 3 Podium Cards */}
                    <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {podium.map((scholar, idx) => {
                        const medalStyle =
                          idx === 0
                            ? 'border-amber-400/45 bg-gradient-to-b from-amber-500/15 to-black/40'
                            : idx === 1
                            ? 'border-slate-300/35 bg-gradient-to-b from-slate-300/10 to-black/40'
                            : 'border-amber-700/45 bg-gradient-to-b from-amber-700/15 to-black/40';
                        const badgeLabel = idx === 0 ? '🥇 HẠNG 1' : idx === 1 ? '🥈 HẠNG 2' : '🥉 HẠNG 3';

                        return (
                          <div
                            key={`podium-${scholar.discord_id}-${idx}`}
                            className={`p-4 rounded-xl border ${medalStyle} flex flex-col justify-between gap-3`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] font-black text-amber-300">
                                  {badgeLabel}
                                </span>
                                <span className="font-mono text-xs font-black text-emerald-300 tabular-nums">
                                  {scholar.study_xp} XP
                                </span>
                              </div>
                              <div className="font-black text-sm sm:text-base text-white truncate">
                                {scholar.display_name || scholar.username}
                              </div>
                              <div className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-[#FFB8E6] border border-white/[0.08] inline-block truncate max-w-full">
                                {scholar.rank_title}
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-white/[0.08] grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
                              <div>
                                <div className="text-white/40">CHUỖI</div>
                                <div className="font-bold text-amber-300 tabular-nums">
                                  {scholar.current_streak}d
                                </div>
                              </div>
                              <div>
                                <div className="text-white/40">ĐỀ</div>
                                <div className="font-bold text-white tabular-nums">
                                  {scholar.exams_completed}
                                </div>
                              </div>
                              <div>
                                <div className="text-white/40">GÓP</div>
                                <div className="font-bold text-emerald-300 tabular-nums">
                                  {scholar.docs_contributed}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ranks #4 - #7 Compact Rows */}
                    <div className="xl:col-span-5 flex flex-col justify-between gap-2">
                      {runnersUp.length > 0 ? (
                        runnersUp.map((scholar, idx) => (
                          <div
                            key={`runner-${scholar.discord_id}-${idx}`}
                            className="hh-dossier-row px-3.5 py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-md bg-white/[0.06] font-mono text-[12px] font-bold text-white/70 flex items-center justify-center shrink-0 tabular-nums">
                                #{idx + 4}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-[13px] text-white truncate">
                                  {scholar.display_name || scholar.username}
                                </div>
                                <div className="text-[11px] font-mono text-white/45 flex items-center gap-2 tabular-nums">
                                  <span>🔥 {scholar.current_streak}d</span>
                                  <span>• ✍️ {scholar.exams_completed} đề</span>
                                  <span>• 📚 {scholar.docs_contributed} tệp</span>
                                </div>
                              </div>
                            </div>
                            <span className="font-mono font-black text-xs text-emerald-300 tabular-nums shrink-0">
                              {scholar.study_xp} XP
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="h-full rounded-xl bg-black/30 border border-white/[0.07] p-4 flex items-center justify-center text-[12px] text-white/50 text-center">
                          Hoàn thành đề thi trong Phòng Thi Thực Chiến hoặc gõ /chuoi trên Discord để ghi danh lên Bảng Vàng Orbit!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </SpotSurface>
          </div>
        )}

        {/* TAB 04: GET_EXAM */}
        {activeTab === 'get_exam' && !hubLocked && (
          <div key="tab-get-exam" className="space-y-6 hh-swap-panel">
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
                    onClick={() => openExamModal(currentExam, 'pdf_reader')}
                    icon={<BookOpen className="w-4 h-4" />}
                  >
                    📖 Đọc Đề PDF Trực Tiếp
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    onClick={() => openExamModal(currentExam, 'practice_room')}
                    icon={<PenTool className="w-4 h-4 text-emerald-400" />}
                  >
                    ✍️ Mở Phòng Thi Thực Chiến (+100 XP)
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    href={resolveExamFileUrl(currentExam) || undefined}
                    target={resolveExamFileUrl(currentExam) ? '_blank' : undefined}
                    rel={resolveExamFileUrl(currentExam) ? 'noopener noreferrer' : undefined}
                    download={botStatus.online ? currentExam.file_name || 'de_thi.pdf' : undefined}
                    onClick={() => {
                      if (!resolveExamFileUrl(currentExam)) {
                        openExamModal(currentExam, 'pdf_reader');
                      }
                    }}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Tải Về Máy ({(currentExam.file_type || 'PDF').toUpperCase()})
                  </PixelButton>
                </div>
              </SpotSurface>
            )}

            {/* Bàn lọc chiến thuật bên dưới để khóa tiêu chí bốc */}
            {renderFilterControls(true)}
          </div>
        )}

        {/* TAB 02 & 03: VAULT */}
        {activeTab === 'vault' && !hubLocked && (
          <div key="tab-vault" className="space-y-6 hh-swap-panel">
            {/* Vault Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#C4A6FF] font-bold mb-1">
                  ORBIT | VIETNAM • DOCUMENT ARCHIVE
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
                  <span>{showBookmarksOnly ? 'Tủ Sách Ôn Luyện Của Tôi' : 'Kho Đề Thi Đã Thẩm Định'}</span>
                  <span className="font-mono tabular-nums text-[13px] sm:text-sm px-3 py-1 rounded-xl bg-[#9B5CFF]/25 border border-[#9B5CFF]/45 text-[#E2D4FF]">
                    {displayedDocuments.length} đề
                  </span>
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle: Cards vs High-Density Table */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setVaultViewMode('cards')}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-mono font-bold cursor-pointer transition-colors ${
                      vaultViewMode === 'cards'
                        ? 'bg-[#9B5CFF] text-white'
                        : 'text-white/55 hover:text-white'
                    }`}
                  >
                    Dạng Thẻ
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-mono font-bold cursor-pointer transition-colors ${
                      vaultViewMode === 'table'
                        ? 'bg-[#9B5CFF] text-white'
                        : 'text-white/55 hover:text-white'
                    }`}
                  >
                    Dạng Bảng
                  </button>
                </div>

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

            {/* Lưới Hồ Sơ Đề Thi (Hỗ trợ cả Dạng Thẻ & Dạng Bảng Mật Độ Cao) */}
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
                {vaultViewMode === 'table' ? (
                  <SpotSurface className="hh-hub-surface p-4 sm:p-5 space-y-2">
                    {paginatedDocuments.map((doc) => renderExamCompactRow(doc))}
                  </SpotSurface>
                ) : (
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
                )}

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
          <div key="tab-submit-doc" className="space-y-6 hh-swap-panel">
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
          <div key="tab-admin" className="space-y-6 hh-swap-panel">
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

      {/* Modal Đọc Đề PDF Trực Tiếp, Phòng Thi Thực Chiến & Hồ Sơ Kiểm Định AI */}
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
        initialTab={dossierInitialTab}
        onCompleteExam={(_docId, minutesSpent) => {
          triggerStudyCheckin('exam_complete', minutesSpent);
        }}
      />

      {/* Thanh Tìm Kiếm Siêu Tốc & Lệnh Nhanh (Ctrl+K / ⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documentsList}
        onSelectExam={(doc) => openExamModal(doc, 'pdf_reader')}
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
