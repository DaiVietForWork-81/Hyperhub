import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, LogIn, ExternalLink, Lock } from 'lucide-react';
import { DiscordUser, getDiscordOAuth2Url } from '../utils/discordAuth';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: DiscordUser) => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOAuthLogin = () => {
    const url = getDiscordOAuth2Url();
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#0c0d18] border border-slate-200 dark:border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center mb-4 text-[#5865F2] shadow-lg shadow-[#5865F2]/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Liên Kết Tài Khoản Discord
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1.5 max-w-sm">
            Yêu cầu liên kết tài khoản Discord có <span className="font-semibold text-emerald-500 dark:text-emerald-400">Email đã xác minh</span> để truy cập Bảng điều khiển và nhận phát đề thi tự động.
          </p>
        </div>

        {/* OAuth2 Login Action */}
        <div className="space-y-4">
          <button
            onClick={handleOAuthLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold shadow-lg shadow-[#5865F2]/30 hover:shadow-[#5865F2]/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer text-sm sm:text-base"
          >
            <LogIn className="w-5 h-5" />
            <span>Đăng Nhập Bằng Discord</span>
            <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
          </button>

          {/* Bảo Mật & Xác Thực */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-2 text-slate-700 dark:text-white/80">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đăng nhập an toàn qua Discord</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-white/70">
              Bạn luôn đăng nhập trực tiếp trên trang của Discord. Mật khẩu của bạn hoàn toàn bảo mật.
            </p>
          </div>

          <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-white/40">
            <Lock className="w-3.5 h-3.5" />
            <span>Mã hóa bảo vệ đầu cuối • Không lưu mật khẩu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
