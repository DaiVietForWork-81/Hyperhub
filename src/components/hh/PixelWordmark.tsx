import React from 'react';

/**
 * Cụm biểu tượng Orbit tĩnh & Wordmark trung tâm ở Hero:
 * - Giữ biểu tượng Orbit cố định, sắc nét tại chỗ (không xoay 3D).
 * - Hiển thị tên thương hiệu Orbit cùng thông điệp "Different paths. One orbit."
 */
export const PixelWordmark: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`hh-orbit-hero-brand ${className ?? ''}`}>
      <div className="hh-orbit-emblem-stage" aria-hidden="true">
        <img
          src="/orbit_emblem_core.png"
          alt=""
          width={140}
          height={140}
          decoding="async"
          draggable={false}
          className="hh-orbit-static-img"
        />
      </div>

      <div className="hh-orbit-title-block" data-ui="hero-wordmark">
        <div className="hh-orbit-wordmark-text" aria-hidden="true">
          Orbit
        </div>
        <p className="hh-orbit-motto">
          Learn • Chill • Study · Không gian học tập, thư giãn &amp; ôn luyện cùng một quỹ đạo.
        </p>
      </div>
    </div>
  );
};

export default PixelWordmark;
