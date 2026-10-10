import React, { useState } from 'react';

interface CosmicCubeProps {
  size?: number; // kích thước cạnh (pixel)
  colorTheme?: 'purple' | 'cyan' | 'pink' | 'emerald' | 'amber';
  interactive?: boolean;
  showInnerCore?: boolean;
  rotationSpeed?: 'slow' | 'normal' | 'fast';
  className?: string;
  isFloating?: boolean;
}

export const CosmicCube: React.FC<CosmicCubeProps> = ({
  size = 64,
  colorTheme = 'purple',
  interactive = true,
  showInnerCore = true,
  rotationSpeed = 'normal',
  className = '',
  isFloating = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const half = size / 2;

  // Theme palettes
  const themeStyles = {
    purple: {
      border: 'border-purple-500/40 dark:border-purple-400/50',
      bg: 'bg-purple-900/10 dark:bg-purple-950/25',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
      coreGlow: 'bg-gradient-to-tr from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)]',
      cornerDot: 'bg-purple-400',
    },
    cyan: {
      border: 'border-cyan-500/40 dark:border-cyan-400/50',
      bg: 'bg-cyan-900/10 dark:bg-cyan-950/25',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
      coreGlow: 'bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]',
      cornerDot: 'bg-cyan-400',
    },
    pink: {
      border: 'border-pink-500/40 dark:border-pink-400/50',
      bg: 'bg-pink-900/10 dark:bg-pink-950/25',
      glow: 'shadow-[0_0_20px_rgba(236,72,153,0.35)]',
      coreGlow: 'bg-gradient-to-tr from-pink-500 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)]',
      cornerDot: 'bg-pink-400',
    },
    emerald: {
      border: 'border-emerald-500/40 dark:border-emerald-400/50',
      bg: 'bg-emerald-900/10 dark:bg-emerald-950/25',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
      coreGlow: 'bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]',
      cornerDot: 'bg-emerald-400',
    },
    amber: {
      border: 'border-amber-500/40 dark:border-amber-400/50',
      bg: 'bg-amber-900/10 dark:bg-amber-950/25',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
      coreGlow: 'bg-gradient-to-tr from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]',
      cornerDot: 'bg-amber-400',
    },
  }[colorTheme];

  // Face common classes (No backdrop-blur to ensure buttery 60-120fps hardware rendering)
  const faceBase = `absolute inset-0 border transition-all duration-300 ${themeStyles.border} ${themeStyles.bg}`;

  const speedClass = isHovered
    ? 'animate-spin-cube-fast'
    : rotationSpeed === 'slow'
    ? 'animate-spin-cube'
    : rotationSpeed === 'fast'
    ? 'animate-spin-cube-fast'
    : 'animate-spin-cube';

  return (
    <div
      aria-hidden="true"
      className={`relative select-none perspective-1000 ${isFloating ? 'animate-drift-1' : ''} ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
    >
      {/* 3D Cube Container */}
      <div
        className={`w-full h-full preserve-3d transition-transform duration-500 ${speedClass}`}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Inner Glowing Nucleus Core */}
        {showInnerCore && (
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-core-pulse ${themeStyles.coreGlow}`}
            style={{
              width: size * 0.35,
              height: size * 0.35,
              transform: 'translate3d(-50%, -50%, 0)',
            }}
          />
        )}

        {/* Front Face */}
        <div
          className={`${faceBase} ${themeStyles.glow}`}
          style={{ transform: `translateZ(${half}px)` }}
        >
          <div className="absolute inset-1.5 border border-white/10 rounded-sm" />
          <span className={`absolute top-1 left-1 w-1 h-1 rounded-full ${themeStyles.cornerDot}`} />
          <span className={`absolute bottom-1 right-1 w-1 h-1 rounded-full ${themeStyles.cornerDot}`} />
        </div>

        {/* Back Face */}
        <div
          className={`${faceBase}`}
          style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}
        >
          <div className="absolute inset-1.5 border border-white/10 rounded-sm" />
          <span className={`absolute top-1 right-1 w-1 h-1 rounded-full ${themeStyles.cornerDot}`} />
          <span className={`absolute bottom-1 left-1 w-1 h-1 rounded-full ${themeStyles.cornerDot}`} />
        </div>

        {/* Right Face */}
        <div
          className={`${faceBase}`}
          style={{ transform: `rotateY(90deg) translateZ(${half}px)` }}
        >
          <div className="absolute inset-1.5 border border-white/10 rounded-sm" />
        </div>

        {/* Left Face */}
        <div
          className={`${faceBase}`}
          style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }}
        >
          <div className="absolute inset-1.5 border border-white/10 rounded-sm" />
        </div>

        {/* Top Face */}
        <div
          className={`${faceBase}`}
          style={{ transform: `rotateX(90deg) translateZ(${half}px)` }}
        >
          <div className="absolute inset-1.5 border border-white/10 rounded-sm" />
        </div>

        {/* Bottom Face */}
        <div
          className={`${faceBase}`}
          style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }}
        >
          <div className="absolute inset-1.5 border border-white/10 rounded-sm" />
        </div>
      </div>
    </div>
  );
};
