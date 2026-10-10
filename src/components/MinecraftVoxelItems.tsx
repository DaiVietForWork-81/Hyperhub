import React, { useState } from 'react';

// ============================================================================
// 1. MINECRAFT VOXEL BLOCK (Diamond, Ender, Redstone, Emerald, Crafting)
// ============================================================================

export type MinecraftBlockType = 'diamond' | 'ender' | 'redstone' | 'emerald' | 'crafting' | 'gold';

interface MinecraftBlockProps {
  type?: MinecraftBlockType;
  size?: number; // pixel width/height (default: 56)
  interactive?: boolean;
  isFloating?: boolean;
  showParticles?: boolean;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export const MinecraftBlock: React.FC<MinecraftBlockProps> = ({
  type = 'diamond',
  size = 56,
  interactive = true,
  isFloating = true,
  showParticles = true,
  label,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const half = size / 2;

  // Block Theme Configurations (Pure CSS/SVG Voxel Patterns)
  const blockConfig = {
    diamond: {
      name: 'Khối Kim Cương',
      baseBg: '#1e2430',
      borderColor: '#38bdf8',
      oreColor1: '#38bdf8',
      oreColor2: '#7dd3fc',
      oreColor3: '#0284c7',
      glow: 'rgba(56, 189, 248, 0.4)',
      particleColor: '#38bdf8',
    },
    ender: {
      name: 'Khối Ender Obsidian',
      baseBg: '#130924',
      borderColor: '#d946ef',
      oreColor1: '#d946ef',
      oreColor2: '#f0abfc',
      oreColor3: '#9333ea',
      glow: 'rgba(217, 70, 239, 0.45)',
      particleColor: '#c026d3',
    },
    redstone: {
      name: 'Khối Đá Đỏ',
      baseBg: '#261417',
      borderColor: '#ef4444',
      oreColor1: '#ef4444',
      oreColor2: '#fca5a5',
      oreColor3: '#b91c1c',
      glow: 'rgba(239, 68, 68, 0.45)',
      particleColor: '#ef4444',
    },
    emerald: {
      name: 'Khối Ngọc Lục Bảo',
      baseBg: '#14261d',
      borderColor: '#10b981',
      oreColor1: '#10b981',
      oreColor2: '#6ee7b7',
      oreColor3: '#047857',
      glow: 'rgba(16, 185, 129, 0.4)',
      particleColor: '#10b981',
    },
    gold: {
      name: 'Khối Vàng Ròng',
      baseBg: '#2a2211',
      borderColor: '#f59e0b',
      oreColor1: '#fbbf24',
      oreColor2: '#fde68a',
      oreColor3: '#d97706',
      glow: 'rgba(245, 158, 11, 0.4)',
      particleColor: '#fbbf24',
    },
    crafting: {
      name: 'Bàn Chế Tạo',
      baseBg: '#452b16',
      borderColor: '#b45309',
      oreColor1: '#d97706',
      oreColor2: '#f59e0b',
      oreColor3: '#92400e',
      glow: 'rgba(180, 83, 9, 0.35)',
      particleColor: '#f59e0b',
    },
  }[type];

  // Minecraft 16-Grid Voxel Ore Pixel Matrix
  const renderPixelMatrix = () => {
    return (
      <svg
        viewBox="0 0 16 16"
        className="w-full h-full"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* Base stone voxel background */}
        <rect width="16" height="16" fill={blockConfig.baseBg} />
        {/* Pixel stone texture noise */}
        <rect x="0" y="0" width="16" height="1" fill="rgba(255,255,255,0.12)" />
        <rect x="0" y="0" width="1" height="16" fill="rgba(255,255,255,0.12)" />
        <rect x="0" y="15" width="16" height="1" fill="rgba(0,0,0,0.4)" />
        <rect x="15" y="0" width="1" height="16" fill="rgba(0,0,0,0.4)" />

        {/* Scattered stone tiles */}
        <rect x="2" y="2" width="3" height="2" fill="rgba(255,255,255,0.06)" />
        <rect x="10" y="11" width="3" height="2" fill="rgba(0,0,0,0.2)" />
        <rect x="1" y="9" width="2" height="3" fill="rgba(255,255,255,0.04)" />

        {/* Ore Gem Clusters (Voxel Diamond / Ender / Redstone) */}
        {type !== 'crafting' ? (
          <>
            {/* Cluster 1: Top-Left */}
            <rect x="4" y="3" width="3" height="3" fill={blockConfig.oreColor1} />
            <rect x="5" y="3" width="1" height="1" fill={blockConfig.oreColor2} />
            <rect x="6" y="5" width="2" height="1" fill={blockConfig.oreColor3} />

            {/* Cluster 2: Center-Right */}
            <rect x="9" y="6" width="3" height="4" fill={blockConfig.oreColor1} />
            <rect x="10" y="7" width="1" height="2" fill={blockConfig.oreColor2} />
            <rect x="11" y="9" width="2" height="1" fill={blockConfig.oreColor3} />

            {/* Cluster 3: Bottom-Left */}
            <rect x="3" y="10" width="4" height="3" fill={blockConfig.oreColor1} />
            <rect x="4" y="10" width="2" height="1" fill={blockConfig.oreColor2} />
            <rect x="6" y="12" width="2" height="1" fill={blockConfig.oreColor3} />
          </>
        ) : (
          /* Crafting Table Top Grid (3x3 grid) */
          <>
            <rect x="2" y="2" width="12" height="12" fill="#78350f" />
            <line x1="6" y1="2" x2="6" y2="14" stroke="#451a03" strokeWidth="0.8" />
            <line x1="10" y1="2" x2="10" y2="14" stroke="#451a03" strokeWidth="0.8" />
            <line x1="2" y1="6" x2="14" y2="6" stroke="#451a03" strokeWidth="0.8" />
            <line x1="2" y1="10" x2="14" y2="10" stroke="#451a03" strokeWidth="0.8" />
            <rect x="3" y="3" width="2" height="2" fill="#fbbf24" opacity="0.8" />
            <rect x="7" y="7" width="2" height="2" fill="#ef4444" opacity="0.8" />
          </>
        )}
      </svg>
    );
  };

  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    border: `1.5px solid ${blockConfig.borderColor}55`,
    backfaceVisibility: 'visible',
    contain: 'strict',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${blockConfig.name} Minecraft`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      onTouchStart={() => interactive && setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 1500)}
      className={`group relative flex flex-col items-center justify-center select-none perspective-1000 ${
        isFloating ? 'animate-drift-1' : ''
      } ${className}`}
      style={{
        width: size * 1.5,
        height: size * 1.5,
      }}
    >
      {/* Dynamic Aura Glow (Non-blocking GPU hardware layer) */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-300 -z-10 ${
          isHovered ? 'scale-125 opacity-80' : 'scale-90 opacity-40'
        }`}
        style={{
          width: size * 1.4,
          height: size * 1.4,
          background: `radial-gradient(circle, ${blockConfig.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Floating Minecraft XP/Sparkle Motes on Hover */}
      {showParticles && isHovered && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <span
            className="absolute w-2 h-2 rounded-xs animate-ender-mote"
            style={{
              backgroundColor: blockConfig.particleColor,
              boxShadow: `0 0 8px ${blockConfig.particleColor}`,
              left: '25%',
              top: '60%',
              animationDelay: '0s',
            }}
          />
          <span
            className="absolute w-1.5 h-1.5 rounded-xs animate-ender-mote"
            style={{
              backgroundColor: '#ffffff',
              boxShadow: `0 0 6px #ffffff`,
              left: '70%',
              top: '55%',
              animationDelay: '0.4s',
            }}
          />
          <span
            className="absolute w-2 h-2 rounded-xs animate-ender-mote"
            style={{
              backgroundColor: blockConfig.particleColor,
              boxShadow: `0 0 8px ${blockConfig.particleColor}`,
              left: '50%',
              top: '75%',
              animationDelay: '0.8s',
            }}
          />
        </div>
      )}

      {/* 3D Voxel Cube Container */}
      <div
        className={`relative preserve-3d transition-transform duration-300 ease-out ${
          isHovered ? 'scale-115' : 'scale-100'
        }`}
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className={`w-full h-full preserve-3d ${
            isHovered ? 'animate-spin-cube-fast' : 'animate-spin-cube'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Face */}
          <div
            style={{
              ...faceStyle,
              transform: `translateZ(${half}px)`,
            }}
          >
            {renderPixelMatrix()}
          </div>

          {/* Back Face */}
          <div
            style={{
              ...faceStyle,
              transform: `rotateY(180deg) translateZ(${half}px)`,
            }}
          >
            {renderPixelMatrix()}
          </div>

          {/* Right Face */}
          <div
            style={{
              ...faceStyle,
              transform: `rotateY(90deg) translateZ(${half}px)`,
            }}
          >
            {renderPixelMatrix()}
          </div>

          {/* Left Face */}
          <div
            style={{
              ...faceStyle,
              transform: `rotateY(-90deg) translateZ(${half}px)`,
            }}
          >
            {renderPixelMatrix()}
          </div>

          {/* Top Face */}
          <div
            style={{
              ...faceStyle,
              transform: `rotateX(90deg) translateZ(${half}px)`,
            }}
          >
            {renderPixelMatrix()}
          </div>

          {/* Bottom Face */}
          <div
            style={{
              ...faceStyle,
              transform: `rotateX(-90deg) translateZ(${half}px)`,
            }}
          >
            {renderPixelMatrix()}
          </div>
        </div>
      </div>

      {/* Optional Label Badge */}
      {label && (
        <span
          className={`mt-2 font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-md border transition-all duration-200 ${
            isHovered
              ? 'text-white bg-black/80 border-purple-500 shadow-md'
              : 'text-white/60 bg-black/50 border-white/10'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 2. MINECRAFT ENCHANTED BOOK (Cuốn Sách Phù Phép Tri Thức)
// ============================================================================

interface MinecraftEnchantedBookProps {
  size?: number; // default: 60
  label?: string;
  isFloating?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MinecraftEnchantedBook: React.FC<MinecraftEnchantedBookProps> = ({
  size = 60,
  label,
  isFloating = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Cuốn Sách Phù Phép Minecraft HyperHub"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col items-center justify-center cursor-pointer select-none perspective-600 ${
        isFloating ? 'animate-drift-2' : ''
      } ${className}`}
      style={{ width: size * 1.4, height: size * 1.4 }}
    >
      {/* Magic Aura Halo */}
      <div
        className={`absolute rounded-full transition-all duration-300 pointer-events-none -z-10 ${
          isHovered ? 'scale-130 opacity-90' : 'scale-100 opacity-50'
        }`}
        style={{
          width: size * 1.2,
          height: size * 1.2,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%)',
        }}
      />

      {/* Floating Enchantment Glyphs (ᔑ ʖ ᓵ ⎓ ᒷ ⍑) */}
      <div className="absolute -top-3 w-full flex justify-around pointer-events-none text-[11px] font-mono text-purple-300 font-bold">
        <span
          className={`transition-all duration-500 ${
            isHovered ? '-translate-y-3 opacity-100 text-fuchsia-300 scale-125' : 'opacity-40'
          }`}
        >
          ᔑ
        </span>
        <span
          className={`transition-all duration-500 delay-100 ${
            isHovered ? '-translate-y-4 opacity-100 text-cyan-300 scale-125' : 'opacity-30'
          }`}
        >
          ʖ
        </span>
        <span
          className={`transition-all duration-500 delay-200 ${
            isHovered ? '-translate-y-3 opacity-100 text-pink-300 scale-125' : 'opacity-40'
          }`}
        >
          ᒷ
        </span>
      </div>

      {/* 3D Isometric Voxel Book Graphics */}
      <div
        className={`relative transition-transform duration-300 ease-out ${
          isHovered ? 'scale-115 rotate-[-6deg]' : 'scale-100 rotate-0'
        }`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow-md">
          {/* Back Cover (Purple Leather) */}
          <rect x="3" y="5" width="26" height="22" rx="2" fill="#581c87" />
          <rect x="3" y="5" width="26" height="22" rx="2" stroke="#a855f7" strokeWidth="1" fill="none" />

          {/* Book Pages (Aged Parchment Gold) */}
          <rect x="5" y="6" width="22" height="18" rx="1" fill="#fef3c7" />
          <line x1="16" y1="6" x2="16" y2="24" stroke="#d97706" strokeWidth="1" strokeDasharray="1 1" />

          {/* Page Lines */}
          <line x1="7" y1="9" x2="14" y2="9" stroke="#92400e" strokeWidth="0.8" opacity="0.6" />
          <line x1="7" y1="12" x2="13" y2="12" stroke="#92400e" strokeWidth="0.8" opacity="0.6" />
          <line x1="7" y1="15" x2="14" y2="15" stroke="#92400e" strokeWidth="0.8" opacity="0.6" />

          <line x1="18" y1="9" x2="25" y2="9" stroke="#92400e" strokeWidth="0.8" opacity="0.6" />
          <line x1="18" y1="12" x2="24" y2="12" stroke="#92400e" strokeWidth="0.8" opacity="0.6" />
          <line x1="18" y1="15" x2="25" y2="15" stroke="#92400e" strokeWidth="0.8" opacity="0.6" />

          {/* Red Ribbon Bookmark */}
          <path d="M 15 6 L 15 26 L 16.5 24 L 18 26 L 18 6 Z" fill="#ef4444" />

          {/* Corner Gold Clasps */}
          <rect x="3" y="5" width="4" height="4" fill="#f59e0b" />
          <rect x="25" y="5" width="4" height="4" fill="#f59e0b" />
          <rect x="3" y="23" width="4" height="4" fill="#f59e0b" />
          <rect x="25" y="23" width="4" height="4" fill="#f59e0b" />

          {/* Glowing Enchantment Magic Ribbon across Book */}
          <rect
            x="4"
            y="13"
            width="24"
            height="3"
            fill="url(#enchantGlow)"
            opacity={isHovered ? '0.9' : '0.6'}
          />

          <defs>
            <linearGradient id="enchantGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c026d3" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#f0abfc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {label && (
        <span className="mt-1 font-mono text-[10px] text-purple-300/80 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 3. MINECRAFT XP ORB (Hạt Kinh Nghiệm Cấp Độ Xoay Nhấp Nháy)
// ============================================================================

interface MinecraftXpOrbProps {
  size?: number; // default: 36
  className?: string;
  isFloating?: boolean;
}

export const MinecraftXpOrb: React.FC<MinecraftXpOrbProps> = ({
  size = 36,
  className = '',
  isFloating = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      aria-hidden="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer ${
        isFloating ? 'animate-drift-3' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer XP Pulse Halo */}
      <div
        className={`absolute rounded-full transition-all duration-300 ${
          isHovered ? 'scale-150 opacity-90' : 'scale-100 opacity-60'
        }`}
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle, rgba(163, 230, 53, 0.6) 0%, rgba(234, 179, 8, 0.2) 60%, transparent 80%)',
        }}
      />

      {/* Multi-layered Rotating Pixel Diamond */}
      <div
        className={`relative transition-all duration-300 ${
          isHovered ? 'scale-125 rotate-90' : 'scale-100 animate-spin-cube-fast'
        }`}
        style={{ width: size * 0.7, height: size * 0.7 }}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full" style={{ shapeRendering: 'crispEdges' }}>
          {/* Lime / Yellow alternating XP Diamond */}
          <polygon points="8,1 15,8 8,15 1,8" fill="#84cc16" />
          <polygon points="8,3 13,8 8,13 3,8" fill="#eab308" />
          <polygon points="8,5 11,8 8,11 5,8" fill="#fef08a" />
          <rect x="7" y="7" width="2" height="2" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 4. 3D GEOMETRIC OCTAHEDRON & PRISM (Khối Hình Học 3D Lượng Tử)
// ============================================================================

interface Geometric3DProps {
  shape?: 'octahedron' | 'pyramid' | 'prism';
  size?: number; // default: 48
  colorTheme?: 'cyan' | 'purple' | 'amber' | 'emerald';
  isFloating?: boolean;
  className?: string;
}

export const Geometric3D: React.FC<Geometric3DProps> = ({
  shape = 'octahedron',
  size = 48,
  colorTheme = 'cyan',
  isFloating = true,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const colors = {
    cyan: {
      primary: '#06b6d4',
      accent: '#22d3ee',
      glow: 'rgba(6, 182, 212, 0.45)',
    },
    purple: {
      primary: '#a855f7',
      accent: '#c026d3',
      glow: 'rgba(168, 85, 247, 0.45)',
    },
    amber: {
      primary: '#f59e0b',
      accent: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.45)',
    },
    emerald: {
      primary: '#10b981',
      accent: '#34d399',
      glow: 'rgba(16, 185, 129, 0.45)',
    },
  }[colorTheme];

  return (
    <div
      aria-hidden="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative select-none flex items-center justify-center cursor-pointer perspective-600 ${
        isFloating ? 'animate-drift-1' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Soft Aura */}
      <div
        className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
          isHovered ? 'scale-130 opacity-80' : 'scale-90 opacity-40'
        }`}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
        }}
      />

      {/* SVG 3D Shaded Polyhedron */}
      <div
        className={`transition-all duration-300 ease-out ${
          isHovered ? 'scale-120 rotate-45' : 'scale-100 rotate-0'
        }`}
        style={{ width: size * 0.85, height: size * 0.85 }}
      >
        {shape === 'octahedron' && (
          <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow">
            {/* Top-Front-Left facet */}
            <polygon points="16,2 4,16 16,18" fill={colors.primary} opacity="0.85" />
            {/* Top-Front-Right facet */}
            <polygon points="16,2 28,16 16,18" fill={colors.accent} opacity="0.95" />
            {/* Bottom-Front-Left facet */}
            <polygon points="16,30 4,16 16,18" fill={colors.primary} opacity="0.65" />
            {/* Bottom-Front-Right facet */}
            <polygon points="16,30 28,16 16,18" fill={colors.accent} opacity="0.75" />
            {/* Wireframe border highlights */}
            <line x1="16" y1="2" x2="16" y2="30" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
            <line x1="4" y1="16" x2="28" y2="16" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
          </svg>
        )}

        {shape === 'pyramid' && (
          <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow">
            {/* Left face */}
            <polygon points="16,4 4,26 16,28" fill={colors.primary} opacity="0.8" />
            {/* Right face */}
            <polygon points="16,4 28,26 16,28" fill={colors.accent} opacity="0.95" />
            {/* Bottom base */}
            <polygon points="4,26 28,26 16,28" fill="#000000" opacity="0.4" />
            {/* Energy Core in Center */}
            <circle cx="16" cy="18" r="3" fill="#ffffff" className="animate-pulse" />
          </svg>
        )}

        {shape === 'prism' && (
          <svg viewBox="0 0 32 32" className="w-full h-full drop-shadow">
            {/* Isometric Prism */}
            <polygon points="16,2 28,8 28,24 16,18" fill={colors.accent} opacity="0.9" />
            <polygon points="16,2 4,8 4,24 16,18" fill={colors.primary} opacity="0.75" />
            <polygon points="16,2 28,8 16,14 4,8" fill="#ffffff" opacity="0.4" />
          </svg>
        )}
      </div>
    </div>
  );
};
