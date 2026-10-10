import React, { useState } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI HÌNH HỌC 3D LƯỢNG TỬ (PURE 3D GEOMETRIC SHAPES)
// - Cầu nguyên tử (Atomic Sphere with electron orbits)
// - Cầu bình thường (Smooth 3D Sphere)
// - Vuông (3D Cube)
// - Chữ nhật (3D Rectangular Prism)
// - Tam giác (3D Pyramid / Tetrahedron)
// - Hình bình hành (3D Parallelogram)
// - Hình thang (3D Trapezoid)
// - Bát diện (3D Octahedron)
// ============================================================================

export type GeometricTheme = 'purple' | 'cyan' | 'pink' | 'emerald' | 'amber';

const THEMES = {
  purple: {
    primary: '#a855f7',
    secondary: '#d946ef',
    glow: 'rgba(168, 85, 247, 0.45)',
    border: '#c026d3',
    bg: 'rgba(147, 51, 234, 0.15)',
    accent: '#f5d0fe',
  },
  cyan: {
    primary: '#06b6d4',
    secondary: '#22d3ee',
    glow: 'rgba(6, 182, 212, 0.45)',
    border: '#0891b2',
    bg: 'rgba(6, 182, 212, 0.15)',
    accent: '#cffafe',
  },
  pink: {
    primary: '#ec4899',
    secondary: '#f43f5e',
    glow: 'rgba(236, 72, 153, 0.45)',
    border: '#db2777',
    bg: 'rgba(236, 72, 153, 0.15)',
    accent: '#fce7f3',
  },
  emerald: {
    primary: '#10b981',
    secondary: '#34d399',
    glow: 'rgba(16, 185, 129, 0.45)',
    border: '#059669',
    bg: 'rgba(16, 185, 129, 0.15)',
    accent: '#d1fae5',
  },
  amber: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.45)',
    border: '#d97706',
    bg: 'rgba(245, 158, 11, 0.15)',
    accent: '#fef3c7',
  },
};

interface BaseShapeProps {
  size?: number;
  theme?: GeometricTheme;
  isFloating?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

// ----------------------------------------------------------------------------
// 1. CẦU (NGUYÊN TỬ) - Atomic Sphere with 3 Orbiting Electron Rings
// ----------------------------------------------------------------------------
export const GeometricAtomSphere: React.FC<BaseShapeProps> = ({
  size = 54,
  theme = 'cyan',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];
  const r = size * 0.38;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Cầu Nguyên Tử 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-1' : ''
      } ${isHovered ? 'scale-115' : 'scale-100'} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Glow */}
      <div
        className="absolute rounded-full pointer-events-none -z-10 transition-opacity duration-300"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`,
          opacity: isHovered ? 0.9 : 0.45,
        }}
      />

      {/* SVG Atomic Nucleus & 3 Orbiting Electron Rings */}
      <svg viewBox="0 0 40 40" className="w-full h-full overflow-visible">
        {/* Orbit Ring 1 (60deg) */}
        <ellipse
          cx="20"
          cy="20"
          rx="18"
          ry="7"
          fill="none"
          stroke={t.primary}
          strokeWidth="1.2"
          opacity="0.7"
          transform="rotate(30 20 20)"
          className={isHovered ? 'animate-spin-cube-fast' : 'animate-spin-cube'}
        />
        {/* Orbit Ring 2 (-60deg) */}
        <ellipse
          cx="20"
          cy="20"
          rx="18"
          ry="7"
          fill="none"
          stroke={t.secondary}
          strokeWidth="1.2"
          opacity="0.7"
          transform="rotate(-40 20 20)"
          className={isHovered ? 'animate-spin-cube-fast' : 'animate-spin-cube-reverse'}
        />
        {/* Orbit Ring 3 (Horizontal) */}
        <ellipse
          cx="20"
          cy="20"
          rx="18"
          ry="6"
          fill="none"
          stroke={t.border}
          strokeWidth="1"
          opacity="0.5"
          transform="rotate(90 20 20)"
        />

        {/* Center Glowing Nucleus Sphere */}
        <defs>
          <radialGradient id={`atomGrad-${theme}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor={t.secondary} />
            <stop offset="100%" stopColor={t.primary} />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r={r} fill={`url(#atomGrad-${theme})`} />

        {/* Orbiting Electron Dots */}
        <circle cx="36" cy="18" r="2" fill="#ffffff" filter="drop-shadow(0 0 3px #ffffff)" />
        <circle cx="6" cy="24" r="2" fill={t.accent} />
        <circle cx="20" cy="5" r="1.8" fill="#ffffff" />
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 2. CẦU (BÌNH THƯỜNG) - Smooth Shaded 3D Sphere / Orb
// ----------------------------------------------------------------------------
export const GeometricSphere: React.FC<BaseShapeProps> = ({
  size = 48,
  theme = 'purple',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Cầu 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-2' : ''
      } ${isHovered ? 'scale-115' : 'scale-100'} ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full rounded-full transition-shadow duration-300"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${t.accent} 0%, ${t.secondary} 30%, ${t.primary} 70%, #060312 100%)`,
          boxShadow: isHovered
            ? `0 0 25px ${t.primary}, inset 0 0 10px rgba(255,255,255,0.4)`
            : `0 0 14px ${t.glow}`,
          border: `1px solid ${t.border}88`,
        }}
      />
    </div>
  );
};

// ----------------------------------------------------------------------------
// 3. VUÔNG (3D CUBE) - Pure Geometric Glass Cube
// ----------------------------------------------------------------------------
export const GeometricCube: React.FC<BaseShapeProps> = ({
  size = 50,
  theme = 'purple',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];
  const half = size / 2;

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    border: `1.5px solid ${t.primary}`,
    background: t.bg,
    boxShadow: `inset 0 0 12px ${t.glow}`,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Lập Phương 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none perspective-1000 cursor-pointer ${
        isFloating ? 'animate-drift-1' : ''
      } ${className}`}
      style={{ width: size * 1.3, height: size * 1.3 }}
    >
      <div
        className={`relative w-full h-full preserve-3d transition-transform duration-300 flex items-center justify-center ${
          isHovered ? 'scale-115 animate-spin-cube-fast' : 'scale-100 animate-spin-cube'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* 6 Clean 3D Geometric Faces */}
        <div style={{ ...faceStyle, transform: `translateZ(${half}px)` }} />
        <div style={{ ...faceStyle, transform: `rotateY(180deg) translateZ(${half}px)` }} />
        <div style={{ ...faceStyle, transform: `rotateY(90deg) translateZ(${half}px)` }} />
        <div style={{ ...faceStyle, transform: `rotateY(-90deg) translateZ(${half}px)` }} />
        <div style={{ ...faceStyle, transform: `rotateX(90deg) translateZ(${half}px)` }} />
        <div style={{ ...faceStyle, transform: `rotateX(-90deg) translateZ(${half}px)` }} />

        {/* Central Core */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.35,
            height: size * 0.35,
            background: t.primary,
            boxShadow: `0 0 12px ${t.secondary}`,
            transform: 'translateZ(0)',
          }}
        />
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 4. CHỮ NHẬT (3D RECTANGULAR PRISM) - Rectangular Box
// ----------------------------------------------------------------------------
export const GeometricRectPrism: React.FC<BaseShapeProps> = ({
  size = 52,
  theme = 'cyan',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];
  const w = size * 1.6;
  const h = size * 0.8;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Hộp Chữ Nhật 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-3' : ''
      } ${isHovered ? 'scale-115 rotate-6' : 'scale-100 rotate-0'} ${className}`}
      style={{ width: w, height: h }}
    >
      <svg viewBox="0 0 48 24" className="w-full h-full overflow-visible">
        {/* 3D Isometric Rectangular Slab */}
        <polygon points="4,8 34,8 44,14 14,14" fill={t.secondary} opacity="0.8" stroke={t.accent} strokeWidth="1" />
        <polygon points="4,8 14,14 14,22 4,16" fill={t.primary} opacity="0.9" stroke={t.border} strokeWidth="1" />
        <polygon points="14,14 44,14 44,22 14,22" fill={t.primary} opacity="0.65" stroke={t.border} strokeWidth="1" />
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 5. TAM GIÁC (3D PYRAMID / TETRAHEDRON) - Triangular Pyramid
// ----------------------------------------------------------------------------
export const GeometricPyramid: React.FC<BaseShapeProps> = ({
  size = 48,
  theme = 'amber',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Tam Giác Kim Tự Tháp 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-2' : ''
      } ${isHovered ? 'scale-115 -rotate-6' : 'scale-100 rotate-0'} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" className="w-full h-full overflow-visible">
        {/* Left facet */}
        <polygon points="18,4 4,28 18,31" fill={t.primary} stroke={t.border} strokeWidth="1.2" />
        {/* Right facet */}
        <polygon points="18,4 32,28 18,31" fill={t.secondary} stroke={t.accent} strokeWidth="1.2" />
        {/* Glowing apex point */}
        <circle cx="18" cy="4" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 4px #ffffff)" />
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 6. HÌNH BÌNH HÀNH (3D PARALLELOGRAM) - Parallelogram Facet
// ----------------------------------------------------------------------------
export const GeometricParallelogram: React.FC<BaseShapeProps> = ({
  size = 48,
  theme = 'pink',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Hình Bình Hành 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-1' : ''
      } ${isHovered ? 'scale-115 rotate-12' : 'scale-100 rotate-0'} ${className}`}
      style={{ width: size * 1.3, height: size * 0.9 }}
    >
      <svg viewBox="0 0 44 28" className="w-full h-full overflow-visible">
        {/* 3D Sheared Parallelogram */}
        <polygon
          points="10,4 40,4 34,24 4,24"
          fill={t.bg}
          stroke={t.primary}
          strokeWidth="1.6"
          filter={`drop-shadow(0 0 6px ${t.glow})`}
        />
        <line x1="16" y1="9" x2="36" y2="9" stroke={t.accent} strokeWidth="1" opacity="0.6" />
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 7. HÌNH THANG (3D TRAPEZOID) - Trapezoidal Prism
// ----------------------------------------------------------------------------
export const GeometricTrapezoid: React.FC<BaseShapeProps> = ({
  size = 48,
  theme = 'emerald',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Hình Thang 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-3' : ''
      } ${isHovered ? 'scale-115 rotate-[-8deg]' : 'scale-100 rotate-0'} ${className}`}
      style={{ width: size * 1.2, height: size * 0.9 }}
    >
      <svg viewBox="0 0 44 32" className="w-full h-full overflow-visible">
        {/* 3D Trapezoid (đáy nhỏ ở trên, đáy lớn ở dưới) */}
        <polygon
          points="12,6 32,6 40,26 4,26"
          fill={t.bg}
          stroke={t.primary}
          strokeWidth="1.6"
          filter={`drop-shadow(0 0 8px ${t.glow})`}
        />
        <polygon points="12,6 32,6 28,14 16,14" fill={t.secondary} opacity="0.4" />
      </svg>
    </div>
  );
};

// ----------------------------------------------------------------------------
// 8. BÁT DIỆN (3D OCTAHEDRON) - 8-Faced Diamond Crystal
// ----------------------------------------------------------------------------
export const GeometricOctahedron: React.FC<BaseShapeProps> = ({
  size = 50,
  theme = 'purple',
  isFloating = true,
  interactive = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const t = THEMES[theme];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Bát Diện 3D"
      onClick={onClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 ${
        isFloating ? 'animate-drift-1' : ''
      } ${isHovered ? 'scale-115 rotate-15' : 'scale-100 rotate-0'} ${className}`}
      style={{ width: size, height: size * 1.2 }}
    >
      <svg viewBox="0 0 32 38" className="w-full h-full overflow-visible">
        {/* Top-left */}
        <polygon points="16,2 4,19 16,21" fill={t.primary} stroke={t.border} strokeWidth="1" />
        {/* Top-right */}
        <polygon points="16,2 28,19 16,21" fill={t.secondary} stroke={t.accent} strokeWidth="1" />
        {/* Bottom-left */}
        <polygon points="16,36 4,19 16,21" fill={t.primary} opacity="0.75" stroke={t.border} strokeWidth="1" />
        {/* Bottom-right */}
        <polygon points="16,36 28,19 16,21" fill={t.secondary} opacity="0.85" stroke={t.accent} strokeWidth="1" />
        {/* Wireframe highlights */}
        <line x1="16" y1="2" x2="16" y2="36" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
        <line x1="4" y1="19" x2="28" y2="19" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
      </svg>
    </div>
  );
};
