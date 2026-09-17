import React, { useState } from 'react';
import { 
  UserCheck, 
  BookOpenCheck, 
  Swords, 
  Trophy, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Compass,
  Heart,
  Zap
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface StepItem {
  number: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderGlow: string;
  badgeGlow: string;
  perks: string[];
}

const STEPS: StepItem[] = [
  {
    number: '01',
    tag: 'GIA NHẬP & ROLE',
    title: 'Gia Nhập & Nhận Vai Trò',
    subtitle: 'Khởi đầu hành trình HyperHub',
    description: 'Tham gia Discord HyperHub, tự do chọn các role môn học bạn quan tâm (Tin học, Toán, Văn, Anh, Lý, Hóa, Sinh, Sử, Địa, Ngoại ngữ). Nhận thông báo sự kiện & tài liệu tức thì.',
    icon: UserCheck,
    accentColor: 'from-purple-500 to-indigo-500',
    borderGlow: 'hover:border-purple-500/80 shadow-[0_0_35px_rgba(168,85,247,0.35)]',
    badgeGlow: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    perks: ['Pick Role 1-Click', 'Hỗ trợ cả chuyên Tin & môn khác', 'Cộng đồng thân thiện'],
  },
  {
    number: '02',
    tag: 'TÀI LIỆU & CHILL',
    title: 'Kho Tài Liệu & Pomodoro',
    subtitle: 'Nâng cấp kiến thức mỗi ngày',
    description: 'Khám phá kho đề thi THPT, đề HSG có lời giải chọn lọc miễn phí. Bật mic, mở cam học cùng bạn bè hoặc đeo tai nghe chill tại phòng voice Pomodoro 24/7 với bot nhạc lofi.',
    icon: BookOpenCheck,
    accentColor: 'from-pink-500 to-rose-500',
    borderGlow: 'hover:border-pink-500/80 shadow-[0_0_35px_rgba(236,72,153,0.35)]',
    badgeGlow: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    perks: ['Thư viện đề thi HSG/Chuyên', 'Phòng học Pomodoro 24/7', 'Bot phát Lofi êm ái'],
  },
  {
    number: '03',
    tag: 'ĐẤU TRƯỜNG 1:1',
    title: 'Đấu Trường Sinh Tồn 2 Mạng',
    subtitle: 'Đối kháng thuật toán nghẹt thở',
    description: 'Bước vào phòng riêng biệt 1:1 so tài code trực tiếp. Cơ chế sinh tồn 2 mạng sống (❤️❤️), nộp sai trừ 1 mạng, bot Sandbox chấm bài siêu tốc mili-giây bảo đảm công bằng tuyệt đối.',
    icon: Swords,
    accentColor: 'from-amber-500 to-orange-500',
    borderGlow: 'hover:border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.35)]',
    badgeGlow: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    perks: ['Sinh Tồn 2 Mạng (❤️❤️)', 'Chấm Sandbox siêu tốc', 'Phân chia độ khó thông minh'],
  },
  {
    number: '04',
    tag: 'RANK ROLE & VINH DANH',
    title: 'Thăng Hạng & Cấp Rank Role',
    subtitle: 'Khẳng định thực lực & tỏa sáng',
    description: 'Tích lũy điểm Elo qua từng trận thắng đối kháng. Hệ thống tự động đồng bộ và cấp Rank Role tương ứng trên Discord từ Đồng đến Thách Đấu cùng các đặc quyền cộng đồng.',
    icon: Trophy,
    accentColor: 'from-cyan-400 to-blue-500',
    borderGlow: 'hover:border-cyan-400/80 shadow-[0_0_35px_rgba(34,211,238,0.35)]',
    badgeGlow: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    perks: ['Rank Role Discord tự động', 'Bảng xếp hạng vinh danh tuần', 'Đặc quyền phòng VIP'],
  },
];

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section 
      id="how-it-works" 
      className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 w-full"
    >
      {/* Section Header */}
      <ScrollReveal>
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/20 bg-purple-950/20 text-xs font-mono tracking-widest text-purple-300 uppercase mb-3 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
            <Compass className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>Lộ Trình Trải Nghiệm • How It Works</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-4 text-balance">
            Cách Hoạt Động Của <span className="cosmic-text-flow">HyperHub</span>
          </h2>

          <p className="text-sm sm:text-base text-white/70 max-w-2xl text-balance leading-relaxed mb-6">
            Từ lúc đặt chân vào máy chủ đến khi trở thành cao thủ đấu trường hoặc tìm được bạn cùng học lý tưởng, mọi thứ đều mượt mà và trực quan.
          </p>

          <div className="h-1 w-20 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 rounded-full"></div>

          {/* Quick Step Tabs / Tour Navigator */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-full bg-slate-100/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 backdrop-blur-md max-w-2xl w-full shadow-sm">
            {STEPS.map((step, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`flex-1 min-w-[120px] sm:min-w-0 py-2 px-3 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 scale-[1.02]'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="opacity-75">{step.number}.</span>
                  <span>{step.tag.split(' & ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* 4 Zoom-able Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch relative py-4">
        {STEPS.map((step, idx) => {
          const isFocused = activeStep === idx;
          const StepIcon = step.icon;

          return (
            <div
              key={step.number}
              onMouseEnter={() => setActiveStep(idx)}
              onClick={() => setActiveStep(idx)}
              className={`zoom-card-transition transform-gpu relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl cursor-pointer select-none border-2 ${
                isFocused
                  ? `scale-[1.02] sm:scale-[1.04] -translate-y-2 z-20 border-purple-500/80 bg-purple-50/95 dark:bg-gradient-to-b dark:from-purple-950/40 dark:to-slate-950/80 shadow-xl shadow-purple-500/15 dark:shadow-[0_0_35px_rgba(168,85,247,0.35)]`
                  : 'scale-100 z-10 opacity-90 hover:opacity-100 bg-white/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08] hover:border-purple-300 dark:hover:border-white/20 shadow-sm'
              } backdrop-blur-xl`}
            >
              {/* Top Accent Gradient Line */}
              <div 
                className={`absolute top-0 left-6 right-6 h-1 rounded-full bg-gradient-to-r ${step.accentColor} transition-opacity duration-300 ${
                  isFocused ? 'opacity-100' : 'opacity-40'
                }`}
              />

              {/* Card Top: Step number & Focus Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br ${step.accentColor} text-white shadow-lg shadow-purple-950/40`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-purple-600 dark:text-purple-300 uppercase block font-semibold">
                      BƯỚC {step.number}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${step.badgeGlow}`}>
                      {step.tag}
                    </span>
                  </div>
                </div>

                {isFocused && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950/40 px-2 py-0.5 rounded-full border border-pink-300 dark:border-pink-500/30 animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    ĐANG XEM
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300/80 mb-3.5">
                  {step.subtitle}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed font-sans mb-4">
                  {step.description}
                </p>

                {/* Perk Checklist */}
                <div className="space-y-2 mt-auto pt-4 border-t border-slate-200/80 dark:border-white/10">
                  {step.perks.map((perk, perkIdx) => (
                    <div key={perkIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isFocused ? 'text-green-500 dark:text-green-400' : 'text-purple-500 dark:text-purple-400'}`} />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Action indication */}
              <div className="pt-2 flex items-center justify-between text-xs font-semibold">
                <span className={`transition-colors ${isFocused ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>
                  {idx === 0 && 'Role chọn tự do'}
                  {idx === 1 && 'Học 24/7'}
                  {idx === 2 && 'Sinh tồn 2 ❤️❤️'}
                  {idx === 3 && 'Lên Rank Discord'}
                </span>
                <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isFocused ? 'translate-x-1 text-pink-500 dark:text-pink-400' : 'text-slate-400 dark:text-white/40'}`} />
              </div>

              {/* Special interactive detail for Step 03: Arena Heart Indicator */}
              {idx === 2 && (
                <div className="mt-3 py-1.5 px-2.5 rounded-xl bg-red-950/40 border border-red-500/20 flex items-center justify-center gap-1.5 text-[11px] text-red-300">
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                  <span className="font-mono font-bold ml-1">2 LIVES BATTLE</span>
                </div>
              )}

              {/* Special interactive detail for Step 04: Fast role badge */}
              {idx === 3 && (
                <div className="mt-3 py-1.5 px-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center gap-1.5 text-[11px] text-cyan-300">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono font-bold">DISCORD BOT RANK ROLE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Sub-CTA */}
      <div className="mt-12 text-center">
        <a
          href="https://discord.gg/D34HX87bGe"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-purple-300 hover:text-pink-300 transition-colors"
        >
          <span>Sẵn sàng trải nghiệm quy trình cùng HyperHub?</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
};
