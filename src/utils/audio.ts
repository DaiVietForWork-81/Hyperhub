/**
 * ORBIT SPATIAL WEB AUDIO ENGINE
 * Bộ tổng hợp âm thanh tương tác thời gian thực bằng Web Audio API:
 * - Không phụ thuộc file âm thanh ngoài (0ms độ trễ, không bao giờ lỗi 404).
 * - Âm sắc thuỷ tinh & tinh vân vũ trụ (Celestial Glass & Warm Synth Harmonics).
 * - Tự động tôn trọng trạng thái bật/tắt của người dùng (lưu trong localStorage).
 */

type Listener = (enabled: boolean) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private lastHoverAt: number = 0;
  private listeners: Set<Listener> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem('orbit_sound_muted');
      this.enabled = saved !== 'true';
    } catch {
      this.enabled = true;
    }
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('orbit_sound_muted', (!this.enabled).toString());
    } catch {
      // ignore
    }
    this.listeners.forEach((fn) => fn(this.enabled));
    if (this.enabled) {
      this.playChime();
    }
    return this.enabled;
  }

  /** Âm lướt chuột qua thẻ/nút - trong trẻo như hạt pha lê nhẹ (có chống lặp <55ms) */
  public playHover() {
    if (!this.enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastHoverAt < 55) return;
    this.lastHoverAt = nowMs;

    const ctx = this.initCtx();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + 0.032);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.016, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.038);
    } catch {
      // silent
    }
  }

  /** Âm bấm nút chính - hợp âm quãng 5 ấm và sắc nét */
  public playClick() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      // Âm nền trầm ấm
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, t); // D5
      osc1.frequency.exponentialRampToValueAtTime(293.66, t + 0.065);
      gain1.gain.setValueAtTime(0.045, t);
      gain1.gain.exponentialRampToValueAtTime(0.0008, t + 0.068);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.07);

      // Âm bội thuỷ tinh phía trên
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, t); // D6
      osc2.frequency.exponentialRampToValueAtTime(880, t + 0.045);
      gain2.gain.setValueAtTime(0.022, t);
      gain2.gain.exponentialRampToValueAtTime(0.0008, t + 0.048);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.05);
    } catch {
      // silent
    }
  }

  /** Âm tích chọn chip / bộ lọc */
  public playTick(active = true) {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      if (active) {
        osc.frequency.setValueAtTime(523.25, t);
        osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.055);
      } else {
        osc.frequency.setValueAtTime(659.25, t);
        osc.frequency.exponentialRampToValueAtTime(440.0, t + 0.055);
      }

      gain.gain.setValueAtTime(0.032, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.062);
    } catch {
      // silent
    }
  }

  /** Âm chuyển tab / chuyển không gian làm việc */
  public playNavSwitch() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      [440, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.035);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + i * 0.035 + 0.09);
        gain.gain.setValueAtTime(0.03, t + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + i * 0.035 + 0.095);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.035);
        osc.stop(t + i * 0.035 + 0.1);
      });
    } catch {
      // silent
    }
  }

  /** Âm thanh kích hoạt tăng tốc 3D Orbit Warp (hợp âm vũ trụ Maj9 ngân vang) */
  public playOrbitWarp() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const chord = [220.0, 329.63, 415.3, 493.88, 659.25, 987.77]; // A Major 9th Cosmic Chord
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = idx < 2 ? 'triangle' : 'sine';
        const start = t + idx * 0.028;
        osc.frequency.setValueAtTime(freq * 0.96, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, start + 0.28);
        osc.frequency.exponentialRampToValueAtTime(freq, start + 0.65);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, start);
        filter.frequency.exponentialRampToValueAtTime(3200, start + 0.22);
        filter.frequency.exponentialRampToValueAtTime(900, start + 0.65);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.032 / (1 + idx * 0.22), start + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0006, start + 0.68);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.7);
      });
    } catch {
      // silent
    }
  }

  /** Âm thắng / hoàn tất bốc đề ngẫu nhiên */
  public playRouletteWin() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);

        gain.gain.setValueAtTime(0.05, now + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.055 + 0.36);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.38);
      });
    } catch {
      // silent
    }
  }

  /** Âm chuông xác nhận lưu mục tiêu / bật âm thanh */
  public playChime() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.045);
        gain.gain.setValueAtTime(0.04, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.045 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.27);
      });
    } catch {
      // silent
    }
  }
}

export const sound = new SoundEngine();
