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

  // Track scroll position & smart direction with RAF throttling
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrolled = currentScrollY > 35;
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));

          if (currentScrollY <= 45) {
            setIsNearTop((prev) => (!prev ? true : prev));
          } else if (currentScrollY < lastScrollY - 8) {
            // Scrolling UP - reveal navbar immediately
            setIsNearTop((prev) => (!prev ? true : prev));
          } else if (currentScrollY > lastScrollY + 8 && currentScrollY > 80 && !mobileMenuOpen) {
            // Scrolling DOWN - tuck navbar away to maximize mobile screen space
            setIsNearTop((prev) => (prev ? false : prev));
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      if (window.__lenis) {
        window.__lenis.scrollTo(target as HTMLElement, { offset: -45, duration: 1.2 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
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
            ? 'bg-white/90 dark:bg-black/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] py-2.5 shadow-md shadow-slate-200/40 dark:shadow-2xl dark:shadow-purple-950/20'
            : 'bg-transparent py-3 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <a 
            href="#hero" 
            onClick={(e) => scrollToSection(e, '#hero')}
            className="flex items-center gap-2.5 group cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg p-1 shrink-0 hover:-translate-y-0.5 active:scale-95 transition-transform duration-200"
          >
            <img
              src="/logo.png"
              alt="HyperHub Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-white/10 group-hover:ring-purple-500/50 transition-all duration-200"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex items-center">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                HyperHub
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 ml-1 shadow-[0_0_8px_#ec4899] animate-pulse"></span>
            </div>
          </a>

          {/* Desktop & Tablet Horizontal Nav Dock (Nằm Ngang Rõ Ràng & Cuộn Ngang Mượt Mà) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1 px-2 rounded-full border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/[0.03] backdrop-blur-md max-w-[65vw] xl:max-w-none shadow-sm dark:shadow-inner">
            {siteConfig.navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => scrollToSection(e, item.href)}
                className="px-3 py-1.5 text-xs lg:text-sm font-medium whitespace-nowrap text-slate-600 dark:text-white/75 hover:text-purple-600 dark:hover:text-white hover:bg-purple-100/80 dark:hover:bg-purple-500/20 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
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
              className="btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:-translate-y-1 active:scale-95 transition-all duration-200 whitespace-nowrap"
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
              className="p-2.5 rounded-xl text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-purple-500 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[56px] sm:top-[60px] max-h-[calc(100dvh-60px)] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-5 py-6 shadow-2xl transition-all animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-1.5">
              {siteConfig.navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href)}
                  className="px-4 py-3 text-base font-semibold text-slate-700 dark:text-white/85 hover:text-purple-600 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-purple-500/20 active:scale-[0.98] rounded-xl transition-all duration-150 min-h-[44px] flex items-center"
                >
                  {item.label}
                </a>
              ))}

              <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10">
                <a
                  href="#platforms"
                  onClick={(e) => scrollToSection(e, '#platforms')}
                  className="btn-shimmer w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg shadow-purple-900/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 min-h-[48px]"
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
