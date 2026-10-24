import React, { useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, LogIn, ExternalLink, Lock } from 'lucide-react';
import { DiscordUser, getDiscordOAuth2Url } from '../utils/discordAuth';
import { PixelButton } from './hh/Controls';

interface DiscordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: DiscordUser) => void;
}

export const DiscordAuthModal: React.FC<DiscordAuthModalProps> = ({ isOpen, onClose }) => {
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
      <div className="hh-modal-dialog" style={{ maxWidth: 480 }}>
        <div className="hh-modal-head">
          <div className="flex items-center gap-3">
            <span className="hh-channel-logo hh-channel-logo--discord" aria-hidden="true">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <span className="hh-tag">Xác thực OAuth2 chính thức</span>
              <h2 id="hh-discord-auth-title" className="hh-card-title mt-1.5">
                Liên kết tài khoản Discord
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
            Liên kết tài khoản Discord có <strong>Email đã xác minh</strong> để đồng bộ tủ sách cá nhân, đóng góp đề thi và nhận đề thi tự động qua tin nhắn trực tiếp từ Bot Orbit.
          </p>

          <PixelButton
            variant="discord"
            block
            onClick={handleOAuthLogin}
            icon={<LogIn className="w-4 h-4" aria-hidden="true" />}
            trailing={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
          >
            Đăng nhập bằng Discord
          </PixelButton>

          <div
            className="hh-cd-session"
            style={{
              gridTemplateColumns: 'auto 1fr',
              borderColor: 'rgba(111, 227, 176, 0.3)',
              background: 'rgba(111, 227, 176, 0.08)',
            }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--hh-mint)' }} aria-hidden="true" />
            <div>
              <h3 className="hh-cd-session-title" style={{ fontSize: 15 }}>
                Đăng nhập an toàn trên cổng Discord
              </h3>
              <p className="hh-cd-session-sub">
                Orbit chỉ đọc thông tin hồ sơ công khai (ID, tên hiển thị, ảnh đại diện) và không bao giờ truy cập mật khẩu của bạn.
              </p>
            </div>
          </div>
        </div>

        <div className="hh-modal-foot">
          <span className="hh-fine flex items-center gap-2">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>Chuẩn xác thực OAuth2 · Không lưu mật khẩu</span>
          </span>
          <button type="button" onClick={onClose} className="hh-quiet-btn hh-press">
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};
