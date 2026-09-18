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
import { Subjects } from './components/Subjects';
import { FAQ } from './components/FAQ';
import { Platforms } from './components/Platforms';
import { Credits } from './components/Credits';
import { Footer } from './components/Footer';
import { LofiPlayer } from './components/LofiPlayer';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  useSmoothScroll();

  return (
    <div 
      className={`relative min-h-dvh w-full overflow-x-hidden transition-colors duration-300 selection:bg-purple-500/30 selection:text-purple-200 ${
        theme === 'light' 
          ? 'bg-[#f8fafc] text-slate-900' 
          : 'bg-[#050508] text-white'
      }`}
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
        <Subjects />
        <FAQ />
        <Platforms />
        <Credits />
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Lo-fi Study Lounge Player */}
      <LofiPlayer />
    </div>
  );
};

export default App;
