import { useEffect } from 'react';
import Lenis from 'lenis';
import { ANCHOR_OFFSET } from '../motion/scroll';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export const useSmoothScroll = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Disable if user prefers reduced motion or automated layout probe is sampling
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      '__motionSample' in window
    ) {
      return;
    }

    // Exempt touch devices to keep 100% native 120Hz inertial scroll
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) {
      return;
    }

    // Lenis configuration: snappy, direct response, zero lag (chỉ bật ở Trang Chủ, tắt ở Hub để cuộn bảng & sidebar 120Hz gốc)
    const lenis = new Lenis({
      duration: 0.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      infinite: false,
      syncTouch: false,
    });

    window.__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Global smooth scrollTo handler for any hash anchor click
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a[href^="#"]');
      if (target) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('#') && href !== '#') {
          const el = document.querySelector(href);
          if (el) {
            e.preventDefault();
            lenis.scrollTo(el as HTMLElement, {
              offset: -ANCHOR_OFFSET,
              duration: 0.85,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', handleAnchorClick);
      lenis.destroy();
      delete window.__lenis;
    };
  }, [enabled]);
};
