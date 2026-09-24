import React from 'react';

export const AmbientGlow: React.FC = () => {
  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-40 dark:opacity-100 transition-opacity duration-300"
      style={{ 
        contain: 'strict',
        backgroundImage: [
          'radial-gradient(ellipse 900px 600px at 50% 0%, rgba(139, 92, 246, 0.18), transparent 70%)',
          'radial-gradient(circle 600px at 95% 40%, rgba(236, 72, 153, 0.10), transparent 70%)',
          'radial-gradient(circle 600px at 5% 75%, rgba(168, 85, 247, 0.10), transparent 70%)'
        ].join(', ')
      }}
    />
  );
};
