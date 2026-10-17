import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  LogOut,
  X,
  UploadCloud,
  Dices,
  Star,
  Clock,
  School,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Shuffle,
  Award,
  BarChart3,
  List,
  LayoutGrid,
} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken, getStoredDiscordUser } from '../utils/discordAuth';
import {
  getApiBaseUrl,
  API_FETCH_HEADERS,
} from '../utils/apiConfig';
import { DocUploadZone } from './DocUploadZone';
import { ExamDossierModal } from './ExamDossierModal';
import { CommandPalette } from './CommandPalette';
import { fetchDocsFromTurso } from '../utils/tursoClient';
import { getBookmarkedExamIds, toggleBookmarkExam } from '../utils/bookmarkStorage';
import { useToast } from '../context/ToastContext';
import { sound } from '../utils/audio';

// AdminPanel tải lười (lazy): chỉ tải khi có quyền admin
const AdminPanel = lazy(() =>
  import('./AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

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

export function getDocumentEducationLevel(doc: {
  estimated_level?: string;
  subject?: string;
  educational_level?: string;
}): 'CAP_2' | 'CAP_3' | 'CHUNG' {
  if (doc.educational_level === 'CAP_2') return 'CAP_2';
  if (doc.educational_level === 'CAP_3') return 'CAP_3';

  const level = (doc.estimated_level || '').toLowerCase();
  const subj = (doc.subject || '').toUpperCase();

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

interface DashboardProps {
  user: DiscordUser | null;
  initialTab?: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin';
  onTabChange?: (tab: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin') => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onBackToHome: () => void;
}

// Map Subject to visual metadata
const SUBJECT_CONFIG: Record<
  string,
  { label: string; badgeClass: string; barGradient: string }
> = {
  ALL: {
    label: 'Tất Cả Môn',
    badgeClass: 'bg-white/10 text-white border-white/20',
    barGradient: 'from-white/30 to-white/60',
  },
  ENGLISH: {
    label: 'Tiếng Anh',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    barGradient: 'from-purple-600 to-pink-500',
  },
  LITERATURE: {
    label: 'Ngữ Văn',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    barGradient: 'from-rose-500 to-pink-500',
  },
  MATHEMATICS: {
    label: 'Toán Học',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    barGradient: 'from-blue-600 to-cyan-500',
  },
  INFORMATICS: {
    label: 'Tin Học',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    barGradient: 'from-amber-500 to-yellow-400',
  },
  CHEMISTRY: {
    label: 'Hóa Học',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    barGradient: 'from-emerald-500 to-teal-400',
  },
  PHYSICS: {
    label: 'Vật Lý',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    barGradient: 'from-cyan-500 to-blue-400',
  },
  BIOLOGY: {
    label: 'Sinh Học',
    badgeClass: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    barGradient: 'from-lime-500 to-emerald-400',
  },
  HISTORY: {
    label: 'Lịch Sử',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    barGradient: 'from-orange-500 to-amber-400',
  },
  GENERAL: {
    label: 'Tổng Hợp / ĐGNL',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    barGradient: 'from-indigo-500 to-purple-500',
  },
};

function getSubjectMeta(code: string) {
  const normalized = (code || '').toUpperCase();
  return (
    SUBJECT_CONFIG[normalized] || {
      label: code || 'Tài Liệu',
      badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      barGradient: 'from-slate-600 to-slate-400',
    }
  );
}

function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateVi(isoString: string): string {
  if (!isoString) return 'Chưa rõ';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatGradeLabel(level: string): string {
  if (!level) return 'Chung';
  if (level.includes('Lớp 12') || level.includes('Khối 12') || level.includes('Ôn thi ĐH') || level.includes('THPT')) {
    return 'Khối 12 • THPTQG';
  }
  if (level.includes('Lớp 11')) return 'Khối 11';
  if (level.includes('Lớp 10') || level.includes('Tuyển sinh 10')) return 'Khối 10';
  if (level.includes('HSG') || level.includes('Olympic') || level.includes('chuyên')) {
    return 'Đội Tuyển HSG';
  }
  if (level.includes('Đại học')) return 'Đại Học';
  return 'Phổ Thông';
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  initialTab = 'overview',
  onTabChange,
  onOpenAuthModal,
  onLogout,
  onBackToHome,
}) => {
  const { showSuccess, showInfo } = useToast();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin'>(
    initialTab
  );

  // Sync tab change
  const handleTabChange = useCallback(
    (tab: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin') => {
      sound.playClick();
      setActiveTab(tab);
      if (onTabChange) onTabChange(tab);
    },
    [onTabChange]
  );

  // Documents State
  const [documents, setDocuments] = useState<ExamDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [selectedDossierDoc, setSelectedDossierDoc] = useState<ExamDocument | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Bookmarks State
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Admin Check State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminInfo, setAdminInfo] = useState<{ role_name?: string } | null>(null);

  // Filter State (Vault Tab)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'pages' | 'questions' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Roulette State (Get Exam Tab)
  const [rouletteSubject, setRouletteSubject] = useState<string>('ALL');
  const [rouletteGrade, setRouletteGrade] = useState<string>('ALL');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winnerDoc, setWinnerDoc] = useState<ExamDocument | null>(null);

  // Stopwatch / Practice Timer State
  const [timerPresetMinutes, setTimerPresetMinutes] = useState<number>(90);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number>(90 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerAlertTriggered, setTimerAlertTriggered] = useState<boolean>(false);

  // 1. Fetch Documents from Turso Cloud
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const rows = await fetchDocsFromTurso(5000, 0);
      if (rows && rows.length > 0) {
        const parsed: ExamDocument[] = rows.map((r: any) => ({
          id: r.id,
          subject: (r.subject || 'GENERAL').toUpperCase(),
          title: r.title || r.file_name || 'Tài Liệu Đề Thi',
          file_name: r.file_name || 'document.pdf',
          file_size_bytes: Number(r.file_size_bytes || 0),
          file_type: r.file_type || 'EXAM_TEST',
          estimated_level: r.estimated_level || 'Chung',
          question_count: Number(r.question_count || 0),
          page_count: Number(r.page_count || 1),
          author_name: r.author_name || 'Orbit Community',
          jump_url: r.jump_url || 'https://discord.com/',
          timestamp: r.timestamp || new Date().toISOString(),
          academic_year: r.academic_year || undefined,
          school_or_department: r.school_or_department || undefined,
          verdict: r.verdict,
          exam_track: r.exam_track,
          confidence: r.confidence,
          moet_2025_compliant: r.moet_2025_compliant === 1 || r.moet_2025_compliant === '1',
          has_answer_keys: r.has_answer_keys === 1 || r.has_answer_keys === '1',
          has_detailed_solutions: r.has_detailed_solutions === 1 || r.has_detailed_solutions === '1',
          file_hash: r.file_hash || undefined,
          notes: r.notes || undefined,
        }));
        setDocuments(parsed);
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu Turso trong Dashboard:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // 2. Initial Setup: Bookmarks & Docs
  useEffect(() => {
    try {
      const saved = getBookmarkedExamIds();
      setBookmarkedIds(new Set(saved));
    } catch {}
    fetchDocuments();
  }, [fetchDocuments]);

  // 3. Admin Check
  const checkAdminStatus = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const token = getDiscordAccessToken();
      const headers: Record<string, string> = { ...API_FETCH_HEADERS };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/api/admin/check`, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_admin) {
          setIsAdmin(true);
          setAdminInfo(data.admin || null);
        }
      }
    } catch {
      // Offline fallback check cached
      try {
        const raw = localStorage.getItem('hyperhub_admin_cache');
        if (raw) {
          const cached = JSON.parse(raw);
          const stored = getStoredDiscordUser();
          if (stored && cached.isAdmin && cached.userId === stored.id) {
            setIsAdmin(true);
          }
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus, user]);

  // 4. Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            setIsTimerRunning(false);
            sound.playRouletteWin();
            return 0;
          }
          if (prev === 5 * 60) {
            sound.playChime();
            setTimerAlertTriggered(true);
            setTimeout(() => setTimerAlertTriggered(false), 5000);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // 5. Subject Counts Dynamic Calculation
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: documents.length };
    documents.forEach((d) => {
      const s = d.subject.toUpperCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [documents]);

  // 6. Filter & Sort Documents for Vault
  const filteredDocuments = useMemo(() => {
    let list = [...documents];

    // Bookmarks only
    if (showBookmarksOnly) {
      list = list.filter((d) => bookmarkedIds.has(d.id));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = normalizeVietnamese(searchQuery);
      list = list.filter((d) => {
        const titleMatch = normalizeVietnamese(d.title).includes(q);
        const subjectMatch = normalizeVietnamese(d.subject).includes(q);
        const schoolMatch = d.school_or_department
          ? normalizeVietnamese(d.school_or_department).includes(q)
          : false;
        return titleMatch || subjectMatch || schoolMatch;
      });
    }

    // Subject
    if (selectedSubject !== 'ALL') {
      list = list.filter((d) => d.subject.toUpperCase() === selectedSubject);
    }

    // Grade
    if (selectedGrade !== 'ALL') {
      if (selectedGrade === '12') {
        list = list.filter(
          (d) =>
            d.estimated_level.includes('12') ||
            d.estimated_level.includes('THPT') ||
            d.estimated_level.includes('ĐH')
        );
      } else if (selectedGrade === '11') {
        list = list.filter((d) => d.estimated_level.includes('11'));
      } else if (selectedGrade === '10') {
        list = list.filter((d) => d.estimated_level.includes('10'));
      } else if (selectedGrade === 'HSG') {
        list = list.filter(
          (d) =>
            d.estimated_level.includes('HSG') ||
            d.estimated_level.includes('Olympic') ||
            d.estimated_level.includes('chuyên')
        );
      }
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === 'pages') {
        return (b.page_count || 0) - (a.page_count || 0);
      }
      if (sortBy === 'questions') {
        return (b.question_count || 0) - (a.question_count || 0);
      }
      if (sortBy === 'name') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [documents, searchQuery, selectedSubject, selectedGrade, sortBy, showBookmarksOnly, bookmarkedIds]);

  const totalPages = Math.ceil(filteredDocuments.length / pageSize) || 1;
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage]);

  const handleToggleBookmark = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playClick();
    const isNowBookmarked = toggleBookmarkExam(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isNowBookmarked) next.add(id);
      else next.delete(id);
      return next;
    });
    if (isNowBookmarked) {
      showSuccess('Đã lưu đề thi vào Tủ Sách cá nhân!');
    } else {
      showInfo('Đã bỏ lưu đề thi.');
    }
  };

  // 7. Roulette Spin Handler
  const handleSpinRoulette = () => {
    if (isSpinning || documents.length === 0) return;

    let pool = documents;
    if (rouletteSubject !== 'ALL') {
      pool = pool.filter((d) => d.subject.toUpperCase() === rouletteSubject);
    }
    if (rouletteGrade !== 'ALL') {
      if (rouletteGrade === '12') {
        pool = pool.filter((d) => d.estimated_level.includes('12') || d.estimated_level.includes('THPT'));
      } else if (rouletteGrade === '11') {
        pool = pool.filter((d) => d.estimated_level.includes('11'));
      } else if (rouletteGrade === '10') {
        pool = pool.filter((d) => d.estimated_level.includes('10'));
      } else if (rouletteGrade === 'HSG') {
        pool = pool.filter((d) => d.estimated_level.includes('HSG') || d.estimated_level.includes('chuyên'));
      }
    }

    if (pool.length === 0) pool = documents;

    setIsSpinning(true);
    setWinnerDoc(null);

    let count = 0;
    const maxSpins = 20;
    let delay = 50;

    const tick = () => {
      count++;
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setWinnerDoc(rand);
      sound.playTick();

      if (count < maxSpins) {
        if (count > 12) delay += 30;
        setTimeout(tick, delay);
      } else {
        setIsSpinning(false);
        sound.playRouletteWin();
      }
    };
    tick();
  };

  // 8. Exam Timer Presets
  const handleSelectTimerPreset = (mins: number) => {
    sound.playClick();
    setTimerPresetMinutes(mins);
    setIsTimerRunning(false);
    setTimerSecondsRemaining(mins * 60);
  };

  const timerMins = Math.floor(timerSecondsRemaining / 60);
  const timerSecs = timerSecondsRemaining % 60;
  const timerProgress = Math.max(0, Math.min(100, ((timerPresetMinutes * 60 - timerSecondsRemaining) / (timerPresetMinutes * 60)) * 100));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#0B0D14] text-[#F8FAFC]">
      {/* ========================================================================= */}
      {/* 1. MOBILE TABS DOCK (Lucian Sliding Pill Tabs - Gọn nhẹ, không che khuất)   */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full px-3 py-2.5 bg-[#0F121E]/90 border-b border-white/[0.08] backdrop-blur-md sticky top-14 z-30 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-lg">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'btn-liquid-glass text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white bg-white/[0.04]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Tổng Quan</span>
        </button>

        <button
          onClick={() => {
            setShowBookmarksOnly(false);
            handleTabChange('vault');
          }}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'vault' && !showBookmarksOnly
              ? 'btn-liquid-glass text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white bg-white/[0.04]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Kho Đề Thi</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
            {documents.length || 179}
          </span>
        </button>

        <button
          onClick={() => {
            setShowBookmarksOnly(true);
            handleTabChange('vault');
          }}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'vault' && showBookmarksOnly
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-[#94A3B8] hover:text-white bg-white/[0.04]'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${activeTab === 'vault' && showBookmarksOnly ? 'fill-current' : 'text-amber-400'}`} />
          <span>Tủ Sách ({bookmarkedIds.size})</span>
        </button>

        <button
          onClick={() => handleTabChange('get_exam')}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'get_exam'
              ? 'btn-liquid-glass text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white bg-white/[0.04]'
          }`}
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Bốc Đề & Giờ</span>
        </button>

        <button
          onClick={() => handleTabChange('submit_doc')}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'submit_doc'
              ? 'btn-liquid-glass text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white bg-white/[0.04]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Nộp Đề</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => handleTabChange('admin')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white'
                : 'text-amber-400 bg-amber-500/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quản Trị</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP SIDEBAR DOCK (Cyber Space Aesthetic, w-60)                       */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex lg:w-60 sticky top-14 h-[calc(100dvh-3.5rem)] bg-[#0B0D14]/95 border-r border-white/[0.08] backdrop-blur-xl flex-col justify-between shrink-0 p-3.5 z-20 shadow-2xl">
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Brand & Cloud Status */}
          <div className="flex items-center justify-between px-2 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-xs font-mono font-extrabold tracking-wider text-white">
                ORBIT // HUB
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#5B8CFF] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              TURSO
            </span>
          </div>

          {/* Navigation Pill Menu */}
          <nav className="flex flex-col gap-1.5 flex-1">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng Quan</span>
            </button>

            <button
              onClick={() => {
                setShowBookmarksOnly(false);
                handleTabChange('vault');
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vault' && !showBookmarksOnly
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#7C3AED]" />
                <span>Kho Đề Thi</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/10 text-white">
                {documents.length || 179}
              </span>
            </button>

            <button
              onClick={() => {
                setShowBookmarksOnly(true);
                handleTabChange('vault');
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vault' && showBookmarksOnly
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${activeTab === 'vault' && showBookmarksOnly ? 'fill-current' : 'text-amber-400'}`} />
                <span>Tủ Sách Lưu</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300">
                {bookmarkedIds.size}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('get_exam')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'get_exam'
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Dices className="w-4 h-4 text-[#EC4899]" />
              <span>Bốc Đề & Bấm Giờ</span>
            </button>

            <button
              onClick={() => handleTabChange('submit_doc')}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'submit_doc'
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Nộp Đề Thi Mới</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-600 text-white shadow-md'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Quản Trị</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  {adminInfo?.role_name || 'ADMIN'}
                </span>
              </button>
            )}

            <button
              onClick={onBackToHome}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer mt-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Trang Chủ</span>
            </button>
          </nav>
        </div>

        {/* Discord User Profile Card */}
        <div className="pt-3 border-t border-white/[0.08]">
          {user ? (
            <div className="p-2.5 rounded-xl bg-[#080912] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-purple-500/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="font-bold text-xs truncate text-white leading-tight">
                    {user.global_name || user.username}
                  </div>
                  <div className="text-[10px] text-[#64748B] truncate">
                    @{user.username}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.04]">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Đã kết nối</span>
                </span>

                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-[#64748B] hover:text-rose-400 transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Thoát</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#080912] border border-white/[0.06] space-y-2 text-center">
              <div className="flex items-center gap-2 justify-center text-xs text-[#94A3B8]">
                <UserCheck className="w-4 h-4 text-[#5B8CFF]" />
                <span>Khách vãng lai</span>
              </div>
              <button
                onClick={onOpenAuthModal}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white btn-liquid-glass cursor-pointer"
              >
                Kết Nối Discord
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE VIEW AREA                                               */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-3 pb-10 w-full max-w-[1600px] space-y-6">
        
        {/* ======================================================================= */}
        {/* TAB 1: OVERVIEW (Tổng Quan)                                             */}
        {/* ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Greeting Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/30 mb-2">
                  <Sparkles className="w-3 h-3" />
                  <span>ORBIT REPOSITORY // TELEMETRY HUB</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Chào mừng trở lại{user ? `, ${user.global_name || user.username}` : ''}!
                </h1>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                  Hệ thống số hóa 179+ bộ đề thi chính thức từ đám mây Turso libSQL. Different paths. One orbit.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono text-[#94A3B8] hover:text-white bg-[#111422] border border-white/[0.08] hover:border-[#5B8CFF]/50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-[#5B8CFF]" />
                  <span>Tìm kiếm...</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.06] rounded text-[#64748B]">Ctrl K</kbd>
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    fetchDocuments();
                    showInfo('Đang cập nhật dữ liệu từ đám mây...');
                  }}
                  title="Làm mới dữ liệu"
                  className="p-2.5 rounded-xl bg-[#111422] border border-white/[0.08] text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDocs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0F121E] border border-white/[0.07] relative overflow-hidden">
                <span className="text-xs font-mono text-[#64748B] block uppercase tracking-wider">
                  Tổng Đề Thi Số Hoá
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white mt-1">
                  {documents.length || 179}
                  <span className="text-[#EC4899] text-2xl">+</span>
                </div>
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  ● 100% Đã kiểm định DocInspector
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#0F121E] border border-white/[0.07] relative overflow-hidden">
                <span className="text-xs font-mono text-[#64748B] block uppercase tracking-wider">
                  Khối Môn Học Trọng Tâm
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white mt-1">
                  09
                </div>
                <span className="text-[11px] text-[#5B8CFF] mt-1 block">
                  Chuẩn chương trình GDPT mới
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#0F121E] border border-white/[0.07] relative overflow-hidden">
                <span className="text-xs font-mono text-[#64748B] block uppercase tracking-wider">
                  Tốc Độ Phản Hồi Turso
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 mt-1">
                  &lt;40ms
                </div>
                <span className="text-[11px] text-[#64748B] mt-1 block">
                  Tokyo aws-ap-northeast-1
                </span>
              </div>
            </div>

            {/* Subject Distribution Matrix */}
            <div className="p-6 rounded-2xl bg-[#0E101D] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#5B8CFF]" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    PHÂN BỔ ĐỀ THI THEO MÔN HỌC (BẤM ĐỂ LỌC)
                  </span>
                </div>
                <span className="text-xs font-mono text-[#64748B]">
                  Tổng {documents.length} đề thi
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(subjectCounts).map(([code, count]) => {
                  if (code === 'ALL') return null;
                  const meta = getSubjectMeta(code);
                  const pct = (((count as number) / (documents.length || 1)) * 100).toFixed(1);

                  return (
                    <div
                      key={code}
                      onClick={() => {
                        sound.playClick();
                        setSelectedSubject(code);
                        handleTabChange('vault');
                      }}
                      className="p-3 rounded-xl bg-[#080912] border border-white/[0.06] hover:border-[#EC4899]/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-white group-hover:text-[#5B8CFF] transition-colors">
                          {meta.label}
                        </span>
                        <span className="font-mono text-[#94A3B8]">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${meta.barGradient}`}
                          style={{ width: `${Math.max(6, parseFloat(pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => {
                  sound.playClick();
                  handleTabChange('vault');
                }}
                className="p-6 rounded-2xl bg-gradient-to-br from-[#141828] to-[#0A0C16] border border-white/[0.08] hover:border-[#7C3AED]/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#7C3AED]" />
                    <h3 className="text-base font-bold text-white group-hover:text-[#5B8CFF] transition-colors">
                      Kho Đề Thi Chuẩn Hóa
                    </h3>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Duyệt 179+ đề thi phân loại theo môn, khối lớp và tải file gốc trực tiếp.
                  </p>
                </div>
                <span className="p-2.5 rounded-xl bg-white/[0.04] text-white group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>

              <div
                onClick={() => {
                  sound.playClick();
                  handleTabChange('get_exam');
                }}
                className="p-6 rounded-2xl bg-gradient-to-br from-[#161224] to-[#0A0C16] border border-white/[0.08] hover:border-[#EC4899]/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Dices className="w-5 h-5 text-[#EC4899]" />
                    <h3 className="text-base font-bold text-white group-hover:text-[#EC4899] transition-colors">
                      Bốc Đề & Bấm Giờ Thi Thử
                    </h3>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Quay ngẫu nhiên 1 đề thi thực chiến và bấm giờ 50 - 90 phút có chuông báo.
                  </p>
                </div>
                <span className="p-2.5 rounded-xl bg-white/[0.04] text-white group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: VAULT (Kho Đề Thi)                                               */}
        {/* ======================================================================= */}
        {activeTab === 'vault' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header & Result Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Kho Đề Thi & Chuyên Đề</span>
                  {showBookmarksOnly && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Tủ Sách Lưu
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Tìm thấy <strong className="text-white">{filteredDocuments.length}</strong> / {documents.length} đề thi
                </p>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-[#080912] border border-white/[0.08]">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setViewMode('grid');
                    }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-[#1C2035] text-white' : 'text-[#64748B] hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setViewMode('table');
                    }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'table' ? 'bg-[#1C2035] text-white' : 'text-[#64748B] hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="p-3.5 rounded-2xl bg-[#0F121E] border border-white/[0.08] space-y-3">
              {/* Search input + Grade + Sort */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm tên đề, trường ra đề, tác giả..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      sound.playClick();
                      setSelectedGrade(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="ALL">Mọi khối lớp</option>
                    <option value="12">Khối 12 • THPTQG</option>
                    <option value="11">Khối 11</option>
                    <option value="10">Khối 10</option>
                    <option value="HSG">Đội tuyển HSG</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => {
                      sound.playClick();
                      setSortBy(e.target.value as any);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="pages">Nhiều trang</option>
                    <option value="questions">Nhiều câu</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                </div>
              </div>

              {/* Subject Sliding Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {Object.keys(SUBJECT_CONFIG).map((code) => {
                  const meta = SUBJECT_CONFIG[code];
                  const count = subjectCounts[code] || 0;
                  if (code !== 'ALL' && count === 0) return null;
                  const isActive = selectedSubject === code;

                  return (
                    <button
                      key={code}
                      onClick={() => {
                        sound.playClick();
                        setSelectedSubject(code);
                        setCurrentPage(1);
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'btn-liquid-glass text-white shadow-md'
                          : 'bg-[#080912] text-[#94A3B8] hover:text-white border border-white/[0.04]'
                      }`}
                    >
                      <span>{meta.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20' : 'bg-white/[0.06] text-[#64748B]'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document Content List */}
            {isLoadingDocs ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-[#94A3B8]">Đang kết nối kho đề Turso Cloud...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-[#0F121E] border border-white/[0.06] space-y-3">
                <BookOpen className="w-10 h-10 text-[#64748B] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-white">Không tìm thấy đề thi phù hợp</h3>
                <p className="text-xs text-[#94A3B8]">Thử đổi từ khóa hoặc chọn Tất Cả Môn.</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginatedDocuments.map((doc) => {
                  const meta = getSubjectMeta(doc.subject);
                  const isBookmarked = bookmarkedIds.has(doc.id);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedDossierDoc(doc);
                      }}
                      className="group p-5 rounded-2xl bg-[#0E101D] border border-white/[0.07] hover:border-[#7C3AED]/50 transition-all flex flex-col justify-between cursor-pointer relative shadow-sm"
                    >
                      <div className="space-y-3">
                        {/* Subject Badge & Grade & Bookmark Star */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono text-[#94A3B8] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                              {formatGradeLabel(doc.estimated_level)}
                            </span>
                          </div>

                          <button
                            onClick={(e) => handleToggleBookmark(doc.id, e)}
                            className="p-1 rounded-lg hover:bg-white/[0.08] text-[#64748B] hover:text-amber-400 transition-colors"
                          >
                            <Star className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-white group-hover:text-[#5B8CFF] transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h4>

                        {/* School or academic year if available */}
                        {doc.school_or_department && (
                          <div className="text-[11px] text-[#94A3B8] truncate flex items-center gap-1">
                            <School className="w-3.5 h-3.5 text-[#5B8CFF] shrink-0" />
                            <span className="truncate">{doc.school_or_department}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="pt-3 border-t border-white/[0.06] mt-4 flex items-center justify-between text-xs text-[#64748B] font-mono">
                        <div className="flex items-center gap-2">
                          <span>{doc.page_count || 1} trang</span>
                          <span>•</span>
                          <span>{formatBytes(doc.file_size_bytes)}</span>
                        </div>

                        <a
                          href={doc.jump_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.playChime();
                          }}
                          className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-white/[0.06]"
                          title="Mở bài đăng Discord"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table List View */
              <div className="rounded-2xl bg-[#0E101D] border border-white/[0.08] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#080912] text-[#64748B] font-mono uppercase tracking-wider border-b border-white/[0.06]">
                      <tr>
                        <th className="py-3 px-4">Môn</th>
                        <th className="py-3 px-4">Tên Đề Thi</th>
                        <th className="py-3 px-4">Khối</th>
                        <th className="py-3 px-4">Trang</th>
                        <th className="py-3 px-4">Dung Lượng</th>
                        <th className="py-3 px-4">Ngày</th>
                        <th className="py-3 px-4 text-right">Lưu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {paginatedDocuments.map((doc) => {
                        const meta = getSubjectMeta(doc.subject);
                        const isBookmarked = bookmarkedIds.has(doc.id);

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => {
                              sound.playClick();
                              setSelectedDossierDoc(doc);
                            }}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-white group-hover:text-[#5B8CFF] transition-colors max-w-sm truncate">
                              {doc.title}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-[#94A3B8]">
                              {formatGradeLabel(doc.estimated_level)}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#94A3B8] whitespace-nowrap">
                              {doc.page_count || 1}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                              {formatBytes(doc.file_size_bytes)}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                              {formatDateVi(doc.timestamp)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={(e) => handleToggleBookmark(doc.id, e)}
                                className="p-1 rounded text-[#64748B] hover:text-amber-400"
                              >
                                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-xs">
                <span className="text-[#64748B] font-mono">
                  Trang <strong className="text-white">{currentPage}</strong> / {totalPages}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setCurrentPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-[#111422] border border-white/[0.08] text-white disabled:opacity-30 cursor-pointer"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                    }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-[#111422] border border-white/[0.08] text-white disabled:opacity-30 cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: GET_EXAM (Bốc Đề & Bấm Giờ Thi Thử)                               */}
        {/* ======================================================================= */}
        {activeTab === 'get_exam' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Roulette Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0E101D] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/30 mb-2">
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>TEST ROULETTE // BỐC ĐỀ NGẪU NHIÊN</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    Bốc Một Đề Thi Thực Chiến
                  </h2>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#64748B] mb-1">MÔN HỌC</label>
                  <select
                    value={rouletteSubject}
                    onChange={(e) => setRouletteSubject(e.target.value)}
                    disabled={isSpinning}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white"
                  >
                    <option value="ALL">Tất Cả Các Môn</option>
                    <option value="MATHEMATICS">Toán Học</option>
                    <option value="ENGLISH">Tiếng Anh</option>
                    <option value="LITERATURE">Ngữ Văn</option>
                    <option value="PHYSICS">Vật Lý</option>
                    <option value="CHEMISTRY">Hóa Học</option>
                    <option value="INFORMATICS">Tin Học</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#64748B] mb-1">KHỐI LỚP</label>
                  <select
                    value={rouletteGrade}
                    onChange={(e) => setRouletteGrade(e.target.value)}
                    disabled={isSpinning}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white"
                  >
                    <option value="ALL">Mọi Khối Lớp</option>
                    <option value="12">Lớp 12 • THPTQG</option>
                    <option value="11">Lớp 11</option>
                    <option value="10">Lớp 10</option>
                    <option value="HSG">Đội Tuyển HSG</option>
                  </select>
                </div>
              </div>

              {/* Spin Button */}
              <button
                onClick={handleSpinRoulette}
                disabled={isSpinning}
                className="w-full py-4 rounded-xl text-sm font-bold text-white btn-liquid-glass flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Đang Lựa Chọn Đề Thi...' : 'QUAY ĐỀ THI NGAY'}</span>
              </button>

              {/* Winner Result */}
              {winnerDoc && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#161228] to-[#0A0C16] border border-[#EC4899]/50 shadow-xl space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>ĐÃ BỐC TRÚNG ĐỀ:</span>
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {winnerDoc.subject}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-2">
                    {winnerDoc.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setSelectedDossierDoc(winnerDoc)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white btn-cyber-outline cursor-pointer"
                    >
                      Xem Hồ Sơ Đề
                    </button>
                    <a
                      href={winnerDoc.jump_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white btn-liquid-glass cursor-pointer"
                    >
                      Làm Trên Discord
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Stopwatch Cockpit */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0E101D] border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/30 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>CHRONO COCKPIT // BẤM GIỜ THI THỬ CHUẨN BGD</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    Đồng Hồ Canh Giờ Làm Bài
                  </h2>
                </div>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { m: 50, label: '50 Phút', sub: 'Lý, Hóa, Sinh, Sử' },
                  { m: 60, label: '60 Phút', sub: 'Tiếng Anh THPTQG' },
                  { m: 90, label: '90 Phút', sub: 'Toán Học (50 câu)' },
                  { m: 120, label: '120 Phút', sub: 'Ngữ Văn Tự Luận' },
                ].map((p) => (
                  <button
                    key={p.m}
                    onClick={() => handleSelectTimerPreset(p.m)}
                    className={`p-3 rounded-xl text-center transition-all cursor-pointer ${
                      timerPresetMinutes === p.m
                        ? 'btn-liquid-glass text-white shadow-md'
                        : 'bg-[#080912] text-[#94A3B8] hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <strong className="block text-sm">{p.label}</strong>
                    <span className="text-[10px] text-[#64748B] block mt-0.5">{p.sub}</span>
                  </button>
                ))}
              </div>

              {/* Big Digital Display */}
              <div className={`p-8 rounded-2xl bg-[#07080D] border border-white/[0.06] flex flex-col items-center justify-center space-y-4 ${timerAlertTriggered ? 'ring-2 ring-[#EC4899] animate-bounce' : ''}`}>
                <div className="text-5xl sm:text-7xl font-mono font-black text-white">
                  <span className={isTimerRunning ? 'text-[#EC4899]' : 'text-white'}>
                    {String(timerMins).padStart(2, '0')}
                  </span>
                  <span className="text-[#64748B] animate-pulse">:</span>
                  <span className={isTimerRunning ? 'text-[#5B8CFF]' : 'text-white'}>
                    {String(timerSecs).padStart(2, '0')}
                  </span>
                </div>

                <div className="w-full max-w-md h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#EC4899] transition-all duration-1000"
                    style={{ width: `${timerProgress}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsTimerRunning(!isTimerRunning);
                    }}
                    className={`px-8 py-3 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 ${
                      isTimerRunning ? 'bg-amber-600 hover:bg-amber-500' : 'btn-liquid-glass'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isTimerRunning ? 'Tạm Dừng' : 'Bắt Đầu Làm Đề'}</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsTimerRunning(false);
                      setTimerSecondsRemaining(timerPresetMinutes * 60);
                    }}
                    className="p-3 rounded-xl bg-[#111422] border border-white/[0.08] text-[#94A3B8] hover:text-white cursor-pointer"
                    title="Đặt lại"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>Tự động phát chuông báo khi còn 5 phút nộp bài</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: SUBMIT_DOC (Kho Nộp Đề)                                          */}
        {/* ======================================================================= */}
        {activeTab === 'submit_doc' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-4 border-b border-white/[0.08]">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Kho Nộp Đề Thi & Chuyên Đề
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Tài liệu tải lên sẽ được engine DocInspector phân tích cấu trúc, nhận diện chữ (OCR) và đồng bộ trực tiếp lên đám mây Turso.
              </p>
            </div>

            <DocUploadZone
              apiBase={apiBase}
              user={user}
              onOpenAuthModal={onOpenAuthModal}
              onUploadSuccess={() => fetchDocuments()}
              onPreviewDoc={(doc) => setSelectedDossierDoc(doc)}
            />
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 5: ADMIN (Quản Trị Hệ Thống)                                        */}
        {/* ======================================================================= */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <Suspense
              fallback={
                <div className="py-20 text-center font-mono text-xs text-[#94A3B8]">
                  Đang nạp bảng điều khiển Quản Trị Hệ Thống...
                </div>
              }
            >
              <AdminPanel />
            </Suspense>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. MODALS & SPOTLIGHT COMMAND PALETTE                                     */}
      {/* ========================================================================= */}
      {selectedDossierDoc && (
        <ExamDossierModal
          doc={selectedDossierDoc}
          isOpen={true}
          onClose={() => setSelectedDossierDoc(null)}
          isBookmarked={bookmarkedIds.has(selectedDossierDoc.id)}
          onToggleBookmark={(id) => handleToggleBookmark(id)}
          apiBase={apiBase}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documents}
        onSelectExam={(doc) => setSelectedDossierDoc(doc)}
        onNavigateTab={(tab) => handleTabChange(tab)}
        onNavigateHome={onBackToHome}
        onTriggerRandomExam={() => {
          setIsCommandPaletteOpen(false);
          handleTabChange('get_exam');
          handleSpinRoulette();
        }}
      />
    </div>
  );
};

export default Dashboard;
