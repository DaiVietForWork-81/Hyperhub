import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative border-t border-white/[0.08] bg-black pt-12 pb-[calc(3rem+env(safe-area-inset-bottom))] px-4 sm:px-6 lg:px-8 z-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand & Slogan */}
        <div className="flex flex-col items-center sm:items-start gap-1.5">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Orbit Logo" className="w-6 h-6 rounded-md object-cover ring-1 ring-purple-500/30" />
            <span className="text-lg font-bold tracking-tight text-white">Orbit</span>
            <span className="text-xs text-purple-400 font-mono tracking-widest font-semibold">• LEARN • GROW • CONNECT</span>
          </div>
          <p className="text-xs text-white/60 text-center sm:text-left font-medium">
            Different paths. One orbit. <span className="text-white/40">(Những con đường khác nhau. Cùng một quỹ đạo.)</span>
          </p>
          <p className="text-[11px] text-white/40 text-center sm:text-left max-w-md">
            Mỗi người có quỹ đạo riêng, nhưng chúng ta gặp nhau tại Orbit để học hỏi, phát triển và cùng tiến xa hơn.
          </p>
          <div className="text-[11px] text-purple-300/60 mt-0.5">
            Đồng sáng lập: <strong className="text-purple-300 font-semibold">Dai Viet, GithuZ, Nguyễn Duy, Lê Minh</strong>
          </div>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60">
          <a href="#hero" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Trang Chủ</a>
          <a href="#countdown-section" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Thời Gian Tuyển Sinh</a>
          <a href="#dream-aspirations" className="btn-motion hover:text-pink-400 hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Ước Mơ</a>
          <a href="#community-intro" className="btn-motion hover:text-purple-400 hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Giới Thiệu</a>
          <a href="#community-channels" className="btn-motion hover:text-sky-400 hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Cộng Đồng</a>
          <a href="#co-founders" className="btn-motion hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all py-1.5 px-1">Đồng Sáng Lập</a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-white/40 text-center sm:text-right">
          © 2026 Orbit. All rights reserved.
          <div className="text-[10px] text-white/25 mt-0.5">
            Phụng sự thế hệ sĩ tử Việt Nam với niềm tự hào & nhiệt huyết 💜
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
