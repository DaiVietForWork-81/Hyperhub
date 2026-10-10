import React from 'react';

interface QuantumCoreProps {
  size?: number;
  colorTheme?: 'purple' | 'cyan' | 'pink' | 'emerald';
  showRings?: boolean;
  isFloating?: boolean;
  className?: string;
}

export const QuantumCore: React.FC<QuantumCoreProps> = ({
  size = 80,
  colorTheme = 'purple',
  showRings = true,
  isFloating = true,
  className = '',
}) => {
  const theme = {
    purple: {
      ring1: 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
      ring2: 'border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
      ring3: 'border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]',
      core: 'bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-400 shadow-[0_0_25px_rgba(236,72,153,0.8)]',
      dot: 'bg-purple-300',
    },
    cyan: {
      ring1: 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
      ring2: 'border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
      ring3: 'border-teal-400/40 shadow-[0_0_15px_rgba(20,184,166,0.3)]',
      core: 'bg-gradient-to-tr from-cyan-500 via-blue-500 to-teal-400 shadow-[0_0_25px_rgba(6,182,212,0.8)]',
      dot: 'bg-cyan-300',
    },
    pink: {
      ring1: 'border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.4)]',
      ring2: 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
      ring3: 'border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
      core: 'bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-500 shadow-[0_0_25px_rgba(244,63,94,0.8)]',
      dot: 'bg-pink-300',
    },
    emerald: {
      ring1: 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
      ring2: 'border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.3)]',
      ring3: 'border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      core: 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_25px_rgba(16,185,129,0.8)]',
      dot: 'bg-emerald-300',
    },
  }[colorTheme];

  const ringRadius = size * 0.95;
  const coreRadius = size * 0.32;

  return (
    <div
      aria-hidden="true"
      className={`relative select-none flex items-center justify-center perspective-600 ${isFloating ? 'animate-drift-2' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Gyro Ring 1 */}
      {showRings && (
        <div
          className={`absolute rounded-full border border-dashed preserve-3d animate-gyro-1 ${theme.ring1}`}
          style={{ width: ringRadius, height: ringRadius }}
        >
          <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${theme.dot}`} />
        </div>
      )}

      {/* Outer Gyro Ring 2 */}
      {showRings && (
        <div
          className={`absolute rounded-full border preserve-3d animate-gyro-2 ${theme.ring2}`}
          style={{ width: ringRadius * 0.85, height: ringRadius * 0.85 }}
        >
          <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${theme.dot}`} />
        </div>
      )}

      {/* Outer Gyro Ring 3 */}
      {showRings && (
        <div
          className={`absolute rounded-full border border-dotted preserve-3d animate-gyro-3 ${theme.ring3}`}
          style={{ width: ringRadius * 0.7, height: ringRadius * 0.7 }}
        />
      )}

      {/* Central Pulsing Quantum Reactor */}
      <div
        className={`relative rounded-full animate-core-pulse ${theme.core}`}
        style={{ width: coreRadius, height: coreRadius }}
      >
        {/* Core highlight dot */}
        <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px]" />
      </div>
    </div>
  );
};
