import React from 'react';
import { Sun, Moon, Sparkles, Wand2 } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

export interface ThemeTransitionState {
  isActive: boolean;
  currentTheme: Theme;
  targetTheme: Theme;
  stage: 'idle' | 'entering' | 'holding' | 'exiting';
  message: string;
}

interface ThemeCurtainProps {
  transition: ThemeTransitionState;
}

export const ThemeCurtain: React.FC<ThemeCurtainProps> = ({ transition }) => {
  // Only render when transition is active or animating
  if (!transition.isActive && transition.stage === 'idle') {
    return null;
  }

  const isDarkTarget = transition.targetTheme === 'dark';

  // Determine curtain transform animation based on stage
  const getStageClass = () => {
    switch (transition.stage) {
      case 'entering':
        return 'animate-curtain-in';
      case 'holding':
        return 'translate-y-0';
      case 'exiting':
        return 'animate-curtain-out';
      default:
        return 'translate-y-0';
    }
  };

  return (
    <div
      id="theme-curtain"
      aria-hidden="true"
      className={`fixed inset-0 z-[999999] pointer-events-auto flex flex-col items-center justify-center overflow-hidden select-none w-screen h-screen ${
        isDarkTarget
          ? 'bg-[#050508] text-white'
          : 'bg-[#ffffff] text-slate-900'
      } ${getStageClass()}`}
    >
      {/* Background Radial Glow & Atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300"
        style={{
          background: isDarkTarget
            ? 'radial-gradient(circle 700px at center, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.12) 40%, transparent 75%)'
            : 'radial-gradient(circle 700px at center, rgba(245, 158, 11, 0.20) 0%, rgba(236, 72, 153, 0.10) 40%, transparent 75%)',
        }}
      />

      {/* Decorative Subtle Corner Guides */}
      <div className="absolute top-6 left-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        SYS.THEME // {isDarkTarget ? 'DARK_MODE' : 'LIGHT_MODE'}
      </div>
      <div className="absolute top-6 right-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        TRANSITION // 100%
      </div>
      <div className="absolute bottom-6 left-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        HYPERHUB CORE
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        ZERO_LATENCY
      </div>

      {/* Central Interactive Animation Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto">
        
        {/* ======================================================== */}
        {/* DUAL BLACK-AND-WHITE MORPHING EMBLEM ("animation chuyển trắng đen") */}
        {/* ======================================================== */}
        <div className="relative mb-8 group">
          {/* Pulsing Aura Rings */}
          <div
            className={`absolute -inset-6 rounded-full blur-2xl opacity-70 animate-pulse-ring ${
              isDarkTarget
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600'
                : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400'
            }`}
          />

          {/* Secondary Orbit Ring */}
          <div
            className="absolute -inset-3 rounded-full border border-dashed opacity-40 animate-spin"
            style={{
              borderColor: isDarkTarget ? '#c084fc' : '#f59e0b',
              animationDuration: '14s',
            }}
          />

          {/* Central Yin-Yang / Day-Night Disc */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 shadow-2xl flex items-center justify-center transition-all duration-300 ${
              isDarkTarget
                ? 'bg-gradient-to-tr from-[#0f101d] via-[#1a1b2e] to-[#2e1065] border border-purple-500/40 shadow-purple-900/40'
                : 'bg-gradient-to-tr from-[#ffffff] via-[#fffbeb] to-[#fef3c7] border border-amber-300 shadow-amber-500/20'
            }`}
          >
            {/* Spinning Duality Disc */}
            <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center animate-yin-yang shadow-inner">
              {/* Left Half: Obsidian Cosmic Void (Dark) */}
              <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#090a10] border-r border-purple-500/30 flex items-center justify-center">
                <Moon className="w-6 h-6 text-purple-300 -translate-x-1" />
              </div>

              {/* Right Half: Radiant Solar Dawn (Light) */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[#ffffff] flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-500 translate-x-1" />
              </div>

              {/* Center Morph Core Pin */}
              <div className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-amber-400 shadow-md ring-2 ring-white/50" />
            </div>

            {/* Floating Sparkle Accents */}
            <Sparkles
              className={`absolute -top-2 -right-2 w-6 h-6 animate-bounce ${
                isDarkTarget ? 'text-pink-400' : 'text-amber-500'
              }`}
            />
            <Wand2
              className={`absolute -bottom-1 -left-2 w-5 h-5 opacity-70 ${
                isDarkTarget ? 'text-purple-400' : 'text-rose-500'
              }`}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* TEXT "ĐỢI..." & STATUS BADGES ("hiện chữ 'Đợi' hoặc chữ khác") */}
        {/* ======================================================== */}
        <div className="space-y-3 mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-widest border transition-colors shadow-sm mb-1 bg-white/5 dark:bg-white/5 border-slate-300 dark:border-white/10">
            <span
              className={`w-2 h-2 rounded-full animate-ping ${
                isDarkTarget ? 'bg-purple-400' : 'bg-amber-500'
              }`}
            />
            <span className={isDarkTarget ? 'text-purple-300' : 'text-amber-600'}>
              {isDarkTarget ? 'CHUYỂN SANG CHẾ ĐỘ TỐI' : 'CHUYỂN SANG CHẾ ĐỘ SÁNG'}
            </span>
          </div>

          {/* Big Bold Headline: "Đợi..." */}
          <h2
            className={`text-4xl sm:text-6xl font-black tracking-tight leading-none ${
              isDarkTarget ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span className="cosmic-text-flow font-extrabold">
              {transition.message || 'Đợi...'}
            </span>
          </h2>

          <p
            className={`text-xs sm:text-sm font-sans tracking-wide font-medium ${
              isDarkTarget ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Đang đồng bộ giao diện và làm mượt không gian hiển thị...
          </p>
        </div>

        {/* ======================================================== */}
        {/* PROGRESS LASER SHIMMER BAR */}
        {/* ======================================================== */}
        <div className="w-56 h-2 rounded-full overflow-hidden relative shadow-inner bg-slate-200 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 animate-[shimmer_1.1s_infinite] ${
              isDarkTarget
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500'
                : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600'
            }`}
            style={{ width: '100%' }}
          />
        </div>

        {/* Micro Subtext */}
        <p
          className={`mt-4 text-[12px] font-mono tracking-widest uppercase ${
            isDarkTarget ? 'text-white/40' : 'text-slate-400'
          }`}
        >
          HYPERHUB // SEAMLESS THEME ENGINE
        </p>
      </div>
    </div>
  );
};
export default ThemeCurtain;
