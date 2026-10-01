import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative border-t border-white/[0.08] bg-black pt-12 pb-[calc(3rem+env(safe-area-inset-bottom))] px-4 sm:px-6 lg:px-8 z-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand & Slogan */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">HyperHub</span>
            <span className="text-xs text-purple-400 font-mono tracking-widest font-semibold">• LEARN • CODE • CHILL</span>
          </div>
          <p className="text-xs text-white/40 text-center sm:text-left">
            Cộng đồng học tập, thuật toán lập trình & công nghệ tại Việt Nam.
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/60">
          <a href="#hero" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Trang Chủ</a>
          <a href="#countdown-section" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Lịch Thi & Đếm Ngược</a>
          <a href="#pillars" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Trụ Cột</a>
          <a href="https://discord.gg/D34HX87bGe" target="_blank" rel="noopener noreferrer" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Cộng Đồng Discord</a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-white/40 text-center sm:text-right">
          © 2026 HyperHub. All rights reserved.
          <div className="text-[10px] text-white/25 mt-0.5">
            Made with 💜 by the HyperHub Community
          </div>
        </div>
      </div>
    </footer>
  );
};
