import React, { useEffect } from 'react';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { AmbientField, CursorAura } from './components/hh/Ambient';
import { CommunityIntro } from './components/CommunityIntro';
import { sound } from './utils/audio';

export const App: React.FC = () => {

  // Chỉ bật Lenis ở Trang Chủ
  useSmoothScroll(true);

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

  const openHub = () => {
    window.location.href = '/hub';
  };

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip bg-[#08060E] text-[#F8F5FF] selection:bg-pink-500/35 selection:text-pink-100">
      <a href="#main-content" className="hh-skip">Bỏ qua tới nội dung chính</a>

      {/* Nền vũ trụ Orbit (AmbientField Canvas + CursorAura) */}
      <AmbientField mode="home" />
      <CursorAura />

      <div key="view-home" className="hh-view-stage relative z-10 w-full min-h-dvh">
        <Navbar />

        <main id="main-content" className="hh-main">
          <Hero
            onOpenDashboard={openHub}
            onSelectSubject={(subjectName) => {
              try {
                sessionStorage.setItem('orbit_subject_filter', subjectName);
              } catch {}
              openHub();
            }}
          />

          {/* ───────── GIỚI THIỆU SERVER ORBIT ───────── */}
          <div id="chapter-learn" className="hh-chapter hh-tone-learn">
            <CommunityIntro onOpenVault={openHub} />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default App;