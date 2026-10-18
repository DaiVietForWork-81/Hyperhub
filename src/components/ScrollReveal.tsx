import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // delay in ms
  direction?: 'up' | 'down' | 'none';
  threshold?: number;
  initialVisible?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  delay = 0,
  direction = 'up',
  threshold = 0.01,
  initialVisible = false,
}) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialVisible) {
      setIsVisible(true);
      return;
    }

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    // If element is already in or above the viewport on initial render, show immediately
    const checkVisibility = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 100) {
        setIsVisible(true);
        return true;
      }
      return false;
    };

    if (checkVisibility()) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setIsVisible(true);
          observer.disconnect(); // Unobserve once shown for zero re-render overhead when scrolling
        }
      },
      {
        threshold,
        rootMargin: '200px 0px 100px 0px',
      }
    );

    observer.observe(el);

    const onResize = () => {
      if (checkVisibility()) {
        observer.disconnect();
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [threshold, initialVisible]);

  const getTransformClass = () => {
    if (isVisible) return 'translate-y-0 opacity-100';
    if (direction === 'up') return 'translate-y-4 opacity-0';
    if (direction === 'down') return '-translate-y-4 opacity-0';
    return 'opacity-0';
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
        !isVisible && 'will-change-[transform,opacity] transform-gpu',
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
