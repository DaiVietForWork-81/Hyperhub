import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Flame,
  Settings,
  X,
  Server,
  CheckCheck,
  Download,
  Filter,
  UploadCloud,
  Dices,
  Star,
} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken } from '../utils/discordAuth';
import {
  getApiBaseUrl,
  setCustomApiUrl,
  DEFAULT_TUNNEL_URL,
  LOCAL_API_URL,
  API_FETCH_HEADERS,
} from '../utils/apiConfig';
import { ExamCountdown } from './ExamCountdown';
import { DocUploadZone } from './DocUploadZone';
import { AdminPanel } from './AdminPanel';
import { formatEstimatedLevel, getExamTrackInfo } from '../utils/formatters';
import { getBookmarkedExamIds, toggleBookmarkExam } from '../utils/bookmarkStorage';

interface DashboardProps {
  user: DiscordUser | null;
  initialTab?: 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin';
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

interface ExamDocument {
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
  is_duplicate?: boolean;
  is_duplicate_copy?: boolean;
  original_id?: number | null;
  duplicate_count?: number;
}

// Danh mục Khối Lớp
const GRADE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Khối', subtitle: 'Tất cả lớp' },
  { id: '12', label: 'Lớp 12', subtitle: 'Ôn TN & ĐH' },
  { id: '11', label: 'Lớp 11', subtitle: 'THPT' },
  { id: '10', label: 'Lớp 10', subtitle: 'THPT' },
  { id: '9', label: 'Lớp 9', subtitle: 'Ôn Vào 10' },
  { id: '8', label: 'Lớp 8', subtitle: 'THCS' },
  { id: '7', label: 'Lớp 7', subtitle: 'THCS' },
  { id: '6', label: 'Lớp 6', subtitle: 'THCS' },
];

// Danh mục 5 Thể Loại Đề Thi Chuẩn Theo Yêu Cầu (Đề thường, Đề HSG, Đề chuyên, Đề quốc tế, Đề chung)
// Quy tắc độ khó: Đề thường < Đề HSG < Đề chuyên
const EXAM_TYPE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Thể Loại', badge: 'Tất cả ✨', icon: '✨', desc: 'Toàn bộ kho đề' },
  { id: 'THUONG', label: 'Đề Thường', badge: 'Cơ bản 📘', icon: '📘', desc: 'Đại trà, định kỳ, thi thử (thường < hsg < chuyên)' },
  { id: 'HSG', label: 'Đề HSG', badge: 'Nâng cao 🏅', icon: '🏅', desc: 'Học sinh giỏi cấp trường/tỉnh (thường < hsg < chuyên)' },
  { id: 'CHUYEN', label: 'Đề Chuyên', badge: 'Chuyên sâu 👑', icon: '👑', desc: 'Tuyển sinh 10 Chuyên, THPT Chuyên (cao nhất)' },
  { id: 'QUOC_TE', label: 'Đề Quốc Tế', badge: 'Quốc tế 🌍', icon: '🌍', desc: 'IMO, AMC, Kangaroo/IKMC, SASMO... (tiếng Việt & Anh)' },
  { id: 'CHUNG', label: 'Đề Chung', badge: 'Tổng hợp 📚', icon: '📚', desc: 'Đề cương, lý thuyết tổng hợp (dễ gây hiểu lầm)' },
];

// Danh mục Môn Học
const SUBJECT_OPTIONS = [
  { id: 'ALL', label: 'Tất Cả Các Môn', icon: '🌐' },
  { id: 'MATHEMATICS', label: 'Toán Học', icon: '📐' },
  { id: 'INFORMATICS', label: 'Tin Học / Lập Trình', icon: '💻' },
  { id: 'LITERATURE', label: 'Ngữ Văn', icon: '📖' },
  { id: 'ENGLISH', label: 'Tiếng Anh', icon: '🇬🇧' },
  { id: 'PHYSICS', label: 'Vật Lý', icon: '⚡' },
  { id: 'CHEMISTRY', label: 'Hóa Học', icon: '🧪' },
  { id: 'BIOLOGY', label: 'Sinh Học', icon: '🧬' },
  { id: 'HISTORY', label: 'Lịch Sử', icon: '🏛️' },
  { id: 'GEOGRAPHY', label: 'Địa Lý', icon: '🗺️' },
];

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
  onOpenAuthModal,
  onLogout,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin'>(
    initialTab || 'overview'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Quyền Quản trị viên (Admin)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminInfo, setAdminInfo] = useState<{
    role_name?: string;
    username?: string;
    user_id?: number | string;
  } | null>(null);

  const checkAdminStatus = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const token = getDiscordAccessToken();
      const headers: Record<string, string> = { ...API_FETCH_HEADERS };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/api/admin/check`, {
        headers,
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_admin) {
          setIsAdmin(true);
          setAdminInfo(data.admin || null);
          return;
        }
      }
      setIsAdmin(false);
      setAdminInfo(null);
    } catch {
      setIsAdmin(false);
      setAdminInfo(null);
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus, user]);

  const [botStatus, setBotStatus] = useState<BotStatus>({ online: false });
  const [isCheckingBot, setIsCheckingBot] = useState<boolean>(true);

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
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedExamType, setSelectedExamType] = useState<string>('ALL');
  const [descriptionKeyword, setDescriptionKeyword] = useState<string>('');

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

  // Danh sách đề thi được hiển thị (có lọc theo Tủ Sách Yêu Thích nếu được kích hoạt)
  const displayedDocuments = useMemo(() => {
    if (showBookmarksOnly) {
      return documentsList.filter((doc) => bookmarkedIds.has(doc.id));
    }
    return documentsList;
  }, [documentsList, showBookmarksOnly, bookmarkedIds]);

  // Trạng thái đề ngẫu nhiên được chọn
  const [isLoadingExam, setIsLoadingExam] = useState<boolean>(false);
  const [currentExam, setCurrentExam] = useState<ExamDocument | null>(null);
  const [examError, setExamError] = useState<string>('');

  // Endpoint Settings Modal State
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [customApiUrlInput, setCustomApiUrlInput] = useState<string>('');
  const [apiSaveMsg, setApiSaveMsg] = useState<string>('');

  // 1. Kiểm tra trạng thái Discord Bot
  const checkBotStatus = useCallback(async () => {
    setIsCheckingBot(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/status`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        setBotStatus({
          online: data.status === 'online',
          bot_user: data.bot_user,
          ping_ms: data.ping_ms,
          uptime_seconds: data.uptime_seconds,
          guilds_count: data.guilds_count,
        });
      } else {
        setBotStatus({ online: false });
      }
    } catch {
      setBotStatus({ online: false });
    } finally {
      setIsCheckingBot(false);
    }
  }, []);

  // 2. Lấy danh sách tất cả đề thi từ Kho Discord (Full List)
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
        const apiBase = getApiBaseUrl();
        const q = new URLSearchParams();
        q.set('limit', '100');

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

        const res = await fetch(`${apiBase}/api/documents?${q.toString()}`, {
          headers: API_FETCH_HEADERS,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.documents) {
            setDocumentsList(data.documents);
            setTotalDocsCount(data.total ?? data.documents.length);
          }
        }
      } catch (e) {
        console.error('Lỗi lấy danh sách đề thi:', e);
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [selectedGrade, selectedExamType, selectedSubject, descriptionKeyword, filterDup]
  );

  // 3. Lấy thống kê số lượng tài liệu
  const fetchDocStats = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/documents/stats`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats({
            total_real: data.total_real || data.total_items || 29,
            unique_items: data.unique_items || 28,
            duplicate_items: data.duplicate_items || 0,
          });
          setTotalDocsCount(data.total_real || data.total_items || 29);
        }
      }
    } catch {
      // Giữ mặc định nếu bot offline
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
      // Nếu danh sách hiện tại đã có đề, bốc ngẫu nhiên 1 đề từ danh sách lọc
      if (documentsList.length > 0) {
        const randomIndex = Math.floor(Math.random() * documentsList.length);
        setCurrentExam(documentsList[randomIndex]);
        window.scrollTo({ top: 350, behavior: 'smooth' });
        return;
      }

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
        window.scrollTo({ top: 350, behavior: 'smooth' });
      } else {
        setExamError(
          data.message ||
            'Không tìm thấy đề thi phù hợp với tiêu chí hiện tại. Hãy thử chọn môn học hoặc loại đề khác!'
        );
      }
    } catch (err: any) {
      setExamError(`Lỗi kết nối tới Bot phát đề: ${err.message || 'Hết thời gian chờ phản hồi'}`);
    } finally {
      setIsLoadingExam(false);
    }
  };

  const handleSaveApiUrl = () => {
    const input = customApiUrlInput.trim();
    if (input) {
      try {
        const parsed = new URL(input);
        const allowed = ['localhost', '127.0.0.1', 'phantasmagorically-occupative-gladys.ngrok-free.dev', 'hyperhub-one.vercel.app'];
        const isAllowed = allowed.some((h) => parsed.hostname === h || parsed.hostname.endsWith('.ngrok-free.dev'));
        if (!isAllowed) {
          setApiSaveMsg('⚠️ Cảnh báo bảo mật: Chỉ chấp nhận máy chủ chính thức của HyperHub hoặc Localhost.');
          return;
        }
      } catch {
        setApiSaveMsg('⚠️ Địa chỉ URL không hợp lệ.');
        return;
      }
    }
    setCustomApiUrl(input || null);
    setApiSaveMsg('Đã lưu địa chỉ máy chủ API thành công!');
    setTimeout(() => {
      setApiSaveMsg('');
      setShowApiSettings(false);
      checkBotStatus();
      fetchDocStats();
      fetchDocuments();
    }, 900);
  };

  const handleResetApiUrl = () => {
    setCustomApiUrl(null);
    setCustomApiUrlInput(getApiBaseUrl());
    setApiSaveMsg('Đã khôi phục cài đặt máy chủ mặc định!');
    setTimeout(() => {
      setApiSaveMsg('');
      setShowApiSettings(false);
      checkBotStatus();
      fetchDocStats();
      fetchDocuments();
    }, 900);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFilterControls = (showRollButton: boolean = true) => (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
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
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
        {/* 1. KHỐI LỚP */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              <span>1. Khối Lớp Học Sinh</span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-white/40">
              Đang chọn:{' '}
              <strong className="text-purple-600 dark:text-purple-400">
                {GRADE_OPTIONS.find((g) => g.id === selectedGrade)?.label}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {GRADE_OPTIONS.map((g) => {
              const isSelected = selectedGrade === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGradeChange(g.id)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:border-purple-300 dark:hover:border-purple-500/30 hover:bg-purple-50/50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="font-bold text-xs sm:text-sm">{g.label}</span>
                  <span
                    className={`text-[10px] ${
                      isSelected ? 'text-purple-100' : 'text-slate-400 dark:text-white/40'
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
                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:border-pink-300 dark:hover:border-pink-500/30 hover:bg-pink-50/30 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <span className="font-bold text-xs truncate">{t.label}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60'
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
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>3. Môn Học Ôn Tập</span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-white/40">
              Đang chọn:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {SUBJECT_OPTIONS.find((s) => s.id === selectedSubject)?.label}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map((s) => {
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#070810] text-white">
      {/* ========================================================================= */}
      {/* SIDEBAR BÊN HÔNG TRÁI                                                     */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-72 lg:min-h-screen bg-white/90 dark:bg-[#0c0d18]/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/[0.08] flex flex-col justify-between shrink-0 p-4 sm:p-6 z-20 shadow-md lg:shadow-none">
        {/* Top: Logo & Nav items */}
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToHome}
              className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
            >
              <img
                src="/logo.png"
                alt="HyperHub Logo"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10 group-hover:ring-purple-500/50 transition-all"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <div className="flex items-center">
                  <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                    HyperHub
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500 ml-1 shadow-[0_0_8px_#ec4899] animate-pulse" />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-white/40 font-medium uppercase tracking-wider block">
                  Bảng Điều Khiển
                </span>
              </div>
            </button>

            {/* Back to Home Mobile Button */}
            <button
              onClick={onBackToHome}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="Quay lại Trang Chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Bot Status & API Server Mini Indicator - CHỈ HIỂN THỊ ĐỐI VỚI ADMIN */}
          {isAdmin && (
            <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {botStatus.online ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    )}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-white/80">
                    Discord Bot:
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      botStatus.online
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {botStatus.online ? 'Online' : 'Offline'}
                  </span>
                  <button
                    onClick={checkBotStatus}
                    disabled={isCheckingBot}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    title="Làm mới trạng thái bot"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingBot ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Endpoint Connection Line */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/50">
                <div
                  className="flex items-center gap-1.5 truncate max-w-[170px]"
                  title={getApiBaseUrl()}
                >
                  <Server className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate font-mono">
                    {getApiBaseUrl().replace(/^https?:\/\//, '').slice(0, 18)}...
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCustomApiUrlInput(getApiBaseUrl());
                    setShowApiSettings(true);
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold shrink-0 cursor-pointer flex items-center gap-0.5"
                >
                  <Settings className="w-3 h-3" />
                  <span>Cài đặt</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Sidebar Buttons */}
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Trang chính</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vault');
                setShowBookmarksOnly(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'vault' && !showBookmarksOnly
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Kho Đề</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-500 dark:text-pink-300 font-bold border border-pink-500/30">
                {totalDocsCount} Đề
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vault');
                setShowBookmarksOnly(true);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'vault' && showBookmarksOnly
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Star className={`w-4 h-4 shrink-0 ${activeTab === 'vault' && showBookmarksOnly ? 'fill-current text-slate-950' : 'text-amber-400'}`} />
              <span>Tủ Sách</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-300 font-bold border border-amber-500/30">
                {bookmarkedIds.size}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('get_exam')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'get_exam'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Dices className="w-4 h-4 shrink-0" />
              <span>Lấy Đề</span>
            </button>

            <button
              onClick={() => setActiveTab('submit_doc')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'submit_doc'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span>Kho Nộp Đề</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                Bot AI
              </span>
            </button>

            {/* Nút Admin - CHỈ HIỂN THỊ KHI CÓ QUYỀN ADMIN */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-600 text-white shadow-lg shadow-rose-900/30'
                    : 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Quản Trị</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/30">
                  {adminInfo?.role_name || 'ADMIN'}
                </span>
              </button>
            )}

            <button
              onClick={onBackToHome}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-xs sm:text-sm text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Về Trang Chủ</span>
            </button>
          </nav>
        </div>

        {/* Bottom: Discord User Profile Card */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10">
          {user ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <div className="overflow-hidden flex-1">
                  <div className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-white">
                    {user.global_name || user.username}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-white/40 truncate">
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Email Verification Status */}
              <div className="flex items-center gap-1.5 text-[11px]">
                {user.verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Email đã xác minh</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                    <XCircle className="w-3 h-3" />
                    <span>Email chưa xác minh</span>
                  </span>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/70 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-[#5865F2]/10 border border-[#5865F2]/30 text-center space-y-3">
              <ShieldCheck className="w-7 h-7 mx-auto text-[#5865F2]" />
              <div className="text-xs text-slate-600 dark:text-white/70">
                Chưa liên kết tài khoản Discord.
              </div>
              <button
                onClick={onOpenAuthModal}
                className="w-full py-2.5 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs shadow-md shadow-[#5865F2]/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                Liên Kết Discord Ngay
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT AREA                                                    */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto max-w-6xl mx-auto w-full">
        {/* ===================================================================== */}
        {/* TAB 1: TRANG CHÍNH (OVERVIEW)                                         */}
        {/* ===================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header Greeting */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                <span>Hệ Thống Quản Trị Học Thuật & Phát Đề</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Chào mừng trở lại{user ? `, ${user.global_name || user.username}` : ''}!
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                Bảng điều khiển kết nối trực tiếp với Discord Bot HyperHub và kho lưu trữ đề thi tự
                động.
              </p>
            </div>

            {/* Đồng Hồ Đếm Ngược Ngày Thi & Động Lực Học Tập */}
            <ExamCountdown onNavigateTab={(tab) => setActiveTab(tab)} />

            {/* Status Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: Discord Bot Live Status */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      botStatus.online
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        botStatus.online ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    {botStatus.online ? 'Đang Hoạt Động' : 'Đang Ngoại Tuyến'}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1">Bot Discord HyperHub</h3>
                <p className="text-xs text-slate-500 dark:text-white/50 mb-3">
                  {botStatus.online
                    ? `Đang kết nối WebSocket (Độ trễ: ${botStatus.ping_ms || 0}ms)`
                    : 'Bot Discord hiện không phản hồi. Các tính năng lấy đề sẽ tạm dừng.'}
                </p>
                <div className="text-xs font-mono text-slate-400 dark:text-white/40 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span>User: {botStatus.bot_user || 'HyperHub#0594'}</span>
                  {botStatus.online && (
                    <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                      ● Live
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Kho Tài Liệu */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/30">
                    Đã Thẩm Định
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1">Kho Đề Thi Sẵn Sàng</h3>
                <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                  {totalDocsCount} Đề
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Bộ đề thi đầy đủ các môn Toán, Tin, Văn, Anh, Lý, Hóa... bóc tách tự động.
                </p>
              </div>

              {/* Card 3: Tài Khoản Liên Kết */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  {user ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Đã Kết Nối
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Chưa Kết Nối
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base mb-1">Xác Thực Discord</h3>
                <p className="text-xs text-slate-500 dark:text-white/50 mb-3">
                  {user
                    ? `Email: ${user.email || 'Ẩn'} (${user.verified ? 'Đã verify ✅' : 'Chưa verify ❌'})`
                    : 'Yêu cầu liên kết tài khoản Discord để nhận phát đề.'}
                </p>
                {!user ? (
                  <button
                    onClick={onOpenAuthModal}
                    className="w-full py-2 px-3 rounded-xl bg-[#5865F2] text-white text-xs font-semibold hover:bg-[#4752c4] transition-colors cursor-pointer"
                  >
                    Liên Kết Ngay
                  </button>
                ) : (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Đủ điều kiện nhận đề thi tự động
                  </div>
                )}
              </div>
            </div>

            {/* Quick Banner Action to Get Exam */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900/30 via-fuchsia-900/20 to-pink-900/30 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-purple-950/20">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-xs font-bold border border-pink-500/30">
                  <Flame className="w-3.5 h-3.5 text-pink-500" />
                  <span>Kho Đề Thi Sẵn Sàng</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Danh Sách & Tải Đề Thi Trực Tiếp
                </h3>
                <p className="text-xs sm:text-sm text-white/70 max-w-xl">
                  Xem toàn bộ kho đề thi được lưu trữ từ Discord. Tải file đề thi về máy tính trong 1
                  chạm hoặc bốc ngẫu nhiên đề theo nhu cầu ôn tập của bạn.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('get_exam')}
                className="btn-shimmer px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-900/40 hover:-translate-y-1 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              >
                Mở Kho Đề Thi Ngay
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: LẤY ĐỀ & DANH SÁCH TẤT CẢ ĐỀ THI                              */}
        {/* ===================================================================== */}
        {activeTab === 'get_exam' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 mb-3">
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
                    Theo yêu cầu hệ thống, Discord Bot bắt buộc phải đang chạy trực tuyến để xác thực
                    và phát đề. Khi Bot offline, tính năng lấy đề sẽ tạm khóa. Vui lòng bật lại Bot
                    Discord!
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

            {/* 2. User Unverified Email Warning Barrier */}
            {(!user || !user.verified) && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-bold text-sm sm:text-base">
                    YÊU CẦU LIÊN KẾT TÀI KHOẢN DISCORD ĐÃ XÁC MINH EMAIL
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70">
                    {!user
                      ? 'Bạn chưa liên kết tài khoản Discord. Vui lòng bấm liên kết ngay bên dưới để mở khóa chức năng nhận và tải đề thi.'
                      : 'Tài khoản Discord của bạn chưa xác thực Email. Vui lòng xác minh email trên Discord hoặc liên kết tài khoản đã verify.'}
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
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/30 via-black/40 to-pink-950/30 border-2 border-purple-500/50 shadow-2xl shadow-purple-950/40 space-y-6 animate-in slide-in-from-bottom-6 duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Môn: {currentExam.subject}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      {formatEstimatedLevel(currentExam.estimated_level)}
                    </span>
                    {(() => {
                      const tr = getExamTrackInfo(currentExam);
                      return (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${tr.badgeClass}`}
                          title={`${tr.description} (${tr.difficultyNote})`}
                        >
                          <span>{tr.icon}</span>
                          <span>{tr.label}</span>
                        </span>
                      );
                    })()}
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/80 border border-white/10">
                      {currentExam.page_count} trang
                    </span>
                  </div>

                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
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
                      toggleBookmarkExam(currentExam.id);
                      setBookmarkedIds(new Set(getBookmarkedExamIds()));
                    }}
                    className={`inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer ${
                      bookmarkedIds.has(currentExam.id)
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                    }`}
                  >
                    <Star className={`w-4 h-4 shrink-0 ${bookmarkedIds.has(currentExam.id) ? 'fill-current text-amber-400' : ''}`} />
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
        {activeTab === 'vault' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-pink-500" />
                <span>Kho Lưu Trữ Đề Thi Đã Thẩm Định</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-3">
                    <span>Kho Đề Thi</span>
                    <span className="text-sm sm:text-base font-bold px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/30">
                      {stats.total_real} Đề
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                    Duyệt toàn bộ tài liệu & đề thi đã qua thẩm định từ Bot DocInspector. Hệ thống hỗ trợ lọc xem đề trùng lặp và đề độc bản bằng mã băm SHA-256.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('submit_doc')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-900/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>+ Nộp Đề Mới Vào Kho</span>
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
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
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
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
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
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      showBookmarksOnly ? 'bg-black/20 text-slate-950' : 'bg-amber-500/20 text-amber-500 dark:text-amber-300'
                    }`}>
                      {bookmarkedIds.size}
                    </span>
                  </button>
                </div>

                {/* Reset bộ lọc */}
                {(selectedGrade !== 'ALL' ||
                  selectedExamType !== 'ALL' ||
                  selectedSubject !== 'ALL' ||
                  descriptionKeyword ||
                  showBookmarksOnly) && (
                  <button
                    onClick={() => {
                      setShowBookmarksOnly(false);
                      setSelectedGrade('ALL');
                      setSelectedExamType('ALL');
                      setSelectedSubject('ALL');
                      setDescriptionKeyword('');
                      fetchDocuments('ALL', 'ALL', 'ALL', '', filterDup);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 w-fit"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xem Tất Cả ({stats.total_real} đề)</span>
                  </button>
                )}
              </div>

              {/* Grid các đề thi */}
              {isLoadingDocs ? (
                <div className="p-12 text-center text-slate-400 dark:text-white/40 space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                  <p className="text-xs font-medium">Đang tải danh sách đề thi từ kho Discord...</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-5 rounded-3xl backdrop-blur-xl border transition-all shadow-sm space-y-3.5 flex flex-col justify-between group ${
                        doc.is_duplicate_copy
                          ? 'border-amber-500/40 bg-amber-950/10 dark:bg-amber-950/20 hover:border-amber-500/70'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-purple-400/50 dark:hover:border-purple-500/40'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                            {doc.subject}
                          </span>
                          {(() => {
                            const tr = getExamTrackInfo(doc);
                            return (
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${tr.badgeClass}`}
                                title={`${tr.description} (${tr.difficultyNote})`}
                              >
                                <span>{tr.icon}</span>
                                <span>{tr.label}</span>
                              </span>
                            );
                          })()}
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80">
                            {formatEstimatedLevel(doc.estimated_level)}
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
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              ✨ Độc Bản
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 uppercase font-bold">
                            {doc.file_type || 'PDF'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
                          {formatFileSize(doc.file_size_bytes)}
                        </span>
                      </div>

                      {/* Tiêu đề & Thông tin đề */}
                      <div>
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
                      </div>

                      {/* Nút thao tác trên từng đề */}
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-white/5">
                        {/* Nút ⭐ Bookmark / Lưu vào tủ sách */}
                        <button
                          type="button"
                          onClick={() => {
                            toggleBookmarkExam(doc.id);
                            setBookmarkedIds(new Set(getBookmarkedExamIds()));
                          }}
                          className={`p-2.5 rounded-xl font-bold text-xs border flex items-center justify-center transition-all cursor-pointer ${
                            bookmarkedIds.has(doc.id)
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 border-transparent hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={bookmarkedIds.has(doc.id) ? 'Bỏ lưu khỏi tủ sách cá nhân' : '⭐ Lưu vào tủ sách ôn luyện của tôi'}
                        >
                          <Star className={`w-3.5 h-3.5 ${bookmarkedIds.has(doc.id) ? 'fill-current text-amber-400' : ''}`} />
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
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-300 dark:border-white/10 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-800 dark:text-white">
                    Không tìm thấy đề thi phù hợp với tiêu chí lọc
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm mx-auto">
                    Hãy thử chọn "Mọi Khối", "Mọi Loại Đề" hoặc xóa từ khóa mô tả để xem toàn bộ
                    danh sách đề thi.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedGrade('ALL');
                      setSelectedExamType('ALL');
                      setSelectedSubject('ALL');
                      setDescriptionKeyword('');
                      fetchDocuments('ALL', 'ALL', 'ALL', '');
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Xem Toàn Bộ Kho Đề Thi
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: KHO NỘP ĐỀ (DOC UPLOAD & AUTO-INSPECT)                         */}
        {/* ===================================================================== */}
        {activeTab === 'submit_doc' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 mb-3">
                <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                <span>Trạm Nộp Đề & Thẩm Định Tài Liệu</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Kho Nộp Đề Thi
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                Kéo thả hoặc tải lên tài liệu / đề thi (PDF, DOCX). Bot DocInspector sẽ tự động phân tích môn học, khối lớp, loại đề, số câu hỏi và kiểm tra chống trùng lặp SHA-256.
              </p>
            </div>

            {/* Upload Zone Component */}
            <DocUploadZone
              apiBase={getApiBaseUrl()}
              user={user}
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
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <AdminPanel
              onClose={() => setActiveTab('overview')}
              onRefreshParentDocs={() => {
                fetchDocuments();
                fetchDocStats();
              }}
            />
          </div>
        )}
      </main>

      {/* [ARCHIVED]: Trình đọc PDF/Word modal đã chuyển vào src/archived/DocPreviewModal.tsx */}

      {/* ========================================================================= */}
      {/* MODAL CÀI ĐẶT SERVER API (ENDPOINT CONFIGURATION - CHỈ DÀNH CHO ADMIN)   */}
      {/* ========================================================================= */}
      {showApiSettings && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#0e101f] border border-purple-500/30 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowApiSettings(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cấu Hình Máy Chủ Bot</h3>
                <p className="text-xs text-white/50">Kết nối Discord Bot & Cầu Nối Dữ Liệu</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-white/80 block mb-1.5">
                  Địa Chỉ API Endpoint (URL)
                </label>
                <input
                  type="text"
                  value={customApiUrlInput}
                  onChange={(e) => setCustomApiUrlInput(e.target.value)}
                  placeholder={DEFAULT_TUNNEL_URL}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-white/70 space-y-1">
                <div className="font-semibold text-purple-300">💡 Gợi ý cấu hình:</div>
                <div>• Web Vercel (HTTPS): Sử dụng Cloudflare Tunnel HTTPS bên dưới:</div>
                <div className="font-mono text-purple-300 text-[10px] break-all select-all">
                  {DEFAULT_TUNNEL_URL}
                </div>
                <div>• Localhost Dev: Dùng `{LOCAL_API_URL}`</div>
              </div>

              {apiSaveMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCheck className="w-4 h-4" />
                  <span>{apiSaveMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveApiUrl}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-purple-900/30"
              >
                Lưu Cấu Hình
              </button>
              <button
                onClick={handleResetApiUrl}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Mặc Định
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
