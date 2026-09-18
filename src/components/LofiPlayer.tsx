import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Headphones, X, ChevronUp, Sparkles } from 'lucide-react';

export const LofiPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);

  // Web Audio Context for Procedural Lo-fi Ambient Chords
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);

  // Procedural mellow lo-fi chords in pentatonic scale (warm soothing study music)
  const chordProgressions = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [293.66, 349.23, 440.00, 523.25], // Dm7
    [196.00, 246.94, 293.66, 349.23], // G7
  ];

  const playChord = (frequencies: number[]) => {
    if (!audioCtxRef.current || !gainNodeRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      // Warm triangle wave for electric piano / rhodes feel
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Soft attack, gentle decay
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.04, now + 0.4);
      noteGain.gain.exponentialRampToValueAtTime(0.015, now + 1.8);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(noteGain);
      noteGain.connect(gainNodeRef.current!);

      osc.start(now);
      osc.stop(now + 3.3);
    });
  };

  const startMusic = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
        masterGain.connect(ctx.destination);

        audioCtxRef.current = ctx;
        gainNodeRef.current = masterGain;
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      let chordIdx = 0;
      playChord(chordProgressions[chordIdx]);
      chordIdx = (chordIdx + 1) % chordProgressions.length;

      const intervalId = window.setInterval(() => {
        playChord(chordProgressions[chordIdx]);
        chordIdx = (chordIdx + 1) % chordProgressions.length;
      }, 3200);

      timerRef.current = intervalId;
      setIsPlaying(true);
    } catch {
      // AudioContext init fallback
    }
  };

  const stopMusic = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopMusic();
    } else {
      startMusic();
    }
  };

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0 : volume,
        audioCtxRef.current.currentTime
      );
    }
  }, [volume, isMuted]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
      {/* Expanded Floating Player Card */}
      {isExpanded ? (
        <div className="w-72 max-w-[calc(100vw-2rem)] p-4 rounded-2xl bg-white/95 dark:bg-slate-950/90 border border-slate-200/90 dark:border-purple-500/40 shadow-2xl shadow-slate-300/50 dark:shadow-purple-950/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">HyperHub Lofi Lounge</span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              aria-label="Thu nhỏ trình phát"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-[11px] text-purple-700 dark:text-purple-300 font-mono mb-1 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-pink-600 dark:text-pink-400" />
              <span>Giai điệu thư giãn tập trung học</span>
            </div>
            <div className="text-xs font-medium text-slate-800 dark:text-white/90 truncate">
              Chords • Study & Code Ambient
            </div>
          </div>

          {/* Equalizer Visualizer */}
          <div className="flex items-end justify-center gap-1 h-6 mb-4 bg-slate-100/80 dark:bg-white/[0.02] rounded-lg p-1 border border-slate-200/80 dark:border-white/[0.05]">
            {isPlaying ? (
              <>
                <span className="w-1 bg-purple-500 rounded-full eq-bar-1"></span>
                <span className="w-1 bg-pink-500 rounded-full eq-bar-2"></span>
                <span className="w-1 bg-cyan-500 rounded-full eq-bar-3"></span>
                <span className="w-1 bg-purple-500 rounded-full eq-bar-4"></span>
                <span className="w-1 bg-pink-500 rounded-full eq-bar-1"></span>
                <span className="w-1 bg-cyan-500 rounded-full eq-bar-2"></span>
              </>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-white/40">Nhấn Phát để bật giai điệu</span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/30 hover:-translate-y-0.5 hover:scale-105 active:scale-90 transition-all duration-200 cursor-pointer shrink-0"
              aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc lofi'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer"
                aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-full accent-purple-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                aria-label="Âm lượng"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Floating Pill */
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`group btn-motion flex items-center gap-2.5 px-4 py-2.5 min-h-[44px] rounded-full border transition-all duration-200 shadow-xl cursor-pointer hover:-translate-y-1 active:scale-95 ${
            isPlaying
              ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-400 dark:border-purple-500/60 text-purple-900 dark:text-white shadow-purple-500/20 dark:shadow-purple-900/30'
              : 'bg-white/95 dark:bg-slate-950/80 border-slate-300 dark:border-white/10 text-slate-800 dark:text-white/80 hover:text-slate-950 dark:hover:text-white hover:border-purple-400 dark:hover:border-purple-500/40'
          } backdrop-blur-md`}
          aria-label="Mở trình phát nhạc lofi"
        >
          <Headphones className={`w-4 h-4 ${isPlaying ? 'text-pink-600 dark:text-pink-400 animate-pulse' : 'text-purple-600 dark:text-purple-400'}`} />
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tracking-wide">
              {isPlaying ? 'Lofi Đang Phát' : 'Lofi Study'}
            </span>

            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3 ml-1">
                <span className="w-0.5 bg-pink-500 rounded-full eq-bar-1"></span>
                <span className="w-0.5 bg-purple-500 rounded-full eq-bar-3"></span>
                <span className="w-0.5 bg-cyan-500 rounded-full eq-bar-2"></span>
              </div>
            )}
          </div>

          <ChevronUp className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
};
