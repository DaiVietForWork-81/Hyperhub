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
  threshold = 0.1,
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
        // Tự động kích hoạt hiện khi cuộn tới và ẩn khi cuộn ra ngoài (áp dụng cả 2 chiều)
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
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
    if (direction === 'up') return 'translate-y-6 opacity-0';
    if (direction === 'down') return '-translate-y-6 opacity-0';
    return 'opacity-0';
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out will-change-[transform,opacity]',
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
