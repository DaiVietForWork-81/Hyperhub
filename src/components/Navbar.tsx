import React, { useEffect, useState } from 'react';
import { Menu, X, ShieldCheck, Home, Volume2, VolumeX } from 'lucide-react';
import { PixelMark } from './hh/PixelMark';
import { sound } from '../utils/audio';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => sound.isEnabled());

  useEffect(() => sound.subscribe(setSoundEnabled), []);

  // Nền header: chỉ đổi state khi vượt ngưỡng (không re-render theo từng pixel cuộn)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 24;
        setIsScrolled((prev) => (prev === next ? prev : next));
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---------- Mobile drawer: Esc, khóa cuộn, focus ---------- */
  useEffect(() => {
    if (!menuOpen) return;
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>('button')?.focus(), 60);
    return () => {
      lenis?.start();
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [menuOpen]);

  const goHome = () => {
    sound.playNavSwitch();
    setMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <header className="hh-header" data-scrolled={isScrolled} data-menu={menuOpen}>
      <div className="hh-header-inner">
        <button
          type="button"
          onClick={goHome}
          onPointerEnter={() => sound.playHover()}
          className="hh-brand"
          aria-label="Orbit · Về trang chủ"
        >
          <PixelMark className="hh-brand-mark" />
          <span className="hh-brand-name" aria-hidden="true">
            Orbit<span>.</span>
          </span>
        </button>

        <nav className="hh-nav" aria-label="Điều hướng chính">
          <span className="hh-nav-indicator" aria-hidden="true" />
          <ul className="hh-nav-list">
            <li>
              <button
                type="button"
                className="hh-nav-item"
                aria-current="page"
                onPointerEnter={() => sound.playHover()}
                onClick={goHome}
              >
                <Home className="hh-nav-icon" aria-hidden="true" />
                <span>Trang chủ</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="hh-header-actions">
          <button
            type="button"
            onClick={() => sound.toggle()}
            onPointerEnter={() => sound.playHover()}
            className="hh-sound-btn"
            data-active={soundEnabled}
            aria-label={soundEnabled ? 'Tắt âm thanh tương tác' : 'Bật âm thanh tương tác'}
            title={soundEnabled ? 'Âm thanh Orbit: Đang bật (Bấm để tắt)' : 'Âm thanh Orbit: Đang tắt (Bấm để bật)'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              window.location.href = '/hub';
            }}
            onPointerEnter={() => sound.playHover()}
            className="hh-link-btn"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Vào Hub</span>
          </button>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="hh-menu-toggle"
          aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={menuOpen}
          aria-controls="hh-mobile-drawer"
          onClick={() => {
            sound.playClick();
            setMenuOpen((v) => !v);
          }}
        >
          <span className="hh-menu-icon" data-open={menuOpen}>
            {menuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </span>
        </button>
      </div>

      {/* Drawer luôn được mount để có cả animation vào lẫn ra; inert khi đóng */}
      <div
        id="hh-mobile-drawer"
        ref={drawerRef}
        className="hh-drawer"
        data-open={menuOpen}
        inert={!menuOpen}
        aria-hidden={!menuOpen}
      >
        <div className="hh-drawer-scrim" onClick={() => setMenuOpen(false)} />
        <div className="hh-drawer-panel">
          <nav aria-label="Điều hướng di động">
            <ul className="hh-drawer-list">
              <li>
                <button
                  type="button"
                  className="hh-drawer-item"
                  aria-current="page"
                  onClick={goHome}
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span>Trang chủ</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="hh-drawer-item"
                  onClick={() => {
                    sound.playClick();
                    setMenuOpen(false);
                    window.location.href = '/hub';
                  }}
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Vào Hub</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

const toggleRef = React.createRef<HTMLButtonElement>();
const drawerRef = React.createRef<HTMLDivElement>();

export default Navbar;