import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  LogOut,
  X,
  UploadCloud,
  Dices,
  Star,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Sparkles,
  BarChart3,
  List,
  LayoutGrid,
  Eye,
  ChevronRight,
  School,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken } from '../utils/discordAuth';
import { getApiBaseUrl, API_FETCH_HEADERS } from '../utils/apiConfig';
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

// Visual theme metadata per subject
const SUBJECT_METAS: Record<
  string,
  { label: string; badge: string; accentColor: string; bgSoft: string; icon: string }
> = {
  ALL: {
    label: 'Tất Cả Môn',
    badge: 'bg-white/10 text-white border-white/20',
    accentColor: '#A855F7',
    bgSoft: 'from-purple-950/40 to-slate-900/60',
    icon: '🌐',
  },
  MATHEMATICS: {
    label: 'Toán Học',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    accentColor: '#3B82F6',
    bgSoft: 'from-blue-950/40 to-slate-900/60',
    icon: '📐',
  },
  LITERATURE: {
    label: 'Ngữ Văn',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    accentColor: '#F43F5E',
    bgSoft: 'from-rose-950/40 to-slate-900/60',
    icon: '📖',
  },
  ENGLISH: {
    label: 'Tiếng Anh',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    accentColor: '#A855F7',
    bgSoft: 'from-purple-950/40 to-slate-900/60',
    icon: '🇬🇧',
  },
  INFORMATICS: {
    label: 'Tin Học',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    accentColor: '#F59E0B',
    bgSoft: 'from-amber-950/40 to-slate-900/60',
    icon: '💻',
  },
  PHYSICS: {
    label: 'Vật Lí',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    accentColor: '#06B6D4',
    bgSoft: 'from-cyan-950/40 to-slate-900/60',
    icon: '⚡',
  },
  CHEMISTRY: {
    label: 'Hóa Học',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    accentColor: '#10B981',
    bgSoft: 'from-emerald-950/40 to-slate-900/60',
    icon: '🧪',
  },
  BIOLOGY: {
    label: 'Sinh Học',
    badge: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    accentColor: '#84CC16',
    bgSoft: 'from-lime-950/40 to-slate-900/60',
    icon: '🧬',
  },
  HISTORY: {
    label: 'Lịch Sử',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    accentColor: '#F97316',
    bgSoft: 'from-orange-950/40 to-slate-900/60',
    icon: '🏛️',
  },
  GENERAL: {
    label: 'Tổng Hợp / ĐGNL',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    accentColor: '#6366F1',
    bgSoft: 'from-indigo-950/40 to-slate-900/60',
    icon: '🧭',
  },
};

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

function formatGradeBadge(level: string): { label: string; dot: string } {
  if (!level) return { label: 'Chung', dot: 'bg-slate-400' };
  if (level.includes('Lớp 12') || level.includes('Khối 12') || level.includes('Ôn thi ĐH') || level.includes('THPT')) {
    return { label: 'Khối 12 • THPTQG', dot: 'bg-rose-500' };
  }
  if (level.includes('Lớp 11')) return { label: 'Khối 11', dot: 'bg-purple-500' };
  if (level.includes('Lớp 10') || level.includes('Tuyển sinh 10')) return { label: 'Khối 10', dot: 'bg-blue-500' };
  if (level.includes('HSG') || level.includes('Olympic') || level.includes('chuyên')) {
    return { label: 'Đội Tuyển HSG', dot: 'bg-amber-400' };
  }
  return { label: 'Phổ Thông', dot: 'bg-emerald-400' };
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
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin'>(
    initialTab
  );

  const handleTabChange = useCallback(
    (tab: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin') => {
      sound.playClick();
      setActiveTab(tab);
      if (onTabChange) onTabChange(tab);
    },
    [onTabChange]
  );

  // Documents state
  const [documents, setDocuments] = useState<ExamDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [selectedDossierDoc, setSelectedDossierDoc] = useState<ExamDocument | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  // Admin status
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'pages' | 'questions' | 'name'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Roulette & Stopwatch states
  const [rouletteSubject, setRouletteSubject] = useState<string>('ALL');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winnerDoc, setWinnerDoc] = useState<ExamDocument | null>(null);

  const [timerPresetMinutes, setTimerPresetMinutes] = useState<number>(90);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number>(90 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSoundAlert, setTimerSoundAlert] = useState<boolean>(false);

  // 1. Fetch Turso Data
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const rows = await fetchDocsFromTurso(5000, 0);
      if (rows && rows.length > 0) {
        const parsed: ExamDocument[] = rows.map((r: any) => ({
          id: Number(r.id),
          subject: (r.subject || 'GENERAL').toUpperCase(),
          title: r.title || r.file_name || 'Tài Liệu Đề Thi',
          file_name: r.file_name || 'document.pdf',
          file_size_bytes: Number(r.file_size_bytes || 0),
          file_type: r.file_type || 'EXAM_TEST',
          estimated_level: r.estimated_level || 'Chung',
          question_count: Number(r.question_count || 0),
          page_count: Number(r.page_count || 1),
          author_name: r.author_name || 'Ban Học Tập',
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
      console.warn('Lỗi tải dữ liệu Turso:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = getBookmarkedExamIds();
      setBookmarkedIds(new Set(saved));
    } catch {}
    fetchDocuments();
  }, [fetchDocuments]);

  // Check admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = getDiscordAccessToken();
        const headers: Record<string, string> = { ...API_FETCH_HEADERS };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${apiBase}/api/admin/check`, { headers, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.is_admin) setIsAdmin(true);
        }
      } catch {}
    };
    checkAdmin();
  }, [apiBase]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        sound.playClick();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Timer Tick
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          sound.playRouletteWin();
          showSuccess('Hết giờ làm bài thi thử!');
          return 0;
        }
        if (prev === 300 && !timerSoundAlert) {
          sound.playChime();
          setTimerSoundAlert(true);
          showInfo('Chú ý: Còn đúng 5 phút để hoàn thành và nộp bài!');
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSoundAlert, showInfo, showSuccess]);

  // Subject document counts
  const subjectCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: documents.length };
    documents.forEach((d) => {
      const s = d.subject.toUpperCase();
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    let list = [...documents];

    if (showBookmarksOnly) {
      list = list.filter((d) => bookmarkedIds.has(d.id));
    }

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

    if (selectedSubject !== 'ALL') {
      list = list.filter((d) => d.subject.toUpperCase() === selectedSubject);
    }

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

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortBy === 'pages') return (b.page_count || 0) - (a.page_count || 0);
      if (sortBy === 'questions') return (b.question_count || 0) - (a.question_count || 0);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
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
    const isNow = toggleBookmarkExam(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isNow) next.add(id);
      else next.delete(id);
      return next;
    });
    if (isNow) showSuccess('Đã lưu đề thi vào Tủ Sách cá nhân!');
    else showInfo('Đã bỏ lưu đề thi.');
  };

  const handleSpinRoulette = () => {
    if (isSpinning || documents.length === 0) return;
    let pool = documents;
    if (rouletteSubject !== 'ALL') {
      pool = documents.filter((d) => d.subject.toUpperCase() === rouletteSubject);
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

  const timerMins = Math.floor(timerSecondsRemaining / 60);
  const timerSecs = timerSecondsRemaining % 60;
  const timerPercent = Math.max(0, Math.min(100, ((timerPresetMinutes * 60 - timerSecondsRemaining) / (timerPresetMinutes * 60)) * 100));

  return (
    <div className="min-h-screen w-full bg-[#07080D] text-[#F8FAFC] flex flex-col font-sans selection:bg-purple-500/30">
      
      {/* ========================================================================= */}
      {/* 1. TOP BENTO COMMAND DOCK (Full Width Control Bar)                        */}
      {/* ========================================================================= */}
      <header className="sticky top-13 sm:top-14 z-40 w-full bg-[#07080D]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Live Status & Search Command Trigger */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[11px] font-mono font-bold text-white tracking-wide">
                TURSO // {documents.length || 179} ĐỀ THI
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setIsCommandPaletteOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F121E] hover:bg-[#161B2E] border border-white/[0.08] text-[#94A3B8] hover:text-white transition-all text-xs cursor-pointer shadow-sm group"
            >
              <Search className="w-3.5 h-3.5 text-[#7C3AED] group-hover:scale-110 transition-transform" />
              <span>Tìm kiếm nhanh...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.06] rounded border border-white/[0.08] text-[#64748B]">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Center: Sliding Segmented Control Tabs */}
          <nav className="flex items-center gap-1 p-1 rounded-2xl bg-[#0B0D15] border border-white/[0.08] overflow-x-auto no-scrollbar shadow-inner">
            <button
              onClick={() => handleTabChange('overview')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Bàn Làm Việc</span>
            </button>

            <button
              onClick={() => {
                setShowBookmarksOnly(false);
                handleTabChange('vault');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'vault' && !showBookmarksOnly
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kho Đề Thi</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20 text-white">
                {documents.length || 179}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('get_exam')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'get_exam'
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
              <span>Bấm Giờ Thi</span>
            </button>

            <button
              onClick={() => handleTabChange('submit_doc')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'submit_doc'
                  ? 'btn-liquid-glass text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nộp Tài Liệu</span>
              <span className="sm:hidden">Nộp</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quản Trị</span>
              </button>
            )}
          </nav>

          {/* Right: Bookmarks Quick Pill & User Avatar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setShowBookmarksOnly((prev) => !prev);
                if (activeTab !== 'vault') handleTabChange('vault');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showBookmarksOnly && activeTab === 'vault'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/40'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] text-[#94A3B8] border-white/[0.08]'
              }`}
              title="Tủ sách đề thi đã lưu"
            >
              <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current text-amber-400' : 'text-amber-400/80'}`} />
              <span className="hidden sm:inline">Tủ Sách</span>
              <span className="text-[10px] font-mono px-1 rounded bg-white/10 text-white">
                {bookmarkedIds.size}
              </span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-purple-500/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <button
                  onClick={onLogout}
                  className="text-[11px] text-[#64748B] hover:text-rose-400 transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 rounded-xl text-xs font-bold btn-liquid-glass text-white cursor-pointer"
              >
                Đăng Nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN BENTO WORKSPACE                                                   */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-4 space-y-6">

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 1: BÀN LÀM VIỆC (ASYMMETRIC BENTO COCKPIT)                          */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            
            {/* Top Row: Welcome Banner with Quick Metrics */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#121324] via-[#0F111D] to-[#0A0C14] border border-white/[0.08] shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/30">
                    <Sparkles className="w-3 h-3" />
                    <span>HỆ SINH THÁI ĐỀ THI SỐ HÓA // GDPT 2018 & 2025</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    Xin chào{user ? `, ${user.global_name || user.username}` : ''}!
                  </h1>
                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                    Khám phá kho đề thi thực chiến chính thức đã qua thẩm định DocInspector, bấm giờ phòng thi chuẩn Bộ GD&ĐT và theo dõi tiến độ cá nhân.
                  </p>
                </div>

                {/* Telemetry Stats Pills */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                  <div className="p-4 rounded-2xl bg-[#080912]/80 border border-white/[0.08] min-w-[130px]">
                    <div className="text-[11px] font-mono text-[#64748B]">TỔNG ĐỀ THI</div>
                    <div className="text-2xl font-black text-white mt-1">179<span className="text-purple-400">+</span></div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">● Đã kiểm định</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#080912]/80 border border-white/[0.08] min-w-[130px]">
                    <div className="text-[11px] font-mono text-[#64748B]">KHỐI MÔN HỌC</div>
                    <div className="text-2xl font-black text-white mt-1">09</div>
                    <div className="text-[10px] text-[#5B8CFF] mt-0.5">Trọng tâm thi THPT</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#080912]/80 border border-white/[0.08] min-w-[130px]">
                    <div className="text-[11px] font-mono text-[#64748B]">ĐỘ TRỄ TURSO</div>
                    <div className="text-2xl font-black text-emerald-400 mt-1">&lt;40ms</div>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5">LibSQL Cloud</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Asymmetric Bento Grid: 12-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Bento Cell 1: Live Interactive Subject Radar (Col 8) */}
              <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-[#0E101D] border border-white/[0.08] space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#7C3AED]" />
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Ma Trận Phân Bổ Môn Học (Bấm Để Lọc Nhanh)
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B]">179 Tài Liệu</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.keys(SUBJECT_METAS)
                    .filter((code) => code !== 'ALL')
                    .map((code) => {
                      const meta = SUBJECT_METAS[code];
                      const count = subjectCounts[code] || 0;
                      return (
                        <div
                          key={code}
                          onClick={() => {
                            sound.playClick();
                            setSelectedSubject(code);
                            handleTabChange('vault');
                          }}
                          className={`p-3.5 rounded-2xl bg-gradient-to-br ${meta.bgSoft} border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{meta.icon}</span>
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white group-hover:bg-white/20 transition-colors">
                              {count} đề
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                              {meta.label}
                            </div>
                            <div className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                              <span>Xem thư viện</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Bento Cell 2: Quick Exam Stopwatch Cockpit (Col 4) */}
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-[#0E101D] border border-white/[0.08] flex flex-col justify-between space-y-4 shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#EC4899]" />
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Đồng Hồ Canh Giờ Làm Bài
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">
                      CHRONO
                    </span>
                  </div>

                  <div className="my-5 text-center">
                    <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                      {String(timerMins).padStart(2, '0')}:{String(timerSecs).padStart(2, '0')}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] mt-1">
                      {isTimerRunning ? 'Đang bấm giờ thi...' : 'Sẵn sàng bắt đầu'}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-4">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${timerPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[50, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => {
                          sound.playClick();
                          setTimerPresetMinutes(mins);
                          setIsTimerRunning(false);
                          setTimerSecondsRemaining(mins * 60);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          timerPresetMinutes === mins
                            ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40'
                            : 'bg-white/[0.03] text-[#94A3B8] hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsTimerRunning((prev) => !prev);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isTimerRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'btn-liquid-glass text-white shadow-lg'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Tạm Dừng</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Bắt Đầu Làm Đề</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsTimerRunning(false);
                      setTimerSecondsRemaining(timerPresetMinutes * 60);
                      setTimerSoundAlert(false);
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.04] text-[#94A3B8] hover:text-white border border-white/[0.08] cursor-pointer"
                    title="Đặt lại giờ"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bento Cell 3: Quick Test Roulette Card (Col 5) */}
              <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#151224] to-[#0A0C16] border border-white/[0.08] flex flex-col justify-between space-y-4 shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <Dices className="w-4 h-4 text-[#7C3AED]" />
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Bốc Đề Thi Ngẫu Nhiên 1-Chạm
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      ROULETTE
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] mt-3">
                    Lựa chọn môn học hoặc để hệ thống quay ngẫu nhiên 1 đề thi thực chiến giúp bạn rèn luyện phản xạ.
                  </p>

                  <div className="mt-4">
                    <select
                      value={rouletteSubject}
                      onChange={(e) => setRouletteSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                    >
                      <option value="ALL">Mọi môn học ({documents.length} đề)</option>
                      {Object.keys(SUBJECT_METAS)
                        .filter((c) => c !== 'ALL')
                        .map((c) => (
                          <option key={c} value={c}>
                            {SUBJECT_METAS[c].label} ({subjectCounts[c] || 0} đề)
                          </option>
                        ))}
                    </select>
                  </div>

                  {winnerDoc && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-white/[0.03] border border-purple-500/30 space-y-2 animate-in zoom-in-95">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {winnerDoc.subject}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatGradeBadge(winnerDoc.estimated_level).label}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-1">
                        {winnerDoc.title}
                      </div>
                      <button
                        onClick={() => setSelectedDossierDoc(winnerDoc)}
                        className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Mở hồ sơ đề thi này</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSpinRoulette}
                  disabled={isSpinning || documents.length === 0}
                  className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white btn-liquid-glass cursor-pointer flex items-center justify-center gap-2"
                >
                  <Dices className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'Đang Quay Đề...' : 'Quay Đề Ngay'}</span>
                </button>
              </div>

              {/* Bento Cell 4: Top Featured Documents Carousel / List (Col 7) */}
              <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-[#0E101D] border border-white/[0.08] space-y-3 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Đề Thi Mới Cập Nhật Trong Kho
                    </h2>
                  </div>
                  <button
                    onClick={() => handleTabChange('vault')}
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem tất cả</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-white/[0.04]">
                  {documents.slice(0, 4).map((doc) => {
                    const meta = SUBJECT_METAS[doc.subject] || SUBJECT_METAS.GENERAL;
                    const grade = formatGradeBadge(doc.estimated_level);

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDossierDoc(doc)}
                        className="py-2.5 px-2 rounded-xl hover:bg-white/[0.02] flex items-center justify-between gap-3 cursor-pointer group transition-colors"
                      >
                        <div className="overflow-hidden flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded ${meta.badge}`}>
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              {grade.label}
                            </span>
                            {doc.school_or_department && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                • {doc.school_or_department}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-white group-hover:text-purple-300 truncate transition-colors">
                            {doc.title}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-[#64748B] hidden sm:inline">
                            {formatBytes(doc.file_size_bytes)}
                          </span>
                          <span className="p-1.5 rounded-lg bg-white/[0.04] text-[#94A3B8] group-hover:text-white group-hover:bg-purple-600/30 transition-all">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 2: THƯ VIỆN ĐỀ THI (DENSE BENTO VAULT & TABLE)                      */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === 'vault' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Filter Bar: Dense & Full Width */}
            <div className="p-4 rounded-3xl bg-[#0E101D] border border-white/[0.08] space-y-3.5 shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search Field */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm tên đề, môn học, năm học, trường ra đề (VD: Sở Bắc Giang, Toán 12...)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#07080D] border border-white/[0.08] text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters & View Switcher */}
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      sound.playClick();
                      setSelectedGrade(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 md:flex-none px-3 py-2.5 rounded-xl bg-[#07080D] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
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
                    className="flex-1 md:flex-none px-3 py-2.5 rounded-xl bg-[#07080D] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="pages">Nhiều trang</option>
                    <option value="questions">Nhiều câu</option>
                    <option value="name">Tên A-Z</option>
                  </select>

                  {/* Grid / Table Toggle */}
                  <div className="flex items-center p-1 rounded-xl bg-[#07080D] border border-white/[0.08]">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setViewMode('grid');
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'bg-[#1C2035] text-white' : 'text-[#64748B] hover:text-white'
                      }`}
                      title="Chế độ Lưới"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setViewMode('table');
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'table' ? 'bg-[#1C2035] text-white' : 'text-[#64748B] hover:text-white'
                      }`}
                      title="Chế độ Bảng"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject Sliding Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {Object.keys(SUBJECT_METAS).map((code) => {
                  const meta = SUBJECT_METAS[code];
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
                          : 'bg-[#07080D] text-[#94A3B8] hover:text-white border border-white/[0.04]'
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

            {/* Results Counter Bar */}
            <div className="flex items-center justify-between px-2 text-xs text-[#94A3B8]">
              <div>
                Tìm thấy <strong className="text-white">{filteredDocuments.length}</strong> / {documents.length} đề thi
                {showBookmarksOnly && <span className="ml-2 text-amber-400 font-bold">(Đang lọc Tủ Sách Lưu)</span>}
              </div>
              <div className="font-mono text-[11px]">
                Trang {currentPage} / {totalPages}
              </div>
            </div>

            {/* Document Content List */}
            {isLoadingDocs ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-[#94A3B8]">Đang đồng bộ cơ sở dữ liệu Turso Cloud...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-[#0E101D] border border-white/[0.06] space-y-3">
                <BookOpen className="w-10 h-10 text-[#64748B] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-white">Không tìm thấy tài liệu phù hợp</h3>
                <p className="text-xs text-[#94A3B8]">Thử đổi từ khóa hoặc chọn "Tất Cả Môn".</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Bento Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginatedDocuments.map((doc) => {
                  const meta = SUBJECT_METAS[doc.subject] || SUBJECT_METAS.GENERAL;
                  const grade = formatGradeBadge(doc.estimated_level);
                  const isBookmarked = bookmarkedIds.has(doc.id);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedDossierDoc(doc);
                      }}
                      className="group p-5 rounded-3xl bg-[#0E101D] border border-white/[0.08] hover:border-purple-500/40 transition-all flex flex-col justify-between cursor-pointer relative shadow-lg hover:shadow-purple-950/20"
                    >
                      <div className="space-y-3">
                        {/* Header Badges & Bookmark */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${meta.badge}`}>
                              {meta.label}
                            </span>
                            <span className="text-[10px] font-mono text-[#94A3B8] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${grade.dot}`} />
                              <span>{grade.label}</span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleBookmark(doc.id, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-white/[0.02] text-[#64748B] hover:text-amber-400 border-white/[0.06]'
                            }`}
                            title={isBookmarked ? 'Bỏ lưu' : 'Lưu đề thi'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
                          </button>
                        </div>

                        {/* Document Title */}
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h3>

                        {/* School or Department if extracted */}
                        {doc.school_or_department && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                            <School className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="truncate">{doc.school_or_department}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Info & Actions */}
                      <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <span>{doc.page_count} trang</span>
                          <span>•</span>
                          <span>{formatBytes(doc.file_size_bytes)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playClick();
                              setSelectedDossierDoc(doc);
                            }}
                            className="p-1.5 rounded-lg bg-white/[0.04] text-[#94A3B8] hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {doc.jump_url && (
                            <a
                              href={doc.jump_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-white/[0.04] text-[#94A3B8] hover:text-[#5B8CFF] hover:bg-white/[0.08] transition-colors"
                              title="Mở bài đăng Discord gốc"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Dense Table View */
              <div className="rounded-3xl bg-[#0E101D] border border-white/[0.08] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#080912] border-b border-white/[0.08] text-[#64748B] font-mono text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Môn Học</th>
                        <th className="py-3 px-4">Tên Đề Thi</th>
                        <th className="py-3 px-4">Khối Lớp</th>
                        <th className="py-3 px-4">Trường / Sở GD</th>
                        <th className="py-3 px-4">Dung Lượng</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {paginatedDocuments.map((doc) => {
                        const meta = SUBJECT_METAS[doc.subject] || SUBJECT_METAS.GENERAL;
                        const grade = formatGradeBadge(doc.estimated_level);
                        const isBookmarked = bookmarkedIds.has(doc.id);

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setSelectedDossierDoc(doc)}
                            className="hover:bg-white/[0.02] cursor-pointer group transition-colors"
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${meta.badge}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-white group-hover:text-purple-300 max-w-md truncate">
                              {doc.title}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[#94A3B8]">
                              {grade.label}
                            </td>
                            <td className="py-3 px-4 text-[#94A3B8] max-w-xs truncate">
                              {doc.school_or_department || '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                              {formatBytes(doc.file_size_bytes)} ({doc.page_count}tr)
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleBookmark(doc.id, e)}
                                  className={`p-1.5 rounded-lg border ${
                                    isBookmarked
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-white/[0.02] text-[#64748B] hover:text-amber-400 border-white/[0.06]'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDossierDoc(doc)}
                                  className="p-1.5 rounded-lg bg-white/[0.04] text-[#94A3B8] hover:text-white"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => {
                    sound.playClick();
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0E101D] border border-white/[0.08] text-[#94A3B8] hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Trang Trước
                </button>

                <span className="text-xs font-mono text-[#94A3B8] px-3">
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    sound.playClick();
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0E101D] border border-white/[0.08] text-[#94A3B8] hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Trang Sau
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 3: BẤM GIỜ & LUYỆN ĐỀ (CHRONO FOCUS COCKPIT)                        */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === 'get_exam' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Big Stopwatch Cockpit (Col 7) */}
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#0E101D] border border-white/[0.08] flex flex-col justify-between space-y-6 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#EC4899]" />
                        <span>Phòng Thi Ảo // Bấm Giờ Canh Điểm</span>
                      </h2>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        Cấu hình khung giờ thi chuẩn Bộ GD&ĐT với cảnh báo chuông tự động trước 5 phút nộp bài.
                      </p>
                    </div>
                  </div>

                  {/* Giant Countdown Display */}
                  <div className="my-10 text-center space-y-3">
                    <div className="text-6xl sm:text-8xl font-mono font-black text-white tracking-wider drop-shadow-[0_0_25px_rgba(236,72,153,0.35)]">
                      {String(timerMins).padStart(2, '0')}:{String(timerSecs).padStart(2, '0')}
                    </div>
                    <div className="text-sm font-mono text-[#94A3B8]">
                      {isTimerRunning ? '● Đang thi trực tiếp' : '○ Đang tạm dừng / Chưa bắt đầu'}
                    </div>

                    <div className="w-full max-w-md mx-auto h-2 bg-white/[0.06] rounded-full overflow-hidden mt-6">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 transition-all duration-300"
                        style={{ width: `${timerPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { mins: 50, desc: 'Lý, Hóa, Sinh, Sử' },
                      { mins: 60, desc: 'Tiếng Anh THPT' },
                      { mins: 90, desc: 'Toán Học 50 câu' },
                      { mins: 120, desc: 'Ngữ Văn Tự Luận' },
                    ].map((item) => (
                      <button
                        key={item.mins}
                        onClick={() => {
                          sound.playClick();
                          setTimerPresetMinutes(item.mins);
                          setIsTimerRunning(false);
                          setTimerSecondsRemaining(item.mins * 60);
                          setTimerSoundAlert(false);
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                          timerPresetMinutes === item.mins
                            ? 'bg-[#EC4899]/15 border-[#EC4899]/50 shadow-md'
                            : 'bg-[#080912] border-white/[0.06] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <div className="text-sm font-black text-white">{item.mins} Phút</div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control Action Bar */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsTimerRunning((prev) => !prev);
                    }}
                    className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                      isTimerRunning
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'btn-liquid-glass text-white'
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-5 h-5 fill-current" />
                        <span>TẠM DỪNG LÀM BÀI</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span>BẮT ĐẦU TÍNH GIỜ</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsTimerRunning(false);
                      setTimerSecondsRemaining(timerPresetMinutes * 60);
                      setTimerSoundAlert(false);
                    }}
                    className="p-3.5 rounded-2xl bg-white/[0.04] text-[#94A3B8] hover:text-white border border-white/[0.08] cursor-pointer"
                    title="Đặt lại từ đầu"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Companion Exam Drawer & Roulette (Col 5) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-6 rounded-3xl bg-[#0E101D] border border-white/[0.08] space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                    <Dices className="w-4 h-4 text-[#7C3AED]" />
                    <h3 className="text-base font-bold text-white">Bốc Đề Cho Lượt Thi Này</h3>
                  </div>

                  <p className="text-xs text-[#94A3B8]">
                    Hệ thống sẽ lấy ngẫu nhiên 1 đề thi đúng môn bạn chọn để bạn mở làm bài song song với đồng hồ.
                  </p>

                  <div className="flex items-center gap-2">
                    <select
                      value={rouletteSubject}
                      onChange={(e) => setRouletteSubject(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-[#080912] border border-white/[0.08] text-xs text-white"
                    >
                      <option value="ALL">Mọi môn ({documents.length} đề)</option>
                      {Object.keys(SUBJECT_METAS)
                        .filter((c) => c !== 'ALL')
                        .map((c) => (
                          <option key={c} value={c}>
                            {SUBJECT_METAS[c].label} ({subjectCounts[c] || 0})
                          </option>
                        ))}
                    </select>

                    <button
                      onClick={handleSpinRoulette}
                      disabled={isSpinning}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs btn-liquid-glass text-white cursor-pointer"
                    >
                      {isSpinning ? 'Đang quay...' : 'Bốc Ngay'}
                    </button>
                  </div>

                  {winnerDoc && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-[#080912] border border-purple-500/40 space-y-2 mt-4">
                      <div className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                        Đề Thi Được Chọn
                      </div>
                      <div className="text-sm font-bold text-white">
                        {winnerDoc.title}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-2">
                        <span>{winnerDoc.page_count} trang • {formatBytes(winnerDoc.file_size_bytes)}</span>
                        <button
                          onClick={() => setSelectedDossierDoc(winnerDoc)}
                          className="font-bold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <span>Mở đề xem</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instruction Card */}
                <div className="p-5 rounded-3xl bg-[#080912] border border-white/[0.06] space-y-2 text-xs text-[#94A3B8]">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#EC4899]" />
                    <span>Quy Chuẩn Phòng Thi Ảo</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-[#64748B]">
                    <li>Khi còn 5 phút, âm thanh cảnh báo sẽ tự động phát.</li>
                    <li>Nên làm bài trên giấy hoặc file PDF tải về để rèn luyện tốc độ tô phiếu trắc nghiệm.</li>
                    <li>Sau khi hết giờ, hãy so sánh đáp án chi tiết trong hồ sơ thẩm định.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 4: NỘP TÀI LIỆU (INTAKE ZONE)                                       */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === 'submit_doc' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="pb-3 border-b border-white/[0.08]">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
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

        {/* ----------------------------------------------------------------------- */}
        {/* TAB 5: ADMIN (QUẢN TRỊ HỆ THỐNG)                                        */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
      {/* 3. MODALS & SPOTLIGHT COMMAND PALETTE                                     */}
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
