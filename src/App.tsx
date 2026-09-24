import React from 'react';
import { useTheme } from './hooks/useTheme';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MouseAura } from './components/MouseAura';
import { AmbientGlow } from './components/AmbientGlow';
import { CyberGrid } from './components/CyberGrid';
import { About } from './components/About';
import { HowItWorks } from './components/HowItWorks';
import { Pillars } from './components/Pillars';
// import { ArenaPreview } from './components/ArenaPreview'; // [Lưu trữ sẵn sàng - mở lại khi hoàn tất nâng cấp]
import { Subjects } from './components/Subjects';
import { FAQ } from './components/FAQ';
import { Platforms } from './components/Platforms';
import { Credits } from './components/Credits';
import { Footer } from './components/Footer';
import { LofiPlayer } from './components/LofiPlayer';
import { ThemeCurtain } from './components/ThemeCurtain';

export const App: React.FC = () => {
  const { theme, toggleTheme, transitionState } = useTheme();
  useSmoothScroll();

  return (
    <div 
      className="relative min-h-dvh w-full overflow-x-hidden transition-colors duration-300 selection:bg-purple-500/30 selection:text-purple-700 dark:selection:text-purple-200 bg-[#f8fafc] dark:bg-[#050508] text-slate-900 dark:text-white"
    >
      {/* Background Ambience, Cyber Grid & Mouse Aura */}
      <AmbientGlow />
      <CyberGrid />
      <MouseAura />

      {/* Navigation with Theme Switcher */}
      <Navbar theme={theme} onToggleTheme={toggleTheme} />

      {/* Main Continuous Experience */}
      <main className="relative z-10 flex flex-col w-full overflow-x-hidden">
        <Hero />
        <About />
        <HowItWorks />
        <Pillars />
        {/* <ArenaPreview /> -- Lưu trữ sẵn sàng, bỏ chú thích để hiển thị lại bất kỳ lúc nào */}
        <Subjects />
        <FAQ />
        <Platforms />
        <Credits />
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Lo-fi Study Lounge Player */}
      <LofiPlayer />

      {/* Full-Screen Shutter Theme Transition Curtain */}
      <ThemeCurtain transition={transitionState} />
    </div>
  );
};

export default App;
