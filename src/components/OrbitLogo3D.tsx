import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

interface OrbitLogo3DProps {
  className?: string;
  size?: number; // Size in px
  showInteractiveBadge?: boolean;
}

export const OrbitLogo3D: React.FC<OrbitLogo3DProps> = ({
  className = '',
  size = 190,
  showInteractiveBadge = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // Smooth animation refs
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const animFrameId = useRef<number | null>(null);
  const idleTime = useRef(0);

  // Mouse / Touch Tracking with smooth spring damping
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Distance from center normalized to [-1, 1]
    const dx = (e.clientX - centerX) / (window.innerWidth / 2);
    const dy = (e.clientY - centerY) / (window.innerHeight / 2);

    // Limit maximum tilt angle (up to 32 degrees)
    targetX.current = -Math.max(-1, Math.min(1, dy)) * 28;
    targetY.current = Math.max(-1, Math.min(1, dx)) * 28;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = (touch.clientX - centerX) / (rect.width * 1.5);
    const dy = (touch.clientY - centerY) / (rect.height * 1.5);

    targetX.current = -Math.max(-1, Math.min(1, dy)) * 26;
    targetY.current = Math.max(-1, Math.min(1, dx)) * 26;
  }, []);

  const handleResetTarget = useCallback(() => {
    targetX.current = 0;
    targetY.current = 0;
    setIsHovered(false);
  }, []);

  // 60-120 FPS Physics Animation Loop (Spring Damping + Sinusoidal Breathing Levitation)
  useEffect(() => {
    const updatePhysics = () => {
      idleTime.current += 0.035;

      // When not hovered or mouse is static, add gentle idle floating & breathing 3D drift
      const idleFloatX = Math.sin(idleTime.current * 0.8) * 4.5;
      const idleFloatY = Math.cos(idleTime.current * 0.6) * 5.5;

      // Linear interpolation (lerp) for ultra-buttery smooth damping
      currentX.current += ((targetX.current || idleFloatX) - currentX.current) * 0.085;
      currentY.current += ((targetY.current || idleFloatY) - currentY.current) * 0.085;

      setRotX(currentX.current);
      setRotY(currentY.current);

      animFrameId.current = requestAnimationFrame(updatePhysics);
    };

    animFrameId.current = requestAnimationFrame(updatePhysics);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleResetTarget, { passive: true });

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleResetTarget);
    };
  }, [handleMouseMove, handleTouchMove, handleResetTarget]);

  // Click bounce reaction
  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 400);
  };

  // Specular sheen highlight position (opposite to tilt)
  const sheenX = 50 - rotY * 1.8;
  const sheenY = 50 - rotX * 1.8;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleResetTarget}
      onClick={handleClick}
      style={{
        perspective: '1200px',
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: '85vw',
        maxHeight: '85vw',
      }}
      className={`relative select-none cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform duration-300 ${className}`}
      title="Logo 3D Tương Tác Orbit (Di chuột hoặc chạm để xoay đa chiều)"
    >
      {/* 3D Root Card with preserve-3d */}
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) ${
            isClicked ? 'scale3d(0.92, 0.92, 0.92)' : isHovered ? 'scale3d(1.08, 1.08, 1.08)' : 'scale3d(1, 1, 1)'
          }`,
          transition: isClicked ? 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
        className="relative w-full h-full flex items-center justify-center will-change-transform"
      >
        {/* ================================================================= */}
        {/* LAYER 1: DEEP COSMIC NEBULA GLOW (translateZ: -70px)              */}
        {/* ================================================================= */}
        <div
          style={{
            transform: 'translateZ(-70px) scale(1.35)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-700/60 via-fuchsia-600/50 to-pink-500/60 blur-3xl pointer-events-none opacity-80 animate-pulse"
        />

        {/* Ambient Backlight Flare */}
        <div
          style={{
            transform: 'translateZ(-40px) scale(1.15)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 rounded-full bg-purple-600/40 blur-2xl pointer-events-none"
        />

        {/* ================================================================= */}
        {/* LAYER 2: 3D GYROSCOPIC ORBITAL RINGS (translateZ: -10px)          */}
        {/* ================================================================= */}
        <div
          style={{
            transform: 'translateZ(-15px) rotateZ(-30deg)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center"
        >
          {/* Animated 3D Ring 1 */}
          <div className="absolute w-[125%] h-[48%] rounded-full border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-spin-slow pointer-events-none [animation-duration:16s]" />
          {/* Animated 3D Ring 2 (Dashed Counter-Orbit) */}
          <div className="absolute w-[115%] h-[40%] rounded-full border border-dashed border-purple-400/25 pointer-events-none animate-spin-slow [animation-duration:24s] [animation-direction:reverse]" />
        </div>

        {/* ================================================================= */}
        {/* LAYER 3: CORE ORBIT TRANSPARENT EMBLEM (translateZ: 50px)         */}
        {/* ================================================================= */}
        <div
          style={{
            transform: 'translateZ(50px)',
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full h-full flex items-center justify-center pointer-events-none"
        >
          <img
            src="/server_icon.png"
            alt="Orbit 3D Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_16px_35px_rgba(168,85,247,0.55)] pointer-events-none transform-gpu"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />

          {/* Dynamic Specular Reflection (Glass/Metal Sheen following cursor) */}
          <div
            style={{
              background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 30%, transparent 65%)`,
              transform: 'translateZ(65px)',
              mixBlendMode: 'overlay',
            }}
            className="absolute inset-0 w-full h-full rounded-full pointer-events-none transition-opacity duration-200"
          />
        </div>

        {/* ================================================================= */}
        {/* LAYER 4: CELESTIAL SATELLITES / 3D ORBIT PARTICLES (translateZ:85px)*/}
        {/* ================================================================= */}
        <div
          style={{
            transform: 'translateZ(85px)',
            transformStyle: 'preserve-3d',
          }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          {/* Orbiting Satellite 1 (Pink Crystal) */}
          <div className="absolute w-full h-full animate-spin-slow [animation-duration:10s]">
            <div className="absolute top-1 left-1/4 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#fff,0_0_24px_#ec4899] animate-pulse" />
          </div>

          {/* Orbiting Satellite 2 (Cyan Diamond) */}
          <div className="absolute w-full h-full animate-spin-slow [animation-duration:14s] [animation-direction:reverse]">
            <div className="absolute bottom-2 right-1/4 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9] animate-ping" />
          </div>

          {/* Top-right sparkle glint */}
          <div className="absolute -top-1 -right-1 text-pink-300 opacity-90 animate-pulse">
            <Sparkles className="w-5 h-5 drop-shadow-[0_0_8px_#ec4899]" />
          </div>
        </div>

        {/* 3D Ambient Floor Drop-Shadow (Cast shadow that responds to 3D tilt) */}
        <div
          style={{
            transform: `translateZ(-90px) translateY(${40 + rotX * 0.4}px) scale(${1 - Math.abs(rotX) * 0.01})`,
            background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.4) 0%, rgba(0,0,0,0.6) 50%, transparent 80%)',
          }}
          className="absolute -bottom-8 w-[80%] h-10 blur-xl pointer-events-none rounded-full"
        />
      </div>

      {/* Floating Interactive 3D Badge Tooltip */}
      {showInteractiveBadge && (
        <div
          className={`absolute -bottom-7 sm:-bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-purple-500/30 text-[10px] sm:text-xs font-mono font-bold text-purple-300 shadow-xl transition-all duration-300 flex items-center gap-1.5 pointer-events-none ${
            isHovered ? 'opacity-100 scale-105 border-pink-400 text-pink-300 shadow-purple-900/60' : 'opacity-65 scale-95'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Logo 3D • Kéo/Di chuột xoay</span>
        </div>
      )}
    </div>
  );
};
