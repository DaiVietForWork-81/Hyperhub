import React, { useState, useEffect, useRef } from 'react';
import { ThemeTransitionState } from '../components/ThemeCurtain';

export type Theme = 'dark' | 'light';

const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const applyDOMTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#f8fafc' : '#050508');
  }
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

  const [transitionState, setTransitionState] = useState<ThemeTransitionState>({
    isActive: false,
    currentTheme: 'dark',
    targetTheme: 'dark',
    stage: 'idle',
    message: 'Đợi...',
  });

  const isBusyRef = useRef(false);

  // Apply theme to document root & meta tags whenever theme state changes
  useEffect(() => {
    applyDOMTheme(theme);
  }, [theme]);

  // Listen to system theme changes if user hasn't explicitly set in localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('hyperhub-theme');
      if (!savedTheme) {
        const sysTheme = e.matches ? 'dark' : 'light';
        applyDOMTheme(sysTheme);
        setTheme(sysTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Full-screen cinematic shutter transition (che full màn hình, hiện "Đợi một chút...")
  const toggleTheme = (_event?: React.MouseEvent) => {
    if (isBusyRef.current) return;
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    isBusyRef.current = true;

    // Persist choice immediately
    try {
      localStorage.setItem('hyperhub-theme', nextTheme);
    } catch {
      // ignore
    }

    const messages = [
      'Đợi...',
      'Đợi một chút...',
      'Đợi giây lát...',
      'Chờ chút nhé...',
    ];
    const pickedMsg = messages[Math.floor(Math.random() * messages.length)];

    // Stage 1: Bắt đầu animation chuyển màu chậm 2s hoàn toàn trên GPU Compositor (Trắng -> Đen dần -> Đen hoặc ngược lại)
    setTransitionState({
      isActive: true,
      currentTheme: theme,
      targetTheme: nextTheme,
      stage: 'morphing',
      message: pickedMsg,
    });

    // Tại t = 2000ms: Đúng 2.0s, màn che đã đạt 100% màu đích (đen hoặc trắng hoàn toàn)
    // Cập nhật DOM theme tĩnh lặng phía sau màn che kín mà KHÔNG gây khựng hình
    window.setTimeout(() => {
      applyDOMTheme(nextTheme);
      setTheme(nextTheme);

      // Chờ 100ms để trang web hoàn tất render theme mới dưới màn che
      window.setTimeout(() => {
        // Stage 2: Màn che tan mờ êm dịu (fade-out 500ms) để lộ giao diện mới
        setTransitionState((prev) => ({
          ...prev,
          stage: 'fading-out',
        }));

        // Reset về idle khi hoàn tất
        window.setTimeout(() => {
          setTransitionState({
            isActive: false,
            currentTheme: nextTheme,
            targetTheme: nextTheme,
            stage: 'idle',
            message: 'Đợi...',
          });
          isBusyRef.current = false;
        }, 550);
      }, 100);
    }, 2000);
  };

  return { theme, toggleTheme, setTheme, transitionState };
};
