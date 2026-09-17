import React, { useRef, useEffect } from 'react';
import { cn } from '../utils/cn';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderColor?: string;
  enableTilt?: boolean;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = 'rgba(168, 85, 247, 0.14)',
  borderColor = 'rgba(236, 72, 153, 0.4)',
  enableTilt = false,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);

      if (enableTilt && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3.5;
        const rotateY = ((x - centerX) / centerX) * 3.5;

        cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--mouse-x', '-999px');
    cardRef.current.style.setProperty('--mouse-y', '-999px');

    if (enableTilt) {
      cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group/spotlight spotlight-card relative rounded-3xl border overflow-hidden transition-[border-color,box-shadow,background-color] duration-300 transform-gpu',
        'border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/40 text-slate-900',
        'dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-[#0e0e13] dark:to-[#060608] dark:shadow-none dark:text-white',
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
        willChange: enableTilt ? 'transform' : 'auto',
      }}
      {...props}
    >
      {/* Spotlight Radial Background Glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(450px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), ${spotlightColor}, transparent 80%)`,
        }}
      />

      {/* Spotlight Traveling Glowing Border */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300 z-10 p-[1px]"
        style={{
          background: `radial-gradient(280px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), ${borderColor}, transparent 70%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Content wrapper with relative positioning above spotlights */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};
