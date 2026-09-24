import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
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

    // Stage 1: Bắt đầu animation chuyển màu chậm tầm 2s (Trắng -> Đen dần -> Đen hoặc ngược lại)
    setTransitionState({
      isActive: true,
      currentTheme: theme,
      targetTheme: nextTheme,
      stage: 'morphing',
      message: pickedMsg,
    });

    // Tại t = 1000ms: Nửa hành trình 2s, cập nhật DOM theme (dark/light, data-theme, state)
    window.setTimeout(() => {
      flushSync(() => {
        applyDOMTheme(nextTheme);
        setTheme(nextTheme);
      });
    }, 1000);

    // Tại t = 2000ms: Hoàn tất 2s chuyển đổi màu, chuyển sang fade-out để hé lộ trang web mới
    window.setTimeout(() => {
      setTransitionState((prev) => ({
        ...prev,
        stage: 'fading-out',
      }));

      // Tại t = 2450ms: Hoàn thành hoàn toàn, reset trạng thái
      window.setTimeout(() => {
        setTransitionState({
          isActive: false,
          currentTheme: nextTheme,
          targetTheme: nextTheme,
          stage: 'idle',
          message: 'Đợi...',
        });
        isBusyRef.current = false;
      }, 450);
    }, 2000);
  };

  return { theme, toggleTheme, setTheme, transitionState };
};
