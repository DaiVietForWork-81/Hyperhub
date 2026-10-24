import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, Compass, Volume2, VolumeX } from 'lucide-react';
import { prefersReducedMotion } from '../motion/capabilities';
import { sound } from '../utils/audio';
import { preloadHub } from '../hubLoader';
import { useHubPulse } from '../hooks/useHubPulse';

export interface OrbitIntroProps {
  onEnterMain: () => void;
  onEnterHub: () => void;
  onSkip: () => void;
}

interface SatelliteNode {
  id: 'LEARN' | 'GROW' | 'CONNECT';
  label: string;
  sub: string;
  radiusX: number;
  radiusY: number;
  tiltX: number;
  tiltZ: number;
  speed: number;
  phase: number;
  color: string;
  size: number;
}

const SATELLITES: SatelliteNode[] = [
  {
    id: 'LEARN',
    label: 'LEARN',
    sub: '179 đề thi',
    radiusX: 148,
    radiusY: 58,
    tiltX: 0.32,
    tiltZ: -0.28,
    speed: 0.42,
    phase: 0.4,
    color: '#E2CEFF',
    size: 5.5,
  },
  {
    id: 'GROW',
    label: 'GROW',
    sub: 'Đối chiếu 3 bước',
    radiusX: 208,
    radiusY: 82,
    tiltX: -0.24,
    tiltZ: 0.36,
    speed: -0.31,
    phase: 2.3,
    color: '#FF55B8',
    size: 6.5,
  },
  {
    id: 'CONNECT',
    label: 'CONNECT',
    sub: 'Hỗ trợ 24/7',
    radiusX: 268,
    radiusY: 104,
    tiltX: 0.18,
    tiltZ: -0.14,
    speed: 0.22,
    phase: 4.2,
    color: '#FFB396',
    size: 5,
  },
];

/**
 * ORBIT - STAGE 1: CINEMATIC INTRO EXPERIENCE
 * Trải nghiệm mở đầu 6 pha (Atmosphere → Core Reveal → Orbital Motion → Brand → Message → Invite Entry)
 * với mô hình quỹ đạo 3D chiếu phối cảnh trên HTML5 Canvas, phản hồi con trỏ theo vật lý lò xo
 * tắt dần tới hạn (critically damped spring, Apple WWDC Fluid Interfaces), hỗ trợ bàn phím và reduced-motion.
 */
export const OrbitIntro: React.FC<OrbitIntroProps> = ({ onEnterMain, onEnterHub, onSkip }) => {
  const reduced = prefersReducedMotion();
  const pulse = useHubPulse();
  const liveDocCount = pulse.docCount || 179;
  const [phase, setPhase] = useState<'entering' | 'ready' | 'exiting'>(reduced ? 'ready' : 'entering');
  const [pulseCount, setPulseCount] = useState(0);
  const [activeNode, setActiveNode] = useState<SatelliteNode['id']>('LEARN');
  const [soundEnabled, setSoundEnabled] = useState(() => sound.isEnabled());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreWrapRef = useRef<HTMLDivElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  // Trạng thái vật lý lò xo cho tương tác con trỏ (damping = 1.0, response = 0.36)
  const physicsRef = useRef({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    velX: 0,
    velY: 0,
    pulseEnergy: 0,
    exitProgress: 0,
    isExiting: false,
  });

  useEffect(() => sound.subscribe(setSoundEnabled), []);

  // Tải trước chunk Hub trong lúc người dùng xem Intro
  useEffect(() => {
    const id = window.setTimeout(() => preloadHub(), 600);
    return () => window.clearTimeout(id);
  }, []);

  // Chuyển pha từ entering -> ready
  useEffect(() => {
    if (reduced) {
      setPhase('ready');
      return;
    }
    const id = window.setTimeout(() => {
      setPhase((prev) => (prev === 'entering' ? 'ready' : prev));
    }, 1150);
    return () => window.clearTimeout(id);
  }, [reduced]);

  // Kích hoạt chuyển cảnh sang trang chính (Stage 1 -> Stage 2)
  const triggerEnter = useCallback(
    (destination: 'main' | 'hub') => {
      if (physicsRef.current.isExiting) return;
      sound.playNavSwitch();
      if (reduced) {
        if (destination === 'hub') onEnterHub();
        else onEnterMain();
        return;
      }
      physicsRef.current.isExiting = true;
      physicsRef.current.pulseEnergy = 1.4;
      setPhase('exiting');
      exitTimerRef.current = window.setTimeout(() => {
        if (destination === 'hub') onEnterHub();
        else onEnterMain();
      }, 560);
    },
    [onEnterHub, onEnterMain, reduced]
  );

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  // Điều khiển bàn phím: Enter để vào Orbit, Escape để bỏ qua ngay lập tức
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        sound.playClick();
        onSkip();
      } else if (e.key === 'Enter' && document.activeElement === document.body) {
        e.preventDefault();
        triggerEnter('main');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSkip, triggerEnter]);

  // Vòng lặp vẽ quỹ đạo 3D chiếu phối cảnh + lò xo tương tác trên Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // 28 ngôi sao nền tĩnh lặng tạo chiều sâu không gian
    const stars = Array.from({ length: 28 }, (_, i) => ({
      x: ((i * 97 + 31) % 100) / 100,
      y: ((i * 53 + 17) % 100) / 100,
      r: (i % 3) * 0.55 + 0.7,
      alpha: ((i % 5) + 2) * 0.08,
      depth: (i % 4) * 0.25 + 0.25,
    }));

    let lastTime = performance.now();
    const startTime = lastTime;

    const projectOrbitPoint = (
      angle: number,
      sat: SatelliteNode,
      scaleFactor: number,
      tiltOffsetX: number,
      tiltOffsetY: number
    ) => {
      const rx = sat.radiusX * scaleFactor;
      const ry = sat.radiusY * scaleFactor;
      const rawX = Math.cos(angle) * rx;
      const rawY = Math.sin(angle) * ry;

      const cosZ = Math.cos(sat.tiltZ + tiltOffsetX * 0.12);
      const sinZ = Math.sin(sat.tiltZ + tiltOffsetX * 0.12);

      const x = rawX * cosZ - rawY * sinZ;
      const y = (rawX * sinZ + rawY * cosZ) * (1 + tiltOffsetY * 0.18);
      const z = Math.sin(angle + sat.tiltX) * rx * 0.45;

      return { x, y, z };
    };

    const drawArcSegment = (
      cx: number,
      cy: number,
      sat: SatelliteNode,
      scaleFactor: number,
      tiltOffsetX: number,
      tiltOffsetY: number,
      frontHalf: boolean,
      alpha: number
    ) => {
      const steps = 64;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const p = projectOrbitPoint(a, sat, scaleFactor, tiltOffsetX, tiltOffsetY);
        const isFront = p.z >= 0;
        if (isFront !== frontHalf) {
          started = false;
          continue;
        }
        const px = cx + p.x;
        const py = cy + p.y;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      const ringGrad = ctx.createLinearGradient(cx - sat.radiusX * scaleFactor, cy + sat.radiusY * scaleFactor, cx + sat.radiusX * scaleFactor, cy - sat.radiusY * scaleFactor);
      const a = frontHalf ? 0.36 * alpha : 0.14 * alpha;
      ringGrad.addColorStop(0, `rgba(155, 92, 255, ${a.toFixed(3)})`);
      ringGrad.addColorStop(0.55, `rgba(255, 60, 166, ${(a * 1.15).toFixed(3)})`);
      ringGrad.addColorStop(1, `rgba(255, 158, 125, ${a.toFixed(3)})`);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = frontHalf ? 1.35 : 0.95;
      ctx.stroke();
    };

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      const p = physicsRef.current;
      // Critically damped spring (omega = 10.5)
      const omega = 10.5;
      const forceX = (p.targetX - p.currentX) * (omega * omega) - 2 * omega * p.velX;
      const forceY = (p.targetY - p.currentY) * (omega * omega) - 2 * omega * p.velY;
      p.velX += forceX * dt;
      p.velY += forceY * dt;
      p.currentX += p.velX * dt;
      p.currentY += p.velY * dt;

      if (p.pulseEnergy > 0.001) {
        p.pulseEnergy = Math.max(0, p.pulseEnergy - dt * 1.65);
      }
      if (p.isExiting) {
        p.exitProgress = Math.min(1, p.exitProgress + dt * 2.1);
      }

      // Đồng bộ góc nghiêng nhẹ lên khối huy hiệu trung tâm
      if (coreWrapRef.current) {
        const tx = (p.currentX * 14).toFixed(2);
        const ty = (p.currentY * 14).toFixed(2);
        const rx = (-p.currentY * 10).toFixed(2);
        const ry = (p.currentX * 10).toFixed(2);
        const sc = (1 + p.pulseEnergy * 0.06 + p.exitProgress * 0.24).toFixed(3);
        coreWrapRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5 + p.currentX * 18;
      const cy = height * 0.5 + p.currentY * 14;
      const responsiveScale = Math.min(1.08, Math.max(0.54, Math.min(width, height) / 640));
      const exitExpand = 1 + p.exitProgress * 0.65;
      const revealScale = reduced ? 1 : Math.min(1, 0.86 + Math.min(1, elapsed / 0.9) * 0.14);
      const scaleFactor = responsiveScale * exitExpand * revealScale;
      const fadeAlpha = Math.max(0, 1 - p.exitProgress * 0.95);

      // 1. Vẽ trường sao tĩnh lặng có chiều sâu parallax (ánh hồng phấn & tím nhạt đồng điệu logo)
      for (const s of stars) {
        const sx = s.x * width - p.currentX * 22 * s.depth;
        const sy = s.y * height - p.currentY * 18 * s.depth;
        ctx.fillStyle = `rgba(248, 232, 255, ${(s.alpha * fadeAlpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Vầng sáng trung tâm đồng điệu với tinh vân tím - hồng - cam đào của logo Orbit
      const glowRadius = 168 * scaleFactor * (1 + p.pulseEnergy * 0.22);
      const coreGlow = ctx.createRadialGradient(cx, cy, 8, cx, cy, glowRadius);
      coreGlow.addColorStop(0, `rgba(255, 60, 166, ${(0.26 * fadeAlpha).toFixed(3)})`);
      coreGlow.addColorStop(0.45, `rgba(155, 92, 255, ${(0.14 * fadeAlpha).toFixed(3)})`);
      coreGlow.addColorStop(0.75, `rgba(255, 158, 125, ${(0.06 * fadeAlpha).toFixed(3)})`);
      coreGlow.addColorStop(1, 'rgba(8, 6, 14, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Sóng xung kích khi người dùng chạm vào tâm quỹ đạo
      if (p.pulseEnergy > 0.02) {
        const waveR = (1.4 - p.pulseEnergy) * 260 * responsiveScale + 48;
        ctx.strokeStyle = `rgba(255, 168, 220, ${(p.pulseEnergy * 0.42 * fadeAlpha).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Nửa sau của các vành quỹ đạo (z < 0)
      for (const sat of SATELLITES) {
        drawArcSegment(cx, cy, sat, scaleFactor, p.currentX, p.currentY, false, fadeAlpha);
      }

      // Tính vị trí các vệ tinh
      const computedNodes = SATELLITES.map((sat) => {
        const angle = sat.phase + (reduced ? 0 : elapsed * sat.speed);
        const pos = projectOrbitPoint(angle, sat, scaleFactor, p.currentX, p.currentY);
        return { sat, angle, ...pos };
      });

      // Vẽ vệ tinh ở nửa sau (z < 0)
      for (const node of computedNodes.filter((n) => n.z < 0)) {
        const nx = cx + node.x;
        const ny = cy + node.y;
        ctx.fillStyle = node.sat.color;
        ctx.globalAlpha = 0.55 * fadeAlpha;
        ctx.beginPath();
        ctx.arc(nx, ny, node.sat.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 5. Nửa trước của các vành quỹ đạo (z >= 0)
      for (const sat of SATELLITES) {
        drawArcSegment(cx, cy, sat, scaleFactor, p.currentX, p.currentY, true, fadeAlpha);
      }

      // 6. Vệ tinh ở nửa trước (z >= 0) + nhãn tọa độ tinh gọn
      for (const node of computedNodes.filter((n) => n.z >= 0)) {
        const nx = cx + node.x;
        const ny = cy + node.y;
        const halo = ctx.createRadialGradient(nx, ny, 1, nx, ny, node.sat.size * 3.4);
        halo.addColorStop(0, `rgba(255, 168, 220, ${(0.62 * fadeAlpha).toFixed(3)})`);
        halo.addColorStop(1, 'rgba(255, 60, 166, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(nx, ny, node.sat.size * 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF5FB';
        ctx.globalAlpha = fadeAlpha;
        ctx.beginPath();
        ctx.arc(nx, ny, node.sat.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      if (!reduced || p.pulseEnergy > 0.01 || p.isExiting) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    physicsRef.current.targetX = Math.max(-1, Math.min(1, nx));
    physicsRef.current.targetY = Math.max(-1, Math.min(1, ny));
  };

  const handlePointerLeave = () => {
    physicsRef.current.targetX = 0;
    physicsRef.current.targetY = 0;
  };

  const handleCorePulse = () => {
    sound.playTick(true);
    physicsRef.current.pulseEnergy = 1.0;
    setPulseCount((c) => c + 1);
    setActiveNode((prev) => (prev === 'LEARN' ? 'GROW' : prev === 'GROW' ? 'CONNECT' : 'LEARN'));
  };

  return (
    <section
      className="hh-intro-stage"
      data-phase={phase}
      aria-labelledby="orbit-intro-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onWheel={(e) => {
        if (e.deltaY > 28) {
          triggerEnter('main');
        }
      }}
    >
      {/* Thanh điều khiển tối giản góc trên: luôn sẵn sàng từ giây đầu tiên */}
      <header className="hh-intro-topbar">
        <div className="hh-intro-brand-mini hh-intro-fade" style={{ ['--d' as string]: '40ms' }}>
          <img
            src="/orbit_emblem_core.png"
            alt=""
            width={28}
            height={28}
            decoding="async"
            className="hh-intro-brand-mini-img"
          />
          <span>Orbit</span>
        </div>

        <div className="hh-intro-topbar-actions">
          <button
            type="button"
            onClick={() => sound.toggle()}
            className="hh-intro-util-btn hh-intro-fade"
            style={{ ['--d' as string]: '80ms' }}
            aria-label={soundEnabled ? 'Tắt âm thanh tương tác' : 'Bật âm thanh tương tác'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
            <span>{soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onSkip();
            }}
            className="hh-intro-skip-btn hh-intro-fade"
            style={{ ['--d' as string]: '120ms' }}
          >
            <span>Bỏ qua Intro</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Khung trung tâm: Khối cầu Quỹ đạo tương tác (Stage Focal Object) + Tuyên ngôn thương hiệu */}
      <div className="hh-intro-body">
        <div className="hh-intro-sculpture hh-intro-rise" style={{ ['--d' as string]: '100ms' }} role="region" aria-label="Mô hình quỹ đạo Orbit tương tác">
          <canvas ref={canvasRef} className="hh-intro-canvas" aria-hidden="true" />

          <div ref={coreWrapRef} className="hh-intro-core-wrap">
            <button
              type="button"
              onClick={handleCorePulse}
              className="hh-intro-core-btn"
              aria-label="Kích hoạt xung quỹ đạo Orbit · Chuyển tâm điểm LEARN, GROW, CONNECT"
            >
              <img
                src="/orbit_emblem_core.png"
                alt="Biểu tượng tâm quỹ đạo Orbit"
                width={148}
                height={148}
                decoding="async"
                draggable={false}
                className="hh-intro-core-img"
              />
            </button>
          </div>

          {/* 3 nút vệ tinh tương tác gắn với 3 quỹ đạo */}
          <div className="hh-intro-nodes" role="group" aria-label="Ba trụ cột quỹ đạo Orbit">
            {SATELLITES.map((sat, idx) => {
              const isSelected = activeNode === sat.id;
              const liveSub = sat.id === 'LEARN' ? `${liveDocCount} đề thi` : sat.sub;
              return (
                <button
                  key={sat.id}
                  type="button"
                  onClick={() => {
                    sound.playTick(true);
                    physicsRef.current.pulseEnergy = 0.85;
                    setActiveNode(sat.id);
                  }}
                  aria-pressed={isSelected}
                  className="hh-intro-node-chip hh-intro-rise"
                  style={{ ['--d' as string]: `${220 + idx * 70}ms` }}
                >
                  <span className="hh-intro-node-dot" style={{ backgroundColor: sat.color }} aria-hidden="true" />
                  <span className="hh-intro-node-name">{sat.label}</span>
                  <span className="hh-intro-node-sub">{liveSub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pha D, E, F: Wordmark, Tuyên ngôn và CTA */}
        <div className="hh-intro-copy">
          <h1 id="orbit-intro-title" className="hh-intro-title hh-intro-rise" style={{ ['--d' as string]: '160ms' }}>
            Orbit · Cùng một quỹ đạo tri thức.
          </h1>

          <p className="hh-intro-lede hh-intro-rise" style={{ ['--d' as string]: '260ms' }}>
            Mỗi người có một hướng đi riêng, nhưng gặp nhau tại Orbit để luyện đề chuẩn hóa, đối chiếu lời giải qua ba bước kiểm duyệt và đồng hành cùng cộng đồng sĩ tử Việt Nam.
          </p>

          <div className="hh-intro-ctas">
            <button
              type="button"
              onClick={() => triggerEnter('main')}
              onPointerEnter={() => sound.playHover()}
              className="hh-btn hh-btn--primary hh-intro-enter-btn hh-intro-rise"
              style={{ ['--d' as string]: '360ms' }}
            >
              <span className="hh-btn-fill" aria-hidden="true" />
              <span className="hh-btn-label">
                <span>Vào không gian Orbit</span>
                <ArrowRight className="w-4 h-4 hh-btn-trail" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => triggerEnter('hub')}
              onPointerEnter={() => sound.playHover()}
              className="hh-btn hh-btn--ghost hh-intro-hub-btn hh-intro-rise"
              style={{ ['--d' as string]: '430ms' }}
            >
              <span className="hh-btn-fill" aria-hidden="true" />
              <span className="hh-btn-label">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Mở thẳng Orbit Hub ({liveDocCount} đề)</span>
              </span>
            </button>
          </div>

          <p className="hh-intro-hint hh-intro-fade" style={{ ['--d' as string]: '500ms' }} aria-live="polite">
            {pulseCount > 0
              ? `Đang khóa tâm điểm ${activeNode} · Nhấn "Vào không gian Orbit" hoặc phím Enter để tiến vào không gian chính.`
              : 'Di chuyển con trỏ hoặc chạm vào tâm cầu để cảm nhận quán tính quỹ đạo · Nhấn Enter hoặc cuộn xuống để vào trang.'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default OrbitIntro;
