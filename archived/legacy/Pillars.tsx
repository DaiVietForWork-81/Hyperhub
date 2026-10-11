import React from 'react';
import { BookOpen, Coffee, Users } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { ScrollReveal } from './ScrollReveal';

export const Pillars: React.FC = () => {
  const pillars = [
    {
      id: "learn",
      tag: "Trụ Cột 01",
      title: "LEARN",
      subtitle: "Học Hỏi & Rèn Luyện Toàn Diện",
      description: "Thư viện bài tập và tài liệu phong phú phân chia theo cấp độ. Hỗ trợ phát triển học Tin từ nền tảng đến chuyên sâu, đồng thời cung cấp tài liệu cho các môn học khác.",
      icon: BookOpen,
      spotlightColor: "rgba(168, 85, 247, 0.22)",
      borderColor: "rgba(168, 85, 247, 0.55)",
      iconColor: "text-purple-400",
      bulletColor: "bg-purple-400 shadow-[0_0_8px_#a855f7]",
      points: [
        "Kho bài tập & đề thi phong phú đa môn",
        "Tài liệu ôn thi từ cơ bản đến nâng cao",
        "Hỗ trợ học Tin và giải đáp kiến thức"
      ]
    },
    {
      id: "chill",
      tag: "Trụ Cột 02",
      title: "CHILL",
      subtitle: "Thư Giãn & Tự Học 1 Mình",
      description: "Tự do học tập theo nhịp độ riêng mà không có áp lực. Tận hưởng các phòng voice 'Study With Me' yên tĩnh, playlist Lofi chất lượng cao và không gian thư thái.",
      icon: Coffee,
      spotlightColor: "rgba(236, 72, 153, 0.22)",
      borderColor: "rgba(236, 72, 153, 0.55)",
      iconColor: "text-pink-400",
      bulletColor: "bg-pink-400 shadow-[0_0_8px_#ec4899]",
      points: [
        "Phòng Pomodoro tự học không gian yên tĩnh",
        "Hệ thống nhạc Lofi / Synthwave chất lượng cao",
        "Góc thư giãn, chia sẻ kinh nghiệm học tập"
      ]
    },
    {
      id: "connect",
      tag: "Trụ Cột 03",
      title: "CONNECT",
      subtitle: "Giao Lưu, Kết Nối & Trao Đổi Đa Môn",
      description: "Gắn kết bạn bè cùng đam mê học tập trên toàn quốc, trao đổi bài vở, thảo luận phương pháp giải bài và nhận sự hỗ trợ tận tình từ ban quản trị 24/7.",
      icon: Users,
      spotlightColor: "rgba(217, 70, 239, 0.22)",
      borderColor: "rgba(217, 70, 239, 0.55)",
      iconColor: "text-fuchsia-400",
      bulletColor: "bg-fuchsia-400 shadow-[0_0_8px_#d946ef]",
      points: [
        "Kênh kết nối, trao đổi bài học đa môn 24/7",
        "Đội ngũ hỗ trợ giải đáp bài tập thân thiện",
        "Giao lưu chia sẻ kinh nghiệm học tập & kỹ năng"
      ]
    }
  ];

  return (
    <section id="pillars" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {/* Section Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono tracking-widest text-purple-700 dark:text-purple-400 uppercase font-semibold">
            ✦ TÔN CHỈ HOẠT ĐỘNG
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-3 mb-4 text-balance">
            Ba Trụ Cột Bản Sắc: LEARN • CHILL • CONNECT
          </h2>
          <p className="text-base text-slate-600 dark:text-white/60 leading-relaxed">
            Định hình trải nghiệm học tập, thư giãn và gắn kết cộng đồng cho từng thành viên tại HyperHub.
          </p>
        </div>
      </ScrollReveal>

      {/* 3 Pillar Cards with Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <ScrollReveal key={pillar.id} delay={index * 150}>
              <SpotlightCard
                spotlightColor={pillar.spotlightColor}
                borderColor={pillar.borderColor}
                className="liquid-glass p-8 h-full flex flex-col justify-between hover:shadow-2xl hover:shadow-purple-950/40"
              >
                {/* Card Content */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3.5 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 ${pillar.iconColor} group-hover/spotlight:scale-105 transition-all duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-white/40 tracking-wider">
                      {pillar.tag}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 group-hover/spotlight:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                    {pillar.title}
                  </h3>
                  <h4 className="text-sm font-semibold text-purple-700 dark:text-white/50 mb-4">
                    {pillar.subtitle}
                  </h4>

                  <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed mb-6 font-sans">
                    {pillar.description}
                  </p>
                </div>

                {/* Bullet Points */}
                <div className="pt-6 border-t border-slate-200/80 dark:border-white/[0.06] space-y-2.5">
                  {pillar.points.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-white/70">
                      <span className={`h-1.5 w-1.5 rounded-full ${pillar.bulletColor}`}></span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};
