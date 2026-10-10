import React from 'react';
import { CosmicCube } from './CosmicCube';
import { QuantumCore } from './QuantumCore';

interface CosmicDriftOrnamentsProps {
  className?: string;
}

export const CosmicDriftOrnaments: React.FC<CosmicDriftOrnamentsProps> = ({
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-60 dark:opacity-85 transition-opacity duration-500 ${className}`}
    >
      {/* ======================================================== */}
      {/* 1. KHỐI ĐỨNG YÊN CHỖ (Anchored Decorative Positions)       */}
      {/* ======================================================== */}

      {/* Góc Trên Phải (Hero / Top-Right Accent): 3D Glass Cyber Cube */}
      <div className="absolute top-24 right-6 sm:right-16 lg:right-28 opacity-75 hover:opacity-100 transition-opacity">
        <CosmicCube
          size={56}
          colorTheme="purple"
          rotationSpeed="normal"
          isFloating={true}
        />
      </div>

      {/* Góc Giữa Trái (Mid-Left Accent): Spinning Quantum Gyro Core */}
      <div className="hidden sm:block absolute top-[42%] left-4 sm:left-12 opacity-65">
        <QuantumCore
          size={72}
          colorTheme="cyan"
          isFloating={true}
        />
      </div>

      {/* Góc Dưới Phải (Bottom-Right Accent): Emerald Floating Cube */}
      <div className="hidden lg:block absolute bottom-36 right-12 opacity-70">
        <CosmicCube
          size={48}
          colorTheme="emerald"
          rotationSpeed="slow"
          isFloating={true}
        />
      </div>

      {/* Góc Dưới Trái (Bottom-Left Accent): Pink Quantum Core */}
      <div className="hidden md:block absolute bottom-24 left-16 opacity-60">
        <QuantumCore
          size={60}
          colorTheme="pink"
          isFloating={true}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. CÁC KHỐI ĐI XUNG QUANH WEB (Drifting Ambient Floating) */}
      {/* ======================================================== */}

      {/* Khối lơ lửng dải trên (Top Ambient Drift) */}
      <div className="absolute top-[18%] left-[22%] animate-drift-2 opacity-50 hidden md:block">
        <div className="relative w-8 h-8 rotate-45 border border-pink-500/40 rounded-lg backdrop-blur-xs bg-pink-500/5 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
          <span className="absolute inset-1 border border-pink-400/20 rounded-xs" />
        </div>
      </div>

      {/* Khối kim cương neon dải giữa (Mid Cosmic Diamond) */}
      <div className="absolute top-[65%] right-[25%] animate-drift-3 opacity-45 hidden sm:block">
        <div className="relative w-10 h-10 rotate-12 border border-purple-500/40 rounded-xl backdrop-blur-xs bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>
      </div>

      {/* Vòng năng lượng lượng tử trôi nhẹ (Orbital Ring Drifter) */}
      <div className="absolute top-[80%] left-[45%] animate-drift-1 opacity-40 hidden lg:block">
        <div className="w-14 h-14 rounded-full border border-dashed border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
        </div>
      </div>
    </div>
  );
};
