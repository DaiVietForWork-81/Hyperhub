import React from 'react';
import { ArrowRight, Sparkles, BookOpen, Coffee, Users, Compass } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

export const Hero: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
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
          <div className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-950/20 backdrop-blur-md mb-6 sm:mb-8 shadow-[0_0_25px_rgba(139,92,246,0.2)] overflow-hidden">
            <div 
              className="absolute inset-0 opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.35), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 4s linear infinite',
              }}
            />
            <Sparkles className="relative z-10 w-3.5 h-3.5 text-pink-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="relative z-10 text-xs font-medium tracking-wide text-purple-300">
              Cộng Đồng Học Tập & Công Nghệ
            </span>
            <span className="relative z-10 h-1 w-1 rounded-full bg-purple-400/60"></span>
            <span className="relative z-10 text-xs font-semibold text-pink-400">Việt Nam</span>
          </div>
        </ScrollReveal>

        {/* HyperHub Big Main Title - With Animated Texture Flow & Atmospheric Aura */}
        <ScrollReveal delay={200}>
          <div className="relative mb-4 sm:mb-6 select-none inline-block">
            <div className="text-aura-halo">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                <span className="cosmic-text-flow">
                  HyperHub
                </span>
              </h1>
            </div>
          </div>
        </ScrollReveal>

        {/* Slogan: LEARN • CHILL • CONNECT with Animated Gradient Texture */}
        <ScrollReveal delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-lg sm:text-2xl md:text-3xl font-black tracking-[0.18em] uppercase mb-6 sm:mb-8">
            <span className="inline-block transform-gpu transition-transform duration-200 hover:scale-110 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">LEARN</span>
            </span>
            <span className="text-pink-500 font-normal animate-pulse select-none">•</span>
            <span className="inline-block transform-gpu transition-transform duration-200 hover:scale-110 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">CHILL</span>
            </span>
            <span className="text-pink-500 font-normal animate-pulse select-none">•</span>
            <span className="inline-block transform-gpu transition-transform duration-200 hover:scale-110 active:scale-95 cursor-default">
              <span className="cosmic-text-flow">CONNECT</span>
            </span>
          </div>
        </ScrollReveal>

        {/* 3 Core Meaning Pills (Learn - Chill - Connect) */}
        <ScrollReveal delay={400}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-2xl mx-auto mb-8 sm:mb-10 w-full px-2">
            <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/80 backdrop-blur-sm hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all">
              <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span><strong>Learn:</strong> Học hỏi & Thi đấu</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/80 backdrop-blur-sm hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all">
              <Coffee className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span><strong>Chill:</strong> Thư giãn & Học 1 mình</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/80 backdrop-blur-sm hover:border-fuchsia-500/50 hover:shadow-[0_0_15px_rgba(217,70,239,0.15)] transition-all">
              <Users className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
              <span><strong>Connect:</strong> Tham gia cộng đồng</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Welcome Description */}
        <ScrollReveal delay={500}>
          <p className="text-sm sm:text-base md:text-lg text-white/70 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed text-balance px-4">
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
              className="btn-shimmer group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-sm text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-xl shadow-purple-950/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Tham Gia Discord Ngay</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>

            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Cách Hoạt Động</span>
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
