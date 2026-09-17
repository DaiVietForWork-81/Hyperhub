import React from 'react';
import { siteConfig } from '../data/site';
import { Sparkles, BookOpen, Coffee, Users, GraduationCap, HeartHandshake } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { ScrollReveal } from './ScrollReveal';

export const About: React.FC = () => {
  return (
    <section id="about" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <ScrollReveal>
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-300 dark:border-purple-500/20 bg-purple-100/80 dark:bg-purple-950/20 text-xs font-mono tracking-widest text-purple-700 dark:text-purple-300 uppercase mb-3 shadow-sm dark:shadow-[0_0_15px_rgba(139,92,246,0.1)] font-semibold">
            <Sparkles className="w-3 h-3 text-pink-600 dark:text-pink-400" />
            <span>Về Chúng Tôi • About HyperHub</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-balance">
            Không Gian Học Tập Toàn Diện
          </h2>
        </div>
      </ScrollReveal>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Interactive Ethos Card */}
        <div className="lg:col-span-5">
          <ScrollReveal delay={150}>
            <SpotlightCard 
              spotlightColor="rgba(168, 85, 247, 0.18)"
              borderColor="rgba(236, 72, 153, 0.5)"
              className="liquid-glass p-7 sm:p-8 rounded-3xl shadow-2xl"
            >
              <div className="space-y-6 select-none font-mono">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse"></span>
                    <span className="text-xs text-slate-700 dark:text-white/70 font-semibold tracking-wider">HYPERHUB // COMMUNITY</span>
                  </div>
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-500/20 font-sans font-semibold">24/7 Online</span>
                </div>

                {/* 3 Pillars Showcase */}
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] hover:border-purple-500/40 transition-all group">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white mb-1">
                      <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">LEARN • Học Hỏi & Thi Đấu</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed font-sans">
                      Kho tài liệu đồ sộ, rèn luyện tư duy thuật toán, luyện thi chuyên và các trận đấu trường cọ xát kiến thức.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] hover:border-pink-500/40 transition-all group">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white mb-1">
                      <Coffee className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      <span className="group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors">CHILL • Thư Giãn & Tự Học 1 Mình</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed font-sans">
                      Phòng học Pomodoro yên tĩnh, âm nhạc Lofi thư thái, không gian tập trung học tập theo nhịp độ riêng.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] hover:border-fuchsia-500/40 transition-all group">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white mb-1">
                      <Users className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span className="group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-300 transition-colors">CONNECT • Tham Gia Cộng Đồng & Trao Đổi</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed font-sans">
                      Hỏi đáp đa môn, kết nối cùng bạn bè trên khắp cả nước và nhận sự trợ giúp tận tình từ ban quản trị.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
                  <span>✦ Mái nhà chung của học sinh & sinh viên</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">WELCOME</span>
                </div>
              </div>
            </SpotlightCard>
          </ScrollReveal>
        </div>

        {/* Right Column: Mission Text with User's Exact Message */}
        <div className="lg:col-span-7 space-y-8">
          <ScrollReveal delay={250}>
            <div className="space-y-4 text-base sm:text-lg text-slate-700 dark:text-white/75 leading-relaxed max-w-[65ch] text-pretty">
              <p>
                <strong className="text-slate-900 dark:text-white font-bold">HyperHub</strong> là một nơi học hỏi có rất nhiều tài liệu phong phú, và cũng là nơi lý tưởng để bạn phát triển học Tin.
              </p>
              <p>
                Nếu bạn cảm thấy mình không có năng khiếu Tin, đừng lo lắng — vào server chúng mình vẫn luôn có các kênh và thành viên sẵn sàng hỗ trợ các môn học và các chuyên ngành khác cho các bạn!
              </p>
              <p className="text-sm text-slate-500 dark:text-white/60">
                Từ Toán, Lý, Hóa, Ngoại ngữ cho đến Lập trình giải thuật, HyperHub xây dựng một môi trường văn minh, không phán xét, nơi mọi câu hỏi đều được lắng nghe và giải đáp nhiệt tình.
              </p>
            </div>
          </ScrollReveal>

          {/* Core Values Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <ScrollReveal delay={350}>
              <SpotlightCard className="liquid-glass p-5 rounded-2xl border-slate-200/80 dark:border-white/[0.08]" spotlightColor="rgba(168, 85, 247, 0.12)">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tài Liệu Đa Dạng & Toàn Diện</h3>
                    <p className="text-xs text-slate-600 dark:text-white/50 mt-1 leading-relaxed font-sans">Đề thi, giáo trình và tài liệu chọn lọc hỗ trợ đắc lực cho cả việc học Tin và các môn văn hóa khác.</p>
                  </div>
                </div>
              </SpotlightCard>
            </ScrollReveal>

            <ScrollReveal delay={450}>
              <SpotlightCard className="liquid-glass p-5 rounded-2xl border-slate-200/80 dark:border-white/[0.08]" spotlightColor="rgba(236, 72, 153, 0.12)">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-500/10 border border-pink-300 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 shrink-0">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Hỗ Trợ Tận Tình & Thân Thiện</h3>
                    <p className="text-xs text-slate-600 dark:text-white/50 mt-1 leading-relaxed font-sans">Luôn có các mod và anh chị đi trước sẵn sàng gỡ rối bài tập, chia sẻ phương pháp học tập hiệu quả.</p>
                  </div>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          </div>

          {/* Metric Stats Cards */}
          <ScrollReveal delay={550}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200/80 dark:border-white/10">
              {siteConfig.stats.map((stat, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] hover:border-purple-400 dark:hover:border-purple-500/30 hover:bg-white dark:hover:bg-white/[0.04] transition-all duration-300 group shadow-sm dark:shadow-none"
                >
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-white/80 mt-1">{stat.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-white/40 leading-tight mt-0.5">{stat.subtext}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
