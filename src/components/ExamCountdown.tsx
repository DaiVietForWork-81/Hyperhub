import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Calendar, Clock, RefreshCw, Flame, GraduationCap, Trophy, ChevronRight } from 'lucide-react';

interface ExamTarget {
  id: '12' | '9';
  gradeName: 'Khối 12' | 'Khối 9';
  examTitle: string;
  targetDate: Date;
  badge: string;
  themeColor: string;
  description: string;
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
    quote: 'Học tập là hạt giống của kiến thức, kiến thức là hạt giống của hạnh phúc.',
    author: 'Ngạn ngữ Gruzia',
    tag: 'Tri thức',
  },
  {
    quote: 'Đừng dừng lại khi mệt mỏi, hãy dừng lại khi bạn đã hoàn thành mục tiêu.',
    author: 'Khuyết danh',
    tag: 'Bền bỉ',
  },
  {
    quote: '12 năm đèn sách kết tinh trong một mùa thi. Hãy cố gắng hết sức mình để không phải nuối tiếc!',
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
    quote: 'Mỗi giờ bạn tập trung cao độ sẽ đổi lại sự tự tin tuyệt đối trong phòng thi.',
    author: 'HyperHub Community',
    tag: 'Tập trung',
  },
];

const EXAM_TARGETS: ExamTarget[] = [
  {
    id: '12',
    gradeName: 'Khối 12',
    examTitle: 'Kỳ Thi Tốt Nghiệp THPT Quốc Gia 2026',
    targetDate: new Date('2026-06-25T07:30:00+07:00'),
    badge: 'Chặng Đua Đại Học 🔥',
    themeColor: 'from-purple-600 via-pink-600 to-rose-600',
    description: 'Kỳ thi quan trọng nhất 12 năm học phổ thông. Ôn luyện mỗi ngày để đỗ nguyện vọng 1!',
  },
  {
    id: '9',
    gradeName: 'Khối 9',
    examTitle: 'Kỳ Thi Tuyển Sinh Vào Lớp 10 (2026 - 2027)',
    targetDate: new Date('2026-06-06T07:30:00+07:00'),
    badge: 'Cánh Cổng Cấp 3 🚀',
    themeColor: 'from-blue-600 via-indigo-600 to-cyan-600',
    description: 'Chinh phục ngôi trường cấp 3 và trường Chuyên mơ ước với kho đề tuyển sinh chọn lọc.',
  },
];

interface ExamCountdownProps {
  onNavigateTab?: (tab: 'vault' | 'get_exam' | 'submit_doc') => void;
}

export const ExamCountdown: React.FC<ExamCountdownProps> = ({ onNavigateTab }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<'12' | '9'>('12');
  const [quoteIndex, setQuoteIndex] = useState<number>(() =>
    Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)
  );
  const [isRotatingQuote, setIsRotatingQuote] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  // Cập nhật từng giây
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTarget = useMemo(
    () => EXAM_TARGETS.find((t) => t.id === selectedTargetId) || EXAM_TARGETS[0],
    [selectedTargetId]
  );

  // Tính toán thời gian chi tiết
  const timeBreakdown = useMemo(() => {
    const diffMs = currentTarget.targetDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      return {
        isFinished: true,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalDays: 0,
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const months = Math.floor(totalDays / 30.4375);
    const daysAfterMonths = totalDays % 30;
    const weeks = Math.floor(daysAfterMonths / 7);
    const days = daysAfterMonths % 7;

    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    return {
      isFinished: false,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      totalDays,
    };
  }, [currentTarget, now]);

  const handleNextQuote = () => {
    setIsRotatingQuote(true);
    setTimeout(() => {
      setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
      setIsRotatingQuote(false);
    }, 200);
  };

  const currentQuote = INSPIRATIONAL_QUOTES[quoteIndex];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Selector Khối Lớp */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-purple-950/40 to-slate-950/90 border border-purple-500/20 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
                Đồng Hồ Đếm Ngược Mùa Thi 2026
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <Flame className="w-3 h-3 text-pink-400" />
                {currentTarget.badge}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentTarget.examTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 dark:text-white/70 max-w-2xl leading-relaxed">
              {currentTarget.description}
            </p>
          </div>

          {/* Switcher Khối 12 / Khối 9 */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 shrink-0">
            <button
              onClick={() => setSelectedTargetId('12')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                selectedTargetId === '12'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Khối 12 (THPTQG)</span>
            </button>

            <button
              onClick={() => setSelectedTargetId('9')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                selectedTargetId === '9'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Khối 9 (Vào 10)</span>
            </button>
          </div>
        </div>

        {/* 2. Dòng Tóm Tắt Thời Gian Thực (Headline Countdown) */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-white/90">
            <span className="text-xl">⏳</span>
            <span>
              Chỉ còn{' '}
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
              giây là bước vào phòng thi!
            </span>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Mục tiêu: {currentTarget.targetDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* 3. Animation Từng Giây, Phút, Giờ, Ngày, Tuần, Tháng, Khối */}
        <div className="relative z-10 grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-4 mt-6">
          {/* Card: Tháng */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 text-center backdrop-blur-md transition-all duration-300 hover:border-purple-500/40 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-200">
              {timeBreakdown.months}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
              Tháng
            </div>
            <div className="h-0.5 w-6 bg-purple-500/50 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card: Tuần */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 text-center backdrop-blur-md transition-all duration-300 hover:border-pink-500/40 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-200">
              {timeBreakdown.weeks}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
              Tuần
            </div>
            <div className="h-0.5 w-6 bg-pink-500/50 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card: Ngày */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 text-center backdrop-blur-md transition-all duration-300 hover:border-rose-500/40 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white to-rose-200">
              {timeBreakdown.days}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
              Ngày
            </div>
            <div className="h-0.5 w-6 bg-rose-500/50 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card: Giờ */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 text-center backdrop-blur-md transition-all duration-300 hover:border-amber-500/40 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-4xl font-black font-mono text-amber-300">
              {timeBreakdown.hours.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
              Giờ
            </div>
            <div className="h-0.5 w-6 bg-amber-500/50 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card: Phút */}
          <div className="group relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 text-center backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/[0.04]">
            <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-300">
              {timeBreakdown.minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
              Phút
            </div>
            <div className="h-0.5 w-6 bg-emerald-500/50 mx-auto mt-2 rounded-full" />
          </div>

          {/* Card: Giây (Animation nhịp đập) */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-purple-900/40 to-pink-950/40 border border-pink-500/30 p-3 sm:p-4 text-center backdrop-blur-md shadow-lg shadow-pink-950/20">
            <div className="text-2xl sm:text-4xl font-black font-mono text-pink-400 animate-pulse">
              {timeBreakdown.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-300 mt-1">
              Giây
            </div>
            <div className="h-0.5 w-6 bg-pink-400 mx-auto mt-2 rounded-full animate-ping" />
          </div>
        </div>
      </div>

      {/* 4. Câu Nói Truyền Cảm Hứng Học Tập (Inspiration Quote Card) */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-slate-900/60 dark:bg-white/[0.02] border border-slate-800 dark:border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              <span className="text-xs text-slate-500 dark:text-white/40">• Lời nhắn hôm nay</span>
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-200 dark:text-white/90 italic">
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
          className="self-end md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 dark:text-white/70 hover:text-white border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRotatingQuote ? 'animate-spin' : ''}`} />
          <span>Đổi câu khác</span>
        </button>
      </div>

      {/* 5. Lối Tắt Nhanh (Quick Action Cards) */}
      {onNavigateTab && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigateTab('vault')}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Kho Lưu Trữ
              </div>
              <div className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Xem Tất Cả Đề Thi
              </div>
              <div className="text-xs text-slate-400">
                Lọc theo khối lớp & môn học
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => onNavigateTab('get_exam')}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-pink-950/30 to-slate-900/60 border border-pink-500/20 hover:border-pink-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                Bốc Đề Nhanh
              </div>
              <div className="text-sm sm:text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                Lấy Đề Ngẫu Nhiên
              </div>
              <div className="text-xs text-slate-400">
                Quay xúc xắc nhận 1 đề ôn luyện
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => onNavigateTab('submit_doc')}
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 to-slate-900/60 border border-blue-500/20 hover:border-blue-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Đóng Góp Tài Liệu
              </div>
              <div className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                Kho Nộp Đề Trực Tuyến
              </div>
              <div className="text-xs text-slate-400">
                Thả đề & Bot nhận dạng tự động
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      )}
    </div>
  );
};
