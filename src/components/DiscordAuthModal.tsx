import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Mail, LogIn, ExternalLink } from 'lucide-react';
import { DiscordUser, getDiscordOAuth2Url, saveDiscordUser } from '../utils/discordAuth';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: DiscordUser) => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'manual'>('oauth');
  const [username, setUsername] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleOAuthLogin = () => {
    const url = getDiscordOAuth2Url();
    window.location.href = url;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên tài khoản Discord của bạn.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!isVerified) {
      setErrorMsg('Bắt buộc email phải được xác minh (verified) trên Discord để có thể lấy đề thi.');
      return;
    }

    const mockId = discordId.trim() || String(Math.floor(100000000000000000 + Math.random() * 900000000000000000));
    const user: DiscordUser = {
      id: mockId,
      username: username.trim(),
      global_name: username.trim(),
      avatar: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`,
      email: email.trim(),
      verified: isVerified,
      connectedAt: new Date().toISOString(),
    };

    saveDiscordUser(user);
    onSuccess(user);
    onClose();
  };

  const handleQuickDemo = (verified: boolean = true) => {
    const user: DiscordUser = {
      id: "1529864608813416449",
      username: "HyperMember",
      global_name: "Thành Viên HyperHub",
      avatar: "https://assets.codeforces.com/favicon-96x96.png",
      email: "member@hyperhub.edu.vn",
      verified: verified,
      connectedAt: new Date().toISOString(),
    };
    saveDiscordUser(user);
    onSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
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

        {/* Tab switch */}
        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6 text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'oauth'
                ? 'bg-white dark:bg-[#5865F2] text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            OAuth2 Trực Tiếp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-[#5865F2] text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Nhập / Test Nhanh
          </button>
        </div>

        {/* Tab 1: Official Discord OAuth2 */}
        {activeTab === 'oauth' && (
          <div className="space-y-4">
            <button
              onClick={handleOAuthLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold shadow-lg shadow-[#5865F2]/30 hover:shadow-[#5865F2]/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer text-sm sm:text-base"
            >
              <LogIn className="w-5 h-5" />
              <span>Đăng Nhập Bằng Discord</span>
              <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
            </button>

            {/* Hướng Dẫn Khi Bị Lỗi Invalid OAuth2 */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Gặp lỗi "Invalid OAuth2 redirect_uri"?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-white/80">
                Do Discord yêu cầu bạn phải thêm tên miền web vào danh sách Redirects:
              </p>
              <div className="text-[11px] space-y-1 pl-2 text-slate-700 dark:text-white/80">
                <div>
                  1. Mở{' '}
                  <a
                    href="https://discord.com/developers/applications/1536298634990325871/oauth2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-[#5865F2] hover:text-[#4752c4]"
                  >
                    Discord Developer Portal (App 1536298634990325871)
                  </a>
                </div>
                <div>2. Chọn menu <b>OAuth2</b> → mục <b>Redirects</b> → bấm <b>Add Redirect</b></div>
                <div>
                  3. Thêm:{' '}
                  <code className="bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-purple-700 dark:text-purple-300 select-all font-bold">
                    https://hyperhub-one.vercel.app
                  </code>
                </div>
                <div>4. Bấm <b>Save Changes</b> ở thanh màu xanh lá dưới cùng.</div>
              </div>
              <div className="pt-1.5 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>⚡ Hoặc bấm vào đây để Liên Kết Trực Tiếp (Không cần OAuth2)</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-xs space-y-2 text-slate-600 dark:text-white/70">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Quyền yêu cầu an toàn: identify, email</span>
              </div>
              <p>
                HyperHub chỉ đọc tên người dùng, avatar và trạng thái xác thực email từ Discord để cấp quyền nhận đề thi. Mật khẩu không bao giờ được chia sẻ.
              </p>
            </div>

            <div className="pt-1 text-center">
              <span className="text-xs text-slate-400 dark:text-white/40">Thử nghiệm nhanh với </span>
              <button
                type="button"
                onClick={() => handleQuickDemo(true)}
                className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
              >
                Tài khoản mẫu (Đã xác minh)
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual / Quick Input */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-white/80">
                Tên Discord (Username) *
              </label>
              <input
                type="text"
                placeholder="VD: nguyenvan_a"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-white/80">
                Email Tài Khoản Discord *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-white/80">
                Discord ID (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="VD: 1529864608813416449"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5865F2]"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="verifyCheckbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-300"
              />
              <label htmlFor="verifyCheckbox" className="text-xs text-slate-600 dark:text-white/70 select-none cursor-pointer">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Email này đã được xác minh trên Discord (Verified)</span>
                <span className="block text-[11px] text-slate-400 dark:text-white/40 mt-0.5">Hệ thống từ chối phát đề nếu email chưa xác minh.</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
            >
              Liên Kết Ngay
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
