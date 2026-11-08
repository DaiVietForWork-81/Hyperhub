import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTheme } from './hooks/useTheme';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ExamCountdown } from './components/ExamCountdown';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { HubAuthWall } from './components/HubAuthWall';
import { Footer } from './components/Footer';
import { DiscordUser, getStoredDiscordUser, getPendingDiscordUser, removeDiscordUser, handleDiscordOAuthCallback, isStoredTokenAlive, syncLinkedAccount } from './utils/discordAuth';
import { getApiBaseUrl, notifyBotViaWebhookHandshake } from './utils/apiConfig';
import { DreamAspirations } from './components/DreamAspirations';
import { CommunityIntro } from './components/CommunityIntro';
import { CommunityChannels } from './components/CommunityChannels';
import { CoFounders } from './components/CoFounders';
import { AmbientField, CursorAura } from './components/hh/Ambient';
import { ChapterRail, ChapterOpener } from './components/hh/Chapters';
import { Reveal } from './components/hh/Reveal';
import { loadDashboard, preloadHubWhenIdle } from './hubLoader';
import { sound } from './utils/audio';
import { AppView as View, DashboardTab as Tab, parseAppRoute, buildAppRoutePath } from './utils/routeParser';

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
 * Chuyển view mượt 120fps không chặn luồng chính (không dùng flushSync + startViewTransition
 * chụp ảnh toàn trang gây khựng 150-250ms khi mount Dashboard lớn).
 */
const withViewTransition = (update: () => void, dir: 'to-hub' | 'to-home' = 'to-hub') => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.navDir = dir;
  }
  update();
};

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Khởi tạo activeView & dashboardTab thống nhất qua parseAppRoute
  const [activeView, setActiveView] = useState<View>(() => {
    if (typeof window === 'undefined') return 'home';
    return parseAppRoute(window.location.pathname, window.location.hash).view;
  });

  // Chỉ bật Lenis ở Trang Chủ, để Hub sử dụng cuộn gốc 120Hz không độ trễ
  useSmoothScroll(activeView === 'home');

  const [dashboardTab, setDashboardTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'overview';
    return parseAppRoute(window.location.pathname, window.location.hash).tab;
  });
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Điều hướng SPA chuẩn với URL /hub, /courses, /forum, /admin và / — nạp sẵn chunk Hub trước khi chạy ViewTransition
  const navigateTo = useCallback((view: View, tab?: Tab) => {
    const search = typeof window !== 'undefined' ? window.location.search || '' : '';
    const targetPath = buildAppRoutePath(view, tab || 'overview', search);
    const dir: 'to-hub' | 'to-home' = view === 'dashboard' ? 'to-hub' : 'to-home';
    const apply = () => {
      setActiveView(view);
      if (tab) setDashboardTab(tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { immediate: true });
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    if (view === 'dashboard') {
      loadDashboard()
        .then(() => withViewTransition(apply, dir))
        .catch(() => withViewTransition(apply, dir));
    } else {
      withViewTransition(apply, dir);
    }
  }, []);

  // Lắng nghe nút Back / Forward & thay đổi hash (#vault, #forum, #submit_doc, #courses) trên trình duyệt
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const parsed = parseAppRoute(window.location.pathname, window.location.hash);
      withViewTransition(
        () => {
          setActiveView(parsed.view);
          if (parsed.view === 'dashboard') {
            setDashboardTab(parsed.tab);
          }
        },
        parsed.view === 'dashboard' ? 'to-hub' : 'to-home'
      );
    };
    window.addEventListener('popstate', syncRouteFromLocation);
    window.addEventListener('hashchange', syncRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
      window.removeEventListener('hashchange', syncRouteFromLocation);
    };
  }, []);

  // Xử lý nạp tài khoản & OAuth callback khi khởi tạo
  useEffect(() => {
    const h = window.location.hash.toLowerCase();
    const isOAuthCallbackHash = h.includes('access_token');

    handleDiscordOAuthCallback().then((user) => {
      if (user) {
        syncLinkedAccount(getApiBaseUrl());
        window.dispatchEvent(new PopStateEvent('popstate'));
        setIsAuthModalOpen(true);
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
      } else if (getPendingDiscordUser()) {
        // Nếu người dùng đã liên kết Discord ở bước 1 và vừa mở lại Web từ kênh #🔐・verify để nhập mã 6 số
        setIsAuthModalOpen(true);
      }
    });

    const onStorageSync = () => {
      const latestStored = getStoredDiscordUser();
      setDiscordUser(latestStored);
    };
    window.addEventListener('storage', onStorageSync);

    if (!isOAuthCallbackHash) {
      if (h === '#dashboard' || h === '#hub') {
        navigateTo('dashboard');
      } else if (h === '#vault') {
        navigateTo('dashboard', 'vault');
      } else if (h === '#get_exam') {
        navigateTo('dashboard', 'get_exam');
      } else if (h === '#submit_doc') {
        navigateTo('dashboard', 'submit_doc');
      } else if (h === '#forum') {
        navigateTo('dashboard', 'forum');
      } else if (h === '#courses') {
        navigateTo('dashboard', 'courses');
      }
    }

    return () => {
      window.removeEventListener('storage', onStorageSync);
    };
  }, [navigateTo]);

  const handleLogout = () => {
    removeDiscordUser();
    setDiscordUser(null);
  };

  // Trang chủ đã hiển thị → tải trước Hub khi trình duyệt rảnh
  useEffect(() => (activeView === 'home' ? preloadHubWhenIdle() : undefined), [activeView]);

  // Khi Web khởi động / người dùng mở trang, bắn tín hiệu qua Discord Webhook 1568882621470089247 để Bot ghi nhận và kết nối đồng bộ
  useEffect(() => {
    const stored = getStoredDiscordUser();
    notifyBotViaWebhookHandshake({
      event: 'web_boot',
      view: activeView,
      tab: dashboardTab,
      username: stored?.global_name || stored?.username || 'Khách truy cập',
      userId: stored?.id,
    }).catch(() => {});
  }, []);

  // Khi người dùng chuyển sang sử dụng Orbit Hub / Kho Đề / Diễn Đàn / Admin, gửi nhịp đồng bộ tới Bot
  useEffect(() => {
    if (activeView === 'dashboard') {
      notifyBotViaWebhookHandshake({
        event: 'web_active',
        view: activeView,
        tab: dashboardTab,
        username: discordUser?.global_name || discordUser?.username || 'Khách truy cập',
        userId: discordUser?.id,
      }).catch(() => {});
    }
  }, [activeView, dashboardTab, discordUser?.id]);

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

      {/* Nền vũ trụ Orbit (AmbientField Canvas + CursorAura) dùng chung xuyên suốt Home & Hub, không remount */}
      <AmbientField mode={activeView} />
      <CursorAura />

      {activeView === 'home' ? (
        <div key="view-home" className="hh-view-stage relative z-10 w-full min-h-dvh">
          <Navbar
            theme={theme}
            onToggleTheme={toggleTheme}
            activeView={activeView}
            activeTab={dashboardTab}
            onSelectView={(view, tab) => navigateTo(view, tab)}
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

          <Footer onOpenDashboard={openHub('get_exam')} />
        </div>
      ) : (
        /* HUB / BẢNG ĐIỀU KHIỂN (MỞ TỰ DO KHO ĐỀ, BỐC ĐỀ, DIỄN ĐÀN; CHỈ YÊU CẦU DISCORD KHI VÀO ADMIN) */
        <div key="view-dashboard" id="main-content" className="hh-view-stage relative z-10 w-full min-h-dvh">
          {!discordUser && dashboardTab === 'admin' ? (
            <HubAuthWall
              onLogin={() => setIsAuthModalOpen(true)}
              onBackToHome={() => navigateTo('home')}
            />
          ) : (
            <Suspense fallback={<HubFallback />}>
              <Dashboard
                user={discordUser}
                initialTab={dashboardTab}
                onTabChange={(tab) => {
                  setDashboardTab(tab);
                  const search = window.location.search || '';
                  const nextPath =
                    tab === 'admin'
                      ? `/admin${search}`
                      : tab === 'courses'
                      ? `/courses${search}`
                      : tab === 'forum'
                      ? `/forum${search}`
                      : `/hub${search}`;
                  if (window.location.pathname + window.location.search !== nextPath) {
                    window.history.replaceState(null, '', nextPath);
                  }
                }}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onUserAuthenticated={(user) => setDiscordUser(user)}
                onLogout={handleLogout}
                onBackToHome={() => navigateTo('home')}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* Discord OAuth2 & Account Link Modal */}
      <DiscordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setDiscordUser(user);
          notifyBotViaWebhookHandshake({
            event: 'user_login',
            view: activeView,
            tab: dashboardTab,
            username: user.global_name || user.username,
            userId: user.id,
            force: true,
          }).catch(() => {});
        }}
      />
    </div>
  );
};

export default App;
