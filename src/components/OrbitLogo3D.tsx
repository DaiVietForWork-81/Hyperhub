import React from 'react';

interface OrbitLogo3DProps {
  className?: string;
  size?: number;
}

/**
 * Biểu tượng Orbit tĩnh (Static Emblem) - giữ nguyên vị trí, sắc nét, không hiệu ứng xoay 3D.
 */
export const OrbitLogo3D: React.FC<OrbitLogo3DProps> = ({
  className = '',
  size = 128,
}) => {
  return (
    <div
      className={`hh-orbit-static-wrap ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src="/orbit_emblem_core.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        className="hh-orbit-static-img"
      />
    </div>
  );
};

export default OrbitLogo3D;
