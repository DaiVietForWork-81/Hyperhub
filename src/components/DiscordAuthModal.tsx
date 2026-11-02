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
} from 'lucide-react';
import { DiscordUser, getDiscordOAuth2Url, saveDiscordUser } from '../utils/discordAuth';
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
  const [memberInput, setMemberInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
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
        const verifiedUser: DiscordUser = data.user;
        saveDiscordUser(verifiedUser);
        onSuccess?.(verifiedUser);
        onClose();
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
      <div className="hh-modal-dialog" style={{ maxWidth: 510 }}>
        <div className="hh-modal-head">
          <div className="flex items-center gap-3">
            <span className="hh-channel-logo hh-channel-logo--discord" aria-hidden="true">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <span className="hh-tag">Xác thực tài khoản Discord bắt buộc</span>
              <h2 id="hh-discord-auth-title" className="hh-card-title mt-1.5">
                Đăng nhập Discord vào Orbit Hub
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
          <p className="hh-card-text">
            Để truy cập <strong>Bàn Điều Khiển (Orbit Hub)</strong>, <strong>Khóa Học</strong> và{' '}
            <strong>Diễn Đàn</strong>, bạn cần đăng nhập bằng tài khoản Discord đã tham gia máy chủ{' '}
            <strong>Orbit | Vietnam</strong>.
          </p>

          {/* Cách 1: Xác thực trực tiếp thành viên trong Server Orbit | Vietnam */}
          <form
            onSubmit={handleVerifyServerMember}
            className="p-4 rounded-xl bg-[#130f1e] border border-[#2c2247] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-extrabold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#FF4FCB]" />
                <span>Cách 1: Xác thực nhanh thành viên Server Orbit</span>
              </span>
              <span className="text-xs font-mono text-emerald-300">Khuyên dùng</span>
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
                {isVerifying ? 'Đang kiểm tra...' : 'Vào Hub ngay'}
              </button>
            </div>
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>

          {/* Cách 2: Đăng nhập qua cổng Discord OAuth2 */}
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
              Đăng nhập bằng Discord OAuth2
            </PixelButton>
          </div>

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
                Đồng bộ 2 chiều với Discord Server
              </h3>
              <p className="hh-cd-session-sub">
                Tài khoản của bạn được đồng bộ trực tiếp với chuỗi điểm danh XP, Tủ sách đề thi và
                quyền đăng bài trên Diễn đàn Orbit.
              </p>
            </div>
          </div>
        </div>

        <div className="hh-modal-foot">
          <span className="hh-fine flex items-center gap-2">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>Bảo mật xác thực thành viên · Không lưu mật khẩu</span>
          </span>
          <button type="button" onClick={onClose} className="hh-quiet-btn hh-press">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
