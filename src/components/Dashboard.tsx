import React, { useState, useEffect, useCallback } from 'react';
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
  Eye,
  UploadCloud,
  Dices,
} from 'lucide-react';
import { DiscordUser } from '../utils/discordAuth';
import {
  getApiBaseUrl,
  setCustomApiUrl,
  DEFAULT_TUNNEL_URL,
  LOCAL_API_URL,
  API_FETCH_HEADERS,
} from '../utils/apiConfig';
import { ExamCountdown } from './ExamCountdown';
import { DocPreviewModal, PreviewableDocument } from './DocPreviewModal';
import { DocUploadZone } from './DocUploadZone';

interface DashboardProps {
  user: DiscordUser | null;
  initialTab?: 'overview' | 'vault' | 'get_exam' | 'submit_doc';
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

// Danh mục Loại Đề Thi
const EXAM_TYPE_OPTIONS = [
  { id: 'ALL', label: 'Mọi Loại Đề', badge: 'Tất cả ✨', icon: '✨' },
  { id: 'THI_THU_THPT', label: 'Thi Thử THPT Quốc Gia', badge: 'Hot 🔥', icon: '🎯' },
  { id: 'HSG', label: 'HSG & Trường Chuyên', badge: 'Nâng cao 🏆', icon: '🏆' },
  { id: 'TUYEN_SINH_10', label: 'Tuyển Sinh Lớp 10', badge: 'Cấp 2 🚀', icon: '🚀' },
  { id: 'GIUA_KY', label: 'Thi Giữa Học Kỳ', badge: 'Định kỳ 📝', icon: '📝' },
  { id: 'CUOI_KY', label: 'Thi Cuối Học Kỳ', badge: 'Học kỳ 📑', icon: '📑' },
  { id: '1_TIET', label: 'Kiểm Tra 1 Tiết', badge: '45 phút ⏱️', icon: '⏱️' },
  { id: '15_PHUT', label: 'Kiểm Tra 15 Phút', badge: 'Nhanh ⚡', icon: '⚡' },
  { id: 'ON_TAP', label: 'Ôn Tập & Bài Tập', badge: 'Luyện tập 📚', icon: '📚' },
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

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  initialTab,
  onOpenAuthModal,
  onLogout,
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'get_exam' | 'submit_doc'>(
    initialTab || 'overview'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [botStatus, setBotStatus] = useState<BotStatus>({ online: false });
  const [isCheckingBot, setIsCheckingBot] = useState<boolean>(true);
  const [previewDoc, setPreviewDoc] = useState<PreviewableDocument | null>(null);

  // Form Lọc & Tìm Kiếm Đề Thi (Mặc định ALL để hiển thị danh sách đầy đủ)
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedExamType, setSelectedExamType] = useState<string>('ALL');
  const [descriptionKeyword, setDescriptionKeyword] = useState<string>('');

  // Danh Sách Đề Thi Trong Kho (Full Catalog List)
  const [documentsList, setDocumentsList] = useState<ExamDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [totalDocsCount, setTotalDocsCount] = useState<number>(28);

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
      searchOverride?: string
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

        if (g && g !== 'ALL') q.set('grade', g);
        if (t && t !== 'ALL') q.set('exam_type', t);
        if (s && s !== 'ALL') q.set('subject', s);
        if (search && search.trim()) q.set('search', search.trim());

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
    [selectedGrade, selectedExamType, selectedSubject, descriptionKeyword]
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
      const res = await fetch(`${apiBase}/api/documents/request_exam?${queryParams.toString()}`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
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
    setCustomApiUrl(customApiUrlInput.trim() || null);
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
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20'
                  : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Kho Đề</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-500 dark:text-pink-300 font-bold border border-pink-500/30">
                {totalDocsCount}+
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
                      {currentExam.estimated_level || 'Chung'}
                    </span>
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
                  {/* Nút Xem Nhanh Đề Thi Trực Tiếp (PDF/Word) */}
                  <button
                    onClick={() => setPreviewDoc(currentExam)}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-950/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 shrink-0 stroke-[2.5]" />
                    <span>Xem Nhanh (PDF / Word)</span>
                  </button>

                  {/* Nút 1: Tải Đề Trực Tiếp Về Máy */}
                  <a
                    href={`${getApiBaseUrl()}/api/documents/${currentExam.id}/download`}
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
                  {currentExam.jump_url && (
                    <a
                      href={currentExam.jump_url}
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
                      {totalDocsCount}+ Đề Đã Thẩm Định
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-white/60 mt-1 max-w-2xl">
                    Duyệt toàn bộ tài liệu & đề thi đã qua thẩm định từ Bot DocInspector. Xem trực tiếp trên web bằng PDF/Word viewer hoặc tải file về máy.
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
                      Danh Sách Tất Cả Các Đề Thi Trong Kho
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-white/40">
                      Hiển thị {documentsList.length} đề thi • Có thể tải trực tiếp file về máy
                    </p>
                  </div>
                </div>

                {/* Reset bộ lọc */}
                {(selectedGrade !== 'ALL' ||
                  selectedExamType !== 'ALL' ||
                  selectedSubject !== 'ALL' ||
                  descriptionKeyword) && (
                  <button
                    onClick={() => {
                      setSelectedGrade('ALL');
                      setSelectedExamType('ALL');
                      setSelectedSubject('ALL');
                      setDescriptionKeyword('');
                      fetchDocuments('ALL', 'ALL', 'ALL', '');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 w-fit"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xem Tất Cả ({totalDocsCount} đề)</span>
                  </button>
                )}
              </div>

              {/* Grid các đề thi */}
              {isLoadingDocs ? (
                <div className="p-12 text-center text-slate-400 dark:text-white/40 space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                  <p className="text-xs font-medium">Đang tải danh sách đề thi từ kho Discord...</p>
                </div>
              ) : documentsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentsList.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-purple-400/50 dark:hover:border-purple-500/40 transition-all shadow-sm space-y-3.5 flex flex-col justify-between group"
                    >
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                            {doc.subject}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80">
                            {doc.estimated_level || 'Chung'}
                          </span>
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
                      </div>

                      {/* Nút thao tác trên từng đề */}
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-white/5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-bold text-xs transition-all cursor-pointer"
                          title="Xem trước đề thi trực tiếp trên web"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Nhanh</span>
                        </button>

                        <a
                          href={`${getApiBaseUrl()}/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.file_name || 'de_thi.pdf'}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Tải Về</span>
                        </a>

                        {doc.jump_url && (
                          <a
                            href={doc.jump_url}
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
              onPreviewDoc={(doc) => setPreviewDoc(doc)}
              onUploadSuccess={() => {
                fetchDocuments();
                fetchDocStats();
              }}
            />
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL XEM TRƯỚC ĐỀ THI TRỰC TIẾP (PDF.JS & OFFICE VIEWER)                 */}
      {/* ========================================================================= */}
      <DocPreviewModal
        document={previewDoc}
        apiBase={getApiBaseUrl()}
        onClose={() => setPreviewDoc(null)}
      />

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
