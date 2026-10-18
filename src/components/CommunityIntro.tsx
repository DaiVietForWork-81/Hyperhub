import React from 'react';
import {
  Sparkles,
  Bot,
  Trophy,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Globe,
  Database,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { SpotlightCard } from './SpotlightCard';

const ORBIT_PILLARS = [
  {
    icon: Globe,
    pillarTag: 'TRỤ CỘT 01',
    badge: 'WEB HUB',
    title: 'Orbit Web Workspace',
    desc: 'Kho ngân hàng đề thi chuẩn hóa, hệ thống tra cứu FTS5 siêu tốc, dashboard cá nhân hóa và quản lý tủ sách đề thi trực tuyến 24/7.',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'from-purple-600/20 via-purple-600/5 to-transparent',
    features: ['Kho 170+ đề thẩm định', 'Lưu trữ cá nhân', 'Bộ lọc môn học chuẩn'],
  },
  {
    icon: Bot,
    pillarTag: 'TRỤ CỘT 02',
    badge: 'AI ENGINE',
    title: 'Orbit AI Multi-Model Generator',
    desc: 'Chuỗi 3 mô hình AI phối hợp (Qwen 3.5:4B tạo đề, Gemma 3:4B phản biện logic 2 vòng, Qwen 2.5:0.5B soát lỗi) tự động xuất 2 file chuẩn in.',
    color: 'text-pink-400',
    border: 'border-pink-500/30',
    glow: 'from-pink-600/20 via-pink-600/5 to-transparent',
    features: ['3 Model AI phối hợp', 'Tách Đề & Đáp án', 'Cam kết hoàn 100% token'],
  },
  {
    icon: Database,
    pillarTag: 'TRỤ CỘT 03',
    badge: 'DOC INTAKE',
    title: 'Thư Viện Đề Thi Tự Động',
    desc: 'Hệ thống tự động quét mã băm SHA-256 chống trùng lặp, bóc tách năm học, trường và sở GD&ĐT ra đề với Native C++ Engine hiệu năng cao.',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'from-cyan-600/20 via-cyan-600/5 to-transparent',
    features: ['Native C++ Engine', 'Chống trùng SHA-256', 'Nhận dạng OCR & Năm học'],
  },
  {
    icon: Trophy,
    pillarTag: 'TRỤ CỘT 04',
    badge: 'COMPETITIVE',
    title: 'Sàn Đấu Thuật Toán & Olympic',
    desc: 'Nuôi dưỡng tư duy Tin học, lập trình thi đấu (Competitive Programming), kết nối bảng xếp hạng Codeforces và rèn luyện thuật toán C++/Python.',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'from-amber-600/20 via-amber-600/5 to-transparent',
    features: ['Liên kết Codeforces', 'Thi đấu 1v1 đối kháng', 'Chuyên đề HSG Tin & Toán'],
  },
];

const COMMUNITY_METRICS = [
  { value: '174+', label: 'Bộ Đề Thi Thật', sub: 'Đã thẩm định AI & C++' },
  { value: '100%', label: 'Phi Lợi Nhuận', sub: 'Vì học sinh Việt Nam' },
  { value: '3 AI', label: 'Models Phối Hợp', sub: 'Qwen 3.5 • Gemma 3 • Qwen 2.5' },
  { value: '24/7', label: 'Học Tập Trực Tuyến', sub: 'Web Hub & Discord Bot' },
];

export const CommunityIntro: React.FC = () => {
  return (
    <section
      id="community-intro"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-purple-600/15 via-fuchsia-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Hệ Sinh Thái Toàn Diện • Giới Thiệu Orbit</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Công Nghệ Phụng Sự{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Tri Thức Thế Hệ Trẻ
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Orbit được kiến tạo để mang lại một không gian học tập mở, văn minh và hoàn toàn miễn phí. 
            Nơi mọi sĩ tử đều tìm thấy nguồn tài liệu chuẩn mực, sự hỗ trợ từ AI thông minh và những người bạn cùng chung chí hướng.
          </p>
        </div>
      </ScrollReveal>

      {/* 4 Trụ Cột Hệ Sinh Thái (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {ORBIT_PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <ScrollReveal key={idx} delay={idx * 80}>
              <SpotlightCard
                className={`p-6 sm:p-7 rounded-3xl border ${pillar.border} bg-gradient-to-b ${pillar.glow} to-black/60 backdrop-blur-xl h-full flex flex-col justify-between hover:border-purple-400/60 transition-all duration-300 group hover:shadow-2xl hover:shadow-purple-950/40`}
                spotlightColor="rgba(168, 85, 247, 0.2)"
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Icon className={`w-6 h-6 ${pillar.color}`} />
                    </div>
                    <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/[0.08] text-white/80 border border-white/10">
                      {pillar.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <span className="text-[11px] font-mono font-bold text-white/40 tracking-wider">
                      {pillar.pillarTag}
                    </span>
                    <h3 className="text-lg font-bold text-white tracking-tight mt-0.5 group-hover:text-purple-300 transition-colors">
                      {pillar.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed">
                    {pillar.desc}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-1.5 pt-2">
                    {pillar.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-xs text-white/70">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-purple-300">
                  <span className="font-semibold">Tìm hiểu thêm</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </SpotlightCard>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Sứ Mệnh & Chỉ Số Thực Tế */}
      <ScrollReveal delay={200}>
        <div className="p-8 sm:p-10 rounded-3xl border border-purple-500/25 bg-gradient-to-r from-purple-950/40 via-black/50 to-pink-950/40 backdrop-blur-2xl space-y-8 relative overflow-hidden shadow-2xl shadow-purple-950/30">
          <div className="max-w-3xl mx-auto text-center space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs text-purple-300 font-mono font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Sứ Mệnh Đồng Hành</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              "Không ai phải bước vào phòng thi một mình."
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Dù bạn đang là học sinh lớp 9 chuẩn bị kỳ thi Tuyển sinh vào 10, hay sĩ tử lớp 12 hướng tới kỳ thi Tốt nghiệp THPT; 
              dù bạn theo đuổi Lập trình thuật toán hay bồi dưỡng Toán, Văn, Ngoại ngữ — Orbit luôn sẵn sàng cung cấp nguồn lực tốt nhất cho bạn.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10 text-center relative z-10">
            {COMMUNITY_METRICS.map((stat, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-white mt-1">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
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
