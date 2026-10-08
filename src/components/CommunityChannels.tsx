import React from 'react';
import {
  ExternalLink,
  Users,
  Bot,
  Headphones,
  BellRing,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { SpotlightCard } from './SpotlightCard';

export const CommunityChannels: React.FC = () => {
  return (
    <section
      id="community-channels"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wide uppercase shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kết Nối Sĩ Tử • Kênh Giao Lưu Chính Thức</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Gia Nhập{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Cộng Đồng HyperHub
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Lựa chọn kênh kết nối yêu thích của bạn để cùng thảo luận bài tập, tra cứu đề thi, 
            nhận thông báo lịch tuyển sinh và đồng hành cùng hàng trăm bạn học trên toàn quốc.
          </p>
        </div>
      </ScrollReveal>

      {/* 2 Kênh Kết Nối Chính: DISCORD & MESSENGER (Chưa thêm Facebook) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        
        {/* KÊNH 1: MÁY CHỦ DISCORD */}
        <ScrollReveal delay={100}>
          <SpotlightCard
            className="p-8 sm:p-9 rounded-3xl border border-[#5865F2]/40 bg-gradient-to-b from-[#5865F2]/15 via-black/40 to-black/60 backdrop-blur-xl h-full flex flex-col justify-between hover:border-[#5865F2] hover:shadow-2xl hover:shadow-[#5865F2]/20 transition-all duration-300 group"
            spotlightColor="rgba(88, 101, 242, 0.2)"
          >
            <div className="space-y-6">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shadow-lg shadow-[#5865F2]/20 group-hover:scale-110 transition-transform">
                  {/* Discord Official SVG Icon */}
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
                  </svg>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#5865F2]/20 text-[#a5b4fc] border border-[#5865F2]/40">
                  HUB HỌC TẬP CHÍNH
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white group-hover:text-[#a5b4fc] transition-colors">
                  Máy Chủ Discord HyperHub
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Trung tâm học tập sôi động với bot thẩm định tự động, phòng học Lo-fi voice 24/7, 
                  phân chia chuyên mục theo từng môn và tổ chức các buổi thi thử định kỳ.
                </p>
              </div>

              {/* Feature bullets */}
              <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-[#5865F2] shrink-0" />
                  <span>Trải nghiệm Bot kiểm định đề & bốc đề tự động</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Phòng học Voice Pomodoro & Lo-fi tập trung</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cộng đồng học sinh, sinh viên văn minh, chia sẻ</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-8">
              <a
                href="https://discord.gg/D34HX87bGe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-[#5865F2] hover:bg-[#4752c4] shadow-xl shadow-[#5865F2]/30 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Tham Gia Máy Chủ Discord</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </SpotlightCard>
        </ScrollReveal>

        {/* KÊNH 2: NHÓM / BOX CHAT MESSENGER */}
        <ScrollReveal delay={200}>
          <SpotlightCard
            className="p-8 sm:p-9 rounded-3xl border border-sky-500/40 bg-gradient-to-b from-sky-500/15 via-black/40 to-black/60 backdrop-blur-xl h-full flex flex-col justify-between hover:border-sky-400 hover:shadow-2xl hover:shadow-sky-500/20 transition-all duration-300 group"
            spotlightColor="rgba(14, 165, 233, 0.2)"
          >
            <div className="space-y-6">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00B2FF]/20 via-[#006AFF]/25 to-[#FF52D9]/20 border border-sky-400/40 text-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
                  {/* Messenger Official SVG Icon */}
                  <svg className="w-8 h-8 fill-current text-sky-400" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.517 3.735 7.195V22l3.418-1.876c.907.251 1.865.388 2.847.388 5.523 0 10-4.145 10-9.258S17.523 2 12 2zm1.06 12.443l-2.58-2.753-5.034 2.753 5.534-5.875 2.64 2.753 4.974-2.753-5.534 5.875z"/>
                  </svg>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  BOX CHAT HỌC TẬP
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white group-hover:text-sky-300 transition-colors">
                  Nhóm Chat Messenger
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Box chat thân thuộc trên Messenger giúp bạn hỏi nhanh bài tập, nhận thông báo đề thi 
                  và cập nhật tin tức tuyển sinh 10 & THPT Quốc Gia mọi lúc trên điện thoại.
                </p>
              </div>

              {/* Feature bullets */}
              <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Tiện lợi trao đổi bài tập trực tiếp trên điện thoại</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Cập nhật nhắc nhở thời gian thi & đếm ngược</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Không khí gần gũi, hỏi bài không lo ngại ngùng</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-8">
              <a
                href="https://m.me/j/AbZngp-x0Ny92IWH/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#00B2FF] via-[#006AFF] to-[#9B51E0] hover:opacity-90 shadow-xl shadow-sky-900/30 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Tham Gia Nhóm Messenger</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </SpotlightCard>
        </ScrollReveal>
      </div>

      {/* Ghi chú tuân thủ yêu cầu: Tạm thời kết nối qua Messenger & Discord */}
      <ScrollReveal delay={300}>
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400 italic">
            💡 <span className="font-semibold text-slate-300">Lưu ý:</span> Hiện tại HyperHub tập trung kết nối học tập chất lượng qua <strong>Discord</strong> và <strong>Messenger</strong> để đảm bảo sự tương tác nhanh chóng và hỗ trợ kịp thời nhất cho sĩ tử.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
};

export default CommunityChannels;
