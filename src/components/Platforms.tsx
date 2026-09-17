import React from 'react';
import { activePlatforms } from '../data/platforms';
import { PlatformCard } from './PlatformCard';
import { ComingSoon } from './ComingSoon';
import { ScrollReveal } from './ScrollReveal';

export const Platforms: React.FC = () => {
  return (
    <section id="platforms" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono tracking-widest text-pink-600 dark:text-pink-400 uppercase font-semibold">
            ✦ KẾT NỐI CỘNG ĐỒNG
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3 mb-4 text-balance">
            Tham Gia Cùng HyperHub
          </h2>
          <p className="text-base text-slate-600 dark:text-white/60 leading-relaxed text-pretty">
            Lựa chọn không gian phù hợp với bạn để bắt đầu học tập, giao lưu và nhận thông báo các giải đấu mới nhất.
          </p>
        </div>
      </ScrollReveal>

      {/* Active Platforms Grid with Staggered ScrollReveal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {activePlatforms.map((platform, index) => (
          <ScrollReveal key={platform.id} delay={index * 150}>
            <PlatformCard platform={platform} />
          </ScrollReveal>
        ))}
      </div>

      {/* Coming Soon Section */}
      <ScrollReveal delay={200}>
        <ComingSoon />
      </ScrollReveal>
    </section>
  );
};
