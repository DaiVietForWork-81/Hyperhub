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
  spotlightColor = 'rgba(168, 85, 247, 0.12)',
  borderColor,
  enableTilt = false,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rectRef.current && cardRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }
    if (!rectRef.current) return;

    const x = e.clientX - rectRef.current.left;
    const y = e.clientY - rectRef.current.top;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rectRef.current = null;
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--mouse-x', '-999px');
    cardRef.current.style.setProperty('--mouse-y', '-999px');
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group/spotlight spotlight-card relative rounded-3xl border overflow-hidden transition-[border-color,box-shadow,background-color] duration-250',
        'border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/40 text-slate-900 hover:border-purple-300 dark:hover:border-purple-500/40',
        'dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-[#0e0e13] dark:to-[#060608] dark:shadow-none dark:text-white',
        className
      )}
      {...props}
    >
      {/* Spotlight Radial Background Glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(380px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), ${spotlightColor}, transparent 75%)`,
        }}
      />

      {/* Content wrapper with relative positioning above spotlights */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};
