import React from 'react';

export const CyberGrid: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[850px] z-0 overflow-hidden select-none"
      style={{ contain: 'paint' }}
    >
      {/* Subtle Dot Grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(rgba(168, 85, 247, 0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Soft Bottom Fade without heavy CSS mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary,#050508)]" />

      {/* Horizontal Horizon Perspective Line */}
      <div 
        className="absolute top-[350px] left-1/2 -translate-x-1/2 w-[1200px] max-w-full h-px opacity-20"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8), transparent)',
        }}
      />
    </div>
  );
};
