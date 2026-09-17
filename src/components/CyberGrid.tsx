import React from 'react';

export const CyberGrid: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Subtle Dot Grid */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(rgba(168, 85, 247, 0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 10%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 10%, #000 30%, transparent 80%)',
        }}
      />

      {/* Horizontal Horizon Perspective Line */}
      <div 
        className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[1200px] max-w-full h-px opacity-20"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8), transparent)',
          filter: 'blur(0.5px)',
        }}
      />
    </div>
  );
};
