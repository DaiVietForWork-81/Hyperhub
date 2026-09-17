import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // delay in ms
  direction?: 'up' | 'down' | 'none';
  threshold?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  delay = 0,
  direction = 'up',
  threshold = 0.08,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold,
        rootMargin: '50px 0px -20px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const getTransformClass = () => {
    if (isVisible) return 'translate-y-0 opacity-100';
    if (direction === 'up') return 'translate-y-5 opacity-0';
    if (direction === 'down') return '-translate-y-5 opacity-0';
    return 'opacity-0';
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transform-gpu transition-[transform,opacity] duration-600 cubic-bezier(0.16, 1, 0.3, 1) will-change-[transform,opacity]',
        getTransformClass(),
        className
      )}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
};
