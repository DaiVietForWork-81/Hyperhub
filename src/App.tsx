import React, { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Dashboard } from './components/Dashboard';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { MouseAura } from './components/MouseAura';
import { AmbientGlow } from './components/AmbientGlow';
import { CyberGrid } from './components/CyberGrid';
import { Footer } from './components/Footer';
import { LofiPlayer } from './components/LofiPlayer';
import { ThemeCurtain } from './components/ThemeCurtain';
import {
  DiscordUser,
  getStoredDiscordUser,
  removeDiscordUser,
  handleDiscordOAuthCallback,
} from './utils/discordAuth';

export const App: React.FC = () => {
  const { theme, toggleTheme, transitionState } = useTheme();
  useSmoothScroll();

  const [activeView, setActiveView] = useState<'home' | 'dashboard'>('home');
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Xử lý nạp tài khoản & OAuth callback khi khởi tạo
  useEffect(() => {
    // 1. Kiểm tra nếu có redirect từ Discord OAuth2
    handleDiscordOAuthCallback().then((user) => {
      if (user) {
        setDiscordUser(user);
        setActiveView('dashboard');
        return;
      }
      // 2. Nạp từ localStorage
      const stored = getStoredDiscordUser();
      if (stored) {
        setDiscordUser(stored);
      }
    });

    // 3. Kiểm tra hash URL (#dashboard)
    if (window.location.hash === '#dashboard') {
      setActiveView('dashboard');
    }
  }, []);

  const handleLogout = () => {
    removeDiscordUser();
    setDiscordUser(null);
  };

  return (
    <div 
      className="relative min-h-dvh w-full overflow-x-hidden transition-colors duration-300 selection:bg-purple-500/30 selection:text-purple-700 dark:selection:text-purple-200 bg-[#f8fafc] dark:bg-[#050508] text-slate-900 dark:text-white"
    >
      {/* Background Ambience, Cyber Grid & Mouse Aura */}
      <AmbientGlow />
      <CyberGrid />
      <MouseAura />

      {/* Header Navigation with Theme Switcher & Dashboard Trigger */}
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        activeView={activeView}
        onSelectView={setActiveView}
        user={discordUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Experience: Chuyển đổi mượt mà giữa Trang Chủ và Bảng Điều Khiển */}
      <main className="relative z-10 flex flex-col w-full overflow-x-hidden pt-16 sm:pt-20">
        {activeView === 'home' ? (
          <Hero onOpenDashboard={() => setActiveView('dashboard')} />
        ) : (
          <Dashboard
            user={discordUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onBackToHome={() => setActiveView('home')}
          />
        )}
      </main>

      {/* Footer (Hiển thị ở Trang Chủ) */}
      {activeView === 'home' && <Footer />}

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

      {/* Full-Screen Shutter Theme Transition Curtain */}
      <ThemeCurtain transition={transitionState} />
    </div>
  );
};

export default App;
