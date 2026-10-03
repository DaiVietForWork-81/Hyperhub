import React from 'react';
import {
  Sparkles,
  Crown,
  Zap,
  Globe2,
  BookOpenCheck,
  Star,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { SpotlightCard } from './SpotlightCard';

export interface CoFounder {
  name: string;
  role: string;
  title: string;
  bio: string;
  quote: string;
  tag: string;
  avatarChar: string;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: React.ElementType;
}

const CO_FOUNDERS: CoFounder[] = [
  {
    name: 'Dai Viet',
    role: 'Đồng Sáng Lập',
    title: 'Lead System Architect & Developer',
    bio: 'Khởi xướng và thiết kế toàn bộ kiến trúc HyperHub, xây dựng hệ thống Bot kiểm định đề tự động, cầu nối API và trải nghiệm Web Portal.',
    quote: 'Công nghệ sinh ra là để phụng sự việc học, mở ra cơ hội bình đẳng cho mọi sĩ tử.',
    tag: '👑 Co-Founder • System Architect',
    avatarChar: 'DV',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-500/10',
    icon: Crown,
  },
  {
    name: 'GithuZ',
    role: 'Đồng Sáng Lập',
    title: 'Core Engine & Infrastructure',
    bio: 'Đồng phát triển lõi xử lý C++ Native Engine, tối ưu hóa các thuật toán tìm kiếm FTS5, chống trùng đề SHA-256 và hạ tầng kỹ thuật máy chủ.',
    quote: 'Tối ưu từng dòng mã để mang lại cho học sinh trải nghiệm học tập mượt mà nhất.',
    tag: '⚡ Co-Founder • Core Engine',
    avatarChar: 'GZ',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-500/10',
    icon: Zap,
  },
  {
    name: 'Nguyễn Duy',
    role: 'Đồng Sáng Lập',
    title: 'Community & Operations Lead',
    bio: 'Quản trị và phát triển cộng đồng học sinh, kết nối các thế hệ sĩ tử, duy trì môi trường trao đổi học tập tích cực và văn minh.',
    quote: 'Cùng nhau, chúng ta đi xa hơn. Một cộng đồng gắn kết là nguồn động lực lớn nhất.',
    tag: '🌐 Co-Founder • Community Lead',
    avatarChar: 'ND',
    color: 'text-pink-400',
    borderColor: 'border-pink-500/40',
    bgColor: 'bg-pink-500/10',
    icon: Globe2,
  },
  {
    name: 'Lê Minh',
    role: 'Đồng Sáng Lập',
    title: 'Academic & Content Lead',
    bio: 'Định hướng học liệu, chọn lọc và kiểm định ngân hàng đề thi bám sát cấu trúc Bộ GD&ĐT, đồng hành xây dựng ngân hàng tri thức cho sĩ tử.',
    quote: 'Chất lượng kiến thức là nền móng vững chắc nhất để hiện thực hóa mọi ước mơ.',
    tag: '📚 Co-Founder • Academic Lead',
    avatarChar: 'LM',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    icon: BookOpenCheck,
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
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Đội Ngũ Sáng Lập • Co-Founders</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Đồng Sáng Lập{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              HyperHub
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Những người đặt viên gạch đầu tiên, cùng chung khát vọng xây dựng một nền tảng học tập, 
            thi thử và trao đổi công nghệ phi lợi nhuận cho thế hệ học sinh Việt Nam.
          </p>
        </div>
      </ScrollReveal>

      {/* 4 Co-Founders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CO_FOUNDERS.map((founder, idx) => {
          const Icon = founder.icon;
          return (
            <ScrollReveal key={founder.name} delay={idx * 100}>
              <SpotlightCard
                className={`p-6 sm:p-7 rounded-3xl border ${founder.borderColor} bg-white/[0.02] backdrop-blur-xl h-full flex flex-col justify-between hover:border-purple-400/60 transition-all duration-300 group`}
                spotlightColor="rgba(168, 85, 247, 0.16)"
              >
                <div className="space-y-5 text-center sm:text-left">
                  {/* Avatar & Icon Badge */}
                  <div className="relative mx-auto sm:mx-0 w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-900/40 via-black to-pink-900/40 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:border-purple-400/50 transition-all duration-300">
                    <span className="text-2xl font-black text-white tracking-wider">
                      {founder.avatarChar}
                    </span>
                    <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-black border border-white/15 shadow-md">
                      <Icon className={`w-3.5 h-3.5 ${founder.color}`} />
                    </div>
                  </div>

                  {/* Name & Role */}
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
                      {founder.name}
                    </h3>
                    <div className={`text-xs font-bold ${founder.color} mt-0.5`}>
                      {founder.role}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {founder.title}
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {founder.bio}
                  </p>

                  {/* Quote */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 italic leading-relaxed">
                    "{founder.quote}"
                  </div>
                </div>

                {/* Bottom Tag */}
                <div className="pt-4 mt-5 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400">
                    HyperHub Team
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-purple-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Co-Founder</span>
                  </span>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};

export default CoFounders;
