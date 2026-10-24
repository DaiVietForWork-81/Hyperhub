import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useTheme } from './hooks/useTheme';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ExamCountdown } from './components/ExamCountdown';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { Footer } from './components/Footer';
import { DiscordUser, getStoredDiscordUser, removeDiscordUser, handleDiscordOAuthCallback, isStoredTokenAlive, syncLinkedAccount } from './utils/discordAuth';
import { getApiBaseUrl } from './utils/apiConfig';
import { DreamAspirations } from './components/DreamAspirations';
import { CommunityIntro } from './components/CommunityIntro';
import { CommunityChannels } from './components/CommunityChannels';
import { CoFounders } from './components/CoFounders';
import { AmbientField, CursorAura } from './components/hh/Ambient';
import { ChapterRail, ChapterOpener } from './components/hh/Chapters';
import { Reveal } from './components/hh/Reveal';
import { OrbitIntro } from './components/OrbitIntro';
import { prefersReducedMotion } from './motion/capabilities';
import { loadDashboard, preloadHubWhenIdle } from './hubLoader';
import { sound } from './utils/audio';

type View = 'intro' | 'home' | 'dashboard';
type Tab = 'overview' | 'vault' | 'get_exam' | 'submit_doc' | 'admin';

const INTRO_SEEN_KEY = 'orbit_intro_seen';

/**
 * Hub (Dashboard ~200KB nguồn) tách chunk riêng: trang chủ tải nhanh hơn,
 * chunk Hub được tải trước khi rảnh / khi người dùng rê chuột, chạm vào CTA dẫn vào Hub.
 */
const Dashboard = lazy(() => loadDashboard().then((m) => ({ default: m.Dashboard })));

/** Khung chờ khi chunk Hub đang tải (thường chỉ thấy trên mạng chậm). */
const HubFallback: React.FC = () => (
  <div className="hh-hub-loading" role="status" aria-live="polite">
    <span className="hh-btn-spinner" aria-hidden="true" />
    Đang mở Orbit Hub…
  </div>
);

/**
 * Chuyển view có hiệu ứng: dùng View Transitions API khi trình duyệt hỗ trợ
 * (crossfade ngắn, không remount thừa), ngược lại cập nhật trực tiếp.
 */
const withViewTransition = (update: () => void) => {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
};

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  useSmoothScroll();

  // Khởi tạo activeView dựa theo pathname (/intro, /hub, /admin) hoặc phiên truy cập đầu tiên
  const [activeView, setActiveView] = useState<View>(() => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);

    if (path.startsWith('/hub') || path.startsWith('/admin') || hash === '#hub' || hash === '#dashboard') {
      return 'dashboard';
    }
    if (path.startsWith('/intro') || hash === '#intro' || params.get('intro') === '1') {
      return 'intro';
    }
    // Bỏ qua Intro khi điều hướng sâu bằng hash/query hoặc khi trình kiểm tra bố cục tự động đang lấy mẫu
    const isAutomatedPageProbe = '__motionSample' in window;
    if (hash || params.get('skipIntro') === '1' || isAutomatedPageProbe) {
      return 'home';
    }
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY) === '1') {
        return 'home';
      }
    } catch {
      return 'home';
    }
    return 'intro';
  });

  const [dashboardTab, setDashboardTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'overview';
    if (window.location.pathname.toLowerCase().startsWith('/admin')) return 'admin';
    return 'overview';
  });
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Điều hướng SPA chuẩn với URL /intro, /hub, /admin và /
  const navigateTo = useCallback((view: View, tab?: Tab) => {
    const targetPath =
      view === 'dashboard'
        ? tab === 'admin'
          ? '/admin'
          : '/hub'
        : view === 'intro'
          ? '/intro'
          : '/';
    if (view !== 'intro') {
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
      } catch {
        // ignore storage quota errors
      }
    }
    const apply = () => {
      setActiveView(view);
      if (tab) setDashboardTab(tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    withViewTransition(apply);
  }, []);

  const handleEnterFromIntro = useCallback(
    (target: 'home' | 'dashboard' = 'home') => {
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
      } catch {
        // ignore
      }
      if (target === 'dashboard') {
        navigateTo('dashboard', 'get_exam');
      } else {
        navigateTo('home');
      }
    },
    [navigateTo]
  );

  const handleReplayIntro = useCallback(() => {
    navigateTo('intro');
  }, [navigateTo]);

  // Lắng nghe nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      withViewTransition(() => {
        if (path.startsWith('/hub') || path.startsWith('/admin') || hash === '#hub' || hash === '#dashboard') {
          setActiveView('dashboard');
          if (path.startsWith('/admin')) {
            setDashboardTab('admin');
          }
        } else if (path.startsWith('/intro') || hash === '#intro') {
          setActiveView('intro');
        } else {
          setActiveView('home');
        }
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Xử lý nạp tài khoản & OAuth callback khi khởi tạo
  useEffect(() => {
    handleDiscordOAuthCallback().then((user) => {
      if (user) {
        setDiscordUser(user);
        syncLinkedAccount(getApiBaseUrl());
        navigateTo('dashboard');
        return;
      }
      const stored = getStoredDiscordUser();
      if (stored) {
        setDiscordUser(stored);
        syncLinkedAccount(getApiBaseUrl());
        isStoredTokenAlive().then((alive) => {
          if (!alive) {
            removeDiscordUser();
            setDiscordUser(null);
          }
        });
      }
    });

    if (window.location.hash === '#dashboard' || window.location.hash === '#hub') {
      navigateTo('dashboard');
    }
  }, [navigateTo]);

  const handleLogout = () => {
    removeDiscordUser();
    setDiscordUser(null);
  };

  // Trang chủ hoặc Intro đã hiển thị → tải trước Hub khi trình duyệt rảnh
  useEffect(() => (activeView === 'home' || activeView === 'intro' ? preloadHubWhenIdle() : undefined), [activeView]);

  // Phản hồi âm thanh tương tác toàn cục
  useEffect(() => {
    const onGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest('button, a, [role="tab"], [role="checkbox"]');
      if (!target) return;
      if (target.classList.contains('hh-btn') || target.classList.contains('hh-sound-btn') || target.classList.contains('hh-nav-item')) {
        return;
      }
      if (target.getAttribute('role') === 'tab' || target.classList.contains('hh-toggle-chip')) {
        sound.playTick(true);
      } else {
        sound.playClick();
      }
    };
    document.addEventListener('click', onGlobalClick, { capture: true });
    return () => document.removeEventListener('click', onGlobalClick, { capture: true });
  }, []);

  const openHub = (tab: Tab) => () => navigateTo('dashboard', tab);

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip bg-[#08060E] text-[#F8F5FF] selection:bg-pink-500/35 selection:text-pink-100">
      <a href="#main-content" className="hh-skip">Bỏ qua tới nội dung chính</a>

      {activeView === 'intro' ? (
        <main id="main-content" className="relative z-10 min-h-dvh w-full">
          <OrbitIntro
            onEnterMain={() => handleEnterFromIntro('home')}
            onEnterHub={() => handleEnterFromIntro('dashboard')}
            onSkip={() => handleEnterFromIntro('home')}
          />
        </main>
      ) : activeView === 'home' ? (
        <>
          <AmbientField />
          <CursorAura />
          <Navbar
            theme={theme}
            onToggleTheme={toggleTheme}
            activeView={activeView}
            activeTab={dashboardTab}
            onSelectView={(view, tab) => navigateTo(view, tab)}
            onReplayIntro={handleReplayIntro}
            user={discordUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
          <ChapterRail />

          <main id="main-content" className="hh-main">
            <Hero
              onOpenDashboard={openHub('get_exam')}
              onSelectSubject={(subjectName) => {
                try {
                  sessionStorage.setItem('orbit_subject_filter', subjectName);
                } catch {}
                navigateTo('dashboard', 'vault');
              }}
            />

            {/* ───────── CHƯƠNG 1 · LEARN ───────── */}
            <div id="chapter-learn" className="hh-chapter hh-tone-learn">
              <ChapterOpener
                word="LEARN"
                index={1}
                title="Kho đề thực chiến cho mùa thi."
                lede="Đếm ngược tới ngày thi, lịch từng môn, kho đề thẩm định và những công cụ giúp bạn ôn đúng trọng tâm."
              />
              <section id="countdown-section" className="hh-section" aria-label="Đếm ngược mùa thi">
                <Reveal preset="fade">
                  <ExamCountdown onNavigateTab={(tab) => navigateTo('dashboard', tab)} />
                </Reveal>
              </section>
              <CommunityIntro onOpenVault={openHub('vault')} />
            </div>

            {/* ───────── CHƯƠNG 2 · GROW ───────── */}
            <div id="chapter-chill" className="hh-chapter hh-tone-grow">
              <ChapterOpener
                word="GROW"
                index={2}
                title="Nuôi dưỡng mục tiêu, bứt phá mỗi ngày."
                lede="Khắc ghi ngôi trường mơ ước để giữ vững quỹ đạo mỗi ngày, kết hợp nhịp ôn Pomodoro và không gian học tập tĩnh lặng."
              />
              <DreamAspirations />
            </div>

            {/* ───────── CHƯƠNG 3 · CONNECT ───────── */}
            <div id="chapter-connect" className="hh-chapter hh-tone-connect">
              <ChapterOpener
                word="CONNECT"
                index={3}
                title="Cùng gặp nhau trên một quỹ đạo."
                lede="Những con đường khác nhau, dù bạn ôn thi vào 10 hay tốt nghiệp THPT, theo đuổi thuật toán hay Toán, Văn, Ngoại ngữ, luôn có người cùng tiến xa hơn tại Orbit."
              />
              <CommunityChannels />
              <CoFounders />
            </div>
          </main>

          <Footer onOpenDashboard={openHub('get_exam')} onReplayIntro={handleReplayIntro} />
        </>
      ) : (
        /* HUB / BẢNG ĐIỀU KHIỂN */
        <>
          <AmbientField />
          <CursorAura />
          <div id="main-content" className="relative z-10 w-full min-h-screen">
            <Suspense fallback={<HubFallback />}>
              <Dashboard
                user={discordUser}
                initialTab={dashboardTab}
                onTabChange={(tab) => {
                  setDashboardTab(tab);
                  const nextPath = tab === 'admin' ? '/admin' : '/hub';
                  if (window.location.pathname !== nextPath) {
                    window.history.replaceState(null, '', nextPath);
                  }
                }}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onLogout={handleLogout}
                onBackToHome={() => navigateTo('home')}
              />
            </Suspense>
          </div>
        </>
      )}

      {/* Discord OAuth2 & Account Link Modal */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setDiscordUser(user);
        }}
      />
    </div>
  );
};

export default App;
