import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface OrbitLogo3DProps {
  className?: string;
  size?: number; // Size in px
  showInteractiveBadge?: boolean;
}

// 21 Extrusion Depth Slices from -10px to +10px (1px spacing for solid continuous 3D relief)
const EXTRUSION_SLICES = Array.from({ length: 21 }, (_, i) => -10 + i);

export const OrbitLogo3D: React.FC<OrbitLogo3DProps> = ({
  className = '',
  size = 210,
  showInteractiveBadge = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFastSpin, setIsFastSpin] = useState(false);

  // Toggle faster spin or burst on click
  const handleLogoClick = () => {
    setIsFastSpin((prev) => !prev);
  };

  return (
    <div
      style={{
        perspective: '1200px',
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: '85vw',
        maxHeight: '85vw',
      }}
      className={`relative select-none flex items-center justify-center cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleLogoClick}
      title="Logo 3D Orbit (Tự xoay vòng 360° - Click để tăng tốc)"
    >
      <style>{`
        @keyframes orbit-coin-continuous-spin {
          0% {
            transform: rotateX(14deg) rotateZ(-3deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(14deg) rotateZ(-3deg) rotateY(360deg);
          }
        }

        @keyframes orbit-specular-sweep {
          0% {
            transform: translateX(-150%) rotate(25deg);
            opacity: 0.85;
          }
          35% {
            transform: translateX(150%) rotate(25deg);
            opacity: 0.1;
          }
          100% {
            transform: translateX(150%) rotate(25deg);
            opacity: 0;
          }
        }

        @keyframes orbit-satellite-rev {
          from {
            transform: rotateZ(0deg);
          }
          to {
            transform: rotateZ(360deg);
          }
        }

        @keyframes orbit-satellite-rev-reverse {
          from {
            transform: rotateZ(360deg);
          }
          to {
            transform: rotateZ(0deg);
          }
        }

        .animate-orbit-3d-spin {
          animation: orbit-coin-continuous-spin 8s linear infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .animate-orbit-3d-spin-fast {
          animation: orbit-coin-continuous-spin 3.5s linear infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .animate-orbit-specular {
          animation: orbit-specular-sweep 8s ease-in-out infinite;
        }

        .animate-orbit-specular-fast {
          animation: orbit-specular-sweep 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* =================================================================== */}
      {/* 3D SCENE ROOT - STRICTLY ANCHORED (NO TRANSLATIONAL DRIFT)          */}
      {/* =================================================================== */}
      <div
        style={{
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full h-full flex items-center justify-center will-change-transform"
      >
        {/* ================================================================= */}
        {/* LAYER 0: 3D FLOOR CAST SHADOW (STATIONARY ON GROUND PLANE)        */}
        {/* ================================================================= */}
        <div
          style={{
            transform: 'rotateX(82deg) translateZ(-85px) scale(0.95)',
            background:
              'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.45) 0%, rgba(0,0,0,0.65) 50%, transparent 75%)',
          }}
          className={`absolute -bottom-10 w-[85%] h-14 blur-xl pointer-events-none rounded-full transition-opacity duration-500 ${
            isHovered ? 'opacity-90 scale-105' : 'opacity-70'
          }`}
        />

        {/* ================================================================= */}
        {/* LAYER 1: DEEP COSMIC NEBULA BACKLIGHT GLOW                        */}
        {/* ================================================================= */}
        <div
          style={{
            transform: 'translateZ(-70px) scale(1.35)',
            transformStyle: 'preserve-3d',
          }}
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-purple-700/60 via-fuchsia-600/50 to-pink-500/60 blur-3xl pointer-events-none transition-opacity duration-500 ${
            isHovered ? 'opacity-95' : 'opacity-70'
          }`}
        />

        {/* Ambient Backlight Flare */}
        <div
          style={{
            transform: 'translateZ(-45px) scale(1.15)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 rounded-full bg-purple-600/40 blur-2xl pointer-events-none"
        />

        {/* ================================================================= */}
        {/* LAYER 2: 3D GYROSCOPIC ORBITAL RINGS (FIXED 3D TILT, ENCIRCLING)  */}
        {/* ================================================================= */}
        {/* Major Orbital Ring (Tilted at 72° X, -20° Y) */}
        <div
          style={{
            transform: 'translateZ(0px) rotateX(72deg) rotateY(-20deg)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-[-14%] pointer-events-none flex items-center justify-center"
        >
          {/* Luminous Neon Ring 1 */}
          <div className="absolute w-full h-full rounded-full border-2 border-pink-500/40 shadow-[0_0_22px_rgba(236,72,153,0.45)] pointer-events-none" />

          {/* Satellite Particle 1 Revolving Along Major Ring */}
          <div
            style={{
              animation: 'orbit-satellite-rev 10s linear infinite',
            }}
            className="absolute w-full h-full pointer-events-none flex items-center justify-center"
          >
            <div className="absolute -top-1.5 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_#fff,0_0_24px_#ec4899] animate-pulse" />
          </div>
        </div>

        {/* Minor Orbital Ring (Tilted at 54° X, 36° Y, Dashed Cyan) */}
        <div
          style={{
            transform: 'translateZ(0px) rotateX(54deg) rotateY(36deg)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-[-8%] pointer-events-none flex items-center justify-center"
        >
          {/* Dashed High-Tech Ring 2 */}
          <div className="absolute w-full h-full rounded-full border border-dashed border-cyan-400/35 pointer-events-none shadow-[0_0_15px_rgba(103,232,249,0.3)]" />

          {/* Satellite Particle 2 Revolving Along Minor Ring */}
          <div
            style={{
              animation: 'orbit-satellite-rev-reverse 14s linear infinite',
            }}
            className="absolute w-full h-full pointer-events-none flex items-center justify-center"
          >
            <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-ping" />
          </div>
        </div>

        {/* ================================================================= */}
        {/* LAYER 3: SOLID 3D EXTRUDED COIN (CONTINUOUS 360° 3D SPIN)         */}
        {/* ================================================================= */}
        <div
          className={`relative w-full h-full flex items-center justify-center pointer-events-none ${
            isFastSpin || isHovered ? 'animate-orbit-3d-spin-fast' : 'animate-orbit-3d-spin'
          }`}
        >
          {/* 3.1: INTERMEDIATE EXTRUSION SLICES (Depth volume from -10px to +10px) */}
          {EXTRUSION_SLICES.map((z) => (
            <div
              key={z}
              style={{
                transform: `translateZ(${z}px)`,
                transformStyle: 'preserve-3d',
              }}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <img
                src="/server_icon.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain pointer-events-none select-none"
                style={{
                  filter:
                    'brightness(0.62) saturate(1.35) contrast(1.2) drop-shadow(0 0 1px rgba(168,85,247,0.5))',
                  opacity: 0.92,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
          ))}

          {/* 3.2: METALLIC BEVEL RINGS (Depth Accents) */}
          <div
            style={{
              transform: 'translateZ(0px)',
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-[6%] rounded-full border-2 border-purple-500/30 pointer-events-none shadow-[0_0_15px_rgba(236,72,153,0.35),inset_0_0_15px_rgba(168,85,247,0.25)]"
          />
          <div
            style={{
              transform: 'translateZ(8px)',
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-[8%] rounded-full border border-pink-400/25 pointer-events-none"
          />
          <div
            style={{
              transform: 'translateZ(-8px)',
              transformStyle: 'preserve-3d',
            }}
            className="absolute inset-[8%] rounded-full border border-purple-400/25 pointer-events-none"
          />

          {/* 3.3: FRONT FACE (translateZ: 10.5px, visible facing forward) */}
          <div
            style={{
              transform: 'translateZ(10.5px)',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
          >
            <img
              src="/server_icon.png"
              alt="Orbit 3D Logo Front"
              className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(168,85,247,0.55)] pointer-events-none select-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />

            {/* Front Specular Sheen (Sweeps across the face) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden rounded-full pointer-events-none">
              <div
                style={{
                  background:
                    'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.7) 48%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 52%, transparent 75%)',
                  mixBlendMode: 'overlay',
                }}
                className={`w-[200%] h-full pointer-events-none ${
                  isFastSpin || isHovered ? 'animate-orbit-specular-fast' : 'animate-orbit-specular'
                }`}
              />
            </div>
          </div>

          {/* 3.4: BACK FACE (translateZ: -10.5px rotateY: 180deg, visible facing backward) */}
          <div
            style={{
              transform: 'translateZ(-10.5px) rotateY(180deg)',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
          >
            <img
              src="/server_icon.png"
              alt="Orbit 3D Logo Back"
              className="w-full h-full object-contain filter drop-shadow-[0_12px_28px_rgba(168,85,247,0.55)] pointer-events-none select-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />

            {/* Back Specular Sheen */}
            <div className="absolute inset-0 w-full h-full overflow-hidden rounded-full pointer-events-none">
              <div
                style={{
                  background:
                    'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.7) 48%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 52%, transparent 75%)',
                  mixBlendMode: 'overlay',
                }}
                className={`w-[200%] h-full pointer-events-none ${
                  isFastSpin || isHovered ? 'animate-orbit-specular-fast' : 'animate-orbit-specular'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Top-Right Sparkle Glint */}
        <div className="absolute top-2 right-2 text-pink-300 opacity-80 pointer-events-none animate-pulse">
          <Sparkles className="w-5 h-5 drop-shadow-[0_0_8px_#ec4899]" />
        </div>
      </div>

      {/* Floating Interactive Badge (Anchored below, strictly stationary) */}
      {showInteractiveBadge && (
        <div
          className={`absolute -bottom-7 sm:-bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-purple-500/30 text-[10px] sm:text-xs font-mono font-bold text-purple-300 shadow-xl transition-all duration-300 flex items-center gap-1.5 pointer-events-none ${
            isHovered
              ? 'opacity-100 scale-105 border-pink-400 text-pink-300 shadow-purple-900/60'
              : 'opacity-70 scale-95'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Logo 3D Orbit • Tự xoay 360°</span>
        </div>
      )}
    </div>
  );
};
