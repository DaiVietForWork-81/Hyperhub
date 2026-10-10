import React from 'react';

export const CyberGrid: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden opacity-30 dark:opacity-40 transition-opacity duration-300"
      style={{
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 80%)',
      }}
    >
      {/* Precision Perspective Grid */}
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(139, 92, 246, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(139, 92, 246, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
};
