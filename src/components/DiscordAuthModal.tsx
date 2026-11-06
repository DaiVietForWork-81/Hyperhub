import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  LogIn,
  ExternalLink,
  Lock,
  UserCheck,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import {
  DiscordUser,
  DISCORD_VERIFY_CHANNEL_URL,
  getDiscordOAuth2Url,
  saveDiscordUser,
  savePendingDiscordUser,
  getPendingDiscordUser,
  clearPendingDiscordUser,
  syncLinkedAccount,
} from '../utils/discordAuth';
import { getApiBaseUrl } from '../utils/apiConfig';
import { PixelButton } from './hh/Controls';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: DiscordUser) => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pendingUser, setPendingUser] = useState<DiscordUser | null>(() => getPendingDiscordUser());
  const [memberInput, setMemberInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [verifyChannelUrl, setVerifyChannelUrl] = useState<string>(DISCORD_VERIFY_CHANNEL_URL);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const savedPending = getPendingDiscordUser();
    if (savedPending) {
      setPendingUser(savedPending);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.__lenis?.start();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOAuthLogin = () => {
    const url = getDiscordOAuth2Url();
    window.location.href = url;
  };

  // Bước 1: Xác minh & liên kết tài khoản Discord với Web/Bot
  const handleVerifyServerMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = memberInput.trim();
    if (!trimmed) return;

    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const base = (getApiBaseUrl() || '').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/account/verify-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.user) {
        const linkedUser: DiscordUser = data.user;
        if (data.verify_channel_url) {
          setVerifyChannelUrl(data.verify_channel_url);
        }
        savePendingDiscordUser(linkedUser);
        setPendingUser(linkedUser);
        setCodeInput('');
        setErrorMsg(null);
      } else {
        setErrorMsg(
          data?.message ||
            'Không tìm thấy tài khoản trong máy chủ Discord Orbit | Vietnam. Hãy kiểm tra lại Username hoặc Discord ID!'
        );
      }
    } catch {
      setErrorMsg('Không thể kết nối tới Bot xác thực. Vui lòng thử lại sau giây lát.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Bước 2: Xác thực mã 6 số (hiệu lực 5 phút) lấy từ kênh #🔐・verify
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    const cleanCode = codeInput.trim().replace(/\s+/g, '');
    if (!cleanCode) return;

    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const base = (getApiBaseUrl() || '').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/account/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_id: pendingUser.id,
          code: cleanCode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const finalUser: DiscordUser = {
          ...pendingUser,
          ...(data.user || {}),
          accessToken: pendingUser.accessToken,
        };
        clearPendingDiscordUser();
        saveDiscordUser(finalUser);
        syncLinkedAccount(getApiBaseUrl());
        onSuccess?.(finalUser);
        onClose();
      } else {
        setErrorMsg(
          data?.message ||
            'Mã xác minh không chính xác hoặc đã hết hạn (5 phút). Vui lòng bấm nút Lấy Mã mới trong kênh #🔐・verify!'
        );
      }
    } catch {
      setErrorMsg('Không thể kết nối tới trạm xác thực mã. Vui lòng thử lại sau giây lát.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPendingAccount = () => {
    clearPendingDiscordUser();
    setPendingUser(null);
    setCodeInput('');
    setErrorMsg(null);
  };

  return (
    <div
      className="hh-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hh-discord-auth-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hh-modal-dialog" style={{ maxWidth: 530 }}>
        <div className="hh-modal-head">
          <div className="flex items-center gap-3">
            <span className="hh-channel-logo hh-channel-logo--discord" aria-hidden="true">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <span className="hh-tag">
                {pendingUser
                  ? 'Bước 2/2 · Nhập Mã Xác Minh 5 Phút từ kênh #🔐・verify'
                  : 'Bước 1/2 · Liên kết tài khoản Discord với Web / Bot'}
              </span>
              <h2 id="hh-discord-auth-title" className="hh-card-title mt-1.5">
                {pendingUser ? 'Nhập Mã Xác Minh Đăng Nhập' : 'Liên kết Discord với Orbit Hub'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hh-quiet-btn hh-press"
            aria-label="Đóng cửa sổ liên kết tài khoản"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="hh-modal-body">
          {!pendingUser ? (
            <>
              <p className="hh-card-text">
                Để đăng nhập vào <strong>Orbit Hub</strong>, trước tiên hãy liên kết tài khoản Discord của bạn, sau đó nhập{' '}
                <strong>mã xác minh 5 phút</strong> lấy từ kênh <code>#🔐・verify</code> trên server Discord{' '}
                <strong>Orbit | Vietnam</strong>.
              </p>

              {/* Bước 1 - Cách 1: Liên kết bằng Username / Discord ID */}
              <form
                onSubmit={handleVerifyServerMember}
                className="p-4 rounded-xl bg-[#130f1e] border border-[#2c2247] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-extrabold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#FF4FCB]" />
                    <span>Cách 1: Liên kết tài khoản thành viên Server Orbit</span>
                  </span>
                  <span className="text-xs font-mono text-emerald-300">Nhanh nhất</span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">
                  Nhập <strong>Username Discord</strong> (ví dụ: <code>nam8152.chill</code>) hoặc{' '}
                  <strong>Discord ID</strong> của bạn trong server <strong>Orbit | Vietnam</strong>:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    placeholder="Nhập Discord Username hoặc ID..."
                    className="flex-1 h-10 px-3.5 rounded-xl bg-[#0D0A14] border border-[#221a35] focus:border-[#FF4FCB] text-[13px] text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying || !memberInput.trim()}
                    className="px-4 h-10 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] disabled:opacity-50 text-[13px] font-extrabold text-white shrink-0 cursor-pointer transition-colors"
                  >
                    {isVerifying ? 'Đang kiểm tra...' : 'Tiếp tục lấy mã ➔'}
                  </button>
                </div>
                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </form>

              {/* Bước 1 - Cách 2: Liên kết qua Discord OAuth2 */}
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-bold text-white/60">
                  Cách 2: Ủy quyền qua cổng Discord OAuth2 chính thức
                </span>
                <PixelButton
                  variant="discord"
                  block
                  onClick={handleOAuthLogin}
                  icon={<LogIn className="w-4 h-4" aria-hidden="true" />}
                  trailing={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
                >
                  Liên kết bằng Discord OAuth2
                </PixelButton>
              </div>
            </>
          ) : (
            /* Bước 2: Hiển thị tài khoản đã liên kết & Ô nhập mã 6 số hiệu lực 5 phút từ kênh #🔐・verify */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#130f1e] border border-emerald-500/30">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={pendingUser.avatar || 'https://orbit-psi-black.vercel.app/server_icon.png'}
                    alt={pendingUser.global_name || pendingUser.username}
                    className="w-10 h-10 rounded-full border border-emerald-400/40 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">
                      {pendingUser.global_name || pendingUser.username}
                    </div>
                    <div className="text-xs text-emerald-300 font-mono truncate">
                      @{pendingUser.username} · Đã liên kết tài khoản
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPendingAccount}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/75 hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đổi acc</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#130f1e] border border-[#2c2247] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-extrabold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#FF4FCB]" />
                    <span>Lấy mã xác minh trong kênh #🔐・verify</span>
                  </span>
                  <span className="text-xs font-mono text-amber-300">Hiệu lực 5 phút</span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  1. Mở kênh <code>#🔐・verify</code> (trong thư mục <strong>📌 THÔNG TIN</strong>) trên server{' '}
                  <strong>Orbit | Vietnam</strong>.<br />
                  2. Bấm nút <strong>&ldquo;Lấy Mã Đăng Nhập Web (5 Phút) 🔑&rdquo;</strong> để nhận mã 6 số.<br />
                  3. <em>Lưu ý:</em> Mỗi mã dùng trong <strong>5 phút</strong> (nếu ấn tạo mã mới thì mã cũ sẽ tự động bị bỏ).
                </p>

                <a
                  href={verifyChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-xs font-extrabold text-[#c7d2fe] transition-colors"
                >
                  <span>Mở nhanh kênh #🔐・verify trên Discord để lấy mã</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <form onSubmit={handleVerifyCode} className="space-y-2.5 pt-1">
                  <label className="block text-xs font-bold text-white/80">
                    Điền mã xác minh 6 số của bạn:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="Nhập mã 6 số (VD: 842915)..."
                      autoFocus
                      className="flex-1 h-11 px-4 rounded-xl bg-[#0D0A14] border border-[#2c2247] focus:border-[#FF4FCB] text-base font-mono tracking-widest text-white placeholder:text-white/35 placeholder:tracking-normal placeholder:font-sans focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying || !codeInput.trim()}
                      className="px-5 h-11 rounded-xl bg-gradient-to-r from-[#d61f79] to-[#9B5CFF] hover:opacity-95 disabled:opacity-50 text-[13px] font-extrabold text-white shrink-0 cursor-pointer transition-opacity"
                    >
                      {isVerifying ? 'Đang xác minh...' : 'Xác nhận & Đăng nhập'}
                    </button>
                  </div>
                </form>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="hh-cd-session"
            style={{
              gridTemplateColumns: 'auto 1fr',
              borderColor: 'rgba(111, 227, 176, 0.3)',
              background: 'rgba(111, 227, 176, 0.08)',
            }}
          >
            <CheckCircle2
              className="w-5 h-5"
              style={{ color: 'var(--hh-mint)' }}
              aria-hidden="true"
            />
            <div>
              <h3 className="hh-cd-session-title" style={{ fontSize: 15 }}>
                Bảo mật xác thực 2 bước Discord ↔ Web
              </h3>
              <p className="hh-cd-session-sub">
                Đảm bảo chỉ chính chủ thành viên Discord mới có thể đăng nhập tài khoản trên Web, bảo vệ chuỗi Streak XP và Credit tác giả.
              </p>
            </div>
          </div>
        </div>

        <div className="hh-modal-foot">
          <span className="hh-fine flex items-center gap-2">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>Mã OTP hiệu lực 5 phút · Ấn lấy mã mới tự hủy mã cũ</span>
          </span>
          <button type="button" onClick={onClose} className="hh-quiet-btn hh-press">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
