import React from 'react';
import { Swords, Zap, Shield } from 'lucide-react';
import { CodeTerminal } from './CodeTerminal';
import { ScrollReveal } from './ScrollReveal';

export const ArenaPreview: React.FC = () => {
  return (
    <section id="arena" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-pink-300 dark:border-pink-500/20 bg-pink-100/80 dark:bg-pink-950/20 text-xs font-mono tracking-widest text-pink-700 dark:text-pink-300 uppercase mb-3 shadow-sm dark:shadow-[0_0_15px_rgba(236,72,153,0.1)] font-semibold">
            <Swords className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>Đấu Trường Đối Kháng 1:1 • Live Sandbox</span>
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3 mb-4 text-balance">
            Trải Nghiệm Đấu Trường Sinh Tồn 1:1
          </h2>
          <p className="text-base text-slate-600 dark:text-white/60 leading-relaxed max-w-2xl mx-auto text-pretty font-sans">
            Thi đấu trực tiếp trong phòng riêng biệt với cơ chế sinh tồn 2 mạng sống (❤️❤️). Đề thi leo thang độ khó và phân định thắng bại minh bạch với trình chấm Sandbox siêu tốc.
          </p>
        </div>
      </ScrollReveal>

      {/* Centerpiece: Interactive Code Terminal */}
      <div className="max-w-3xl mx-auto mb-12">
        <ScrollReveal delay={200}>
          <CodeTerminal />
        </ScrollReveal>
      </div>

      {/* 3 Arena Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <ScrollReveal delay={300}>
          <div className="liquid-glass p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-center space-y-2 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm dark:shadow-none transition-colors">
            <div className="h-10 w-10 mx-auto rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Swords className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sinh Tồn 2 Mạng (❤️❤️)</h3>
            <p className="text-xs text-slate-600 dark:text-white/50 leading-relaxed font-sans">
              Mỗi thí sinh có 2 mạng sống. Nộp sai trừ 1 mạng, áp lực thời gian nghẹt thở.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <div className="liquid-glass p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-center space-y-2 hover:border-pink-400 dark:hover:border-pink-500/40 shadow-sm dark:shadow-none transition-colors">
            <div className="h-10 w-10 mx-auto rounded-xl bg-pink-100 dark:bg-pink-500/10 border border-pink-300 dark:border-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chấm Sandbox Siêu Tốc</h3>
            <p className="text-xs text-slate-600 dark:text-white/50 leading-relaxed font-sans">
              Thời gian chấm mili-giây, phản hồi verdict Accepted / WA / TLE ngay tức thì.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <div className="liquid-glass p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-center space-y-2 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/40 shadow-sm dark:shadow-none transition-colors">
            <div className="h-10 w-10 mx-auto rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/10 border border-fuchsia-300 dark:border-fuchsia-500/20 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cấp Rank Role Discord</h3>
            <p className="text-xs text-slate-600 dark:text-white/50 leading-relaxed font-sans">
              Tự động thăng cấp bậc và cấp role vinh danh trên máy chủ Discord chính thức.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
