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

    const startLoop = () => {
      if (isLoopRunning || document.hidden) return;
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

    // Smooth Lerp animation with Idle Stop Condition (Zero CPU when stationary)
    const animate = () => {
      const dx = mouseX - currentX;
      const dy = mouseY - currentY;
      const dist = Math.hypot(dx, dy);

      // If moved very close to target, snap and pause the loop
      if (dist < 0.15) {
        currentX = mouseX;
        currentY = mouseY;
        if (auraRef.current) {
          auraRef.current.style.transform = `translate3d(${currentX - 250}px, ${currentY - 250}px, 0)`;
        }
        stopLoop();
        return;
      }

      // Ease factor 0.08 for smooth, luxury inertia
      currentX += dx * 0.08;
      currentY += dy * 0.08;

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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial positioning
    if (auraRef.current) {
      auraRef.current.style.transform = `translate3d(${currentX - 250}px, ${currentY - 250}px, 0)`;
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopLoop();
    };
  }, []);

  return (
    <div
      ref={auraRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-0 h-[500px] w-[500px] rounded-full opacity-30 dark:opacity-30 light:opacity-15 dark:mix-blend-screen light:mix-blend-multiply blur-[110px] will-change-transform hidden md:block"
      style={{
        background: 'radial-gradient(circle at 40% 40%, rgba(147, 51, 234, 0.45) 0%, rgba(236, 72, 153, 0.28) 42%, rgba(0, 0, 0, 0) 70%)',
        transform: 'translate3d(-500px, -500px, 0)',
      }}
    />
  );
};
