import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { siteConfig } from '../data/site';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../hooks/useTheme';

interface NavbarProps {
  theme: Theme;
  onToggleTheme: (e?: React.MouseEvent) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNearTop, setIsNearTop] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 35;
      setIsScrolled(scrolled);
      // When at the very top, always show navbar
      if (window.scrollY < 40) {
        setIsNearTop(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track mouse proximity to top of the screen ("hiện khi con trỏ chuột đến gần")
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If cursor is within 90px from the top, reveal navbar immediately
      if (e.clientY <= 90) {
        if (hideTimerRef.current) {
          window.clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setIsNearTop(true);
      } else {
        // Only auto-hide if user has scrolled down into the page
        if (window.scrollY > 50 && !mobileMenuOpen) {
          if (!hideTimerRef.current) {
            hideTimerRef.current = window.setTimeout(() => {
              setIsNearTop(false);
              hideTimerRef.current = null;
            }, 1200); // 1.2s smooth grace period before tucking away
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isVisible = isNearTop || !isScrolled || mobileMenuOpen;

  return (
    <>
      {/* Invisible Top Hover Trigger Zone: Re-activates navbar when cursor comes near top */}
      <div 
        aria-hidden="true"
        onMouseEnter={() => {
          if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
          setIsNearTop(true);
        }}
        className="fixed top-0 left-0 right-0 h-16 z-40 pointer-events-auto"
      />

      <header
        onMouseEnter={() => {
          if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
          setIsNearTop(true);
        }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full ${
          isVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          isScrolled
            ? 'bg-black/80 dark:bg-black/80 light:bg-white/90 backdrop-blur-md border-b border-white/[0.08] py-2.5 shadow-2xl shadow-purple-950/20'
            : 'bg-transparent py-3 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <a 
            href="#hero" 
            onClick={(e) => scrollToSection(e, '#hero')}
            className="flex items-center gap-2.5 group cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg p-1 shrink-0"
          >
            <img
              src="/logo.png"
              alt="HyperHub Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-purple-500/50 transition-all duration-200"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex items-center">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-purple-300 transition-colors">
                HyperHub
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 ml-1 shadow-[0_0_8px_#ec4899] animate-pulse"></span>
            </div>
          </a>

          {/* Desktop & Tablet Horizontal Nav Dock (Nằm Ngang Rõ Ràng & Cuộn Ngang Mượt Mà) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1 px-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md max-w-[65vw] xl:max-w-none shadow-inner">
            {siteConfig.navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => scrollToSection(e, item.href)}
                className="px-3 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap text-white/75 hover:text-white hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.35)] rounded-full transition-all duration-150 active:scale-95"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Action Area: Theme Switcher & Discord CTA */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />

            <a
              href="#platforms"
              onClick={(e) => scrollToSection(e, '#platforms')}
              className="btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
            >
              <span>Tham Gia Ngay</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Actions (Theme Toggle + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[56px] sm:top-[60px] max-h-[calc(100dvh-60px)] overflow-y-auto bg-black/95 dark:bg-black/95 light:bg-white/95 backdrop-blur-xl border-b border-white/10 px-6 py-6 shadow-2xl transition-all animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-2">
              {siteConfig.navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href)}
                  className="px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-purple-500/20 rounded-xl transition-all"
                >
                  {item.label}
                </a>
              ))}

              <div className="pt-3 mt-2 border-t border-white/10">
                <a
                  href="#platforms"
                  onClick={(e) => scrollToSection(e, '#platforms')}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg shadow-purple-900/30"
                >
                  <span>Tham Gia Cộng Đồng Discord</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
