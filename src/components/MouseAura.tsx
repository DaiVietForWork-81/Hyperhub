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
    let animationFrameId: number;

    const animate = () => {
      // Smooth continuous lerp without abrupt scroll-stop hitching
      currentX += (mouseX - currentX) * 0.08;
      currentY += (mouseY - currentY) * 0.08;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${currentX - 250}px, ${currentY - 250}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
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
