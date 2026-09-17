import React from 'react';

export const AmbientGlow: React.FC = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Top subtle purple atmosphere */}
      <div 
        className="absolute -top-[15%] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-[150px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.05) 60%, transparent 80%)'
        }}
      />
      {/* Middle right soft pink atmosphere */}
      <div 
        className="absolute top-[35%] -right-[10%] h-[500px] w-[600px] rounded-full opacity-15 blur-[140px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.35) 0%, transparent 70%)'
        }}
      />
      {/* Bottom left violet atmosphere */}
      <div 
        className="absolute top-[70%] -left-[10%] h-[600px] w-[600px] rounded-full opacity-15 blur-[160px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
        }}
      />
    </div>
  );
};
