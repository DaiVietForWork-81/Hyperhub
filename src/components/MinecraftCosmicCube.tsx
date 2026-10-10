import React, { useState } from 'react';

interface MinecraftCosmicCubeProps {
  size?: number; // pixel width/height (default: 84)
  label?: string; // Optional subtitle badge (e.g. "HyperHub Server Core")
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MinecraftCosmicCube: React.FC<MinecraftCosmicCubeProps> = ({
  size = 84,
  label = 'HyperHub Server Core',
  showLabel = true,
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const half = size / 2;

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 1200);
    onClick?.();
  };

  // Minecraft Obsidian & Ender Pixel Face Matrix (16-grid aesthetic)
  const faceBaseStyle = `
    absolute inset-0 border-2 border-purple-400/60 dark:border-fuchsia-500/70
    bg-gradient-to-br from-[#12072B] via-[#0D041D] to-[#1F093D]
    shadow-[inset_0_0_15px_rgba(192,38,211,0.35)]
    transition-all duration-300 select-none
  `;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Khối Minecraft Không Gian HyperHub"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 2000)}
      className={`group relative flex flex-col items-center justify-center cursor-pointer select-none perspective-1000 ${className}`}
      style={{
        width: size * 1.8,
        height: size * 1.8,
      }}
    >
      {/* ======================================================== */}
      {/* 1. ORBITING ELECTRONS (Hạt bay vòng quanh phân tử 3D)     */}
      {/* ======================================================== */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Electron Orbit 1: Cyan Electron (Nghiêng 68deg) */}
        <div
          className={`absolute rounded-full border border-cyan-400/30 transition-all duration-300 ${
            isHovered ? 'animate-electron-fast-1 scale-110' : 'animate-electron-1 opacity-60'
          }`}
          style={{
            width: size * 1.65,
            height: size * 1.65,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Hạt Electron 1 */}
          <span
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee,0_0_24px_#06b6d4] transition-all duration-300"
            style={{
              width: isHovered ? 10 : 7,
              height: isHovered ? 10 : 7,
            }}
          />
        </div>

        {/* Electron Orbit 2: Fuchsia/Ender Electron (Nghiêng -58deg) */}
        <div
          className={`absolute rounded-full border border-fuchsia-400/30 transition-all duration-300 ${
            isHovered ? 'animate-electron-fast-2 scale-110' : 'animate-electron-2 opacity-60'
          }`}
          style={{
            width: size * 1.5,
            height: size * 1.5,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Hạt Electron 2 */}
          <span
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_14px_#e879f9,0_0_24px_#c026d3] transition-all duration-300"
            style={{
              width: isHovered ? 10 : 7,
              height: isHovered ? 10 : 7,
            }}
          />
        </div>

        {/* Electron Orbit 3: Gold Plasma Electron (Nghiêng ngang 20deg) */}
        <div
          className={`absolute rounded-full border border-amber-400/25 transition-all duration-300 ${
            isHovered ? 'animate-electron-fast-3 scale-110' : 'animate-electron-3 opacity-50'
          }`}
          style={{
            width: size * 1.35,
            height: size * 1.35,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Hạt Electron 3 */}
          <span
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_#facc15,0_0_20px_#eab308] transition-all duration-300"
            style={{
              width: isHovered ? 9 : 6,
              height: isHovered ? 9 : 6,
            }}
          />
        </div>

        {/* Hạt Bụi Ma Thuật Ender (Minecraft Motes rising up when active) */}
        {isHovered && (
          <>
            <span
              className="absolute w-2 h-2 bg-purple-400 rounded-xs shadow-[0_0_8px_#c026d3] animate-ender-mote"
              style={{ left: '35%', top: '65%', animationDelay: '0s' }}
            />
            <span
              className="absolute w-1.5 h-1.5 bg-fuchsia-300 rounded-xs shadow-[0_0_8px_#e879f9] animate-ender-mote"
              style={{ left: '60%', top: '70%', animationDelay: '0.6s' }}
            />
            <span
              className="absolute w-2 h-2 bg-cyan-300 rounded-xs shadow-[0_0_8px_#22d3ee] animate-ender-mote"
              style={{ left: '48%', top: '60%', animationDelay: '1.2s' }}
            />
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. MINECRAFT VOXEL 3D CUBE (Phóng to khi chạm vào)       */}
      {/* ======================================================== */}
      {/* Glow Layer (GPU accelerated layer, zero lag) */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-500 -z-10 ${
          isHovered ? 'scale-125 opacity-80' : 'scale-95 opacity-40'
        }`}
        style={{
          width: size * 1.4,
          height: size * 1.4,
          background: 'radial-gradient(circle, rgba(217, 70, 239, 0.45) 0%, rgba(147, 51, 234, 0.2) 40%, transparent 70%)',
        }}
      />
      <div
        className={`relative preserve-3d transition-transform duration-500 ease-out ${
          isHovered ? 'scale-[1.22]' : 'scale-100'
        }`}
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className={`w-full h-full preserve-3d ${
            isHovered ? 'animate-spin-cube-fast' : 'animate-spin-cube'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Lõi Tinh Thể Năng Lượng Vũ Trụ (Ender Core / Nether Beacon) */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-cyan-400 animate-core-pulse shadow-[0_0_25px_rgba(236,72,153,0.9)]"
            style={{
              width: size * 0.45,
              height: size * 0.45,
              transform: 'translate3d(-50%, -50%, 0)',
            }}
          >
            {/* Lớp hạt nhân pixel Minecraft bên trong lõi */}
            <div className="absolute inset-1 border border-white/40 rounded-xs flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
            </div>
          </div>

          {/* MẶT 1: FRONT FACE (Obsidian Voxel with Ender Glyphs) */}
          <div
            className={faceBaseStyle}
            style={{ transform: `translateZ(${half}px)` }}
          >
            {/* Vân Voxel Minecraft (Pixel grid 4x4) */}
            <div className="absolute inset-1.5 grid grid-cols-3 grid-rows-3 gap-0.5 pointer-events-none opacity-40">
              <span className="bg-purple-500/30 rounded-xs" />
              <span className="bg-transparent" />
              <span className="bg-fuchsia-500/40 rounded-xs" />
              <span className="bg-transparent" />
              <span className="border border-purple-400/60 bg-purple-600/30 rounded-xs" />
              <span className="bg-transparent" />
              <span className="bg-fuchsia-500/30 rounded-xs" />
              <span className="bg-transparent" />
              <span className="bg-cyan-500/40 rounded-xs" />
            </div>
            {/* Điểm pixel góc nổi bật */}
            <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-fuchsia-400 rounded-xs shadow-[0_0_6px_#e879f9]" />
            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-xs shadow-[0_0_6px_#22d3ee]" />
          </div>

          {/* MẶT 2: BACK FACE */}
          <div
            className={faceBaseStyle}
            style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}
          >
            <div className="absolute inset-1.5 grid grid-cols-3 grid-rows-3 gap-0.5 pointer-events-none opacity-40">
              <span className="bg-transparent" />
              <span className="bg-purple-500/40 rounded-xs" />
              <span className="bg-transparent" />
              <span className="bg-cyan-500/30 rounded-xs" />
              <span className="border border-fuchsia-400/60 bg-fuchsia-600/30 rounded-xs" />
              <span className="bg-transparent" />
              <span className="bg-transparent" />
              <span className="bg-purple-500/30 rounded-xs" />
              <span className="bg-transparent" />
            </div>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-xs" />
          </div>

          {/* MẶT 3: RIGHT FACE */}
          <div
            className={faceBaseStyle}
            style={{ transform: `rotateY(90deg) translateZ(${half}px)` }}
          >
            <div className="absolute inset-2 border border-purple-400/30 rounded-xs flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-fuchsia-500/50 rounded-xs" />
            </div>
          </div>

          {/* MẶT 4: LEFT FACE */}
          <div
            className={faceBaseStyle}
            style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }}
          >
            <div className="absolute inset-2 border border-cyan-400/30 rounded-xs flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-cyan-500/50 rounded-xs" />
            </div>
          </div>

          {/* MẶT 5: TOP FACE */}
          <div
            className={faceBaseStyle}
            style={{ transform: `rotateX(90deg) translateZ(${half}px)` }}
          >
            <div className="absolute inset-1.5 border-2 border-fuchsia-400/40 rounded-xs" />
          </div>

          {/* MẶT 6: BOTTOM FACE */}
          <div
            className={faceBaseStyle}
            style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }}
          >
            <div className="absolute inset-1.5 border-2 border-purple-500/40 rounded-xs" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. NHÃN PHỤ VÀ HIỆU ỨNG TƯƠNG TÁC (Touch Feedback Badge) */}
      {/* ======================================================== */}
      {showLabel && (
        <div
          className={`mt-4 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase transition-all duration-300 border ${
            isHovered
              ? 'bg-fuchsia-950/80 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_15px_rgba(217,70,239,0.5)] scale-105'
              : 'bg-black/60 border-purple-500/30 text-purple-300/80 hover:text-white'
          }`}
        >
          {isClicked ? '⚡ OVERCHARGE RESONANCE!' : label}
        </div>
      )}
    </div>
  );
};
