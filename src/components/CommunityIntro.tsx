import React from 'react';
import {
  Sparkles,
  BookOpen,
  Code2,
  Headphones,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { SpotlightCard } from './SpotlightCard';

const CORE_VALUES = [
  {
    icon: BookOpen,
    badge: 'LEARN',
    title: 'Học Hỏi & Khám Phá',
    desc: 'Kho ngân hàng đề thi thật phong phú, được phân loại chính xác theo khối lớp, môn học và thẩm định tự động bằng hệ thống DocInspector AI kết hợp lõi C++ Native.',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Code2,
    badge: 'CODE',
    title: 'Công Nghệ & Lập Trình',
    desc: 'Không gian nuôi dưỡng đam mê Tin học, lập trình thi đấu (Competitive Programming), thuật toán C++, Python, Khoa học máy tính từ cơ bản đến nâng cao.',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Headphones,
    badge: 'CHILL',
    title: 'Thư Giãn & Tự Học 1 Mình',
    desc: 'Phòng học ảo Lo-fi Study Lounge phát nhạc thư thái cùng đồng hồ đếm ngược khoa học, tạo môi trường học tập tập trung cao độ, xua tan áp lực thi cử.',
    color: 'text-pink-400',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Users,
    badge: 'CONNECT',
    title: 'Cộng Đồng Thân Thiện',
    desc: 'Kết nối hàng trăm bạn bè đồng trang lứa trên khắp mọi miền tổ quốc. Mọi thắc mắc về bài vở, đề khó hay phương pháp học đều có người sẵn sàng giải đáp.',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
];

const COMMUNITY_STATS = [
  { value: '174+', label: 'Bộ Đề Thi Thật', sub: 'Đã kiểm định AI & C++' },
  { value: '100%', label: 'Phi Lợi Nhuận', sub: 'Vì học sinh Việt Nam' },
  { value: '24/7', label: 'Học Tập Trực Tuyến', sub: 'Phòng học & Bot hỗ trợ' },
  { value: '4+', label: 'Khối Lớp Trọng Điểm', sub: 'Từ Tuyển sinh 10 đến THPT' },
];

export const CommunityIntro: React.FC = () => {
  return (
    <section
      id="community-intro"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden"
    >
      {/* Glow highlight */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Mái Nhà Chung • Giới Thiệu HyperHub</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Cộng Đồng Học Tập &{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Công Nghệ Trẻ
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Được sáng lập và xây dựng bởi thế hệ học sinh - sinh viên Việt Nam, HyperHub là không gian học tập trực tuyến 
            hoàn toàn mở, văn minh và phi lợi nhuận, nơi mọi sĩ tử đều tìm thấy tài liệu quý giá và những người bạn cùng chung chí hướng.
          </p>
        </div>
      </ScrollReveal>

      {/* 4 Giá trị cốt lõi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {CORE_VALUES.map((val, idx) => {
          const Icon = val.icon;
          return (
            <ScrollReveal key={idx} delay={idx * 90}>
              <SpotlightCard
                className={`p-6 sm:p-7 rounded-2xl border ${val.border} bg-white/[0.02] backdrop-blur-xl h-full flex flex-col justify-between hover:border-purple-400/50 transition-all duration-300`}
                spotlightColor="rgba(168, 85, 247, 0.15)"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${val.bg} ${val.color} border ${val.border} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${val.bg} ${val.color} border ${val.border}`}>
                      {val.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {val.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {val.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hoàn toàn miễn phí</span>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Tôn chỉ & Lời nhắn gửi từ HyperHub */}
      <ScrollReveal delay={200}>
        <div className="p-8 sm:p-10 rounded-3xl border border-purple-500/25 bg-gradient-to-r from-purple-950/30 via-black/40 to-pink-950/30 backdrop-blur-xl space-y-6">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              "Không ai phải bước vào phòng thi một mình."
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dù bạn đang là học sinh lớp 9 ôn thi vào 10 chuyên, hay sĩ tử lớp 12 chuẩn bị bước vào kỳ thi Tốt nghiệp THPT 
              lịch sử; dù bạn có thế mạnh về Tin học, hay đang tìm kiếm tài liệu Toán, Văn, Ngoại ngữ — HyperHub luôn có sẵn 
              kho tài liệu được tuyển chọn kỹ lưỡng và một môi trường tích cực chào đón bạn.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-center">
            {COMMUNITY_STATS.map((stat, i) => (
              <div key={i} className="p-3">
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-white mt-1">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};

export default CommunityIntro;
