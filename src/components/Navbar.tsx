import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Menu, X, ShieldCheck, CheckCircle2, LayoutDashboard, Home, BookOpen, Dices, UploadCloud, Volume2, VolumeX, Compass } from 'lucide-react';
import { DiscordUser } from '../utils/discordAuth';
import { PixelMark } from './hh/PixelMark';
import { useHubPulse } from '../hooks/useHubPulse';
import { preloadHub } from '../hubLoader';
import { sound } from '../utils/audio';

type Tab = 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin';

interface NavbarProps {
  theme?: string;
  onToggleTheme?: (e?: React.MouseEvent) => void;
  activeView: 'home' | 'dashboard';
  activeTab?: Tab;
  onSelectView: (view: 'home' | 'dashboard', tab?: Tab) => void;
  onReplayIntro?: () => void;
  user: DiscordUser | null;
  onOpenAuthModal: () => void;
}

interface NavItem {
  key: string;
  view: 'home' | 'dashboard';
  tab?: Tab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', view: 'home', label: 'Trang chủ', mobileLabel: 'Trang chủ', icon: Home },
  { key: 'vault', view: 'dashboard', tab: 'vault', label: 'Kho đề', mobileLabel: 'Kho đề thi', icon: BookOpen },
  { key: 'get_exam', view: 'dashboard', tab: 'get_exam', label: 'Lấy đề', mobileLabel: 'Lấy đề nhanh', icon: Dices },
  { key: 'submit_doc', view: 'dashboard', tab: 'submit_doc', label: 'Nộp đề', mobileLabel: 'Kho nộp đề', icon: UploadCloud },
  { key: 'overview', view: 'dashboard', tab: 'overview', label: 'Bảng điều khiển', mobileLabel: 'Bảng điều khiển', icon: LayoutDashboard },
];

const isItemActive = (item: NavItem, view: 'home' | 'dashboard', tab: Tab) => {
  if (item.view !== view) return false;
  if (view === 'home') return true;
  if (item.tab === 'overview') return tab === 'overview' || tab === 'admin';
  return item.tab === tab;
};

export const Navbar: React.FC<NavbarProps> = ({ activeView, activeTab = 'overview', onSelectView, onReplayIntro, user, onOpenAuthModal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => sound.isEnabled());
  const { docCount } = useHubPulse();

  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const activeKey = NAV_ITEMS.find((i) => isItemActive(i, activeView, activeTab))?.key ?? 'home';

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

  /* ---------- Indicator trượt giữa các mục nav ---------- */
  const moveIndicator = useCallback((key: string, instant = false) => {
    const list = listRef.current;
    const ind = indicatorRef.current;
    const el = itemRefs.current[key];
    if (!list || !ind || !el) return;
    const host = ind.parentElement ?? list;
    const lr = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (instant) ind.style.transition = 'none';
    ind.style.width = `${r.width}px`;
    ind.style.transform = `translate3d(${r.left - lr.left - host.clientLeft}px, 0, 0)`;
    ind.style.opacity = '1';
    if (instant) {
      void ind.offsetWidth;
      ind.style.transition = '';
    }
  }, []);

  useLayoutEffect(() => {
    moveIndicator(activeKey, true);
    const onResize = () => moveIndicator(activeKey, true);
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => moveIndicator(activeKey, true)).catch(() => {});
    return () => window.removeEventListener('resize', onResize);
  }, [activeKey, moveIndicator, docCount]);

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

  const go = (item: NavItem) => {
    sound.playNavSwitch();
    setMenuOpen(false);
    onSelectView(item.view, item.tab);
  };

  const countBadge = (small = false) =>
    docCount !== null ? (
      <span className={`hh-nav-badge${small ? ' hh-nav-badge--sm' : ''}`}>
        {docCount.toLocaleString('vi-VN')}
        <span className="sr-only"> đề</span>
      </span>
    ) : null;

  return (
    <header className="hh-header" data-scrolled={isScrolled || activeView === 'dashboard'} data-menu={menuOpen}>
      <div className="hh-header-inner">
        <button
          type="button"
          onClick={() => go(NAV_ITEMS[0])}
          onPointerEnter={() => sound.playHover()}
          className="hh-brand"
          aria-label="Orbit · Về trang chủ"
        >
          <PixelMark className="hh-brand-mark" />
          <span className="hh-brand-name" aria-hidden="true">
            Orbit<span>.</span>
          </span>
        </button>

        <nav className="hh-nav" aria-label="Điều hướng chính" onPointerLeave={() => moveIndicator(activeKey)}>
          <span ref={indicatorRef} className="hh-nav-indicator" aria-hidden="true" />
          <ul ref={listRef} className="hh-nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeKey;
              return (
                <li key={item.key}>
                  <button
                    ref={(el) => {
                      itemRefs.current[item.key] = el;
                    }}
                    type="button"
                    className="hh-nav-item"
                    aria-current={active ? 'page' : undefined}
                    onPointerEnter={() => {
                      sound.playHover();
                      moveIndicator(item.key);
                      if (item.view === 'dashboard') preloadHub();
                    }}
                    onFocus={() => {
                      moveIndicator(item.key);
                      if (item.view === 'dashboard') preloadHub();
                    }}
                    onBlur={() => moveIndicator(activeKey)}
                    onClick={() => go(item)}
                  >
                    <Icon className="hh-nav-icon" aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.key === 'vault' && countBadge(true)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hh-header-actions">
          {onReplayIntro && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onReplayIntro();
              }}
              onPointerEnter={() => sound.playHover()}
              className="hh-replay-intro-btn"
              title="Phát lại màn mở đầu quỹ đạo Orbit"
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Intro</span>
            </button>
          )}

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

          {user ? (
            <button
              type="button"
              onClick={() => {
                sound.playNavSwitch();
                onSelectView('dashboard');
              }}
              onPointerEnter={() => sound.playHover()}
              className="hh-user-chip"
              title={`Đã liên kết với Discord: @${user.username}`}
            >
              <img
                src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt=""
                width={24}
                height={24}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                }}
              />
              <span className="hh-user-name">{user.global_name || user.username}</span>
              {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-label="Email đã xác minh" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenAuthModal();
              }}
              onPointerEnter={() => sound.playHover()}
              className="hh-link-btn"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Liên kết Discord</span>
            </button>
          )}
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
              {NAV_ITEMS.map((item, i) => {
                const Icon = item.icon;
                const active = item.key === activeKey;
                return (
                  <li key={item.key} style={{ ['--i' as string]: i }}>
                    <button
                      type="button"
                      className="hh-drawer-item"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => go(item)}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span>{item.mobileLabel}</span>
                      {item.key === 'vault' && countBadge()}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="hh-drawer-foot">
            {user ? (
              <div className="hh-drawer-user">
                <img src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="" width={36} height={36} />
                <div>
                  <div className="hh-drawer-user-name">{user.global_name || user.username}</div>
                  <div className="hh-drawer-user-handle">@{user.username}</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMenuOpen(false);
                  onOpenAuthModal();
                }}
                className="hh-drawer-discord"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Liên kết tài khoản Discord</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
