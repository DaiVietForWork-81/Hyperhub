import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  RefreshCw,
  Flame,
  GraduationCap,
  Trophy,
  ChevronRight,
  CheckCircle2,
  ListChecks,
  Square,
  CheckSquare,
  Percent,
} from 'lucide-react';

export type ExamMode = 'thpt' | 'grade10';
export type ExamCohort = '2027-2028' | '2028-2029';

export interface ExamSession {
  id: string;
  icon: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  datetime: Date;
  description?: string;
}

interface ExamTarget {
  id: string;
  mode: ExamMode;
  cohort: ExamCohort;
  modeLabel: string;
  cohortLabel: string;
  examTitle: string;
  targetDate: Date;
  badge: string;
  themeColor: string;
  description: string;
  startOfYear: Date;
  sessions: ExamSession[];
}

const INSPIRATIONAL_QUOTES = [
  {
    quote: 'Trên con đường thành công, không có dấu chân của kẻ lười biếng.',
    author: 'Lỗ Tấn',
    tag: 'Kiên trì',
  },
  {
    quote: 'Mỗi bài tập bạn giải hôm nay là một bước tiến gần hơn đến cánh cổng Đại học mơ ước!',
    author: 'HyperHub Mentor',
    tag: 'Quyết tâm',
  },
  {
    quote: 'Tri thức là sức mạnh. Đầu tư vào tri thức luôn mang lại lợi nhuận cao nhất.',
    author: 'Benjamin Franklin',
    tag: 'Tri thức',
  },
  {
    quote: 'Đừng dừng lại khi mệt mỏi, hãy dừng lại khi bạn đã hoàn thành bài thi.',
    author: 'Khuyết danh',
    tag: 'Bền bỉ',
  },
  {
    quote: '12 năm đèn sách kết tinh trong một mùa thi. Hãy chiến đấu hết mình để không nuối tiếc!',
    author: 'Lời chúc sĩ tử',
    tag: 'Tỏa sáng',
  },
  {
    quote: 'Tương lai thuộc về những ai tin tưởng vào vẻ đẹp của ước mơ của mình.',
    author: 'Eleanor Roosevelt',
    tag: 'Ước mơ',
  },
  {
    quote: 'Không có áp lực, không có kim cương. Vượt qua giới hạn để chạm đỉnh vinh quang!',
    author: 'Ngạn ngữ hiện đại',
    tag: 'Đột phá',
  },
  {
    quote: 'Mỗi giờ bạn tập trung cao độ hôm nay sẽ đổi lại sự tự tin tuyệt đối trong phòng thi.',
    author: 'HyperHub Community',
    tag: 'Tập trung',
  },
];

const CHECKLIST_ITEMS = [
  { id: 'cccd', label: 'CCCD / CMND (Căn cước công dân)', icon: '🪪' },
  { id: 'the-du-thi', label: 'Thẻ dự thi & Giấy báo dự thi', icon: '🎫' },
  { id: 'but-bi', label: 'Bút bi (tối thiểu 2 cây cùng màu mực)', icon: '🖊️' },
  { id: 'but-chi-2b', label: 'Bút chì 2B & gọt chì (tô trắc nghiệm)', icon: '✏️' },
  { id: 'gom', label: 'Gôm / Tẩy chì chất lượng cao', icon: '🧼' },
  { id: 'thuoc-ke', label: 'Thước kẻ, compa, ê-ke', icon: '📐' },
  { id: 'may-tinh', label: 'Máy tính Casio (danh mục được phép)', icon: '🧮' },
  { id: 'nuoc-uong', label: 'Chai nước lọc trong suốt (bóc nhãn)', icon: '💧' },
  { id: 'dong-ho', label: 'Đồng hồ đeo tay kim (không smartwatch)', icon: '⏱️' },
  { id: 'khan-giay', label: 'Khăn giấy / Khẩu trang y tế', icon: '🧻' },
];

const EXAM_TARGETS: ExamTarget[] = [
  // =========================================================================
  // 1. CHẾ ĐỘ: TỐT NGHIỆP THPT QUỐC GIA (Khóa 2027-2028 & Khóa 2028-2029)
  // =========================================================================
  {
    id: 'thpt-2027-2028',
    mode: 'thpt',
    cohort: '2027-2028',
    modeLabel: 'Tốt Nghiệp THPT',
    cohortLabel: 'Khóa 2027 - 2028',
    examTitle: 'Kỳ Thi Tốt Nghiệp THPT Quốc Gia (Khóa 2027 - 2028)',
    targetDate: new Date('2027-06-11T07:30:00+07:00'),
    startOfYear: new Date('2026-09-05T00:00:00+07:00'),
    badge: 'Khóa 2009 - 2010 • GDPT 2018 🔥',
    themeColor: 'from-purple-600 via-pink-600 to-rose-600',
    description: 'Kỳ thi Tốt nghiệp THPT dự kiến diễn ra vào các ngày 11 và 12 tháng 6 hằng năm với 2 môn bắt buộc (Toán, Văn) và 2 môn tự chọn.',
    sessions: [
      {
        id: 'van-thpt-2728',
        icon: '📝',
        subject: 'Ngữ văn',
        date: '11/6/2027',
        time: '07:30',
        duration: '120 phút',
        datetime: new Date('2027-06-11T07:30:00+07:00'),
        description: 'Thi tự luận bắt buộc (120 phút)',
      },
      {
        id: 'toan-thpt-2728',
        icon: '🔢',
        subject: 'Toán',
        date: '11/6/2027',
        time: '14:20',
        duration: '90 phút',
        datetime: new Date('2027-06-11T14:20:00+07:00'),
        description: 'Thi trắc nghiệm bắt buộc (90 phút)',
      },
      {
        id: 'tc1-thpt-2728',
        icon: '1️⃣',
        subject: 'Bài thi Tự chọn môn thứ nhất',
        date: '12/6/2027',
        time: '07:30',
        duration: '50 phút',
        datetime: new Date('2027-06-12T07:30:00+07:00'),
        description: 'Vật lý / Hóa học / Sinh học / Lịch sử / Địa lý...',
      },
      {
        id: 'tc2-thpt-2728',
        icon: '2️⃣',
        subject: 'Bài thi Tự chọn môn thứ hai',
        date: '12/6/2027',
        time: '08:35',
        duration: '50 phút',
        datetime: new Date('2027-06-12T08:35:00+07:00'),
        description: 'Ngoại ngữ / Tin học / Công nghệ...',
      },
    ],
  },
  {
    id: 'thpt-2028-2029',
    mode: 'thpt',
    cohort: '2028-2029',
    modeLabel: 'Tốt Nghiệp THPT',
    cohortLabel: 'Khóa 2028 - 2029',
    examTitle: 'Kỳ Thi Tốt Nghiệp THPT Quốc Gia (Khóa 2028 - 2029)',
    targetDate: new Date('2028-06-11T07:30:00+07:00'),
    startOfYear: new Date('2027-09-05T00:00:00+07:00'),
    badge: 'Khóa 2010 - 2011 • Vững Vàng Tương Lai 🌟',
    themeColor: 'from-purple-600 via-indigo-600 to-cyan-600',
    description: 'Kỳ thi Tốt nghiệp THPT diễn ra vào các ngày 11 và 12 tháng 6 hằng năm. Xây dựng mục tiêu trường Đại học mơ ước từ sớm!',
    sessions: [
      {
        id: 'van-thpt-2829',
        icon: '📝',
        subject: 'Ngữ văn',
        date: '11/6/2028',
        time: '07:30',
        duration: '120 phút',
        datetime: new Date('2028-06-11T07:30:00+07:00'),
        description: 'Thi tự luận bắt buộc (120 phút)',
      },
      {
        id: 'toan-thpt-2829',
        icon: '🔢',
        subject: 'Toán',
        date: '11/6/2028',
        time: '14:20',
        duration: '90 phút',
        datetime: new Date('2028-06-11T14:20:00+07:00'),
        description: 'Thi trắc nghiệm bắt buộc (90 phút)',
      },
      {
        id: 'tc1-thpt-2829',
        icon: '1️⃣',
        subject: 'Bài thi Tự chọn môn thứ nhất',
        date: '12/6/2028',
        time: '07:30',
        duration: '50 phút',
        datetime: new Date('2028-06-12T07:30:00+07:00'),
        description: 'Vật lý / Hóa học / Sinh học / Lịch sử / Địa lý...',
      },
      {
        id: 'tc2-thpt-2829',
        icon: '2️⃣',
        subject: 'Bài thi Tự chọn môn thứ hai',
        date: '12/6/2028',
        time: '08:35',
        duration: '50 phút',
        datetime: new Date('2028-06-12T08:35:00+07:00'),
        description: 'Ngoại ngữ / Tin học / Công nghệ...',
      },
    ],
  },

  // =========================================================================
  // 2. CHẾ ĐỘ: TUYỂN SINH VÀO LỚP 10 THPT (Khóa 2027-2028 & Khóa 2028-2029)
  // =========================================================================
  {
    id: 'grade10-2027-2028',
    mode: 'grade10',
    cohort: '2027-2028',
    modeLabel: 'Vào Lớp 10',
    cohortLabel: 'Khóa 2027 - 2028',
    examTitle: 'Kỳ Thi Tuyển Sinh Vào Lớp 10 THPT (Khóa 2027 - 2028)',
    targetDate: new Date('2027-06-06T07:30:00+07:00'),
    startOfYear: new Date('2026-09-05T00:00:00+07:00'),
    badge: 'Khóa 2012 • Cánh Cổng Cấp 3 🚀',
    themeColor: 'from-blue-600 via-indigo-600 to-cyan-600',
    description: 'Chinh phục ngôi trường cấp 3 công lập và các trường THPT Chuyên mơ ước (Năm học 2027 - 2028).',
    sessions: [
      {
        id: 'van-10-2728',
        icon: '📝',
        subject: 'Ngữ văn',
        date: '06/6/2027',
        time: '07:30',
        duration: '120 phút',
        datetime: new Date('2027-06-06T07:30:00+07:00'),
        description: 'Thi tự luận bắt buộc (120 phút)',
      },
      {
        id: 'anh-10-2728',
        icon: '🌐',
        subject: 'Tiếng Anh (Ngoại ngữ)',
        date: '06/6/2027',
        time: '14:00',
        duration: '60 phút',
        datetime: new Date('2027-06-06T14:00:00+07:00'),
        description: 'Thi trắc nghiệm (60 phút)',
      },
      {
        id: 'toan-10-2728',
        icon: '🔢',
        subject: 'Toán',
        date: '07/6/2027',
        time: '07:30',
        duration: '120 phút',
        datetime: new Date('2027-06-07T07:30:00+07:00'),
        description: 'Thi tự luận bắt buộc (120 phút)',
      },
      {
        id: 'chuyen-10-2728',
        icon: '🎯',
        subject: 'Môn Chuyên / Bài thi thứ tư',
        date: '07/6/2027',
        time: '14:00',
        duration: '150 phút',
        datetime: new Date('2027-06-07T14:00:00+07:00'),
        description: 'Dành cho thí sinh thi THPT Chuyên',
      },
    ],
  },
  {
    id: 'grade10-2028-2029',
    mode: 'grade10',
    cohort: '2028-2029',
    modeLabel: 'Vào Lớp 10',
    cohortLabel: 'Khóa 2028 - 2029',
    examTitle: 'Kỳ Thi Tuyển Sinh Vào Lớp 10 THPT (Khóa 2028 - 2029)',
    targetDate: new Date('2028-06-06T07:30:00+07:00'),
    startOfYear: new Date('2027-09-05T00:00:00+07:00'),
    badge: 'Khóa 2013 • Tự Hào Cấp 3 🌟',
    themeColor: 'from-cyan-600 via-sky-600 to-blue-600',
    description: 'Chinh phục ngôi trường cấp 3 công lập và các trường THPT Chuyên mơ ước (Năm học 2028 - 2029).',
    sessions: [
      {
        id: 'van-10-2829',
        icon: '📝',
        subject: 'Ngữ văn',
        date: '06/6/2028',
        time: '07:30',
        duration: '120 phút',
        datetime: new Date('2028-06-06T07:30:00+07:00'),
        description: 'Thi tự luận bắt buộc (120 phút)',
      },
      {
        id: 'anh-10-2829',
        icon: '🌐',
        subject: 'Tiếng Anh (Ngoại ngữ)',
        date: '06/6/2028',
        time: '14:00',
        duration: '60 phút',
        datetime: new Date('2028-06-06T14:00:00+07:00'),
        description: 'Thi trắc nghiệm (60 phút)',
      },
      {
        id: 'toan-10-2829',
        icon: '🔢',
        subject: 'Toán',
        date: '07/6/2028',
        time: '07:30',
        duration: '120 phút',
        datetime: new Date('2028-06-07T07:30:00+07:00'),
        description: 'Thi tự luận bắt buộc (120 phút)',
      },
      {
        id: 'chuyen-10-2829',
        icon: '🎯',
        subject: 'Môn Chuyên / Bài thi thứ tư',
        date: '07/6/2028',
        time: '14:00',
        duration: '150 phút',
        datetime: new Date('2028-06-07T14:00:00+07:00'),
        description: 'Dành cho thí sinh thi THPT Chuyên',
      },
    ],
  },
];

interface ExamCountdownProps {
  onNavigateTab?: (tab: 'vault' | 'get_exam' | 'submit_doc') => void;
}

export const ExamCountdown: React.FC<ExamCountdownProps> = ({ onNavigateTab }) => {
  // 1. Chế độ kỳ thi: Tốt nghiệp THPT hoặc Tuyển sinh Vào 10
  const [selectedMode, setSelectedMode] = useState<ExamMode>(() => {
    try {
      const saved = localStorage.getItem('hyperhub-exam-mode');
      if (saved === 'thpt' || saved === 'grade10') return saved;
    } catch {}
    return 'thpt';
  });

  // 2. Khóa học: Duy nhất 2 khóa: Khóa 2027 - 2028 và Khóa 2028 - 2029
  const [selectedCohort, setSelectedCohort] = useState<ExamCohort>(() => {
    try {
      const saved = localStorage.getItem('hyperhub-exam-cohort');
      if (saved === '2027-2028' || saved === '2028-2029') return saved;
    } catch {}
    return '2027-2028';
  });

  const [quoteIndex, setQuoteIndex] = useState<number>(() =>
    Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)
  );
  const [isRotatingQuote, setIsRotatingQuote] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  // Checklist lưu trữ trong localStorage
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('thpt-exam-checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);

  // Cập nhật từng giây
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleModeChange = (mode: ExamMode) => {
    setSelectedMode(mode);
    try {
      localStorage.setItem('hyperhub-exam-mode', mode);
    } catch {}
  };

  const handleCohortChange = (cohort: ExamCohort) => {
    setSelectedCohort(cohort);
    try {
      localStorage.setItem('hyperhub-exam-cohort', cohort);
    } catch {}
  };

  // Xác định mục tiêu kỳ thi đang chọn (đúng mode và cohort)
  const currentTarget = useMemo(() => {
    return (
      EXAM_TARGETS.find((t) => t.mode === selectedMode && t.cohort === selectedCohort) ||
      EXAM_TARGETS.find((t) => t.mode === selectedMode) ||
      EXAM_TARGETS[0]
    );
  }, [selectedMode, selectedCohort]);

  // Tìm môn thi tiếp theo hoặc môn thi gần nhất
  const nextSession = useMemo(() => {
    const nowMs = now.getTime();
    for (const session of currentTarget.sessions) {
      if (session.datetime.getTime() > nowMs) {
        return session;
      }
    }
    return currentTarget.sessions[0];
  }, [currentTarget, now]);

  // Tính toán thời gian đếm ngược chính (Năm, Tháng, Tuần, Ngày, Giờ, Phút, Giây)
  const timeBreakdown = useMemo(() => {
    const diffMs = currentTarget.targetDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      return {
        isFinished: true,
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalDays: 0,
      };
    }

    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const years = Math.floor(totalDays / 365.25);
    const daysAfterYears = Math.floor(totalDays % 365.25);

    const months = Math.floor(daysAfterYears / 30.4375);
    const daysAfterMonths = Math.floor(daysAfterYears % 30.4375);
    const weeks = Math.floor(daysAfterMonths / 7);
    const days = Math.floor(daysAfterMonths % 7);

    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    return {
      isFinished: false,
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      totalDays,
    };
  }, [currentTarget, now]);

  // Tính % tiến trình năm học đã trôi qua
  const yearProgressPercent = useMemo(() => {
    const start = currentTarget.startOfYear.getTime();
    const end = currentTarget.targetDate.getTime();
    const current = now.getTime();
    if (current <= start) return 0;
    if (current >= end) return 100;
    const p = ((current - start) / (end - start)) * 100;
    return Math.round(p * 10) / 10;
  }, [currentTarget, now]);

  const handleNextQuote = () => {
    setIsRotatingQuote(true);
    setTimeout(() => {
      setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
      setIsRotatingQuote(false);
    }, 200);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('thpt-exam-checklist', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const completedChecklistCount = useMemo(() => {
    return CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;
  }, [checklist]);

  const currentQuote = INSPIRATIONAL_QUOTES[quoteIndex];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Selector Chế Độ Kỳ Thi & Khóa Học */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0c0d1b] via-[#120f26] to-[#070814] border border-purple-500/20 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Thông tin Kỳ thi & Huy hiệu */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Đồng Hồ Đếm Ngược Mùa Thi
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <Flame className="w-3 h-3 text-pink-400" />
                {currentTarget.badge}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {currentTarget.examTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {currentTarget.description}
            </p>
          </div>

          {/* 2 Chế Độ Kỳ Thi & Khóa Học Switcher */}
          <div className="flex flex-col sm:flex-row xl:flex-col gap-2.5 shrink-0">
            {/* Hàng 1: 2 Chế Độ (Tốt Nghiệp THPT vs Vào Lớp 10) */}
            <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => handleModeChange('thpt')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  selectedMode === 'thpt'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Tốt Nghiệp THPT</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('grade10')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  selectedMode === 'grade10'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Vào Lớp 10</span>
              </button>
            </div>

            {/* Hàng 2: Chọn Khóa (Khóa 2027 - 2028 & Khóa 2028 - 2029) */}
            <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => handleCohortChange('2027-2028')}
                className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                  selectedCohort === '2027-2028'
                    ? selectedMode === 'thpt'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Khóa 2027 - 2028
              </button>

              <button
                type="button"
                onClick={() => handleCohortChange('2028-2029')}
                className={`flex-1 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                  selectedCohort === '2028-2029'
                    ? selectedMode === 'thpt'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Khóa 2028 - 2029
              </button>
            </div>
          </div>
        </div>

        {/* 2. Dòng Tóm Tắt Thời Gian Thực (Headline Countdown) */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-white/90">
            <span className="text-xl">⏳</span>
            <span>
              Chỉ còn{' '}
              {timeBreakdown.years > 0 && (
                <>
                  <span className="font-extrabold text-amber-300 font-mono text-lg sm:text-xl">
                    {timeBreakdown.years}
                  </span>{' '}
                  năm{' '}
                </>
              )}
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-pink-400 text-lg sm:text-xl font-mono">
                {timeBreakdown.totalDays}
              </span>{' '}
              ngày{' '}
              <span className="font-extrabold text-pink-400 font-mono">
                {timeBreakdown.hours.toString().padStart(2, '0')}
              </span>{' '}
              giờ{' '}
              <span className="font-extrabold text-purple-400 font-mono">
                {timeBreakdown.minutes.toString().padStart(2, '0')}
              </span>{' '}
              phút{' '}
              <span className="font-extrabold text-cyan-400 font-mono">
                {timeBreakdown.seconds.toString().padStart(2, '0')}
              </span>{' '}
              giây nữa là bắt đầu môn thi đầu tiên!
            </span>
          </div>

          {/* Nút Mở Checklist Phòng Thi */}
          <button
            onClick={() => setShowChecklistModal(true)}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <ListChecks className="w-4 h-4 text-emerald-400" />
            <span>Hành trang phòng thi</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
              {completedChecklistCount}/{CHECKLIST_ITEMS.length}
            </span>
          </button>
        </div>

        {/* 3. Ô Đếm Ngược Chi Tiết: Animation hiện Năm, Tháng, Tuần, Ngày, Giờ, Phút, Giây, Khối */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3.5 mt-6">
          {/* Card 1: Năm */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-amber-500/30 p-3 sm:p-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-amber-400 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200">
              {timeBreakdown.years}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/80 mt-1">
              Năm
            </div>
            <div className="h-0.5 w-6 bg-amber-500/60 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card 2: Tháng */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-purple-500/30 p-3 sm:p-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-purple-400 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200">
              {timeBreakdown.months}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-300/80 mt-1">
              Tháng
            </div>
            <div className="h-0.5 w-6 bg-purple-500/60 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card 3: Tuần */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-blue-500/30 p-3 sm:p-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-blue-400 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200">
              {timeBreakdown.weeks}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-300/80 mt-1">
              Tuần
            </div>
            <div className="h-0.5 w-6 bg-blue-500/60 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card 4: Ngày */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-rose-500/30 p-3 sm:p-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-rose-400 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-rose-200">
              {timeBreakdown.days}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-300/80 mt-1">
              Ngày
            </div>
            <div className="h-0.5 w-6 bg-rose-500/60 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card 5: Giờ */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-amber-500/30 p-3 sm:p-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-amber-400 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
              {timeBreakdown.hours.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/80 mt-1">
              Giờ
            </div>
            <div className="h-0.5 w-6 bg-amber-500/60 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card 6: Phút */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-emerald-500/30 p-3 sm:p-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-emerald-400 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300">
              {timeBreakdown.minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-300/80 mt-1">
              Phút
            </div>
            <div className="h-0.5 w-6 bg-emerald-500/60 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card 7: Giây (Animation nhịp đập liên tục) */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-purple-900/40 to-pink-950/40 border border-pink-500/40 p-3 sm:p-3.5 text-center backdrop-blur-md shadow-lg shadow-pink-950/20">
            <div className="text-2xl sm:text-3xl font-black font-mono text-pink-400 animate-pulse">
              {timeBreakdown.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-300 mt-1">
              Giây
            </div>
            <div className="h-0.5 w-6 bg-pink-400 mx-auto mt-2 rounded-full animate-ping" />
          </div>

          {/* Card 8: Khối (Hiển thị Khối & Niên khóa mục tiêu) */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-950/50 via-purple-950/40 to-pink-950/30 border border-purple-500/40 p-3 sm:p-3.5 text-center backdrop-blur-md hover:border-purple-300 transition-all duration-300 shadow-lg shadow-purple-950/30">
            <div className="text-base sm:text-lg font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200">
              {selectedMode === 'thpt' ? 'Khối 12' : 'Khối 9'}
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-purple-300/90 mt-1 truncate">
              {selectedCohort}
            </div>
            <div className="h-0.5 w-6 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto mt-2 rounded-full" />
          </div>
        </div>

        {/* 4. Thanh Tiến Trình Năm Học (%) */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              <span>Tiến trình năm học đã qua:</span>
            </div>
            <span className="font-mono font-bold text-pink-400">
              {yearProgressPercent}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
              style={{ width: `${yearProgressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Khai giảng (05/09)</span>
            <span>Ngày thi: {currentTarget.targetDate.toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* 2. Lịch Thi Chi Tiết Từng Môn Theo Ca */}
      <div className="rounded-3xl p-6 sm:p-7 bg-[#0b0c16] border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-lg">
              📅
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Lịch Thi Chi Tiết ({currentTarget.modeLabel} - {currentTarget.cohortLabel})
              </h3>
              <p className="text-xs text-slate-400">
                Theo dõi chính xác ngày giờ phát đề, thời gian làm bài của từng môn thi
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
            Môn tiếp theo: {nextSession.subject} ({nextSession.date})
          </span>
        </div>

        {/* Danh sách các buổi thi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {currentTarget.sessions.map((session) => {
            const isNext = session.id === nextSession.id;
            return (
              <div
                key={session.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden group ${
                  isNext
                    ? 'bg-gradient-to-br from-purple-950/40 via-[#131126] to-[#0d0f1e] border-purple-500/60 shadow-lg shadow-purple-950/30'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0 p-2 rounded-xl bg-white/[0.04] border border-white/10">
                      {session.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-purple-300 transition-colors">
                        {session.subject}
                      </h4>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{session.date}</span>
                        <span>•</span>
                        <span className="font-mono text-purple-300">{session.time}</span>
                        <span>•</span>
                        <span className="font-medium text-pink-300">{session.duration}</span>
                      </div>
                    </div>
                  </div>

                  {isNext && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                      Đang đếm ngược
                    </span>
                  )}
                </div>

                {session.description && (
                  <div className="text-xs text-slate-400/90 pt-2 border-t border-white/5">
                    {session.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Câu Nói Truyền Cảm Hứng Học Tập (Inspiration Quote Card) */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-[#0a0b14] border border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>

          <div
            className={`transition-opacity duration-200 ${
              isRotatingQuote ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {currentQuote.tag}
              </span>
              <span className="text-xs text-white/40">• Lời nhắn nhủ mỗi ngày</span>
            </div>
            <p className="text-sm sm:text-base font-medium text-white/90 italic">
              "{currentQuote.quote}"
            </p>
            <div className="text-xs font-bold text-amber-400/90 mt-1">
              — {currentQuote.author}
            </div>
          </div>
        </div>

        <button
          onClick={handleNextQuote}
          title="Đổi câu nói khác"
          className="self-end md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRotatingQuote ? 'animate-spin' : ''}`} />
          <span>Đổi câu khác</span>
        </button>
      </div>

      {/* 4. Lối Tắt Nhanh Vào Kho Đề / Bốc Đề / Nộp Đề */}
      {onNavigateTab && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigateTab('vault')}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-[#0e101f] border border-purple-500/20 hover:border-purple-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Kho Lưu Trữ
              </div>
              <div className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Xem Tất Cả Đề Thi
              </div>
              <div className="text-xs text-slate-400">
                28+ Đề thi đã thẩm định
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => onNavigateTab('get_exam')}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-pink-950/30 to-[#0e101f] border border-pink-500/20 hover:border-pink-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                Bốc Đề Nhanh
              </div>
              <div className="text-sm sm:text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                Lấy Đề Ngẫu Nhiên
              </div>
              <div className="text-xs text-slate-400">
                Bốc 1 đề ôn luyện theo tiêu chí
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => onNavigateTab('submit_doc')}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 to-[#0e101f] border border-blue-500/20 hover:border-blue-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Đóng Góp Đề
              </div>
              <div className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                Kho Nộp Đề Trực Tuyến
              </div>
              <div className="text-xs text-slate-400">
                Bot AI tự động phân tích & thẩm định
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      )}

      {/* 5. Modal Checklist Phòng Thi (Hành Trang Sĩ Tử) */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0e101f] border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-lg">
                  🎒
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Checklist Hành Trang Phòng Thi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Đã chuẩn bị: <strong className="text-pink-400">{completedChecklistCount}/{CHECKLIST_ITEMS.length}</strong> vật dụng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = !!checklist[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-purple-950/40 border-purple-500/50 text-white'
                        : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <span
                      className={`text-xs font-medium flex-1 ${
                        isChecked ? 'line-through text-slate-400' : 'text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {completedChecklistCount === CHECKLIST_ITEMS.length && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>🎉 Bạn đã chuẩn bị đầy đủ 10/10 vật dụng! Tự tin bước vào phòng thi nhé!</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowChecklistModal(false)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Đã Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCountdown;
