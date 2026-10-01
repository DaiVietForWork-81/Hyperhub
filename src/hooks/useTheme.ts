import React, { useState, useEffect } from 'react';
import { ThemeTransitionState } from '../components/ThemeCurtain';

export type Theme = 'dark';

const applyDOMTheme = () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light');
  root.classList.add('dark');
  root.setAttribute('data-theme', 'dark');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', '#050508');
  }
};

export const useTheme = () => {
  const theme: Theme = 'dark';

  const [transitionState] = useState<ThemeTransitionState>({
    isActive: false,
    currentTheme: 'dark',
    targetTheme: 'dark',
    stage: 'idle',
    message: '',
  });

  useEffect(() => {
    applyDOMTheme();
    try {
      localStorage.setItem('hyperhub-theme', 'dark');
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = (_event?: React.MouseEvent) => {
    // Luôn giữ giao diện Dark Mode vĩnh viễn
    applyDOMTheme();
  };

  const setTheme = (_newTheme: Theme) => {
    applyDOMTheme();
  };

  return { theme, toggleTheme, setTheme, transitionState };
};
