import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
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
  Clock,
  Play,
  Pause,
  RotateCcw,
  Target,

  Trophy,
  PenTool,
  MessageSquare,
  Lock,
} from 'lucide-react';
import {
  DiscordUser,
  DISCORD_VERIFY_CHANNEL_URL,
  getDiscordAccessToken,
  getStoredDiscordUser,
  getPendingDiscordUser,
  clearPendingDiscordUser,
  saveDiscordUser,
  startDiscordOAuthLogin,
  syncLinkedAccount,
} from '../utils/discordAuth';
import {
  getApiBaseUrl,
  API_FETCH_HEADERS,
  DEFAULT_TUNNEL_URL,
  setCustomApiUrl,
  notifyBotViaWebhookHandshake,
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
import { CoursesHub } from '../courses/CoursesHub';
import { ForumHub } from './ForumHub';
import {
  HubLayoutProvider,
  useHubLayout,
  ResizableCard,
} from './HubResizable';

export type HubTab = 'overview' | 'courses' | 'forum' | 'vault' | 'get_exam' | 'submit_doc' | 'admin';

interface DashboardProps {
  user: DiscordUser | null;
  initialTab?: HubTab;
  onTabChange?: (tab: HubTab) => void;
  onOpenAuthModal: () => void;
  onUserAuthenticated?: (user: DiscordUser) => void;
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
  author_id?: number | string;
  author_avatar?: string;
  jump_url?: string;
  download_url?: string;
  timestamp: string;
  file_hash?: string;
  short_label?: string;
  notes?: string;
  description?: string;
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
    icon: '',
    color: '#FF4FCB',
    desc: 'Hiển thị gộp tất cả khối lớp (6 → 12) và toàn bộ môn học',
  },
  {
    id: 'CAP_2',
    label: 'Cấp 2',
    badge: 'THCS (Lớp 6 - 9)',
    icon: '',
    color: '#10B981',
    desc: '9 môn học chính thức theo chương trình GDPT 2018',
  },
  {
    id: 'CAP_3',
    label: 'Cấp 3',
    badge: 'THPT (Lớp 10 - 12)',
    icon: '',
    color: '#EF4444',
    desc: '8 môn bắt buộc + 7 môn tự chọn theo GDPT 2018',
  },
];

// Danh mục Khối Lớp cho chế độ Chung (Cả Cấp 2 & 3)
export const ALL_GRADE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Khối', subtitle: 'Tất cả lớp', color: '#FF4FCB' },
  { id: '12', label: 'Lớp 12', subtitle: 'Ôn TN & ĐH', color: '#EF4444' },
  { id: '11', label: 'Lớp 11', subtitle: 'THPT', color: '#F97316' },
  { id: '10', label: 'Lớp 10', subtitle: 'THPT', color: '#F59E0B' },
  { id: '9', label: 'Lớp 9', subtitle: 'Ôn Vào 10', color: '#10B981' },
  { id: '8', label: 'Lớp 8', subtitle: 'THCS', color: '#06B6D4' },
  { id: '7', label: 'Lớp 7', subtitle: 'THCS', color: '#3B82F6' },
  { id: '6', label: 'Lớp 6', subtitle: 'THCS', color: '#38BDF8' },
];

// Danh mục Khối Lớp riêng cho Cấp 2 (THCS)
export const CAP2_GRADE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Khối Cấp 2', subtitle: 'Lớp 6 → 9', color: '#10B981' },
  { id: '9', label: 'Lớp 9', subtitle: 'Ôn Vào 10', color: '#10B981' },
  { id: '8', label: 'Lớp 8', subtitle: 'THCS', color: '#06B6D4' },
  { id: '7', label: 'Lớp 7', subtitle: 'THCS', color: '#3B82F6' },
  { id: '6', label: 'Lớp 6', subtitle: 'THCS', color: '#38BDF8' },
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
  { id: 'ALL', label: 'Mọi Thể Loại', badge: 'Tất cả', icon: '', desc: 'Toàn bộ kho đề' },
  { id: 'THUONG', label: 'Đề Thường', badge: 'Cơ bản', icon: '', desc: 'Đại trà, định kỳ, thi thử (thường < hsg < chuyên)' },
  { id: 'HSG', label: 'Đề HSG', badge: 'Nâng cao', icon: '', desc: 'Học sinh giỏi cấp trường/tỉnh (thường < hsg < chuyên)' },
  { id: 'CHUYEN', label: 'Đề Chuyên', badge: 'Chuyên sâu', icon: '', desc: 'Tuyển sinh 10 Chuyên, THPT Chuyên (cao nhất)' },
  { id: 'QUOC_TE', label: 'Đề Quốc Tế', badge: 'Quốc tế', icon: '', desc: 'IMO, AMC, Kangaroo/IKMC, SASMO... (tiếng Việt & Anh)' },
  { id: 'CHUNG', label: 'Đề Chung', badge: 'Tổng hợp', icon: '', desc: 'Đề cương, lý thuyết tổng hợp' },
];

// ============================================================================
// DANH MỤC MÔN HỌC THEO TỪNG CẤP (CHUẨN CHƯƠNG TRÌNH GDPT 2018)
// ============================================================================

// CẤP 2 (THCS): ĐÚNG 9 MÔN THEO YÊU CẦU
export const CAP2_SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Môn Cấp 2', icon: '' },
  { id: 'LITERATURE', label: 'Ngữ văn', icon: '' },
  { id: 'MATHEMATICS', label: 'Toán', icon: '' },
  { id: 'ENGLISH', label: 'Ngoại ngữ 1', icon: '' },
  { id: 'CIVIC_EDUCATION', label: 'Giáo dục công dân', icon: '' },
  { id: 'HISTORY_GEOGRAPHY', label: 'Lịch sử và Địa lý', icon: '' },
  { id: 'NATURAL_SCIENCE', label: 'Khoa học tự nhiên', icon: '' },
  { id: 'TECHNOLOGY', label: 'Công nghệ', icon: '' },
  { id: 'INFORMATICS', label: 'Tin học', icon: '' },
  { id: 'PHYSICAL_EDUCATION', label: 'Giáo dục thể chất', icon: '' },
];

// CẤP 3 (THPT): 8 MÔN BẮT BUỘC THEO YÊU CẦU
export const CAP3_MANDATORY_SUBJECTS = [
  { id: 'LITERATURE', label: 'Ngữ văn', icon: '', group: 'mandatory' },
  { id: 'MATHEMATICS', label: 'Toán', icon: '', group: 'mandatory' },
  { id: 'ENGLISH', label: 'Ngoại ngữ 1', icon: '', group: 'mandatory' },
  { id: 'HISTORY', label: 'Lịch sử', icon: '', group: 'mandatory' },
  { id: 'PHYSICAL_EDUCATION', label: 'Giáo dục thể chất', icon: '', group: 'mandatory' },
  { id: 'DEFENSE_SECURITY_EDU', label: 'Giáo dục quốc phòng và an ninh', icon: '', group: 'mandatory' },
  { id: 'EXPERIENTIAL_CAREER_ACT', label: 'Hoạt động trải nghiệm, hướng nghiệp', icon: '', group: 'mandatory' },
  { id: 'LOCAL_EDUCATION', label: 'Nội dung giáo dục của địa phương', icon: '', group: 'mandatory' },
];

// CẤP 3 (THPT): 7 MÔN TỰ CHỌN THEO YÊU CẦU
export const CAP3_ELECTIVE_SUBJECTS = [
  { id: 'GEOGRAPHY', label: 'Địa lí', icon: '', group: 'elective' },
  { id: 'ECONOMIC_LEGAL_EDU', label: 'Giáo dục kinh tế và pháp luật', icon: '', group: 'elective' },
  { id: 'PHYSICS', label: 'Vật lí', icon: '', group: 'elective' },
  { id: 'CHEMISTRY', label: 'Hóa học', icon: '', group: 'elective' },
  { id: 'BIOLOGY', label: 'Sinh học', icon: '', group: 'elective' },
  { id: 'TECHNOLOGY', label: 'Công nghệ', icon: '', group: 'elective' },
  { id: 'INFORMATICS', label: 'Tin học', icon: '', group: 'elective' },
];

export const CAP3_SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Môn Cấp 3', icon: '' },
  ...CAP3_MANDATORY_SUBJECTS,
  ...CAP3_ELECTIVE_SUBJECTS,
];

// CHẾ ĐỘ CHUNG: TỔNG HỢP CẢ 2 CẤP
export const ALL_SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Các Môn', icon: '' },
  { id: 'MATHEMATICS', label: 'Toán', icon: '' },
  { id: 'LITERATURE', label: 'Ngữ văn', icon: '' },
  { id: 'ENGLISH', label: 'Ngoại ngữ 1', icon: '' },
  { id: 'INFORMATICS', label: 'Tin học', icon: '' },
  { id: 'TECHNOLOGY', label: 'Công nghệ', icon: '' },
  { id: 'PHYSICAL_EDUCATION', label: 'Giáo dục thể chất', icon: '' },
  { id: 'NATURAL_SCIENCE', label: 'Khoa học tự nhiên (Cấp 2)', icon: '' },
  { id: 'HISTORY_GEOGRAPHY', label: 'Lịch sử và Địa lý (Cấp 2)', icon: '' },
  { id: 'CIVIC_EDUCATION', label: 'Giáo dục công dân (Cấp 2)', icon: '' },
  { id: 'PHYSICS', label: 'Vật lí (Cấp 3)', icon: '' },
  { id: 'CHEMISTRY', label: 'Hóa học (Cấp 3)', icon: '' },
  { id: 'BIOLOGY', label: 'Sinh học (Cấp 3)', icon: '' },
  { id: 'HISTORY', label: 'Lịch sử (Cấp 3)', icon: '' },
  { id: 'GEOGRAPHY', label: 'Địa lí (Cấp 3)', icon: '' },
  { id: 'ECONOMIC_LEGAL_EDU', label: 'Giáo dục kinh tế & pháp luật (Cấp 3)', icon: '' },
  { id: 'DEFENSE_SECURITY_EDU', label: 'GD Quốc phòng & An ninh (Cấp 3)', icon: '' },
  { id: 'EXPERIENTIAL_CAREER_ACT', label: 'HĐ trải nghiệm, hướng nghiệp (Cấp 3)', icon: '' },
  { id: 'LOCAL_EDUCATION', label: 'Nội dung GD địa phương (Cấp 3)', icon: '' },
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
      icon: '',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
    };
  }
  if (lvl === 'CAP_3') {
    return {
      id: 'CAP_3',
      label: 'Cấp 3 (THPT)',
      shortLabel: 'Cấp 3',
      icon: '',
      badgeClass: 'bg-[#291524] text-[#ffb8e6] border-[#422039]',
      dotColor: 'bg-[#FF4FCB]',
    };
  }
  return {
    id: 'CHUNG',
    label: 'Chung (Cả 2 cấp)',
    shortLabel: 'Chung',
    icon: '',
    badgeClass: 'bg-[#171522] text-white/75 border-[#241a38]',
    dotColor: 'bg-slate-400',
  };
}




const DASHBOARD_SUBJECT_SHORT_MAP: Record<string, string> = {
  MATHEMATICS: 'Toán',
  TOAN: 'Toán',
  TOÁN: 'Toán',
  PHYSICS: 'Lý',
  VAT_LY: 'Lý',
  'VẬT LÍ': 'Lý',
  'VẬT LÝ': 'Lý',
  CHEMISTRY: 'Hóa',
  HOA_HOC: 'Hóa',
  'HÓA HỌC': 'Hóa',
  BIOLOGY: 'Sinh',
  SINH_HOC: 'Sinh',
  'SINH HỌC': 'Sinh',
  INFORMATICS: 'Tin',
  TIN_HOC: 'Tin',
  'TIN HỌC': 'Tin',
  LITERATURE: 'Văn',
  NGU_VAN: 'Văn',
  'NGỮ VĂN': 'Văn',
  ENGLISH: 'Anh',
  TIENG_ANH: 'Anh',
  'TIẾNG ANH': 'Anh',
  'NGOẠI NGỮ 1 (TIẾNG ANH)': 'Anh',
  HISTORY: 'Sử',
  LICH_SU: 'Sử',
  'LỊCH SỬ': 'Sử',
  GEOGRAPHY: 'Địa',
  DIA_LY: 'Địa',
  'ĐỊA LÍ': 'Địa',
  'ĐỊA LÝ': 'Địa',
  NATURAL_SCIENCE: 'KHTN',
  KHTN: 'KHTN',
  'KHOA HỌC TỰ NHIÊN': 'KHTN',
  HISTORY_GEOGRAPHY: 'Sử - Địa',
  LS_DL: 'Sử - Địa',
  'LỊCH SỬ VÀ ĐỊA LÍ': 'Sử - Địa',
  'LỊCH SỬ VÀ ĐỊA LÝ': 'Sử - Địa',
  CIVIC_EDUCATION: 'GDCD',
  GDCD: 'GDCD',
  'GIÁO DỤC CÔNG DÂN': 'GDCD',
  ECONOMIC_LEGAL_EDU: 'GDKT&PL',
  GDKT_PL: 'GDKT&PL',
  'GIÁO DỤC KINH TẾ VÀ PHÁP LUẬT': 'GDKT&PL',
  TECHNOLOGY: 'Công nghệ',
  CONG_NGHE: 'Công nghệ',
  'CÔNG NGHỆ': 'Công nghệ',
  DEFENSE_SECURITY_EDU: 'GDQP&AN',
  GDQP_AN: 'GDQP&AN',
  'GIÁO DỤC QUỐC PHÒNG VÀ AN NINH': 'GDQP&AN',
  GENERAL: 'Tổng hợp',
};

export function getExamDescriptionInfo(doc: ExamDocument): {
  shortLabel: string;
  bodyDescription: string;
  fullDescription: string;
} {
  const subjKey = (doc.subject || 'GENERAL').trim();
  const subjShort =
    DASHBOARD_SUBJECT_SHORT_MAP[subjKey] ||
    DASHBOARD_SUBJECT_SHORT_MAP[subjKey.toUpperCase()] ||
    subjKey;

  const estStr = (doc.estimated_level || '').trim();
  const mGrade = estStr.match(/\b(6|7|8|9|10|11|12)\b/);
  const gradeNum = mGrade ? parseInt(mGrade[1], 10) : null;
  const gradeShort = gradeNum
    ? `Lớp ${gradeNum}`
    : /THCS|CẤP 2/i.test(estStr)
    ? 'Cấp 2'
    : /ĐẠI HỌC/i.test(estStr)
    ? 'Đại học'
    : 'Phổ thông';

  const trackInfo = getExamTrackInfo(doc);
  const trackShort =
    trackInfo.tier === 'CHUYEN'
      ? 'Chuyên'
      : trackInfo.tier === 'HSG'
      ? 'HSG'
      : trackInfo.tier === 'QUOC_TE'
      ? 'Quốc tế'
      : 'Thường';

  const computedShortLabel = doc.short_label || `${gradeShort} ${trackShort} ${subjShort}`.trim();

  const rawNotes = (doc.description || doc.notes || '').trim();
  if (rawNotes && rawNotes.includes(' — ')) {
    const [prefix, ...rest] = rawNotes.split(' — ');
    const body = rest.join(' — ').trim();
    if (body && !body.includes('Bậc:')) {
      return {
        shortLabel: prefix.trim() || computedShortLabel,
        bodyDescription: body,
        fullDescription: `${prefix.trim() || computedShortLabel} — ${body}`,
      };
    }
  }

  const mParen = estStr.match(/\(([^)]+)\)/);
  let natureStr = mParen ? mParen[1].trim() : '';
  if (!natureStr || /^(thường|chung|hsg|chuyên|ôn thi thpt|ôn vào 10)$/i.test(natureStr)) {
    if (trackShort === 'Chuyên' && gradeNum === 9) {
      natureStr = `Đề thi tuyển sinh vào lớp 10 Chuyên môn ${subjShort}`;
    } else if (trackShort === 'HSG') {
      natureStr = `Đề thi chọn Học sinh giỏi môn ${subjShort}`;
    } else if (gradeNum === 9) {
      natureStr = `Đề ôn thi tuyển sinh vào lớp 10 môn ${subjShort}`;
    } else if (gradeNum === 12) {
      natureStr = `Đề thi thử / ôn luyện Tốt nghiệp THPT môn ${subjShort}`;
    } else {
      natureStr = `Đề kiểm tra định kỳ môn ${subjShort}`;
    }
  }

  const parts: string[] = [natureStr];
  if (doc.school_or_department && doc.school_or_department !== 'null') {
    parts.push(
      `(${doc.school_or_department}${
        doc.academic_year && doc.academic_year !== 'null' ? ` • ${doc.academic_year}` : ''
      })`
    );
  } else if (doc.academic_year && doc.academic_year !== 'null') {
    parts.push(`(năm học ${doc.academic_year})`);
  }
  if (doc.question_count && doc.question_count > 0) {
    parts.push(`gồm ${doc.question_count} câu hỏi`);
  }
  const extras: string[] = [];
  if (doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) {
    extras.push('cấu trúc chuẩn 2025');
  }
  if (doc.has_detailed_solutions) extras.push('có lời giải chi tiết');
  else if (doc.has_answer_keys) extras.push('có bảng đáp án');
  if (extras.length > 0) {
    parts.push(`• ${extras.join(', ')}`);
  }

  let bodyDesc = parts.join(' ').trim();
  if (!bodyDesc.endsWith('.')) bodyDesc += '.';

  return {
    shortLabel: computedShortLabel,
    bodyDescription: bodyDesc,
    fullDescription: `${computedShortLabel} — ${bodyDesc}`,
  };
}

// Gợi ý từ khóa nhanh
const QUICK_KEYWORD_TAGS = [
  'Lớp 12 Thường Toán',
  'Lớp 9 Chuyên Tin',
  'Lớp 11 Thường Hóa',
  'Lớp 7 HSG Toán',
  'Đề thi thử 2025',
  'Có đáp án chi tiết',
  'Hàm số mũ & Logarit',
  'Quy hoạch động',
  'Đọc hiểu & Nghị luận',
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

// Bộ nhớ đệm cấp module giúp chuyển qua lại Home ↔ Hub tức thì (0ms delay, không tải lại từ đầu)
let CACHED_HUB_DOCS: ExamDocument[] = [];
let CACHED_HUB_TOTAL = 29;
let CACHED_HUB_STATS = { total_real: 29, unique_items: 28, duplicate_items: 2 };

// Component đồng hồ đếm ngược độc lập (React.memo) — chỉ render lại đúng 4 ô số mỗi giây,
// KHÔNG kích hoạt re-render toàn bộ 4.600 dòng của DashboardContent (chống khựng/giật khi cuộn).
const HubThptCountdownStrip: React.FC<{ examYear: number; targetIso: string }> = React.memo(
  ({ examYear, targetIso }) => {
    const [parts, setParts] = useState(() => {
      const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
      return {
        days: String(Math.floor(diff / 86400000)).padStart(2, '0'),
        hours: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
        minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      };
    });

    useEffect(() => {
      const targetMs = new Date(targetIso).getTime();
      const timer = window.setInterval(() => {
        const diff = Math.max(0, targetMs - Date.now());
        setParts({
          days: String(Math.floor(diff / 86400000)).padStart(2, '0'),
          hours: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
          minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
          seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
        });
      }, 1000);
      return () => window.clearInterval(timer);
    }, [targetIso]);

    const cells = [
      { val: parts.days, unit: 'Ngày' },
      { val: parts.hours, unit: 'Giờ' },
      { val: parts.minutes, unit: 'Phút' },
      { val: parts.seconds, unit: 'Giây' },
    ];

    return (
      <div className="flex items-center gap-1.5 self-start sm:self-center">
        <span className="text-[13px] font-semibold text-white/55 mr-1 hidden sm:inline">
          Kỳ thi THPT {examYear}:
        </span>
        {cells.map((cell, i) => (
          <div
            key={cell.unit}
            className={`px-2.5 py-1 rounded-lg border text-center tabular-nums ${
              i === 3
                ? 'bg-[#291524] border-[#422039] text-[#FFB8E6]'
                : 'bg-[#15131f] border-[#221e30] text-white'
            }`}
          >
            <div className="font-mono font-black text-[13px] sm:text-sm leading-none">{cell.val}</div>
            <div className="text-xs font-mono text-white/55 mt-0.5">{cell.unit}</div>
          </div>
        ))}
      </div>
    );
  }
);

const DashboardContent: React.FC<DashboardProps> = ({
  user,
  initialTab,
  onTabChange,
  onOpenAuthModal,
  onUserAuthenticated,
  onLogout,
  onBackToHome,
}) => {
  const { config } = useHubLayout();
  const [activeTab, setActiveTab] = useState<HubTab>(
    initialTab || 'overview'
  );
  const { showSuccess, showInfo, showError } = useToast();

  const handleTabChange = useCallback(
    (tab: HubTab) => {
      sound.playNavSwitch();
      setActiveTab(tab);
      onTabChange?.(tab);
    },
    [onTabChange]
  );

  // Animate UI Moving Indicator cho thanh điều hướng bên trái (Sidebar Command Rail)
  const sidebarNavRef = useRef<HTMLElement>(null);
  const sidebarIndicatorRef = useRef<HTMLSpanElement>(null);
  const sidebarItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Đồng bộ URL với tab Admin, Courses, Forum để có link trực tiếp /admin, /courses, /forum chia sẻ được
  useEffect(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search || '';
      if (activeTab === 'admin' && path !== '/admin') {
        window.history.replaceState(null, '', `/admin${search}`);
      } else if (activeTab === 'courses' && path !== '/courses') {
        window.history.replaceState(null, '', `/courses${search}`);
      } else if (activeTab === 'forum' && path !== '/forum') {
        window.history.replaceState(null, '', `/forum${search}`);
      } else if (
        activeTab !== 'admin' &&
        activeTab !== 'courses' &&
        activeTab !== 'forum' &&
        (path === '/admin' || path === '/courses' || path === '/forum')
      ) {
        window.history.replaceState(null, '', `/hub${search}`);
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

  const checkAdminStatus = useCallback(async () => {
    let confirmed = false;
    const stored = getStoredDiscordUser();
    const token = getDiscordAccessToken();
    if (!token && !stored?.id) {
      writeCachedAdmin(false);
      setIsAdmin(false);
      setAdminInfo(null);
      return;
    }

    for (let attempt = 0; attempt < 2 && !confirmed; attempt++) {
      try {
        const apiBase = getApiBaseUrl();
        const headers: Record<string, string> = { ...API_FETCH_HEADERS };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (stored?.id) headers['X-Discord-User-Id'] = String(stored.id);
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
          break;
        }
        if (res.status < 500) break;
      } catch {
        // timeout/lỗi mạng → vòng lặp tự thử lại 1 lần
      }
    }
    if (!confirmed) {
      if (stored?.id === '1529864608813416449') {
        setIsAdmin(true);
        setAdminInfo({
          user_id: stored.id,
          username: stored.username,
          role_name: '👑 Owner',
        });
        writeCachedAdmin(true);
      } else {
        setIsAdmin(false);
        setAdminInfo(null);
      }
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

  // Danh Sách Đề Thi Trong Kho (Full Catalog List - khởi tạo tức thì từ bộ nhớ đệm nếu đã nạp)
  const [documentsList, setDocumentsList] = useState<ExamDocument[]>(() => CACHED_HUB_DOCS);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [totalDocsCount, setTotalDocsCount] = useState<number>(() => CACHED_HUB_TOTAL);
  const [stats, setStats] = useState<{
    total_real: number;
    unique_items: number;
    duplicate_items: number;
  }>(() => CACHED_HUB_STATS);
  const [filterDup, setFilterDup] = useState<'all' | 'unique' | 'duplicate'>('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'pages' | 'size' | 'confidence'>('newest');
  // Phân trang & Tối ưu Render danh sách đề (Mặc định 24 đề/trang, chống nghẽn DOM)
  const [visibleCount, setVisibleCount] = useState<number>(24);

  useEffect(() => {
    if (documentsList.length > 0) CACHED_HUB_DOCS = documentsList;
  }, [documentsList]);
  useEffect(() => {
    if (totalDocsCount > 0) CACHED_HUB_TOTAL = totalDocsCount;
  }, [totalDocsCount]);
  useEffect(() => {
    if (stats.total_real > 0) CACHED_HUB_STATS = stats;
  }, [stats]);

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

    // 11. Lọc theo Từ Khóa Tìm Kiếm (Tối ưu Multi-Token: gõ "Lớp 9 Chuyên Tin" hoặc "Lớp 7 HSG Toán" quét linh hoạt từng từ)
    if (descriptionKeyword && descriptionKeyword.trim()) {
      const tokens = descriptionKeyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        list = list.filter((doc) => {
          const descInfo = getExamDescriptionInfo(doc);
          const text = `${doc.title || ''} ${doc.file_name || ''} ${doc.subject || ''} ${doc.school_or_department || ''} ${doc.academic_year || ''} ${doc.notes || ''} ${descInfo.shortLabel} ${descInfo.fullDescription}`.toLowerCase();
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
      return `/api/documents/${doc.id}/download`;
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

  // 5. Xử lý Bốc Đề Ngẫu Nhiên (Random Pick — Mở 100% Free cho mọi người)
  const handlePickRandomExam = async () => {
    setExamError('');
    setCurrentExam(null);
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
  // MỤC TIÊU TRƯỜNG MƠ ƯỚC (ĐỒNG BỘ VỚI TRANG CHỦ ORBIT)
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

  const [, setIsCheckingIn] = useState<boolean>(false);

  const fetchStudyProfileAndLeaderboard = useCallback(async () => {
    const uid = user?.id || '';
    const uname = user?.username || 'Học Sinh Orbit';
    const dname = user?.global_name || user?.username || 'Học Sinh Orbit';
    const avatar = user?.avatar || '';

    // 1. Tải Bảng Xếp Hạng Học Thuật qua Cổng Cloud API
    fetchAcademicLeaderboardTurso()
      .then((lb) => {
        if (lb && lb.length > 0) {
          setLeaderboardList(lb);
        }
      })
      .catch(() => {});

    // 2. Tải Hồ Sơ & Chuỗi Ngày Học cá nhân
    if (!uid) return;
    fetchStudyProfileTurso(uid, uname, dname, avatar)
      .then((prof) => {
        if (prof) {
          setStudyProfile(prof);
          try {
            localStorage.setItem('orbit_study_profile_v1', JSON.stringify(prof));
          } catch {}
        }
      })
      .catch(() => {});
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
        const updated = await recordStudyCheckinTurso({
          discordId: uid,
          username: uname,
          displayName: dname,
          avatarUrl: avatar,
          action,
          minutes,
          dreamSchool: dreamSchoolOverride ?? dreamGoal?.school,
          dreamScore: dreamScoreOverride ?? dreamGoal?.score,
        });
        if (updated && updated.profile) {
          setStudyProfile(updated.profile);
          try {
            localStorage.setItem('orbit_study_profile_v1', JSON.stringify(updated.profile));
          } catch {}
        }

        if (action === 'daily_checkin') {
          showSuccess('Đã đồng bộ hoạt động học tập giữa Discord & Web!', 'Hồ Sơ Học Tập');
        } else if (action === 'pomodoro') {
          showSuccess('Hoàn thành phiên Pomodoro 25 phút!', 'Pomodoro Đồng Bộ');
        } else if (action === 'exam_complete') {
          showSuccess('Đã ghi nhận hoàn thành phiên luyện đề thực chiến!', 'Phòng Thi Thực Chiến');
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
              ? 'Đã hoàn thành 25 phút tập trung! Nghỉ ngơi 5 phút nhé.'
              : 'Hết giờ nghỉ! Bắt đầu phiên tập trung mới.',
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
      { id: 'GENERAL', label: 'Tài liệu & Chuyên đề chung', shortLabel: 'Chuyên đề chung', tone: '#FFB8E6' },
      { id: 'MATHEMATICS', label: 'Toán học', shortLabel: 'Toán học', tone: '#FF4FCB' },
      { id: 'INFORMATICS', label: 'Tin học & Thuật toán', shortLabel: 'Tin học', tone: '#FBBF24' },
      { id: 'PHYSICS', label: 'Vật lí', shortLabel: 'Vật lí', tone: '#38BDF8' },
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

  // Đồng bộ ngày & giờ đếm ngược kỳ thi THPT Quốc Gia (đã tách sang HubThptCountdownStrip để không re-render toàn Dashboard)
  const nextThptExam = useMemo(() => getNextThptExamInfo(), []);

  const [vaultViewMode, setVaultViewMode] = useState<'cards' | 'table'>('table');

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1d1a29]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242429] text-[#FFB8E6] flex items-center justify-center shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#FF4FCB]">Bàn lọc chuyên sâu</span>
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
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0B0911] border border-[#1d1a29]">
            {EDUCATION_LEVEL_OPTIONS.map((opt) => {
              const isSelected = selectedEducationLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleEducationLevelChange(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#d61f79] text-white'
                      : 'text-white/65 hover:text-white hover:bg-[#171522]'
                  }`}
                >
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
              className="px-3 py-1.5 rounded-lg bg-[#1d1a29] hover:bg-[#262235] text-white font-bold text-[13px] shrink-0 cursor-pointer"
            >
              Bốc thử từ kho Web
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
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#0D0A14] border border-[#1d1a29] focus:border-[#FF4FCB] text-white text-[13px] sm:text-sm placeholder:text-white/35 focus:outline-none transition-colors"
              />
              {descriptionKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setDescriptionKeyword('');
                    fetchDocuments(selectedGrade, selectedExamType, selectedSubject, '');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-white hover:bg-[#1d1a29] cursor-pointer"
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
                className="w-full h-11 px-3.5 rounded-xl bg-[#0D0A14] border border-[#1d1a29] focus:border-[#9B5CFF] text-[13px] sm:text-sm font-bold text-white cursor-pointer focus:outline-none"
              >
                <option value="newest">Mới cập nhật nhất</option>
                <option value="confidence">Độ hoàn thiện hồ sơ cao nhất</option>
                <option value="pages">Nhiều trang nhất</option>
                <option value="size">Dung lượng lớn nhất</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedDrawer((prev) => !prev)}
                aria-expanded={showAdvancedDrawer || activeAdvancedFilterCount > 0}
                className={`w-full h-11 px-3.5 rounded-xl border text-[13px] font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  showAdvancedDrawer || activeAdvancedFilterCount > 0
                    ? 'bg-[#291524] border-[#422039] text-[#FFB8E6]'
                    : 'bg-[#0D0A14] border-[#1d1a29] text-white/75 hover:text-white hover:border-[#2a253b]'
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
            <span className="text-[13px] font-semibold text-white/50 shrink-0 mr-1 flex items-center gap-1">
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
                  className={`text-[13px] font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#291524] border-[#422039] text-white'
                      : 'bg-[#13111c] border-[#1d1a29] text-white/60 hover:text-white hover:border-[#2a253b]'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {/* HÀNG 3: DẢI KHỐI LỚP KÈM THƯỚC ĐO TỶ LỆ MÀU ROLE DISCORD */}
          <div className="p-3.5 rounded-xl bg-[#0B0911] border border-[#1d1a29] space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-bold text-white/80 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#C4A6FF]" />
                <span>Khối Lớp</span>
              </span>
              {/* Thanh phân bố 7 khối lớp */}
              <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                <div className="w-full h-2 rounded-full bg-[#171522] overflow-hidden flex">
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
                      '6': '#38BDF8',
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
            <div className="xl:col-span-5 p-3.5 rounded-xl bg-[#0B0911] border border-[#1d1a29] space-y-2">
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
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Môn học */}
            <div className="xl:col-span-7 p-3.5 rounded-xl bg-[#0B0911] border border-[#1d1a29] space-y-2">
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
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HÀNG 5 (DRAWER): BỘ LỌC CHUYÊN SÂU (NĂM HỌC, TRƯỜNG, CHUẨN 2025, ĐÁP ÁN) */}
          {(showAdvancedDrawer || activeAdvancedFilterCount > 0) && (
            <div className="p-4 rounded-xl bg-[#13101c] border border-[#241f33] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-bold text-white/70 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#C4A6FF]" />
                    <span>Năm Học Ra Đề</span>
                  </label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0911] border border-[#1d1a29] text-[13px] font-bold text-white focus:outline-none focus:border-[#9B5CFF]"
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
                    className="w-full h-10 px-3 rounded-lg bg-[#0B0911] border border-[#1d1a29] text-[13px] font-bold text-white focus:outline-none focus:border-[#FF4FCB]"
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
                  <BookOpen className="w-3.5 h-3.5 text-[#FFB8E6]" />
                  <span>Có Lời Giải Chi Tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterHasDiscordLink((p) => !p)}
                  data-active={filterHasDiscordLink}
                  className="hh-hub-chip"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
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
                    disabled={isLoadingExam}
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
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[13px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
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
  const resolveDocAuthorInfo = (doc: ExamDocument) => {
    const authorName = doc.author_name || 'Orbit Bot';
    let authorAvatar = doc.author_avatar || '';
    if (
      !authorAvatar &&
      user &&
      user.avatar &&
      ((doc.author_id && String(doc.author_id) === String(user.id)) ||
        (doc.author_name &&
          (doc.author_name === user.global_name || doc.author_name === user.username)))
    ) {
      authorAvatar = user.avatar;
    }
    if (!authorAvatar && doc.author_id) {
      try {
        const aid = String(doc.author_id).trim();
        if (aid.length > 10 && /^\d+$/.test(aid)) {
          const idx = Number((BigInt(aid) >> 22n) % 6n);
          authorAvatar = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
        }
      } catch {
        /* ignore */
      }
    }
    if (!authorAvatar) {
      authorAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
    return { authorName, authorAvatar };
  };

  const renderExamDossierCard = (doc: ExamDocument, idx: number = 0) => {
    const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
    const trackInfo = getExamTrackInfo(doc);
    const eduBadge = getEducationLevelBadgeInfo(doc);
    const descInfo = getExamDescriptionInfo(doc);
    const { authorName, authorAvatar } = resolveDocAuthorInfo(doc);
    const isBookmarked = bookmarkedIds.has(doc.id);

    return (
      <ResizableCard key={doc.id} id={`doc_${doc.id}`} allowResizeWidth={false} className="h-full">
        <SpotSurface
          as="article"
          style={{ '--stagger-idx': idx } as React.CSSProperties}
          className={`hh-card-pop hh-hub-surface hh-hub-surface--interactive h-full p-5 sm:p-6 flex flex-col justify-between gap-4 group ${
            doc.is_duplicate_copy ? 'border-amber-500/40' : ''
          }`}
        >
          {/* Top Metadata Strip */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-black px-2.5 py-1 rounded-lg bg-[#201833] text-[#E2D4FF] border border-[#32244d]">
                  {doc.subject}
                </span>
                <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${eduBadge.badgeClass}`}>
                  <span>{eduBadge.shortLabel}</span>
                </span>
                <span
                  className={`text-[13px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${trackInfo.badgeClass}`}
                  title={`${trackInfo.description} (${trackInfo.difficultyNote})`}
                >
                  <span>{trackInfo.label}</span>
                </span>
                <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${gradeStyle.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
                  <span>{gradeStyle.label}</span>
                </span>

              </div>

              <div className="flex items-center gap-1.5 font-mono text-[13px] text-white/50">
                <span className="px-2 py-0.5 rounded-md bg-[#181622] text-[#FFB8E6] font-bold">
                  {(doc.file_type || 'PDF').toUpperCase()}
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

              {/* Mô tả đề thi ngắn gọn (VD: Lớp 9 Chuyên Tin — ...) */}
              <div className="px-2.5 py-1.5 rounded-lg bg-[#14111f] border border-[#241d38] text-[12px] text-white/75 leading-relaxed line-clamp-2">
                <span className="font-extrabold text-[#FFB8E6]">{descInfo.shortLabel}</span>
                <span className="text-white/45 mx-1.5">—</span>
                <span>{descInfo.bodyDescription}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] text-white/55">
                <span>{doc.page_count || 1} trang</span>
                {doc.question_count > 0 && <span>• {doc.question_count} câu hỏi</span>}
                <div className="hh-author-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 font-medium">
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="hh-avatar-ring w-4 h-4 rounded-full object-cover border border-purple-400/50 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                  <span className="text-[11px] text-purple-200/85">Tác giả:</span>
                  <strong className="text-[11px] text-white font-bold truncate max-w-[130px]">
                    {authorName}
                  </strong>
                </div>
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
                  className="text-[13px] font-bold px-2.5 py-0.5 rounded-md bg-[#161d2e] text-sky-300 border border-[#24324d] hover:border-sky-400 flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-sky-400" />
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
                  className="text-[13px] font-semibold px-2.5 py-0.5 rounded-md bg-[#201833] text-[#E2D4FF] border border-[#32244d] hover:border-[#9B5CFF] flex items-center gap-1 truncate max-w-[220px] cursor-pointer"
                  title={doc.school_or_department}
                >
                  <School className="w-3 h-3 shrink-0" />
                  <span className="truncate">{doc.school_or_department}</span>
                </button>
              )}
              {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) && (
                <span className="text-[13px] font-extrabold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Chuẩn 2025
                </span>
              )}
              {doc.has_answer_keys && (
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Đáp án
                </span>
              )}
              {doc.has_detailed_solutions && (
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-[#291524] text-[#FFB8E6] border border-[#422039]">
                  Lời giải
                </span>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="space-y-3 pt-3 border-t border-[#1d1a29]">

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const wasBookmarked = bookmarkedIds.has(doc.id);
                  toggleBookmarkExam(doc.id);
                  setBookmarkedIds(new Set(getBookmarkedExamIds()));
                  if (!wasBookmarked) {
                    showSuccess(`Đã lưu "${doc.title || doc.file_name}" vào Tủ Sách!`, 'Tủ Sách');
                  } else {
                    showInfo('Đã gỡ đề thi khỏi Tủ Sách.', 'Tủ Sách');
                  }
                }}
                aria-label={isBookmarked ? 'Bỏ lưu khỏi tủ sách' : 'Lưu vào tủ sách'}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'bg-[#1a1814] text-amber-400 border-amber-500/40'
                    : 'bg-[#161618] text-white/50 border-[#242429] hover:text-amber-300 hover:border-amber-500/30'
                }`}
                title={isBookmarked ? 'Bỏ lưu' : 'Lưu vào Tủ Sách'}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => openExamModal(doc, 'pdf_reader')}
                className="flex-1 py-2 px-3 rounded-lg bg-[#d61f79] hover:bg-[#e11d84] text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                title="Đọc đề PDF trực tiếp trên Web"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Đọc PDF</span>
              </button>

              <button
                type="button"
                onClick={() => openExamModal(doc, 'practice_room')}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-[13px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                title="Mở phòng thi thực chiến (Đếm giờ + Phiếu tô đáp án 2025)"
              >
                <PenTool className="w-3.5 h-3.5 shrink-0" />
                <span>Làm Đề</span>
              </button>

              <button
                type="button"
                onClick={() => openExamModal(doc, 'overview')}
                className="px-2.5 py-2 rounded-lg bg-[#161618] hover:bg-[#1e1e22] border border-[#242429] text-white/80 hover:text-white font-bold text-[13px] transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="Xem chi tiết đề thi"
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
                className="p-2 rounded-lg bg-[#161618] hover:bg-[#1e1e22] border border-[#242429] text-[#E2D4FF] transition-colors cursor-pointer"
                title="Tải tệp gốc về máy"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        </SpotSurface>
      </ResizableCard>
    );
  };

  // ===========================================================================
  // SUB-RENDER: COMPACT TABLE ROW FOR HIGH-DENSITY WORKBENCH / VAULT TABLE VIEW
  // ===========================================================================
  const renderExamCompactRow = (doc: ExamDocument, idx: number = 0) => {
    const isBookmarked = bookmarkedIds.has(doc.id);
    const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
    const trackInfo = getExamTrackInfo(doc);
    const descInfo = getExamDescriptionInfo(doc);
    const { authorName, authorAvatar } = resolveDocAuthorInfo(doc);
    const resolvedDownloadUrl = resolveExamFileUrl(doc);

    return (
      <div
        key={`row-${doc.id}`}
        style={{ '--stagger-idx': idx } as React.CSSProperties}
        className="hh-card-pop hh-dossier-row px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
      >
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[13px] font-extrabold px-2 py-0.5 rounded bg-[#201833] text-[#E2D4FF] border border-[#32244d]">
              {doc.subject}
            </span>
            <span className={`text-[13px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${gradeStyle.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
              <span>{gradeStyle.label}</span>
            </span>
            <span className={`text-[13px] font-bold px-2 py-0.5 rounded border ${trackInfo.badgeClass}`}>
              {trackInfo.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => openExamModal(doc, 'pdf_reader')}
            className="text-left min-w-0 flex-1 cursor-pointer"
            title={descInfo.fullDescription}
          >
            <div className="font-bold text-[13px] sm:text-sm text-white group-hover:text-[#FFB8E6] transition-colors truncate">
              {doc.title || doc.file_name}
            </div>
            <div className="text-[11px] text-white/60 truncate mt-0.5 flex items-center gap-1.5">
              <span className="font-bold text-[#C4A6FF] shrink-0">{descInfo.shortLabel}</span>
              <span className="text-white/35 shrink-0">—</span>
              <span className="truncate">{descInfo.bodyDescription}</span>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* HUY HIỆU TÁC GIẢ (DISCORD USER + AVATAR) TRÊN DÒNG ĐỀ THI */}
          <div
            className="hh-author-pill inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-100 shrink-0"
            title={`Tác giả đóng góp: ${authorName}`}
          >
            <img
              src={authorAvatar}
              alt={authorName}
              className="hh-avatar-ring w-3.5 h-3.5 rounded-full object-cover border border-purple-400/50 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
              }}
            />
            <span className="font-bold text-white truncate max-w-[96px]">{authorName}</span>
          </div>

          <div className="hidden 2xl:flex items-center gap-1.5 text-[13px] text-white/55 font-mono tabular-nums pr-1">
            <span>{doc.page_count || 1}tr</span>
            <span>•</span>
            <span>{formatFileSize(doc.file_size_bytes)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openExamModal(doc, 'pdf_reader')}
              className="px-2.5 py-1 rounded-lg bg-[#291524] hover:bg-[#d61f79] border border-[#422039] text-[#FFB8E6] hover:text-white text-[13px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Đọc PDF</span>
            </button>

            <button
              type="button"
              onClick={() => openExamModal(doc, 'practice_room')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/35 text-emerald-300 text-[13px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
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
                className="p-1.5 rounded-lg bg-[#161618] hover:bg-[#1e1e22] border border-[#242429] text-white/75 hover:text-white transition-colors"
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
                  ? 'bg-[#1a1814] border-amber-500/40 text-amber-400'
                  : 'bg-[#161618] border-[#242429] text-white/45 hover:text-amber-300'
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

  const isPreviewBypass =
    typeof window !== 'undefined' && window.location.search.includes('preview_auth=1');
  const hubLocked = !user && !isPreviewBypass;
  const sidebarWidthPx = Math.max(268, config.sidebarWidth);

  const [gatePendingUser, setGatePendingUser] = useState<DiscordUser | null>(() => getPendingDiscordUser());
  const [gateCodeInput, setGateCodeInput] = useState<string>('');
  const [gateVerifying, setGateVerifying] = useState<boolean>(false);
  const [gateError, setGateError] = useState<string>('');

  useEffect(() => {
    const syncGatePending = () => {
      setGatePendingUser(getPendingDiscordUser());
    };
    syncGatePending();
    window.addEventListener('orbit:pending-user-changed', syncGatePending as EventListener);
    window.addEventListener('storage', syncGatePending);
    return () => {
      window.removeEventListener('orbit:pending-user-changed', syncGatePending as EventListener);
      window.removeEventListener('storage', syncGatePending);
    };
  }, []);

  const handleGateVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatePendingUser) return;
    const cleanCode = gateCodeInput.trim().replace(/\s+/g, '');
    if (!cleanCode) {
      setGateError('Vui lòng nhập mã xác minh 6 số lấy từ kênh #🔐・verify.');
      return;
    }
    setGateVerifying(true);
    setGateError('');
    try {
      const apiBase = (getApiBaseUrl() || '').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/account/verify-code`, {
        method: 'POST',
        headers: {
          ...API_FETCH_HEADERS,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discord_id: gatePendingUser.id,
          code: cleanCode,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const finalUser: DiscordUser = {
          ...gatePendingUser,
          ...(data.user || {}),
          accessToken: gatePendingUser.accessToken,
        };
        clearPendingDiscordUser();
        saveDiscordUser(finalUser);
        syncLinkedAccount(getApiBaseUrl());
        onUserAuthenticated?.(finalUser);
        showSuccess(
          `Xin chào ${finalUser.global_name || finalUser.username}! Đã xác thực mã 5 phút và mở khóa Bàn Điều Khiển Orbit.`,
          'Đăng Nhập Discord Thành Công'
        );
      } else {
        setGateError(
          data?.message ||
            'Mã xác minh không chính xác hoặc đã hết hạn (5 phút). Vui lòng bấm nút Lấy Mã mới trong kênh #🔐・verify!'
        );
      }
    } catch {
      setGateError('Không thể kết nối tới trạm xác thực mã. Vui lòng thử lại sau giây lát.');
    } finally {
      setGateVerifying(false);
    }
  };

  const activeSidebarKey = useMemo(() => {
    if (activeTab === 'vault') {
      return showBookmarksOnly ? 'bookmarks' : 'vault';
    }
    return activeTab;
  }, [activeTab, showBookmarksOnly]);

  const moveSidebarIndicator = useCallback((key: string, instant = false) => {
    const nav = sidebarNavRef.current;
    const ind = sidebarIndicatorRef.current;
    const el = sidebarItemRefs.current[key];
    if (!nav || !ind || !el) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.height === 0) return;
    if (instant) ind.style.transition = 'none';
    ind.style.height = `${Math.round(elRect.height)}px`;
    ind.style.transform = `translate3d(0, ${Math.round(elRect.top - navRect.top)}px, 0)`;
    ind.style.opacity = '1';
    nav.dataset.ready = 'true';
    if (instant) {
      void ind.offsetHeight;
      ind.style.transition = '';
    }
  }, []);

  useLayoutEffect(() => {
    moveSidebarIndicator(activeSidebarKey, true);
    const onResize = () => moveSidebarIndicator(activeSidebarKey, true);
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => moveSidebarIndicator(activeSidebarKey, true)).catch(() => {});
    return () => window.removeEventListener('resize', onResize);
  }, [activeSidebarKey, moveSidebarIndicator, isAdmin, totalDocsCount]);

  return (
    <div className="hh-hub-shell">
      {/* ========================================================================= */}
      {/* MOBILE TOP COMMAND HEADER                                                 */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full sticky top-0 z-40 hh-hub-mobile-bar">
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-[#1d1a29]">
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
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#291524] text-[#FFB8E6] border border-[#422039]">
                  Hub
                </span>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2 rounded-lg bg-[#161618] border border-[#242429] text-white/80"
              aria-label="Tìm kiếm nhanh"
            >
              <Search className="w-4 h-4 text-[#FFB8E6]" />
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-white/85 bg-[#161420] border border-[#221e30] flex items-center gap-1.5 cursor-pointer"
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
            onClick={() => handleTabChange('courses')}
            data-active={activeTab === 'courses'}
            className="hh-hub-chip whitespace-nowrap"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#C4A6FF]" />
            <span>Khóa Học (Beta)</span>
          </button>
          <button
            onClick={() => handleTabChange('forum')}
            data-active={activeTab === 'forum'}
            className="hh-hub-chip whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#FFB8E6]" />
            <span>Diễn Đàn</span>
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
      {/* DESKTOP COMMAND RAIL (SIDEBAR - FIXED VIEWPORT + FULL-PAGE RAIL)          */}
      {/* ========================================================================= */}
      <aside
        data-lenis-prevent
        style={{ width: `${sidebarWidthPx}px` }}
        className="hidden lg:flex lg:fixed lg:top-0 lg:left-0 lg:bottom-0 h-dvh hh-hub-sidebar hh-sidebar-scroll flex-col justify-between shrink-0 p-3 z-30 overflow-y-auto overscroll-contain"
      >
        <div className="space-y-2.5">
          {/* Brand Header with Crystal Ring Emblem */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#221a35]">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2.5 group cursor-pointer text-left min-w-0"
              title="Quay về Trang Chủ Orbit | Vietnam"
            >
              <span className="hh-orbit-logo-halo w-8 h-8 shrink-0">
                <img
                  src="/orbit_logo_transparent.png"
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 object-contain"
                />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-black text-white group-hover:text-[#FFB8E6] transition-colors flex items-center gap-1.5 truncate">
                  <span>Orbit | Vietnam</span>
                </div>
                <div className="text-xs font-mono text-[#C4A6FF]/75 truncate">
                  Bàn điều khiển v2.5
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-[#171522] border border-transparent hover:border-[#242033] transition-colors cursor-pointer shrink-0"
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
            className="w-full px-2.5 py-1.5 rounded-xl bg-[#13111c] hover:bg-[#181622] border border-[#221a35] hover:border-[#422039] flex items-center justify-between gap-2 text-[13px] text-white/75 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[#FF4FCB] shrink-0" />
              <span className="truncate">Tìm nhanh đề thi &amp; lệnh...</span>
            </span>
            <kbd className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#181622] border border-[#242033] text-white/70 whitespace-nowrap shrink-0">
              Ctrl K
            </kbd>
          </button>

          {/* Navigation Deck with Animate UI Vertical Gliding Indicator */}
          <div className="space-y-1">
            <div className="px-2 pb-0.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/55">
                Trạm điều hành
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{botStatus.online ? 'Bot Live' : 'Cloud Live'}</span>
              </span>
            </div>

            <nav
              ref={sidebarNavRef}
              className="hh-sidebar-nav space-y-0.5"
              aria-label="Điều hướng Hub"
              onPointerLeave={() => moveSidebarIndicator(activeSidebarKey)}
            >
              <span ref={sidebarIndicatorRef} className="hh-sidebar-indicator" aria-hidden="true" />

              <button
                ref={(el) => {
                  sidebarItemRefs.current['overview'] = el;
                }}
                type="button"
                onClick={() => handleTabChange('overview')}
                onPointerEnter={() => moveSidebarIndicator('overview')}
                onFocus={() => moveSidebarIndicator('overview')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'overview'}
                className="hh-hub-nav-item"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-[#C4A6FF]" />
                <span className="truncate">Bàn Điều Khiển</span>
                <span className="ml-auto font-mono text-xs text-white/45 shrink-0">01</span>
              </button>

              <button
                ref={(el) => {
                  sidebarItemRefs.current['courses'] = el;
                }}
                type="button"
                onClick={() => handleTabChange('courses')}
                onPointerEnter={() => moveSidebarIndicator('courses')}
                onFocus={() => moveSidebarIndicator('courses')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'courses'}
                className="hh-hub-nav-item"
              >
                <GraduationCap className="w-4 h-4 shrink-0 text-[#FFB8E6]" />
                <span className="truncate">Khóa Học (Chưa hoàn thiện)</span>
                <span className="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  Beta
                </span>
              </button>

              <button
                ref={(el) => {
                  sidebarItemRefs.current['forum'] = el;
                }}
                type="button"
                onClick={() => handleTabChange('forum')}
                onPointerEnter={() => moveSidebarIndicator('forum')}
                onFocus={() => moveSidebarIndicator('forum')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'forum'}
                className="hh-hub-nav-item"
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">Diễn Đàn Orbit</span>
                <span className="ml-auto font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                  4 Mục
                </span>
              </button>

              <button
                ref={(el) => {
                  sidebarItemRefs.current['vault'] = el;
                }}
                type="button"
                onClick={() => {
                  handleTabChange('vault');
                  setShowBookmarksOnly(false);
                }}
                onPointerEnter={() => moveSidebarIndicator('vault')}
                onFocus={() => moveSidebarIndicator('vault')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'vault' && !showBookmarksOnly}
                className="hh-hub-nav-item"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-[#FF4FCB]" />
                <span className="truncate">Kho Đề Thi</span>
                <span className="ml-auto font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-[#291524] text-[#FFB8E6] border border-[#422039] shrink-0">
                  {totalDocsCount}
                </span>
              </button>

              <button
                ref={(el) => {
                  sidebarItemRefs.current['bookmarks'] = el;
                }}
                type="button"
                onClick={() => {
                  handleTabChange('vault');
                  setShowBookmarksOnly(true);
                }}
                onPointerEnter={() => moveSidebarIndicator('bookmarks')}
                onFocus={() => moveSidebarIndicator('bookmarks')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'vault' && showBookmarksOnly}
                className="hh-hub-nav-item"
              >
                <Star className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="truncate">Tủ Sách Cá Nhân</span>
                <span className="ml-auto font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  {bookmarkedIds.size}
                </span>
              </button>

              <button
                ref={(el) => {
                  sidebarItemRefs.current['get_exam'] = el;
                }}
                type="button"
                onClick={() => handleTabChange('get_exam')}
                onPointerEnter={() => moveSidebarIndicator('get_exam')}
                onFocus={() => moveSidebarIndicator('get_exam')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'get_exam'}
                className="hh-hub-nav-item"
              >
                <Dices className="w-4 h-4 shrink-0 text-[#38BDF8]" />
                <span className="truncate">Máy Bốc Đề</span>
                <span className="ml-auto font-mono text-xs text-[#38BDF8]/80 shrink-0">RNG</span>
              </button>

              <button
                ref={(el) => {
                  sidebarItemRefs.current['submit_doc'] = el;
                }}
                type="button"
                onClick={() => handleTabChange('submit_doc')}
                onPointerEnter={() => moveSidebarIndicator('submit_doc')}
                onFocus={() => moveSidebarIndicator('submit_doc')}
                onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                data-active={activeTab === 'submit_doc'}
                className="hh-hub-nav-item"
              >
                <UploadCloud className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">Đóng Góp Đề Thi</span>
                <span className="ml-auto font-mono text-xs text-emerald-300/80 shrink-0">+XP</span>
              </button>

              {(isAdmin || readCachedAdmin()) && (
                <button
                  ref={(el) => {
                    sidebarItemRefs.current['admin'] = el;
                  }}
                  type="button"
                  onClick={() => handleTabChange('admin')}
                  onPointerEnter={() => moveSidebarIndicator('admin')}
                  onFocus={() => moveSidebarIndicator('admin')}
                  onBlur={() => moveSidebarIndicator(activeSidebarKey)}
                  data-active={activeTab === 'admin'}
                  className="hh-hub-nav-item"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="truncate">Quản Trị Hệ Thống</span>
                  {hasSystemUpdate ? (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold shrink-0">
                      Mới
                    </span>
                  ) : (
                    <span className="ml-auto font-mono text-xs text-amber-300/75 flex items-center gap-1 shrink-0">
                      {justReconnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      <span>{adminInfo?.role_name || 'Root'}</span>
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* LỌC NHANH THEO KHỐI LỚP (GỌN GÀNG, SẮC NÉT) */}
          <div className="pt-2.5 border-t border-[#221a35] space-y-1.5">
            <div className="px-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/55">
                Khối lớp trọng điểm
              </span>
              <span className="text-xs font-mono text-white/45 tabular-nums">Lớp 6–12</span>
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
                  className="px-2.5 py-1.5 rounded-lg bg-[#13111c] hover:bg-[#181622] border border-[#221a35] hover:border-[#422039] flex items-center justify-between text-[13px] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-white/85 truncate">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: g.dot }} />
                    <span className="truncate">{g.label}</span>
                  </span>
                  <span className="font-mono text-[13px] text-white/60 tabular-nums shrink-0">{g.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MINI LIVE ORBIT POMODORO PILL */}
          <div className="p-2.5 rounded-xl bg-[#13111c] border border-[#221a35]">
            <div className="flex items-center justify-between text-[13px]">
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
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#291524] text-[#FFB8E6]">
                  {pomoRunning ? 'Đang chạy' : 'Pomodoro 25/5'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom: Discord Identity & Storage Channel Status */}
        <div className="pt-2.5 mt-2 border-t border-[#221a35] space-y-2">
          {user ? (
            <div className="p-2.5 rounded-xl bg-[#13111c] border border-[#221a35] space-y-1.5">
              <div className="flex items-center gap-2.5">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg object-cover border border-[#32244d] shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="font-bold text-[13px] truncate text-white">
                    {user.global_name || user.username}
                  </div>
                  <div className="text-xs text-white/50 truncate font-mono">
                    @{user.username}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-white/45 hover:text-rose-300 hover:bg-[#1d1a29] cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-[#221a35] text-white/50">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Đã liên kết Discord</span>
                </span>
                <span className="tabular-nums text-[#FFB8E6] font-bold">Đã xác thực</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#13111c] border border-[#221a35] space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/85 font-bold">Đồng bộ Discord</span>
                <span className="font-mono text-xs text-[#FFB8E6]">Khách</span>
              </div>
              <PixelButton
                variant="discord"
                block
                className="!min-h-[36px] !text-[13px]"
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
            className="w-full py-2 px-3 rounded-xl bg-[#13111c] hover:bg-[#181622] border border-[#221a35] text-[13px] font-bold text-white/75 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2 truncate">
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF4FCB] shrink-0" />
              <span className="truncate">Về Trang Chủ Orbit</span>
            </span>
            <span className="font-mono text-xs text-white/40 shrink-0">ESC</span>
          </button>
        </div>
      </aside>

      {/* Cột nền kéo dài xuyên suốt 100% chiều cao toàn trang từ đỉnh xuống đáy Hub */}
      <div
        className="hidden lg:block shrink-0 hh-hub-sidebar-rail pointer-events-none"
        style={{ width: `${sidebarWidthPx}px` }}
        aria-hidden="true"
      />

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CONTENT                                                    */}
      {/* ========================================================================= */}
      <main className="hh-hub-main flex-1 min-w-0 p-4 sm:p-6 lg:p-7 xl:p-8 max-w-[1640px] mx-auto w-full">
        {/* Desktop Top Telemetry & Quick Filter Bar */}
        <div className="hidden lg:flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-[#1d1a29]">
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
                {activeTab === 'courses' && 'Trung tâm Khóa học — Beta (Chưa hoàn thiện)'}
                {activeTab === 'forum' && 'Diễn đàn thảo luận 2 chiều (Góc thắc mắc · Facts · Hỏi đáp · Ôn thi)'}
                {activeTab === 'vault' && (showBookmarksOnly ? 'Tủ sách cá nhân' : 'Kho đề thi')}
                {activeTab === 'get_exam' && 'Máy bốc đề ngẫu nhiên'}
                {activeTab === 'submit_doc' && 'Đóng góp đề thi'}
                {activeTab === 'admin' && 'Quản trị hệ thống'}
              </span>
            </div>

            {/* 1-Click Quick Filter Strip right in the header */}
            <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-[#1d1a29]">
              <button
                type="button"
                onClick={() => {
                  setSelectedEducationLevel('ALL');
                  handleGradeChange('12');
                  setShowBookmarksOnly(false);
                  handleTabChange('vault');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#13111c] hover:bg-[#181622] border border-[#1d1a29] text-[13px] font-semibold text-white/80 hover:text-white cursor-pointer transition-colors"
              >
                Đề Lớp 12 ({gradeDistribution['12'] || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterHasAnswers(true);
                  setShowBookmarksOnly(false);
                  handleTabChange('vault');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#13111c] hover:bg-[#181622] border border-[#1d1a29] text-[13px] font-semibold text-emerald-300/90 hover:text-emerald-200 cursor-pointer transition-colors"
              >
                Có Đáp Án ({withAnswersDocsCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExamTypeChange('CHUYEN');
                  setShowBookmarksOnly(false);
                  handleTabChange('vault');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#13111c] hover:bg-[#181622] border border-[#1d1a29] text-[13px] font-semibold text-[#FFB8E6] hover:text-white cursor-pointer transition-colors"
              >
                Trường Chuyên
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Database & Bot Telemetry Pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#13111c] border border-[#1d1a29] text-[13px] font-mono tabular-nums">
              <span
                className={`w-2 h-2 rounded-full ${
                  botStatus.online ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
              />
              <span className="text-white/80 font-sans font-semibold">
                {botStatus.online ? 'Bot trực tuyến' : 'Cloud trực tuyến'}
              </span>
              <span className="text-white/20">|</span>
              <span className="text-[#FFB8E6] font-bold">{totalDocsCount} đề</span>
            </div>

            <button
              type="button"
              onClick={() => {
                notifyBotViaWebhookHandshake({
                  event: 'manual_sync',
                  view: 'dashboard',
                  tab: activeTab,
                  username: user?.global_name || user?.username || 'Học Sinh Orbit',
                  userId: user?.id,
                  force: true,
                });
                checkBotStatus();
                fetchDocStats();
                fetchDocuments();
                showInfo('Đã đồng bộ trực tiếp Bot ↔ Web qua Cầu nối Bảo mật 7 Lớp & làm mới Kho Đề Vô Hạn (#1556682296235393034).');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#13111c] hover:bg-[#1a1726] border border-[#241f35] text-[13px] font-semibold text-white/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              title="Đồng bộ trực tiếp Bot ↔ Web (Khiên Bảo Mật 7 Lớp · Kho Đề Vô Hạn #1556682296235393034)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C6F24E]" />
              <span>Đồng bộ Bot</span>
            </button>
          </div>
        </div>

        {/* Admin Update Banner */}
        {hasSystemUpdate && activeTab !== 'admin' && (
          <div className="mb-6 p-4 rounded-xl bg-[#241a10] border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[13px] px-2.5 py-1 rounded bg-amber-400 text-black font-bold">
                Cập nhật
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

        {/* MANDATORY DISCORD LOGIN GATE TO ENTER ORBIT HUB / FORUM */}
        {hubLocked && (
          <SpotSurface className="hh-hub-surface p-6 sm:p-8 w-full space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT 7/12: DISCORD LOGIN & MEMBER VERIFICATION */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2 pb-4 border-b border-[#1d1a29]">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#291524] border border-[#422039] text-[13px] font-mono text-[#FFB8E6]">
                    <Lock className="w-3.5 h-3.5 text-[#FF4FCB]" />
                    <span>Cổng Xác Thực Thành Viên Discord Orbit</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-[26px] font-black text-white tracking-tight leading-snug">
                    Đăng Nhập Tài Khoản Discord Để Vào Bàn Điều Khiển
                  </h1>
                  <p className="text-[13px] sm:text-sm text-white/70 leading-relaxed">
                    Bàn điều khiển trung tâm, Kho đề thi, Khóa học và Diễn đàn 2 chiều (Góc thắc mắc · Facts · Hỏi đáp · Ôn thi) được đồng bộ trực tiếp với máy chủ Discord Orbit | Vietnam.
                  </p>
                </div>

                {!gatePendingUser ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#0D0A14] border border-[#221a35] space-y-3">
                      <div className="text-[13px] text-white/80 space-y-1.5 leading-relaxed">
                        <div>
                          <strong className="text-white">Bước 1:</strong> Bấm nút bên dưới để xác minh &amp; liên kết tài khoản Discord chính chủ với Web/Bot.
                        </div>
                        <div>
                          <strong className="text-white">Bước 2:</strong> Vào kênh <code>#🔐・verify</code> trên server <strong>Orbit | Vietnam</strong> bấm nút <strong>Lấy Mã (5 Phút)</strong> và nhập mã 6 số để mở khóa Hub.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={startDiscordOAuthLogin}
                          className="px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-extrabold text-[13px] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Xác minh &amp; Liên kết tài khoản Discord</span>
                        </button>
                        <a
                          href="https://discord.gg/Xeb2pNH2"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-[#13111c] hover:bg-[#181622] border border-[#221a35] text-white/85 hover:text-white font-semibold text-[13px] inline-flex items-center justify-center gap-2 transition-colors"
                        >
                          <span>Tham Gia Server Orbit</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#C4A6FF]" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleGateVerifyCode} className="p-4 rounded-xl bg-[#0D0A14] border border-[#221a35] space-y-3.5">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#221a35]">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={gatePendingUser.avatar || 'https://orbit-psi-black.vercel.app/server_icon.png'}
                          alt={gatePendingUser.global_name || gatePendingUser.username}
                          className="w-9 h-9 rounded-full border border-emerald-400/40 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-white truncate">
                            {gatePendingUser.global_name || gatePendingUser.username}
                          </div>
                          <div className="text-xs text-emerald-300 font-mono truncate">
                            @{gatePendingUser.username} · Bước 2/2: Nhập mã xác minh 5 phút
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearPendingDiscordUser();
                          setGatePendingUser(null);
                          setGateCodeInput('');
                          setGateError('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/75 hover:text-white cursor-pointer"
                      >
                        Đổi tài khoản
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-white/75">
                        Bấm nút lấy mã 6 số trong kênh <code>#🔐・verify</code> (mỗi mã dùng trong 5 phút, tạo mã mới sẽ tự hủy mã cũ):
                      </span>
                      <a
                        href={DISCORD_VERIFY_CHANNEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#c7d2fe] hover:text-white"
                      >
                        <span>Mở kênh #🔐・verify</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id="orbit-gate-code-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={gateCodeInput}
                        onChange={(e) => setGateCodeInput(e.target.value)}
                        placeholder="Nhập mã xác minh 6 số (VD: 842915)..."
                        className="flex-1 h-11 px-4 rounded-xl bg-[#130f1e] border border-[#2c2247] focus:border-[#FF4FCB] text-base font-mono tracking-widest text-white placeholder:text-white/35 placeholder:tracking-normal placeholder:font-sans focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={gateVerifying || !gateCodeInput.trim()}
                        className="h-11 px-5 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] disabled:opacity-50 text-white font-extrabold text-[13px] flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{gateVerifying ? 'Đang xác minh...' : 'Xác Nhận & Vào Hub'}</span>
                      </button>
                    </div>
                    {gateError && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[13px]">
                        {gateError}
                      </div>
                    )}
                  </form>
                )}

                <div className="pt-3 border-t border-[#1d1a29] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onBackToHome}
                    className="px-3.5 py-2 rounded-xl bg-[#13111c] hover:bg-[#181622] border border-[#221a35] text-white/75 hover:text-white font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Về Trang Chủ</span>
                  </button>
                </div>
              </div>

              {/* RIGHT 5/12: ĐẶC QUYỀN ĐỒNG BỘ 2 CHIỀU ORBIT WEB <-> DISCORD */}
              <div className="lg:col-span-5 p-5 rounded-xl bg-[#0D0A14] border border-[#221a35] space-y-4">
                <div className="text-sm font-extrabold text-white border-b border-[#221a35] pb-2.5">
                  Quyền lợi khi liên kết tài khoản Discord Orbit
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-[#13101d] border border-[#221a35] space-y-1">
                    <div className="text-[13px] font-bold text-[#FFB8E6]">
                      1. Diễn đàn 2 chiều (#diễn-đàn)
                    </div>
                    <div className="text-[13px] text-white/65">
                      Đăng bài và bình luận trực tiếp trên 4 chuyên mục: Góc thắc mắc, Facts, Hỏi đáp và Ôn thi.
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#13101d] border border-[#221a35] space-y-1">
                    <div className="text-[13px] font-bold text-emerald-300">
                      2. Kho Đề Thi &amp; Máy Bốc Đề
                    </div>
                    <div className="text-[13px] text-white/65">
                      Truy cập toàn bộ {totalDocsCount} đề thi từ Lớp 6 đến Lớp 12, đọc PDF và làm bài tính giờ.
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#13101d] border border-[#221a35] space-y-1">
                    <div className="text-[13px] font-bold text-amber-300">
                      3. Vinh danh Credit Tác Giả &amp; Role ✍️ Tác giả
                    </div>
                    <div className="text-[13px] text-white/65">
                      Ghi nhận Tên &amp; Avatar vĩnh viễn trên thẻ đề đóng góp và tự động cấp Role Tác giả trên Discord.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SpotSurface>
        )}

        {/* TAB 01: OVERVIEW — ORBIT | VIETNAM COMMAND DECK V2 */}
        {activeTab === 'overview' && !hubLocked && (
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1d1a29]">
                      <div className="flex items-center gap-2.5">
                        <span className="hh-orbit-logo-halo w-8 h-8 shrink-0">
                          <img
                            src="/orbit_logo_transparent.png"
                            alt="Orbit | Vietnam"
                            className="w-6 h-6 object-contain"
                          />
                        </span>
                        <div>
                          <div className="text-[13px] font-semibold text-[#FFB8E6]">
                            Orbit | Vietnam · Trung tâm điều hành học thuật
                          </div>
                          <div className="text-[13px] text-white/60">
                            Không gian học tập &amp; Kho đề thi mở
                          </div>
                        </div>
                      </div>

                      {/* Real-time Second-by-Second THPT Countdown Strip (React.memo cô lập re-render) */}
                      <HubThptCountdownStrip
                        examYear={nextThptExam.examYear}
                        targetIso={nextThptExam.targetIso}
                      />
                    </div>

                    {/* Hero Headline & Context */}
                    <div className="space-y-2">
                      <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black tracking-tight text-white leading-[1.18]">
                        Bàn điều khiển học thuật Orbit
                      </h1>
                      <p className="text-[13px] sm:text-sm text-white/65 max-w-2xl leading-relaxed">
                        Chào <strong className="text-white">{user ? user.global_name || user.username : 'bạn'}</strong>, truy cập tức thì <strong className="text-white tabular-nums">{totalDocsCount} đề thi</strong> đã kiểm định cấu trúc, mở phòng luyện đề bấm giờ nhận XP hoặc bốc ngẫu nhiên theo đúng tổ hợp môn mục tiêu.
                      </p>
                    </div>

                    {/* Nguyện Vọng 1 Target Bar */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B0911] border border-[#1d1a29]">
                      {!isEditingDream && dreamGoal ? (
                        <div
                          key="hub-dream-saved"
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 hh-swap-panel"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Target className="w-5 h-5 text-[#FF4FCB] shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-[#FFB8E6]">
                                Mục tiêu Nguyện vọng 1 đã khóa
                              </div>
                              <div className="text-sm sm:text-base font-black text-white truncate flex flex-wrap items-center gap-2">
                                <span>{dreamGoal.school}</span>
                                {dreamGoal.score && (
                                  <span className="font-mono text-[13px] px-2 py-0.5 rounded bg-[#201833] text-[#E2D4FF] border border-[#32244d] tabular-nums">
                                    Chỉ tiêu: {dreamGoal.score}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingDream(true)}
                            className="px-3 py-1.5 rounded-lg bg-[#161420] hover:bg-[#1e1b2c] border border-[#221e30] text-[13px] font-bold text-white/85 cursor-pointer self-start sm:self-center shrink-0"
                          >
                            Đổi mục tiêu
                          </button>
                        </div>
                      ) : (
                        <form key="hub-dream-form" onSubmit={handleSaveDreamInHub} className="space-y-2.5 hh-swap-panel">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-[#FFB8E6] flex items-center gap-1.5">
                              <Target className="w-4 h-4 text-[#FF4FCB]" />
                              <span>Thiết lập mục tiêu trường Đại học / Chuyên</span>
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
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <input
                              type="text"
                              value={dreamSchoolInput}
                              onChange={(e) => setDreamSchoolInput(e.target.value)}
                              placeholder="VD: ĐH Bách Khoa Hà Nội, ĐH Ngoại Thương, Chuyên KHTN..."
                              className="sm:col-span-7 h-9 px-3 rounded-lg bg-[#14121d] border border-[#221e30] text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[#FF4FCB]"
                            />
                            <input
                              type="text"
                              value={dreamScoreInput}
                              onChange={(e) => setDreamScoreInput(e.target.value)}
                              placeholder="Điểm (VD: 28.5+)"
                              className="sm:col-span-3 h-9 px-3 rounded-lg bg-[#14121d] border border-[#221e30] text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:border-[#9B5CFF]"
                            />
                            <button
                              type="submit"
                              className="sm:col-span-2 h-9 px-3 rounded-lg bg-[#d61f79] hover:bg-[#e11d84] text-white font-bold text-[13px] cursor-pointer transition-colors"
                            >
                              Ghim
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* TYPOGRAPHY-FIRST 4-COLUMN KPI STRIP (NO IDENTICAL BOX SLOP) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1d1a29] rounded-xl bg-[#0B0911] border border-[#1d1a29] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className="p-3.5 text-left hover:bg-[#14121d] transition-colors cursor-pointer group"
                      >
                        <div className="text-[13px] font-semibold text-white/55 group-hover:text-white/80">
                          Kho đề chuẩn
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{totalDocsCount}</span>
                          <span className="text-xs font-mono text-[#FFB8E6] font-semibold">tệp</span>
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
                        className="p-3.5 text-left hover:bg-[#14121d] transition-colors cursor-pointer group"
                      >
                        <div className="text-[13px] font-semibold text-white/55 group-hover:text-white/80">
                          Trọng điểm 12
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-[#FF4FCB] mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{gradeDistribution['12'] || 0}</span>
                          <span className="text-xs font-mono text-white/55 font-semibold">đề thi</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterHasAnswers(true);
                          setShowBookmarksOnly(false);
                          handleTabChange('vault');
                        }}
                        className="p-3.5 text-left hover:bg-[#14121d] transition-colors cursor-pointer group"
                      >
                        <div className="text-[13px] font-semibold text-white/55 group-hover:text-white/80">
                          Có đáp án
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{withAnswersDocsCount}</span>
                          <span className="text-xs font-mono text-emerald-300/75 font-semibold">đề giải</span>
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
                        className="p-3.5 text-left hover:bg-[#14121d] transition-colors cursor-pointer group"
                      >
                        <div className="text-[13px] font-semibold text-white/55 group-hover:text-white/80">
                          Khối THPT 10–12
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-[#38BDF8] mt-1 tabular-nums flex items-baseline gap-1.5">
                          <span>{thptDocsCount}</span>
                          <span className="text-xs font-mono text-sky-300/75 font-semibold">tài liệu</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Bar */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#1d1a29]">
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
                      onClick={() => handleTabChange('courses')}
                      icon={<GraduationCap className="w-4 h-4 text-[#C4A6FF]" />}
                    >
                      Khóa Học (Beta · Chưa hoàn thiện)
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

                {/* RIGHT 5/12: ORBITAL FOCUS POMODORO COCKPIT (SVG RADIAL RING) */}
                <div className="xl:col-span-5 rounded-xl bg-[#0B0911] border border-[#1d1a29] p-5 sm:p-6 flex flex-col justify-between gap-4">
                  {/* Top Bar: Pomodoro Mode Switcher */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1d1a29]">
                    <div>
                      <div className="text-[13px] font-semibold text-[#C4A6FF]">
                        Buồng lái tập trung · Orbit Timer
                      </div>
                      <div className="text-sm font-extrabold text-white mt-0.5">
                        Đồng Hồ Tập Trung Pomodoro 25/5
                      </div>
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[#14121d] border border-[#221e30]">
                      <button
                        type="button"
                        onClick={() => togglePomoMode('focus')}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                          pomoMode === 'focus'
                            ? 'bg-[#291524] text-[#FFB8E6] border border-[#422039]'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        25p học
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePomoMode('chill')}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                          pomoMode === 'chill'
                            ? 'bg-[#291524] text-[#FFB8E6] border border-[#422039]'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        5p nghỉ
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
                            stroke="#1e1b2e"
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
                          <span className="text-xs font-mono text-[#FFB8E6] mt-0.5">
                            {pomoRunning ? 'Đang học' : pomoMode === 'focus' ? 'Sẵn sàng' : 'Giải lao'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Controls + Focus Summary */}
                    <div className="sm:col-span-7 space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setPomoRunning((r) => !r);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#d61f79] hover:bg-[#e11d84] text-white text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
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
                          className="p-2 rounded-lg bg-[#161618] hover:bg-[#1e1e22] border border-[#242429] text-white/75 hover:text-white cursor-pointer"
                          title="Đặt lại đồng hồ"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-[#13111c] border border-[#1d1a29] space-y-1.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-extrabold text-[#FFB8E6] truncate">
                            {user ? user.global_name || user.username : 'Thành viên Orbit'}
                          </span>
                          <span className="font-mono font-bold text-emerald-300">
                            Pomodoro 25/5
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono text-white/55 tabular-nums">
                          <span>{studyProfile?.pomodoro_count || 0} phiên tập trung</span>
                          <span>{studyProfile?.exams_completed || 0} đề đã luyện</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: 3 Clean Academic Metrics */}
                  <div className="pt-3 border-t border-[#1d1a29]">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-[#13111c] border border-[#1d1a29]">
                        <div className="text-xs font-semibold text-white/55">Pomodoro</div>
                        <div className="text-sm font-black text-[#E2CEFF] tabular-nums mt-0.5">
                          {studyProfile?.pomodoro_count || 0} phiên
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#13111c] border border-[#1d1a29]">
                        <div className="text-xs font-semibold text-white/55">Đề đã luyện</div>
                        <div className="text-sm font-black text-sky-300 tabular-nums mt-0.5">
                          {studyProfile?.exams_completed || 0} đề
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#13111c] border border-[#1d1a29]">
                        <div className="text-xs font-semibold text-white/55">Đóng góp</div>
                        <div className="text-sm font-black text-emerald-300 tabular-nums mt-0.5">
                          {studyProfile?.docs_contributed || 0} đề
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NẾU VỪA BỐC THỬ 1 ĐỀ NGAY TRÊN OVERVIEW THÌ HIỂN THỊ KẾT QUẢ TỨC THÌ */}
            {currentExam && (
              <SpotSurface className="hh-hub-surface p-5 sm:p-6 border-[#422039]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FF4FCB] text-[#0E0C14] font-bold">
                        Đề vừa bốc tức thì
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
                      className="px-4 py-2 rounded-lg bg-[#d61f79] hover:bg-[#e11d84] text-white text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Đọc Đề PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openExamModal(currentExam, 'practice_room')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Làm Bài Thực Chiến</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentExam(null)}
                      className="p-2 rounded-lg text-white/40 hover:text-white cursor-pointer"
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
                  <span className="text-[13px] font-bold text-[#C4A6FF]">
                    Ma trận môn học trọng điểm
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-[13px] text-white/60">
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
                  className="text-[13px] font-bold text-[#FFB8E6] hover:underline flex items-center gap-1 cursor-pointer"
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
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white/50">
                            Môn học
                          </div>
                          <div className="text-sm sm:text-[15px] font-extrabold text-white group-hover:text-[#FFB8E6] transition-colors mt-0.5 truncate">
                            {subj.shortLabel}
                          </div>
                        </div>
                        <span
                          className="font-mono text-xs font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0"
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
                          <span className="text-xs text-white/55 font-mono">đề thi</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-[#1a1726] overflow-hidden">
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d1a29] pb-3.5">
                  <div>
                    <div className="text-[13px] font-semibold text-[#FF4FCB]">
                      Đề thi &amp; tài liệu mới nhất
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                      Đề Thi Vừa Kiểm Duyệt Lên Kho Cloud
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0B0911] border border-[#1d1a29]">
                      <button
                        type="button"
                        onClick={() => setVaultViewMode('table')}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                          vaultViewMode === 'table'
                            ? 'bg-[#291524] text-[#FFB8E6] border border-[#422039]'
                            : 'text-white/55 hover:text-white'
                        }`}
                      >
                        Dạng Bảng
                      </button>
                      <button
                        type="button"
                        onClick={() => setVaultViewMode('cards')}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
                          vaultViewMode === 'cards'
                            ? 'bg-[#291524] text-[#FFB8E6] border border-[#422039]'
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
                      className="text-[13px] font-bold text-[#FFB8E6] hover:underline flex items-center gap-1 cursor-pointer tabular-nums pl-1"
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
                    {documentsList.slice(0, 7).map((doc) => renderExamCompactRow(doc))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {documentsList.slice(0, 4).map((doc) => renderExamDossierCard(doc))}
                  </div>
                )}

                <div className="pt-2.5 border-t border-[#1d1a29] flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/60">
                  <span>Bấm trực tiếp vào tên đề để mở trình đọc PDF hoặc Phòng Thi Thực Chiến</span>
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
                  <div className="flex items-center justify-between border-b border-[#1d1a29] pb-3.5">
                    <div>
                      <div className="text-[13px] font-semibold text-amber-300">
                        Lưu trữ cá nhân
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                        Tủ Sách Đang Ghim
                      </h3>
                    </div>
                    <span className="font-mono tabular-nums text-[13px] px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {bookmarkedIds.size} đề
                    </span>
                  </div>

                  {bookmarkedIds.size === 0 ? (
                    <div className="space-y-2.5">
                      <p className="text-[13px] text-white/60 leading-relaxed">
                        Chưa có đề ghim. Bấm biểu tượng ngôi sao trên bất kỳ đề thi nào hoặc ghim nhanh đề gợi ý dưới đây:
                      </p>
                      <div className="space-y-2">
                        {documentsList.slice(0, 2).map((doc) => (
                          <div
                            key={`suggest-${doc.id}`}
                            className="p-2.5 rounded-xl bg-[#0B0911] border border-[#1d1a29] flex items-center justify-between gap-2"
                          >
                            <div
                              onClick={() => openExamModal(doc, 'pdf_reader')}
                              className="min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="text-xs font-mono font-bold text-[#FFB8E6]">{doc.subject}</div>
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
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[13px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
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
                            className="p-2.5 rounded-xl bg-[#0B0911] hover:bg-[#14121d] border border-[#1d1a29] cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-bold text-amber-300">{doc.subject}</div>
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

                {/* 1-Click Exam Track Filter Matrix */}
                <div className="pt-3 border-t border-[#1d1a29] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/55">
                    <span>Phân ban đề nhanh</span>
                    <span>1 chạm mở kho</span>
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
                        className={`px-3 py-2 rounded-xl bg-[#0B0911] hover:bg-[#14121d] border border-[#1d1a29] hover:border-[#422039] text-left text-[13px] font-bold ${track.tone} transition-colors cursor-pointer`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academic Summary */}
                <div className="pt-3 border-t border-[#1d1a29] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/55">
                      Phạm vi kho học liệu
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      100% Miễn phí
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[13px] text-white/70 font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans text-white/55">Cấp học:</span>
                      <span className="text-white font-bold">THCS &amp; THPT (Lớp 6–12)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-white/55">Định dạng:</span>
                      <span className="text-emerald-400 font-bold">PDF, Word &amp; Đáp án</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-white/55">Cộng đồng:</span>
                      <span className="text-[#FFB8E6] font-bold">Orbit | Vietnam</span>
                    </div>
                  </div>
                </div>
              </SpotSurface>
            </div>

            {/* ===================================================================== */}
            {/* ZONE 4: BẢNG VÀNG HỌC THUẬT ORBIT (TOP TÁC GIẢ ĐÓNG GÓP & LUYỆN ĐỀ)   */}
            {/* ===================================================================== */}
            <SpotSurface className="hh-hub-surface p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1d1a29] pb-3.5">
                <div>
                  <div className="text-[13px] font-semibold text-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bảng vàng học thuật liên thông Discord ↔ Web</span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                    Vinh Danh Tác Giả Đóng Góp Tài Liệu &amp; Học Giả Luyện Đề
                  </h3>
                </div>
              </div>

              {(() => {
                const sortedScholars = [...leaderboardList].sort(
                  (a, b) => b.docs_contributed - a.docs_contributed || b.exams_completed - a.exams_completed
                );
                const topScholars = sortedScholars.slice(0, 5);

                return (
                  <div className="space-y-2.5">
                    {topScholars.map((scholar, idx) => {
                      const isTop1 = idx === 0;
                      return (
                        <div
                          key={`scholar-${scholar.discord_id}-${idx}`}
                          className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isTop1
                              ? 'bg-[#1a1510] border-[#3d2e18]'
                              : 'bg-[#0B0911] border-[#1d1a29]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-black shrink-0 tabular-nums ${
                                isTop1
                                  ? 'bg-amber-400 text-black'
                                  : 'bg-[#171522] text-white/80 border border-[#242033]'
                              }`}
                            >
                              Hạng #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-sm sm:text-base text-white truncate">
                                  {scholar.display_name || scholar.username}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-[#181622] text-[#FFB8E6] border border-[#262235] font-semibold">
                                  Thành viên Orbit
                                </span>
                              </div>
                              <div className="text-[13px] font-mono text-white/55 flex flex-wrap items-center gap-3 mt-1 tabular-nums">
                                <span>Đề đã luyện: {scholar.exams_completed}</span>
                                <span>• Pomodoro: {scholar.pomodoro_count || 0} phiên</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1d1a29]">
                            <span className="text-xs text-white/45 sm:hidden">Tài liệu đóng góp</span>
                            <span className="font-mono text-base sm:text-lg font-black text-emerald-300 tabular-nums">
                              {scholar.docs_contributed} đề đóng góp
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </SpotSurface>
          </div>
        )}

        {/* TAB 02: COURSES — TRUNG TÂM KHÓA HỌC ORBIT (ĐỒNG BỘ REPO KHOAHOC) */}
        {activeTab === 'courses' && !hubLocked && (
          <div key="tab-courses" className="hh-swap-panel">
            <CoursesHub
              onOpenExamVaultForSubject={(subjectCode) => {
                setSelectedSubject(subjectCode);
                setShowBookmarksOnly(false);
                handleTabChange('vault');
              }}
            />
          </div>
        )}

        {/* TAB 02B: FORUM — DIỄN ĐÀN THẢO LUẬN 2 CHIỀU ĐỒNG BỘ DISCORD #💡・diễn-đàn */}
        {activeTab === 'forum' && !hubLocked && (
          <div key="tab-forum" className="hh-swap-panel">
            <ForumHub user={user} onRequireAuth={onOpenAuthModal} />
          </div>
        )}

        {/* TAB 04: GET_EXAM */}
        {activeTab === 'get_exam' && !hubLocked && (
          <div key="tab-get-exam" className="space-y-6 hh-swap-panel">
            <SpotSurface className="hh-hub-surface p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1d1a29] pb-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
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
                    disabled={isLoadingExam}
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

              {/* Thông báo gọn nếu chưa liên kết Discord */}
              {!user && (
                <div className="p-3.5 rounded-xl bg-[#0B0911] border border-[#1d1a29] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2.5 text-white/75">
                    <CheckCircle2 className="w-4 h-4 text-[#FFB8E6] shrink-0" />
                    <span>
                      Bạn có thể bốc đề &amp; đọc PDF hoàn toàn tự do. Liên kết tài khoản Discord để nhận Credit vĩnh viễn và Role ✍️ Tác giả khi đóng góp đề!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold shrink-0 cursor-pointer"
                  >
                    Liên kết Discord
                  </button>
                </div>
              )}
            </SpotSurface>

            {/* KẾT QUẢ ĐỀ THI VỪA QUAY ĐƯỢC */}
            {currentExam && (
              <SpotSurface className="hh-hub-surface p-6 sm:p-8 border-[#422039] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] px-2.5 py-1 rounded bg-emerald-400 text-black font-bold">
                      Đề đã sẵn sàng
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[13px] font-black bg-[#201833] text-[#E2D4FF] border border-[#32244d]">
                      {currentExam.subject}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[13px] font-bold bg-[#171522] text-white">
                      {currentExam.estimated_level}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-[13px] font-mono bg-[#14121d] text-white/80">
                      {currentExam.page_count || 1} trang • {formatFileSize(currentExam.file_size_bytes)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleInstantPracticePick}
                    className="px-3 py-1.5 rounded-lg bg-[#171522] hover:bg-[#221e30] text-[13px] font-bold text-[#FFB8E6] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Quay đề khác</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {currentExam.title || currentExam.file_name}
                  </h2>
                  {(() => {
                    const cDesc = getExamDescriptionInfo(currentExam);
                    return (
                      <div className="px-3 py-2 rounded-xl bg-[#14111f] border border-[#241d38] text-[13px] text-white/80 leading-relaxed">
                        <span className="font-extrabold text-[#FFB8E6]">{cDesc.shortLabel}</span>
                        <span className="text-white/45 mx-1.5">—</span>
                        <span>{cDesc.bodyDescription}</span>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/50 font-mono mt-1">
                    <span>Tệp gốc: {currentExam.file_name}</span>
                    <span>•</span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200">
                      {currentExam.author_avatar ? (
                        <img
                          src={currentExam.author_avatar}
                          alt={currentExam.author_name || 'Contributor'}
                          className="w-4 h-4 rounded-full object-cover border border-purple-400/40 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                          }}
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                          👤
                        </span>
                      )}
                      <span className="text-[12px] text-purple-300">Đóng góp bởi:</span>
                      <strong className="text-[12px] text-white font-bold">{currentExam.author_name || 'Admin'}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <PixelButton
                    variant="primary"
                    onClick={() => openExamModal(currentExam, 'pdf_reader')}
                    icon={<BookOpen className="w-4 h-4" />}
                  >
                    Đọc Đề PDF Trực Tiếp
                  </PixelButton>

                  <PixelButton
                    variant="ghost"
                    onClick={() => openExamModal(currentExam, 'practice_room')}
                    icon={<PenTool className="w-4 h-4 text-emerald-400" />}
                  >
                    Mở Phòng Thi Thực Chiến
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
                <div className="text-[13px] font-semibold text-[#C4A6FF] mb-1">
                  Orbit | Vietnam · Kho lưu trữ đề thi
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
                  <span>{showBookmarksOnly ? 'Tủ Sách Ôn Luyện Của Tôi' : 'Kho Đề Thi Thực Chiến'}</span>
                  <span className="font-mono tabular-nums text-[13px] sm:text-sm px-3 py-1 rounded-xl bg-[#201833] border border-[#32244d] text-[#E2D4FF]">
                    {displayedDocuments.length} đề
                  </span>
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle: Cards vs High-Density Table */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0911] border border-[#1d1a29]">
                  <button
                    type="button"
                    onClick={() => setVaultViewMode('cards')}
                    className={`px-2.5 py-1 rounded-lg text-[13px] font-mono font-bold cursor-pointer transition-colors ${
                      vaultViewMode === 'cards'
                        ? 'bg-[#291524] text-[#FFB8E6] border border-[#422039]'
                        : 'text-white/55 hover:text-white'
                    }`}
                  >
                    Dạng Thẻ
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg text-[13px] font-mono font-bold cursor-pointer transition-colors ${
                      vaultViewMode === 'table'
                        ? 'bg-[#291524] text-[#FFB8E6] border border-[#422039]'
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
                    className="p-6 rounded-xl hh-hub-surface space-y-4"
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
                  <div className="p-4 rounded-xl hh-hub-surface flex flex-col sm:flex-row items-center justify-between gap-3">
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
                      ? 'Hãy nhấn biểu tượng ngôi sao trên các thẻ đề thi để lưu vào Tủ Sách ôn luyện.'
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
            <SpotSurface className="hh-hub-surface p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Đóng Góp Đề Thi &amp; Tài Liệu Học Tập
                  </h1>
                  <p className="text-[13px] sm:text-sm text-white/65 mt-1 max-w-2xl">
                    Chia sẻ đề thi hoặc chuyên đề ôn tập (PDF, DOCX, TXT, Google Drive) để đóng góp cho cộng đồng và nhận vinh danh Credit Tác giả vĩnh viễn.
                  </p>
                </div>
              </div>
            </SpotSurface>

            <Suspense
              fallback={
                <div className="p-8 text-center text-[13px] text-white/50">Đang mở cổng đóng góp tài liệu...</div>
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
              <SpotSurface className="hh-hub-surface rounded-xl p-6 sm:p-10 text-center max-w-2xl mx-auto my-8 space-y-5">
                <div className="w-14 h-14 rounded-xl bg-[#181622] border border-[#242033] flex items-center justify-center text-[#FFA8DC] mx-auto">
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
            showSuccess('Đã lưu đề thi vào Tủ Sách Cá Nhân!', 'Tủ Sách');
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
