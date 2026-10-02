import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard';
import { ExamCountdown } from './components/ExamCountdown';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { MouseAura } from './components/MouseAura';
import { AmbientGlow } from './components/AmbientGlow';
import { CyberGrid } from './components/CyberGrid';
import { Footer } from './components/Footer';
import { LofiPlayer } from './components/LofiPlayer';
import { DiscordUser, getStoredDiscordUser, removeDiscordUser, handleDiscordOAuthCallback } from './utils/discordAuth';
import { HomeStudyPortal } from './components/HomeStudyPortal';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  useSmoothScroll();

  // Khởi tạo activeView dựa theo pathname (/hub) hoặc hash (#hub, #dashboard)
  const [activeView, setActiveView] = useState<'home' | 'dashboard'>(() => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.startsWith('/hub') || hash === '#hub' || hash === '#dashboard') {
      return 'dashboard';
    }
    return 'home';
  });

  const [dashboardTab, setDashboardTab] = useState<'overview' | 'vault' | 'get_exam' | 'submit_doc'>('overview');
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Điều hướng SPA chuẩn với URL /hub và /
  const navigateTo = useCallback(
    (view: 'home' | 'dashboard', tab?: 'overview' | 'vault' | 'get_exam' | 'submit_doc') => {
      setActiveView(view);
      if (tab) {
        setDashboardTab(tab);
      }
      const targetPath = view === 'dashboard' ? '/hub' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  // Lắng nghe nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith('/hub') || hash === '#hub' || hash === '#dashboard') {
        setActiveView('dashboard');
      } else {
        setActiveView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Xử lý nạp tài khoản & OAuth callback khi khởi tạo
  useEffect(() => {
    // 1. Kiểm tra nếu có redirect từ Discord OAuth2
    handleDiscordOAuthCallback().then((user) => {
      if (user) {
        setDiscordUser(user);
        navigateTo('dashboard');
        return;
      }
      // 2. Nạp từ localStorage
      const stored = getStoredDiscordUser();
      if (stored) {
        setDiscordUser(stored);
      }
    });

    // 3. Kiểm tra hash URL trực tiếp khi tải lại trang
    if (window.location.hash === '#dashboard' || window.location.hash === '#hub') {
      navigateTo('dashboard');
    }
  }, [navigateTo]);

  const handleLogout = () => {
    removeDiscordUser();
    setDiscordUser(null);
  };

  return (
    <div 
      className="relative min-h-dvh w-full overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200 bg-[#050508] text-white"
    >
      {/* Background Ambience, Cyber Grid & Mouse Aura */}
      <AmbientGlow />
      <CyberGrid />
      <MouseAura />

      {/* Header Navigation with Dashboard Trigger */}
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        activeView={activeView}
        onSelectView={(view, tab) => navigateTo(view, tab)}
        user={discordUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Experience: Chuyển đổi mượt mà giữa Trang Chủ (kèm Bộ Đếm THPT, Kho Đề, Nộp Đề) và Bảng Điều Khiển (/hub) */}
      <main className="relative z-10 flex flex-col w-full overflow-x-hidden pt-16 sm:pt-20">
        {activeView === 'home' ? (
          <>
            <Hero onOpenDashboard={() => navigateTo('dashboard', 'get_exam')} />

            {/* Đồng Hồ Đếm Ngược Ngày Thi THPT & Tuyển Sinh Vào 10 Trực Tiếp Tại Trang Chủ */}
            <section
              id="countdown-section"
              className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16"
            >
              <ExamCountdown onNavigateTab={(tab) => navigateTo('dashboard', tab)} />
            </section>

            {/* Cổng Học Liệu & Đề Thi (Kho 28+, Bốc Đề, Nộp Đề Hàng Loạt) Trực Tiếp Tại Trang Chủ */}
            <section
              id="study-portal-section"
              className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24"
            >
              <HomeStudyPortal
                user={discordUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onNavigateToTab={(tab) => navigateTo('dashboard', tab)}
              />
            </section>
          </>
        ) : (
          <Dashboard
            user={discordUser}
            initialTab={dashboardTab}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onBackToHome={() => navigateTo('home')}
          />
        )}
      </main>

      {/* Footer (Hiển thị ở Trang Chủ) */}
      {activeView === 'home' && <Footer />}

      {/* [ARCHIVED]: Trình đọc PDF/Word modal đã chuyển vào src/archived/DocPreviewModal.tsx, các nút thẻ đề hiện mở tệp/tải về trực tiếp */}

      {/* Floating Lo-fi Study Lounge Player */}
      <LofiPlayer />

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
