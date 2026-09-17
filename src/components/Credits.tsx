import React from 'react';
import { Sparkles } from 'lucide-react';
import { creditsData } from '../data/credits';
import { SpotlightCard } from './SpotlightCard';
import { ScrollReveal } from './ScrollReveal';

export const Credits: React.FC = () => {
  return (
    <section id="credits" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono tracking-widest text-purple-700 dark:text-purple-400 uppercase font-semibold">
            ✦ BAN ĐIỀU HÀNH & PHÁT TRIỂN
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3 mb-4 text-balance">
            Đội Ngũ Xây Dựng HyperHub
          </h2>
          <p className="text-base text-slate-600 dark:text-white/60 leading-relaxed text-pretty">
            Một cộng đồng được nuôi dưỡng bởi những thành viên nhiệt huyết, mong muốn đem lại giá trị học tập đích thực cho thế hệ trẻ.
          </p>
        </div>
      </ScrollReveal>

      {/* Team Cards Grid with Spotlight and Staggered ScrollReveal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {creditsData.map((member, idx) => (
          <ScrollReveal key={idx} delay={idx * 120}>
            <SpotlightCard
              enableTilt={true}
              spotlightColor="rgba(168, 85, 247, 0.16)"
              borderColor="rgba(236, 72, 153, 0.4)"
              className="p-6 text-center space-y-4 h-full flex flex-col justify-between hover:shadow-xl hover:shadow-purple-950/30"
            >
              <div>
                {/* Avatar Placeholder / Graphic */}
                <div className="relative mx-auto h-20 w-20 rounded-2xl bg-gradient-to-tr from-purple-900/60 to-pink-900/60 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover/spotlight:scale-105 group-hover/spotlight:border-purple-400 dark:group-hover/spotlight:border-purple-500/40 group-hover/spotlight:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300">
                  <span className="text-2xl font-bold text-white/90">
                    {member.name.charAt(0)}
                  </span>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-purple-600 border-2 border-white dark:border-black flex items-center justify-center shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>

                {/* Member Info */}
                <div className="mt-4">
                  <div className="text-lg font-bold text-slate-900 dark:text-white group-hover/spotlight:text-purple-600 dark:group-hover/spotlight:text-purple-300 transition-colors">
                    {member.name}
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-400 font-semibold mt-0.5">
                    {member.role}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-white/55 leading-relaxed mt-3">
                  {member.bio}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06] mt-4">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-white/50 group-hover/spotlight:border-purple-400 dark:group-hover/spotlight:border-purple-500/30 transition-colors">
                  {member.tag}
                </span>
              </div>
            </SpotlightCard>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};
