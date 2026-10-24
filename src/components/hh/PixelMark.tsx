import React from 'react';

/**
 * Biểu tượng Orbit tĩnh dùng ở Header, Sidebar /hub và Footer.
 */
export const PixelMark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`hh-orbit-mark ${className ?? ''}`} aria-hidden="true">
    <img
      src="/orbit_emblem_core.png"
      alt=""
      width={32}
      height={32}
      decoding="async"
      draggable={false}
      className="hh-orbit-mark-img"
    />
  </span>
);

export default PixelMark;
