import React from 'react';
import {
  Lock,
  LogIn,
  BookOpen,
  MessageSquare,
  Clock,
  Trophy,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface HubAuthWallProps {
  onLogin: () => void;
  onBackToHome: () => void;
}

export const HubAuthWall: React.FC<HubAuthWallProps> = ({ onLogin, onBackToHome }) => {
  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center p-4 md:p-8 bg-[#070611] text-white overflow-hidden">
      {/* Background glow effects */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-25"
        style={{
          background: 'radial-gradient(circle, #9B5CFF 0%, #FF4FCB 40%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-10 w-[500px] h-[400px] rounded-full blur-[130px] opacity-20"
        style={{
          background: 'radial-gradient(circle, #38BDF8 0%, #3B82F6 40%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl bg-[#0D0B1C]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4FCB] animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-[#FF4FCB] uppercase font-bold">
              Orbit | Hub Gateway
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <Lock className="w-3 h-3 text-amber-400" />
            Yêu cầu tài khoản Discord
          </span>
        </div>

        {/* Hero Title & Explanation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#9B5CFF]/20 to-[#FF4FCB]/20 border border-white/10 mb-4 shadow-[0_0_30px_rgba(155,92,255,0.25)]">
            <Sparkles className="w-8 h-8 text-[#FF4FCB]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
            Mở Khóa Bảng Điều Khiển Orbit
          </h1>
          <p className="text-sm sm:text-base text-white/60 max-w-lg mx-auto leading-relaxed">
            Để bảo vệ cộng đồng học tập và đồng bộ dữ liệu thời gian thực, toàn bộ tính năng tại 
            <strong className="text-white"> Orbit Hub</strong> (Kho đề thi, Diễn đàn, Khóa học) yêu cầu bạn đăng nhập bằng tài khoản Discord.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="p-2 rounded-lg bg-[#9B5CFF]/15 text-[#9B5CFF] shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kho Đề Thực Chiến</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Xem trước PDF, làm bài trắc nghiệm và tải toàn bộ đề thi chuẩn cấu trúc.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="p-2 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Diễn Đàn 2 Chiều</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Đăng bài hỏi đáp và nhận câu trả lời đồng bộ trực tiếp từ Discord Server.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="p-2 rounded-lg bg-[#34D399]/15 text-[#34D399] shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Không Gian Tự Học Pomodoro</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Đồng hồ bấm giờ Pomodoro 25/5 giúp rèn luyện sự tập trung khi giải đề.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="p-2 rounded-lg bg-[#FBBF24]/15 text-[#FBBF24] shrink-0 mt-0.5">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bảng Vàng Danh Dự</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Đua top học tập toàn server, vinh danh thành tích và mục tiêu trường mơ ước.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:from-[#4752C4] hover:to-[#5865F2] transition-all shadow-[0_0_25px_rgba(88,101,242,0.4)] hover:shadow-[0_0_35px_rgba(88,101,242,0.6)] active:scale-[0.99] cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Đăng Nhập Bằng Discord Để Vào Hub
          </button>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại Trang Chủ
            </button>

            <a
              href="https://discord.gg/Xeb2pNH2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#38BDF8]/80 hover:text-[#38BDF8] transition-colors"
            >
              Chưa vào server? Tham gia Orbit
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
