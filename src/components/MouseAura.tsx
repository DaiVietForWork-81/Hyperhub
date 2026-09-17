import React, { useEffect, useRef } from 'react';

export const MouseAura: React.FC = () => {
  const auraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable on touch devices or if user prefers reduced motion
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReducedMotion) {
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let animationFrameId: number | null = null;
    let isLoopRunning = false;
    let isScrolling = false;
    let scrollTimeout: number | null = null;

    const startLoop = () => {
      if (isLoopRunning || document.hidden || isScrolling) return;
      isLoopRunning = true;
      animationFrameId = requestAnimationFrame(animate);
    };

    const stopLoop = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      isLoopRunning = false;
    };

    const animate = () => {
      const dx = mouseX - currentX;
      const dy = mouseY - currentY;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.2) {
        currentX = mouseX;
        currentY = mouseY;
        if (auraRef.current) {
          auraRef.current.style.transform = `translate3d(${currentX - 250}px, ${currentY - 250}px, 0)`;
        }
        stopLoop();
        return;
      }

      currentX += dx * 0.1;
      currentY += dy * 0.1;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${currentX - 250}px, ${currentY - 250}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      startLoop();
    };

    const handleScroll = () => {
      isScrolling = true;
      stopLoop();
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        isScrolling = false;
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      stopLoop();
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div
      ref={auraRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-0 h-[500px] w-[500px] rounded-full opacity-35 dark:opacity-35 light:opacity-20 will-change-transform hidden md:block"
      style={{
        background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.15) 40%, transparent 70%)',
        transform: 'translate3d(-500px, -500px, 0)',
        contain: 'paint',
      }}
    />
  );
};
