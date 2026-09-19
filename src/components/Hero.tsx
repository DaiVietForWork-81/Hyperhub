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
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const SUBJECTS = [
  { name: "Toán Học", icon: Calculator, color: "text-blue-500 dark:text-blue-400", border: "hover:border-blue-400/60" },
  { name: "Ngữ Văn", icon: BookOpen, color: "text-rose-500 dark:text-rose-400", border: "hover:border-rose-400/60" },
  { name: "Tiếng Anh", icon: Globe, color: "text-sky-500 dark:text-sky-400", border: "hover:border-sky-400/60" },
  { name: "Vật Lý", icon: Zap, color: "text-amber-500 dark:text-amber-400", border: "hover:border-amber-400/60" },
  { name: "Hóa Học", icon: FlaskConical, color: "text-emerald-500 dark:text-emerald-400", border: "hover:border-emerald-400/60" },
  { name: "Sinh Học", icon: Dna, color: "text-green-500 dark:text-green-400", border: "hover:border-green-400/60" },
  { name: "Lịch Sử", icon: Hourglass, color: "text-orange-500 dark:text-orange-400", border: "hover:border-orange-400/60" },
  { name: "Địa Lý", icon: Compass, color: "text-teal-500 dark:text-teal-400", border: "hover:border-teal-400/60" },
  { name: "Tin Học", icon: Cpu, color: "text-indigo-500 dark:text-indigo-400", border: "hover:border-indigo-400/60" },
  { name: "Công Nghệ", icon: Laptop, color: "text-cyan-500 dark:text-cyan-400", border: "hover:border-cyan-400/60" },
  { name: "Giáo Dục Công Dân", icon: Scale, color: "text-purple-500 dark:text-purple-400", border: "hover:border-purple-400/60" },
  { name: "Python", icon: Terminal, color: "text-yellow-500 dark:text-yellow-400", border: "hover:border-yellow-400/60" },
  { name: "C / C++", icon: Code2, color: "text-blue-600 dark:text-blue-400", border: "hover:border-blue-500/60" },
  { name: "Lập Trình Thuật Toán", icon: Trophy, color: "text-pink-500 dark:text-pink-400", border: "hover:border-pink-400/60" },
  { name: "Khoa Học Dữ Liệu & AI", icon: Brain, color: "text-violet-500 dark:text-violet-400", border: "hover:border-violet-400/60" },
  { name: "Ôn Thi Chuyên & HSG", icon: Award, color: "text-fuchsia-500 dark:text-fuchsia-400", border: "hover:border-fuchsia-400/60" },
  { name: "Luyện Thi THPT QG", icon: GraduationCap, color: "text-red-500 dark:text-red-400", border: "hover:border-red-400/60" },
  { name: "Và Nhiều Môn Khác...", icon: Sparkles, color: "text-slate-500 dark:text-slate-400", border: "hover:border-purple-400/60" },
];

export const Hero: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      if (window.__lenis) {
        window.__lenis.scrollTo(el, { offset: -40, duration: 1.2 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section 
      id="hero" 
      className="relative min-h-[calc(100dvh-5rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-20 sm:py-24 md:py-28 overflow-hidden text-center w-full"
    >
      {/* Central Content Box - Fluid & Perfectly Centered */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto z-10 w-full">
        
        {/* Top Community Pill Badge */}
        <ScrollReveal delay={100}>
          <div className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-100/80 dark:bg-purple-950/20 backdrop-blur-md mb-6 sm:mb-8 shadow-sm dark:shadow-[0_0_25px_rgba(139,92,246,0.2)]">
            <Sparkles className="relative z-10 w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span className="relative z-10 text-xs font-medium tracking-wide text-purple-700 dark:text-purple-300 font-semibold">
              Cộng Đồng Học Tập & Công Nghệ
            </span>
            <span className="relative z-10 h-1 w-1 rounded-full bg-purple-500/60"></span>
            <span className="relative z-10 text-xs font-bold text-pink-600 dark:text-pink-400">Việt Nam</span>
          </div>
        </ScrollReveal>

        {/* HyperHub Big Main Title - With Animated Texture Flow & Atmospheric Aura */}
        <ScrollReveal delay={200}>
          <div className="relative mb-4 sm:mb-6 select-none inline-block">
            <div className="text-aura-halo">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none drop-shadow-sm dark:drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                <span className="cosmic-text-flow">
                  HyperHub
                </span>
              </h1>
            </div>
          </div>
        </ScrollReveal>

        {/* Slogan: LEARN • CHILL • CONNECT with Animated Gradient Texture */}
        <ScrollReveal delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-4 text-sm sm:text-xl md:text-2xl lg:text-3xl font-black tracking-[0.1em] sm:tracking-[0.18em] uppercase mb-6 sm:mb-8">
            <span className="inline-block transform-gpu transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">LEARN</span>
            </span>
            <span className="text-pink-500 font-normal animate-pulse select-none">•</span>
            <span className="inline-block transform-gpu transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">CHILL</span>
            </span>
            <span className="text-pink-500 font-normal animate-pulse select-none">•</span>
            <span className="inline-block transform-gpu transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">CONNECT</span>
            </span>
          </div>
        </ScrollReveal>

        {/* Animated Moving Stream of Subjects & Programming (Infinite Marquee) */}
        <ScrollReveal delay={400}>
          <div className="w-full max-w-4xl lg:max-w-5xl mx-auto mb-8 sm:mb-10 px-2 overflow-hidden select-none">
            <div className="relative py-1.5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="animate-marquee-infinite flex items-center gap-2.5 sm:gap-3 cursor-default">
                {[...SUBJECTS, ...SUBJECTS].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`${item.name}-${idx}`}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 bg-white/85 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-white/90 shadow-sm dark:shadow-none backdrop-blur-md transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 hover:shadow-md ${item.border}`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color} shrink-0`} />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Welcome Description */}
        <ScrollReveal delay={500}>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-white/70 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed text-balance px-4">
            Nơi học hỏi có rất nhiều tài liệu phong phú, là bệ phóng phát triển học Tin và hỗ trợ toàn diện các môn học khác dành cho bạn.
          </p>
        </ScrollReveal>

        {/* Action Buttons - Centered */}
        <ScrollReveal delay={600}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto px-4">
            <a
              href="https://discord.gg/D34HX87bGe"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-shimmer group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[50px] rounded-full font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-xl shadow-purple-900/30 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span>Tham Gia Discord Ngay</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
            </a>

            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[50px] rounded-full font-medium text-sm text-slate-800 dark:text-white/80 hover:text-purple-600 dark:hover:text-white bg-white/80 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-300 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500/50 shadow-sm dark:shadow-none hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:rotate-45 transition-transform duration-300" />
              <span>Cách Hoạt Động</span>
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
