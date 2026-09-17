import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative border-t border-white/[0.08] bg-black py-12 px-4 sm:px-6 lg:px-8 z-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand & Slogan */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">HyperHub</span>
            <span className="text-xs text-purple-400 font-mono tracking-widest">• LEARN • CODE • CHILL</span>
          </div>
          <p className="text-xs text-white/40">
            Cộng đồng học tập, thuật toán lập trình & công nghệ tại Việt Nam.
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex items-center gap-6 text-xs text-white/60">
          <a href="#hero" className="hover:text-white transition-colors">Trang Chủ</a>
          <a href="#about" className="hover:text-white transition-colors">Giới Thiệu</a>
          <a href="#pillars" className="hover:text-white transition-colors">Trụ Cột</a>
          <a href="#platforms" className="hover:text-white transition-colors">Cộng Đồng</a>
          <a href="#credits" className="hover:text-white transition-colors">Đội Ngũ</a>
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
