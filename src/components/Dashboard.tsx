import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
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
  Check,
  Server,
  CheckCheck,
} from 'lucide-react';
import { DiscordUser } from '../utils/discordAuth';
import {
  getApiBaseUrl,
  setCustomApiUrl,
  DEFAULT_TUNNEL_URL,
  LOCAL_API_URL,
} from '../utils/apiConfig';

interface DashboardProps {
  user: DiscordUser | null;
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
  timestamp: string;
}

// Danh mục Khối Lớp Hiện Đại (Modern Pill Selector)
const GRADE_OPTIONS = [
  { id: '12', label: 'Lớp 12', subtitle: 'Ôn TN & ĐH' },
  { id: '11', label: 'Lớp 11', subtitle: 'THPT' },
  { id: '10', label: 'Lớp 10', subtitle: 'THPT' },
  { id: '9', label: 'Lớp 9', subtitle: 'Ôn Vào 10' },
  { id: '8', label: 'Lớp 8', subtitle: 'THCS' },
  { id: '7', label: 'Lớp 7', subtitle: 'THCS' },
  { id: '6', label: 'Lớp 6', subtitle: 'THCS' },
  { id: 'ALL', label: 'Mọi Khối', subtitle: 'Tất cả lớp' },
];

// Danh mục Loại Đề Thi Hiện Đại (Modern Card Selector)
const EXAM_TYPE_OPTIONS = [
  { id: 'THI_THU_THPT', label: 'Thi Thử THPT Quốc Gia', badge: 'Hot 🔥', icon: '🎯' },
  { id: 'HSG', label: 'HSG & Trường Chuyên', badge: 'Nâng cao 🏆', icon: '🏆' },
  { id: 'TUYEN_SINH_10', label: 'Tuyển Sinh Lớp 10', badge: 'Cấp 2 🚀', icon: '🚀' },
  { id: 'GIUA_KY', label: 'Thi Giữa Học Kỳ', badge: 'Định kỳ 📝', icon: '📝' },
  { id: 'CUOI_KY', label: 'Thi Cuối Học Kỳ', badge: 'Học kỳ 📑', icon: '📑' },
  { id: '1_TIET', label: 'Kiểm Tra 1 Tiết', badge: '45 phút ⏱️', icon: '⏱️' },
  { id: '15_PHUT', label: 'Kiểm Tra 15 Phút', badge: 'Nhanh ⚡', icon: '⚡' },
  { id: 'ON_TAP', label: 'Ôn Tập & Bài Tập', badge: 'Luyện tập 📚', icon: '📚' },
  { id: 'ALL', label: 'Mọi Loại Đề', badge: 'Tất cả ✨', icon: '✨' },
];

// Danh mục Môn Học Hiện Đại (Modern Subject Chips)
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

// Gợi ý từ khóa nhanh (1 chạm thêm vào ô mô tả)
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

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onOpenAuthModal,
  onLogout,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'get_exam'>('overview');
  const [botStatus, setBotStatus] = useState<BotStatus>({ online: false });
  const [isCheckingBot, setIsCheckingBot] = useState<boolean>(true);

  // Form Lấy Đề State
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('12');
  const [selectedExamType, setSelectedExamType] = useState<string>('THI_THU_THPT');
  const [descriptionKeyword, setDescriptionKeyword] = useState<string>('');

  // Trạng thái phát đề
  const [isLoadingExam, setIsLoadingExam] = useState<boolean>(false);
  const [currentExam, setCurrentExam] = useState<ExamDocument | null>(null);
  const [examError, setExamError] = useState<string>('');
  const [totalDocsCount, setTotalDocsCount] = useState<number>(28);

  // Endpoint Settings Modal State
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [customApiUrlInput, setCustomApiUrlInput] = useState<string>('');
  const [apiSaveMsg, setApiSaveMsg] = useState<string>('');

  // 1. Kiểm tra trạng thái Discord Bot định kỳ
  const checkBotStatus = useCallback(async () => {
    setIsCheckingBot(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/status`, {
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

  // 2. Lấy thống kê số lượng tài liệu
  const fetchDocStats = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/documents/stats`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.total_items) {
          setTotalDocsCount(data.total_items);
        }
      }
    } catch {
      // Giữ mặc định nếu bot offline
    }
  }, []);

  useEffect(() => {
    checkBotStatus();
    fetchDocStats();
    const timer = setInterval(() => {
      checkBotStatus();
    }, 15000);
    return () => clearInterval(timer);
  }, [checkBotStatus, fetchDocStats]);

  // 3. Xử lý yêu cầu Lấy Đề từ Bot
  const handleRequestExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamError('');
    setCurrentExam(null);

    // Kiểm tra Bot online
    if (!botStatus.online) {
      setExamError(
        'Discord Bot hiện đang không hoạt động (Offline). Vui lòng khởi động Bot Discord để hệ thống có thể bốc đề thi!'
      );
      return;
    }

    // Kiểm tra điều kiện tài khoản Discord & Email Verified
    if (!user) {
      setExamError('Bạn cần liên kết tài khoản Discord trước khi nhận đề thi.');
      onOpenAuthModal();
      return;
    }

    if (!user.verified) {
      setExamError(
        'Tài khoản Discord của bạn chưa xác minh Email (Unverified). Discord Bot chỉ phát đề cho tài khoản đã xác minh email.'
      );
      return;
    }

    // Bắt buộc nhập mô tả theo yêu cầu
    if (!descriptionKeyword.trim()) {
      setExamError('Vui lòng nhập phần mô tả / từ khóa đề thi bạn mong muốn.');
      return;
    }

    setIsLoadingExam(true);
    try {
      const queryParams = new URLSearchParams({
        grade: selectedGrade,
        exam_type: selectedExamType,
        subject: selectedSubject,
        description: descriptionKeyword.trim(),
      });

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/documents/request_exam?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`Bot phản hồi mã lỗi HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.document) {
        setCurrentExam(data.document);
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
    setCustomApiUrl(customApiUrlInput.trim() || null);
    setApiSaveMsg('Đã lưu địa chỉ máy chủ API thành công!');
    setTimeout(() => {
      setApiSaveMsg('');
      setShowApiSettings(false);
      checkBotStatus();
      fetchDocStats();
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
    }, 900);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#f8fafc] dark:bg-[#070810] text-slate-900 dark:text-white transition-colors duration-200">
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

          {/* Bot Status & API Server Mini Indicator */}
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
              onClick={() => setActiveTab('get_exam')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'get_exam'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Lấy đề</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-500 dark:text-pink-300 font-bold border border-pink-500/30">
                Hot
              </span>
            </button>

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
                  {totalDocsCount}+
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
                  <span>Tính Năng Trọng Tâm</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Lấy Đề Thi Tự Động Từ Kho Discord
                </h3>
                <p className="text-xs sm:text-sm text-white/70 max-w-xl">
                  Chọn khối lớp, loại đề và từ khóa mô tả. Bot sẽ tự động chọn lọc ngẫu nhiên một đề
                  thi chuẩn xác nhất từ hệ thống cho bạn.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('get_exam')}
                className="btn-shimmer px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-900/40 hover:-translate-y-1 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
              >
                Lấy Đề Ngay Bây Giờ
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: LẤY ĐỀ (GET EXAM FEATURE)                                      */}
        {/* ===================================================================== */}
        {activeTab === 'get_exam' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 mb-3">
                <FileSpreadsheet className="w-3.5 h-3.5 text-pink-500" />
                <span>Trạm Phát Đề Tự Động</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Lấy Đề Thi
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1">
                Yêu cầu Discord Bot hoạt động & tài khoản Discord có email đã xác minh.
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
                      ? 'Bạn chưa liên kết tài khoản Discord. Vui lòng bấm liên kết ngay bên dưới để mở khóa chức năng nhận đề.'
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

            {/* 3. Form Yêu Cầu Đề Thi Hiện Đại (No Broken Native Selects) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm space-y-7">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">Tiêu Chí Bốc Đề Thi</h3>
                    <p className="text-xs text-slate-400 dark:text-white/40">
                      Chọn trực tiếp bằng 1 chạm tiện lợi, không lo lỗi giao diện
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  Chuẩn hóa UI 2026
                </span>
              </div>

              {examError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{examError}</span>
                </div>
              )}

              <form onSubmit={handleRequestExam} className="space-y-6">
                {/* ============================================================== */}
                {/* 1. KHỐI LỚP (BẮT BUỘC) - Modern Interactive Pills              */}
                {/* ============================================================== */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-purple-500" />
                      <span>1. Khối Lớp Học Sinh *</span>
                    </label>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      Đang chọn: {GRADE_OPTIONS.find((g) => g.id === selectedGrade)?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {GRADE_OPTIONS.map((g) => {
                      const isSelected = selectedGrade === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGrade(g.id)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white border-transparent shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/50 scale-[1.02]'
                              : 'bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-bold tracking-tight">
                            {g.label}
                          </span>
                          <span
                            className={`text-[10px] truncate max-w-full ${
                              isSelected ? 'text-white/80' : 'text-slate-400 dark:text-white/40'
                            }`}
                          >
                            {g.subtitle}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* 2. LOẠI ĐỀ THI (BẮT BUỘC) - Modern Interactive Cards           */}
                {/* ============================================================== */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-pink-500" />
                      <span>2. Loại Đề Thi *</span>
                    </label>
                    <span className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                      Đang chọn: {EXAM_TYPE_OPTIONS.find((t) => t.id === selectedExamType)?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {EXAM_TYPE_OPTIONS.map((t) => {
                      const isSelected = selectedExamType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedExamType(t.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-900/40 via-fuchsia-900/30 to-pink-900/40 dark:from-purple-950/60 dark:to-pink-950/60 border-purple-500 text-purple-950 dark:text-white shadow-md shadow-purple-900/20 ring-2 ring-purple-500/40'
                              : 'bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">{t.icon}</span>
                            <div>
                              <div className="text-xs sm:text-sm font-bold leading-tight">
                                {t.label}
                              </div>
                              <span
                                className={`text-[10px] inline-block font-semibold mt-0.5 ${
                                  isSelected
                                    ? 'text-purple-600 dark:text-purple-300'
                                    : 'text-slate-400 dark:text-white/40'
                                }`}
                              >
                                {t.badge}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                                : 'border-slate-300 dark:border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* 3. MÔN HỌC (TÙY CHỌN) - Modern Subject Chips                  */}
                {/* ============================================================== */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-purple-500" />
                      <span>3. Môn Học</span>
                    </label>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      Đang chọn: {SUBJECT_OPTIONS.find((s) => s.id === selectedSubject)?.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_OPTIONS.map((s) => {
                      const isSelected = selectedSubject === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSubject(s.id)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/25 ring-2 ring-purple-400/40'
                              : 'bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="text-base">{s.icon}</span>
                          <span>{s.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ============================================================== */}
                {/* 4. MÔ TẢ / TỪ KHÓA ĐỀ THI (BẮT BUỘC)                           */}
                {/* ============================================================== */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-pink-500" />
                      <span>4. Mô Tả / Từ Khóa Đề Thi *</span>
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-white/40">
                      Bắt buộc nhập từ khóa
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="VD: bài tập hàm số mũ, wordform, quy hoạch động, phân tích thơ, đề có lời giải..."
                      value={descriptionKeyword}
                      onChange={(e) => setDescriptionKeyword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-white/30 text-slate-900 dark:text-white shadow-inner"
                      required
                    />
                    {descriptionKeyword && (
                      <button
                        type="button"
                        onClick={() => setDescriptionKeyword('')}
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
                      <span>Gợi ý từ khóa nhanh (bấm để thêm vào mô tả):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_KEYWORD_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!descriptionKeyword.includes(tag)) {
                              setDescriptionKeyword((prev) =>
                                prev ? `${prev.trim()} ${tag}` : tag
                              );
                            }
                          }}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          <span>+ {tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* ACTION SUBMIT                                                  */}
                {/* ============================================================== */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="submit"
                    disabled={!botStatus.online || !user || !user.verified || isLoadingExam}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-purple-900/30 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoadingExam ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Bot Đang Bốc Đề...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Lấy Đề Thi Ngẫu Nhiên</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs text-slate-400 dark:text-white/40 text-center sm:text-left">
                    Bot sẽ ngẫu nhiên chọn 1 đề thi thỏa mãn điều kiện từ kho dữ liệu Discord.
                  </span>
                </div>
              </form>
            </div>

            {/* 4. Khu Vực Hiển Thị Kết Quả Đề Thi Nhận Được */}
            {currentExam && (
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/20 via-black/40 to-pink-950/20 border-2 border-purple-500/40 shadow-2xl shadow-purple-950/40 space-y-6 animate-in slide-in-from-bottom-6 duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Môn: {currentExam.subject}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      {currentExam.estimated_level || 'Lớp 12'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/80 border border-white/10">
                      {currentExam.page_count} trang
                    </span>
                  </div>

                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã nhận đề thành công!</span>
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
                    <span className="text-white/40 block">Số câu hỏi nhận diện:</span>
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
                  {currentExam.jump_url ? (
                    <a
                      href={currentExam.jump_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#5865F2]/30 hover:-translate-y-0.5 active:scale-95 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Mở & Tải Đề Trên Discord</span>
                    </a>
                  ) : (
                    <span className="text-xs text-white/50">Đề thi lưu nội bộ hệ thống.</span>
                  )}

                  <button
                    onClick={handleRequestExam}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Bốc Đề Khác</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL CÀI ĐẶT SERVER API (ENDPOINT CONFIGURATION)                         */}
      {/* ========================================================================= */}
      {showApiSettings && (
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
