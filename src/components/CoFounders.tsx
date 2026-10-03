import React from 'react';
import {
  Sparkles,
  Crown,
  Star,
  Users,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { SpotlightCard } from './SpotlightCard';

export interface MainFounder {
  name: string;
  role: string;
  badge: string;
  quote: string;
  avatarChar: string;
}

export interface AssociateFounder {
  name: string;
  role: string;
  quote: string;
  avatarChar: string;
  color: string;
  borderColor: string;
}

const MAIN_FOUNDER: MainFounder = {
  name: 'Dai Viet',
  role: 'Sáng Lập Viên',
  badge: '👑 Sáng Lập Chính • Founder',
  quote: 'Công nghệ sinh ra là để phụng sự việc học, mở ra cơ hội bình đẳng cho mọi sĩ tử.',
  avatarChar: 'DV',
};

const ASSOCIATE_FOUNDERS: AssociateFounder[] = [
  {
    name: 'GithuZ',
    role: 'Đồng Sáng Lập',
    quote: 'Tối ưu từng dòng mã để mang lại cho học sinh trải nghiệm học tập mượt mà nhất.',
    avatarChar: 'GZ',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
  },
  {
    name: 'Nguyễn Duy',
    role: 'Đồng Sáng Lập',
    quote: 'Cùng nhau, chúng ta đi xa hơn. Một cộng đồng gắn kết là nguồn động lực lớn nhất.',
    avatarChar: 'ND',
    color: 'text-pink-400',
    borderColor: 'border-pink-500/30 hover:border-pink-500/60',
  },
  {
    name: 'Lê Minh',
    role: 'Đồng Sáng Lập',
    quote: 'Chất lượng kiến thức là nền móng vững chắc nhất để hiện thực hóa mọi ước mơ.',
    avatarChar: 'LM',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
  },
];

export const CoFounders: React.FC = () => {
  return (
    <section
      id="co-founders"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden"
    >
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-purple-600/10 via-pink-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Đội Ngũ Sáng Lập • Leadership</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Đội Ngũ Sáng Lập{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              HyperHub
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Những người đặt viên gạch đầu tiên, cùng chung khát vọng kiến tạo không gian học tập, 
            thi thử và trao đổi công nghệ phi lợi nhuận cho thế hệ sĩ tử Việt Nam.
          </p>
        </div>
      </ScrollReveal>

      <div className="space-y-8 max-w-5xl mx-auto">
        {/* 1. SÁNG LẬP CHÍNH (DAI VIET - FEATURED PROMINENT HERO CARD) */}
        <ScrollReveal>
          <SpotlightCard
            className="p-8 sm:p-10 rounded-3xl border border-purple-500/50 bg-gradient-to-br from-purple-950/20 via-black/40 to-pink-950/20 backdrop-blur-xl shadow-2xl shadow-purple-950/40 relative overflow-hidden group hover:border-purple-400/80 transition-all duration-300"
            spotlightColor="rgba(168, 85, 247, 0.25)"
          >
            {/* Ambient Aura Top Right */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-7 text-center md:text-left relative z-10">
              {/* Avatar Dai Viet */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 p-[2px] shadow-xl shadow-purple-950/50 group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full bg-[#0a0a14] rounded-3xl flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text tracking-wider">
                      {MAIN_FOUNDER.avatarChar}
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-900/50 border border-purple-300/40">
                  <Crown className="w-4 h-4" />
                </div>
              </div>

              {/* Founder Info */}
              <div className="space-y-3.5 flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-300 transition-colors">
                      {MAIN_FOUNDER.name}
                    </h3>
                    <div className="text-xs sm:text-sm font-bold text-purple-400 mt-0.5">
                      {MAIN_FOUNDER.role}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 self-center md:self-start">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sáng Lập Chính</span>
                  </span>
                </div>

                {/* Quote */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  "{MAIN_FOUNDER.quote}"
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <span className="font-mono text-slate-400">HyperHub Foundation</span>
                  <span className="inline-flex items-center gap-1 font-bold text-purple-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Founder</span>
                  </span>
                </div>
              </div>
            </div>
          </SpotlightCard>
        </ScrollReveal>

        {/* 2. ĐỒNG SÁNG LẬP (GITHUZ, NGUYỄN DUY, LÊ MINH) */}
        <div>
          <div className="flex items-center gap-3 mb-5 px-1">
            <Users className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Đồng Sáng Lập • Co-Founders
            </h4>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ASSOCIATE_FOUNDERS.map((founder, idx) => (
              <ScrollReveal key={founder.name} delay={(idx + 1) * 100}>
                <SpotlightCard
                  className={`p-6 rounded-3xl border ${founder.borderColor} bg-white/[0.02] backdrop-blur-xl h-full flex flex-col justify-between transition-all duration-300 group`}
                  spotlightColor="rgba(255, 255, 255, 0.08)"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
                        <span className="text-lg font-black text-white tracking-wider">
                          {founder.avatarChar}
                        </span>
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-base sm:text-lg font-black text-white truncate group-hover:text-purple-300 transition-colors">
                          {founder.name}
                        </h4>
                        <div className={`text-xs font-bold ${founder.color}`}>
                          {founder.role}
                        </div>
                      </div>
                    </div>

                    {/* Quote */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] sm:text-xs text-slate-400 italic leading-relaxed">
                      "{founder.quote}"
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400">HyperHub Team</span>
                    <span className="text-slate-400 font-semibold">Co-Founder</span>
                  </div>
                </SpotlightCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoFounders;
