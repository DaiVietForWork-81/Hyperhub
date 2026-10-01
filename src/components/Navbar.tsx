import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ShieldCheck, CheckCircle2, LayoutDashboard, Home } from 'lucide-react';
import { DiscordUser } from '../utils/discordAuth';

interface NavbarProps {
  theme?: string;
  onToggleTheme?: (e?: React.MouseEvent) => void;
  activeView: 'home' | 'dashboard';
  onSelectView: (view: 'home' | 'dashboard') => void;
  user: DiscordUser | null;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onSelectView,
  user,
  onOpenAuthModal,
}) => {
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
            setIsNearTop((prev) => (!prev ? true : prev));
          } else if (currentScrollY > lastScrollY + 8 && currentScrollY > 80 && !mobileMenuOpen) {
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

  const handleNavClick = (view: 'home' | 'dashboard') => {
    setMobileMenuOpen(false);
    onSelectView(view);
  };

  const isVisible = isNearTop || !isScrolled || mobileMenuOpen;

  return (
    <>
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
          isScrolled || activeView === 'dashboard'
            ? 'bg-black/85 backdrop-blur-md border-b border-white/[0.08] py-2.5 shadow-2xl shadow-purple-950/20'
            : 'bg-transparent py-3 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <button 
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 group cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg p-1 shrink-0 hover:-translate-y-0.5 active:scale-95 transition-transform duration-200"
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
          </button>

          {/* Desktop Nav Dock */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2 py-1 px-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md shadow-inner">
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeView === 'home'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang Chủ</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Bảng Điều Khiển</span>
            </button>
          </nav>

          {/* Action Area: Discord User / Link CTA */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => onSelectView('dashboard')}
                className="flex items-center gap-2.5 py-1.5 px-3 rounded-full bg-white/[0.05] border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer"
                title={`Đã liên kết với Discord: @${user.username}`}
              >
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                  }}
                />
                <span className="text-xs font-semibold max-w-[120px] truncate text-white">
                  {user.global_name || user.username}
                </span>
                {user.verified && (
                  <span title="Email đã xác minh">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="btn-shimmer inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg shadow-purple-900/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Liên Kết Discord</span>
              </button>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-purple-500 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[56px] sm:top-[60px] max-h-[calc(100dvh-60px)] overflow-y-auto bg-black/95 backdrop-blur-xl border-b border-white/10 px-5 py-6 shadow-2xl transition-all animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className={`w-full text-left px-4 py-3 text-base font-semibold rounded-xl transition-all flex items-center gap-2.5 ${
                  activeView === 'home'
                    ? 'bg-purple-500/20 text-white'
                    : 'text-white/85'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Trang Chủ</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('dashboard')}
                className={`w-full text-left px-4 py-3 text-base font-semibold rounded-xl transition-all flex items-center gap-2.5 ${
                  activeView === 'dashboard'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'text-white/85'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Bảng Điều Khiển</span>
              </button>

              <div className="pt-4 border-t border-white/10 mt-2">
                {user ? (
                  <div className="p-3 rounded-xl bg-white/5 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt={user.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold truncate text-white">{user.global_name || user.username}</div>
                        <div className="text-xs text-slate-400">@{user.username}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuthModal();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#5865F2] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/20"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Liên Kết Tài Khoản Discord</span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
