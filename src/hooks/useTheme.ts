import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'dark' | 'light';

const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hyperhub-theme') as Theme | null;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      return getSystemTheme();
    }
    return 'dark';
  });

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  // Listen to system theme changes if user hasn't explicitly set in localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('hyperhub-theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Animated Theme Toggle with View Transitions circular ripple or smooth crossfade
  const toggleTheme = (event?: React.MouseEvent) => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    // Persist user's choice
    try {
      localStorage.setItem('hyperhub-theme', nextTheme);
    } catch {
      // ignore
    }

    // Modern View Transitions API for luxury ripple animation
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const x = event ? event.clientX : window.innerWidth / 2;
      const y = event ? event.clientY : 0;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (
        document as unknown as {
          startViewTransition: (cb: () => void) => { ready: Promise<void> };
        }
      ).startViewTransition(() => {
        flushSync(() => {
          setTheme(nextTheme);
          const root = document.documentElement;
          if (nextTheme === 'light') {
            root.classList.remove('dark');
            root.classList.add('light');
          } else {
            root.classList.remove('light');
            root.classList.add('dark');
          }
        });
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];
        document.documentElement.animate(
          {
            clipPath: clipPath,
          },
          {
            duration: 450,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    } else {
      // Fallback with smooth CSS transition class
      document.documentElement.classList.add('theme-transitioning');
      setTheme(nextTheme);
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 400);
    }
  };

  return { theme, toggleTheme, setTheme };
};
