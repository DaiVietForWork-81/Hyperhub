import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: (e?: React.MouseEvent) => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={(e) => onToggle(e)}
      aria-label={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
      title={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
      className={`relative inline-flex items-center justify-center p-2 rounded-full border transition-all duration-300 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 ${
        isDark
          ? 'border-white/10 bg-white/[0.04] text-purple-300 hover:text-white hover:bg-white/10 hover:border-purple-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
          : 'border-slate-300 bg-white text-amber-500 hover:text-amber-600 hover:bg-slate-100 shadow-md'
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 scale-100 text-purple-300" />
        ) : (
          <Sun className="w-4 h-4 transition-transform duration-300 rotate-90 scale-100 text-amber-500" />
        )}
      </div>
    </button>
  );
};
