import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

export interface ThemeTransitionState {
  isActive: boolean;
  currentTheme: Theme;
  targetTheme: Theme;
  stage: 'idle' | 'morphing' | 'fading-out';
  message: string;
}

interface ThemeCurtainProps {
  transition: ThemeTransitionState;
}

export const ThemeCurtain: React.FC<ThemeCurtainProps> = ({ transition }) => {
  // Only render when transition is active or fading out
  if (!transition.isActive && transition.stage === 'idle') {
    return null;
  }

  const isDarkTarget = transition.targetTheme === 'dark';
  const isFadingOut = transition.stage === 'fading-out';

  // Determine background animation class
  // If moving to dark: Trắng -> Đen dần -> Đen (tầm 2s)
  // If moving to light: Đen -> Trắng dần -> Trắng (tầm 2s)
  const getBackgroundClass = () => {
    if (isFadingOut) {
      return isDarkTarget ? 'bg-[#050508] text-white' : 'bg-[#ffffff] text-slate-900';
    }
    return isDarkTarget ? 'animate-morph-to-dark' : 'animate-morph-to-light';
  };

  return (
    <div
      id="theme-curtain"
      aria-hidden="true"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden select-none w-screen h-screen transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      } ${getBackgroundClass()}`}
    >
      {/* Ambient Radial Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500"
        style={{
          background: isDarkTarget
            ? 'radial-gradient(circle 700px at center, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.12) 40%, transparent 75%)'
            : 'radial-gradient(circle 700px at center, rgba(245, 158, 11, 0.22) 0%, rgba(236, 72, 153, 0.10) 40%, transparent 75%)',
        }}
      />

      {/* Decorative Technical Corner Labels */}
      <div className="absolute top-6 left-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        TRANSITION // 2.0S_SLOW_MORPH
      </div>
      <div className="absolute top-6 right-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        {isDarkTarget ? 'TARGET: OBSIDIAN_DARK' : 'TARGET: SOLAR_LIGHT'}
      </div>
      <div className="absolute bottom-6 left-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        HYPERHUB // MORPHING_ENGINE
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[11px] tracking-widest uppercase opacity-40">
        STATUS: SYNCHRONIZING
      </div>

      {/* Central Interactive Animation Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-lg mx-auto">
        
        {/* ======================================================== */}
        {/* SLOW 2S BLACK-AND-WHITE ECLIPSE DISK                     */}
        {/* ======================================================== */}
        <div className="relative mb-8">
          {/* Pulsing Aura Halo */}
          <div
            className={`absolute -inset-6 rounded-full blur-2xl opacity-75 animate-pulse-ring ${
              isDarkTarget
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600'
                : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400'
            }`}
          />

          {/* Orbit Dashed Ring */}
          <div
            className="absolute -inset-3.5 rounded-full border border-dashed opacity-40 animate-spin"
            style={{
              borderColor: isDarkTarget ? '#c084fc' : '#f59e0b',
              animationDuration: '10s',
            }}
          />

          {/* Duality Yin-Yang Disc rotating smoothly over 2s */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 shadow-2xl flex items-center justify-center transition-all duration-300 animate-eclipse-2s ${
              isDarkTarget
                ? 'bg-gradient-to-tr from-[#0f101d] via-[#1a1b2e] to-[#2e1065] border border-purple-500/40 shadow-purple-900/40'
                : 'bg-gradient-to-tr from-[#ffffff] via-[#fffbeb] to-[#fef3c7] border border-amber-300 shadow-amber-500/20'
            }`}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center shadow-inner">
              {/* Left Side: Deep Dark Obsidian Void */}
              <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#090a10] border-r border-purple-500/30 flex items-center justify-center">
                <Moon className="w-6 h-6 text-purple-300 -translate-x-1" />
              </div>

              {/* Right Side: Radiant Solar Dawn */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[#ffffff] flex items-center justify-center">
                <Sun className="w-6 h-6 text-amber-500 translate-x-1" />
              </div>

              {/* Center Core Dot */}
              <div className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-amber-400 shadow-md ring-2 ring-white/60" />
            </div>

            {/* Sparkle Accent */}
            <Sparkles
              className={`absolute -top-2 -right-2 w-6 h-6 animate-bounce ${
                isDarkTarget ? 'text-pink-400' : 'text-amber-500'
              }`}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* TEXT: "ĐỢI..." & CHUYỂN TRẮNG - ĐEN DẦN                  */}
        {/* ======================================================== */}
        <div className="space-y-3 mb-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-widest border transition-colors shadow-sm mb-1 bg-white/10 dark:bg-white/5 border-slate-400/30 dark:border-white/15">
            <span
              className={`w-2 h-2 rounded-full animate-ping ${
                isDarkTarget ? 'bg-purple-400' : 'bg-amber-500'
              }`}
            />
            <span className={isDarkTarget ? 'text-purple-300' : 'text-amber-600'}>
              {isDarkTarget
                ? 'TRẮNG ➔ ĐEN DẦN ➔ TỐI'
                : 'ĐEN ➔ TRẮNG DẦN ➔ SÁNG'}
            </span>
          </div>

          {/* Big Stylized "Đợi..." Title */}
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
            <span className="cosmic-text-flow font-extrabold">
              {transition.message || 'Đợi...'}
            </span>
          </h2>

          <p className="text-xs sm:text-sm font-sans tracking-wide font-medium opacity-85">
            {isDarkTarget
              ? 'Đang chuyển từ nền Trắng sang Đen dần trong 2 giây...'
              : 'Đang chuyển từ nền Đen sang Trắng dần trong 2 giây...'}
          </p>
        </div>

        {/* ======================================================== */}
        {/* 2-SECOND LINEAR LASER PROGRESS BAR                      */}
        {/* ======================================================== */}
        <div className="w-64 h-2 rounded-full overflow-hidden relative shadow-inner bg-slate-300/40 dark:bg-white/15">
          <div
            className={`h-full rounded-full animate-progress-2s ${
              isDarkTarget
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500'
                : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600'
            }`}
          />
        </div>

        {/* Footer Duration Badge */}
        <p className="mt-4 text-[11px] font-mono tracking-widest uppercase opacity-45">
          HYPERHUB // 2.0S CINEMATIC SHIFT
        </p>
      </div>
    </div>
  );
};

export default ThemeCurtain;
