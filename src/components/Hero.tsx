import React from 'react';
import {
  ArrowRight,
  Sparkles,
  Compass,
  Calculator,
  BookOpen,
  Globe,
  Zap,
  FlaskConical,
  Dna,
  Hourglass,
  Cpu,
  Laptop,
  Scale,
  Terminal,
  Code2,
  Trophy,
  Brain,
  Award,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const ROW1_SUBJECTS = [
  { name: "Toán Học", icon: Calculator, color: "text-blue-400", border: "border-blue-500/20" },
  { name: "Ngữ Văn", icon: BookOpen, color: "text-rose-400", border: "border-rose-500/20" },
  { name: "Tiếng Anh", icon: Globe, color: "text-sky-400", border: "border-sky-500/20" },
  { name: "Vật Lý", icon: Zap, color: "text-amber-400", border: "border-amber-500/20" },
  { name: "Hóa Học", icon: FlaskConical, color: "text-emerald-400", border: "border-emerald-500/20" },
  { name: "Sinh Học", icon: Dna, color: "text-green-400", border: "border-green-500/20" },
  { name: "Lịch Sử", icon: Hourglass, color: "text-orange-400", border: "border-orange-500/20" },
  { name: "Địa Lý", icon: Compass, color: "text-teal-400", border: "border-teal-500/20" },
  { name: "Giáo Dục Công Dân", icon: Scale, color: "text-purple-400", border: "border-purple-500/20" },
  { name: "Công Nghệ", icon: Laptop, color: "text-cyan-400", border: "border-cyan-500/20" },
  { name: "Tin Học", icon: Cpu, color: "text-indigo-400", border: "border-indigo-500/20" },
  { name: "Khoa Học Tự Nhiên", icon: Sparkles, color: "text-emerald-400", border: "border-emerald-500/20" },
  { name: "Khoa Học Xã Hội", icon: BookOpen, color: "text-pink-400", border: "border-pink-500/20" },
];

const ROW2_SUBJECTS = [
  { name: "Python", icon: Terminal, color: "text-yellow-400", border: "border-yellow-500/20" },
  { name: "C / C++", icon: Code2, color: "text-blue-400", border: "border-blue-500/20" },
  { name: "Lập Trình Thuật Toán", icon: Trophy, color: "text-pink-400", border: "border-pink-500/20" },
  { name: "Lập Trình Cơ Bản & Nâng Cao", icon: Code2, color: "text-cyan-400", border: "border-cyan-500/20" },
  { name: "Khoa Học Dữ Liệu & AI", icon: Brain, color: "text-violet-400", border: "border-violet-500/20" },
  { name: "Phát Triển Web & Phần Mềm", icon: Laptop, color: "text-sky-400", border: "border-sky-500/20" },
  { name: "Ôn Thi Chuyên & HSG", icon: Award, color: "text-fuchsia-400", border: "border-fuchsia-500/20" },
  { name: "Luyện Thi THPT Quốc Gia", icon: GraduationCap, color: "text-red-400", border: "border-red-500/20" },
  { name: "Olympic Tin Học & Toán", icon: Trophy, color: "text-amber-400", border: "border-amber-500/20" },
  { name: "Và Nhiều Chuyên Đề Khác...", icon: Sparkles, color: "text-purple-300", border: "border-purple-500/20" },
];

interface HeroProps {
  onOpenDashboard?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDashboard }) => {
  return (
    <section 
      id="hero" 
      className="relative min-h-[calc(100dvh-3.5rem)] flex flex-col justify-start items-center px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-8 overflow-hidden text-center w-full"
    >
      {/* Central Content Box - Fluid & Lifted Upwards (To-Vừa) with Viewport Height Adaptability */}
      <div className="flex flex-col items-center max-w-5xl lg:max-w-6xl mx-auto z-10 w-full">
        
        {/* Top Community Pill Badge */}
        <ScrollReveal initialVisible={true} delay={50}>
          <div className="group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full border border-purple-500/30 bg-purple-950/30 backdrop-blur-md mb-2 sm:mb-2.5 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <Sparkles className="relative z-10 w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400" />
            <span className="relative z-10 text-[10px] sm:text-xs tracking-wide text-purple-300 font-semibold">
              Cộng Đồng Học Tập & Công Nghệ
            </span>
            <span className="relative z-10 h-1 w-1 rounded-full bg-purple-500/60"></span>
            <span className="relative z-10 text-[10px] sm:text-xs font-bold text-pink-400">Việt Nam</span>
          </div>
        </ScrollReveal>

        {/* Orbit Big Main Title - With Server Icon On Top */}
        <ScrollReveal initialVisible={true} delay={100}>
          <div className="relative mb-1 sm:mb-2 select-none flex flex-col items-center">
            {/* 2D Orbit Server Icon Badge - Fluidly Sized to fit viewport adaptively across all ratios */}
            <div className="mb-1 sm:mb-1.5 relative group cursor-pointer inline-flex items-center justify-center">
              {/* Soft Cosmic Aura Glow */}
              <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-tr from-purple-600/50 via-fuchsia-600/40 to-pink-500/40 rounded-full blur-xl sm:blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <img
                src="/server_icon.png"
                alt="Orbit Server Icon"
                className="relative z-10 h-[clamp(65px,11vh,115px)] w-[clamp(65px,11vh,115px)] sm:h-[clamp(75px,13vh,135px)] sm:w-[clamp(75px,13vh,135px)] object-contain filter drop-shadow-[0_12px_28px_rgba(168,85,247,0.55)] group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>

            <div className="text-aura-halo">
              <h1 className="text-[clamp(2.1rem,5vh,3.8rem)] font-black tracking-tight leading-none drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                <span className="cosmic-text-flow">
                  Orbit
                </span>
              </h1>
            </div>
          </div>
        </ScrollReveal>

        {/* Slogan: LEARN • GROW • CONNECT with Animated Gradient Texture */}
        <ScrollReveal initialVisible={true} delay={150}>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-[clamp(0.72rem,1.7vh,1.1rem)] font-black tracking-[0.1em] sm:tracking-[0.15em] uppercase mb-1 sm:mb-1.5 text-white">
            <span className="inline-block transform-gpu transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">LEARN</span>
            </span>
            <span className="text-pink-500 font-normal animate-pulse select-none">•</span>
            <span className="inline-block transform-gpu transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">GROW</span>
            </span>
            <span className="text-pink-500 font-normal animate-pulse select-none">•</span>
            <span className="inline-block transform-gpu transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">CONNECT</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] sm:text-[11px] text-purple-300 font-medium mb-2.5 sm:mb-3">
            <span className="font-semibold text-white">Different paths. One orbit.</span>
            <span className="text-pink-400">•</span>
            <span className="text-purple-200/80">Những con đường khác nhau. Cùng một quỹ đạo.</span>
          </div>
        </ScrollReveal>

        {/* Dual Animated Moving Stream of Subjects & Programming */}
        <ScrollReveal initialVisible={true} delay={200}>
          <div className="w-full max-w-5xl lg:max-w-6xl mx-auto mb-2.5 sm:mb-3.5 px-2 overflow-hidden select-none pointer-events-none">
            <div className="relative space-y-1.5 py-0.5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              {/* Row 1: Leftward Stream */}
              <div className="animate-marquee-left flex items-center gap-2 transform-gpu will-change-transform">
                {[...ROW1_SUBJECTS, ...ROW1_SUBJECTS].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`row1-${item.name}-${idx}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 bg-[#12131f]/95 border ${item.border} text-white/90 shadow-sm`}
                    >
                      <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${item.color} shrink-0`} />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>

              {/* Row 2: Rightward Stream */}
              <div className="animate-marquee-right flex items-center gap-2 transform-gpu will-change-transform">
                {[...ROW2_SUBJECTS, ...ROW2_SUBJECTS].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`row2-${item.name}-${idx}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 bg-[#12131f]/95 border ${item.border} text-white/90 shadow-sm`}
                    >
                      <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${item.color} shrink-0`} />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Welcome Description */}
        <ScrollReveal initialVisible={true} delay={250}>
          <p className="text-[clamp(0.72rem,1.5vh,0.875rem)] text-white/75 max-w-xl mx-auto mb-3 sm:mb-4 leading-relaxed line-clamp-2 px-4">
            Mỗi người có một quỹ đạo riêng, nhưng chúng ta gặp nhau tại <span className="text-white font-semibold">Orbit</span> để học hỏi, bứt phá năng lực và cùng nhau tiến xa hơn trên hành trình tri thức.
          </p>
        </ScrollReveal>

        {/* Action Buttons - Centered */}
        <ScrollReveal initialVisible={true} delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto px-4">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="ux-btn-liquid btn-shimmer group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-2 sm:py-2.5 min-h-[42px] sm:min-h-[44px] rounded-full font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/40 hover:shadow-[0_0_30px_rgba(236,72,153,0.45)] cursor-pointer"
            >
              <span>Vào Bảng Điều Khiển & Lấy Đề</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
            </button>

            <a
              href="https://discord.gg/D34HX87bGe"
              target="_blank"
              rel="noopener noreferrer"
              className="ux-btn-liquid group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 min-h-[42px] sm:min-h-[44px] rounded-full font-medium text-xs sm:text-sm text-white/90 hover:text-white bg-white/[0.04] border border-white/10 hover:border-purple-500/50 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
              <span>Tham Gia Discord</span>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Hero;
