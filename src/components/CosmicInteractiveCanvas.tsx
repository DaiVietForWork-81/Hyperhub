import React, { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// CÁC LOẠI HÌNH KHỐI (SHAPE TYPES)
// - Cầu nguyên tử (Atom with electron orbits)
// - Cầu bình thường (3D Shaded Sphere)
// - Vuông (3D Cube / Voxel Block)
// - Chữ nhật (3D Rectangular Prism)
// - Tam giác (3D Tetrahedron / Pyramid)
// - Hình bình hành (3D Parallelogram)
// - Hình thang (3D Trapezoid)
// - Bát diện (3D Octahedron / Diamond)
// ============================================================================

export type ShapeType =
  | 'atom_sphere'
  | 'normal_sphere'
  | 'cube'
  | 'rect_prism'
  | 'pyramid'
  | 'parallelogram'
  | 'trapezoid'
  | 'octahedron';

interface ParticleSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface GeometricEntity {
  id: number;
  type: ShapeType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  electronAngle: number;
  color: {
    primary: string;
    secondary: string;
    glow: string;
    accent: string;
  };
  scale: number;
  targetScale: number;
  lifecycle: 'spawning' | 'active' | 'dissolving';
  lifeTimer: number;
  maxLife: number;
  isFollowing: boolean;
  orbitAngleOffset: number;
  orbitDistance: number;
  isFreeRoam: boolean;
}

const PALETTES = [
  // Cyan Diamond
  { primary: '#06b6d4', secondary: '#22d3ee', glow: 'rgba(6, 182, 212, 0.5)', accent: '#a5f3fc' },
  // Fuchsia / Ender
  { primary: '#a855f7', secondary: '#d946ef', glow: 'rgba(217, 70, 239, 0.55)', accent: '#f5d0fe' },
  // Redstone Flame
  { primary: '#ef4444', secondary: '#f87171', glow: 'rgba(239, 68, 68, 0.5)', accent: '#fecaca' },
  // Emerald Jade
  { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.5)', accent: '#a7f3d0' },
  // Gold Amber
  { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)', accent: '#fef3c7' },
  // Sapphire Royal
  { primary: '#3b82f6', secondary: '#60a5fa', glow: 'rgba(59, 130, 246, 0.5)', accent: '#bfdbfe' },
];

const ALL_SHAPE_TYPES: ShapeType[] = [
  'atom_sphere',
  'normal_sphere',
  'cube',
  'rect_prism',
  'pyramid',
  'parallelogram',
  'trapezoid',
  'octahedron',
];

export const CosmicInteractiveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Supernova Flash Overlay State
  const [flashActive, setFlashActive] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [comboBanner, setComboBanner] = useState<{ text: string; count: number } | null>(null);

  // Mutable refs for zero-lag RAF loop
  const entitiesRef = useRef<GeometricEntity[]>([]);
  const sparksRef = useRef<ParticleSpark[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    active: false,
  });
  const clickComboRef = useRef<number>(0);
  const comboTimerRef = useRef<number | null>(null);
  const nextIdRef = useRef<number>(1);

  // Helper: Tạo 1 khối ngẫu nhiên
  const createEntity = useCallback(
    (
      x?: number,
      y?: number,
      forcedType?: ShapeType,
      isFreeRoam = false
    ): GeometricEntity => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const h = typeof window !== 'undefined' ? window.innerHeight : 800;

      const posX = x ?? Math.random() * w;
      const posY = y ?? Math.random() * h;

      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const type =
        forcedType ?? ALL_SHAPE_TYPES[Math.floor(Math.random() * ALL_SHAPE_TYPES.length)];

      const baseSpeed = isFreeRoam ? 2.5 + Math.random() * 3.5 : 0.6 + Math.random() * 1.2;
      const moveAngle = Math.random() * Math.PI * 2;

      return {
        id: nextIdRef.current++,
        type,
        x: posX,
        y: posY,
        vx: Math.cos(moveAngle) * baseSpeed,
        vy: Math.sin(moveAngle) * baseSpeed,
        size: type === 'atom_sphere' || type === 'cube' ? 24 + Math.random() * 14 : 20 + Math.random() * 16,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: (Math.random() - 0.5) * 0.025,
        vRotY: (Math.random() - 0.5) * 0.03,
        vRotZ: (Math.random() - 0.5) * 0.02,
        electronAngle: Math.random() * Math.PI * 2,
        color: palette,
        scale: 0.05,
        targetScale: 1,
        lifecycle: 'spawning',
        lifeTimer: 0,
        maxLife: 800 + Math.random() * 1400, // ~15-35 giây trước khi tự biến mất & sinh mới
        isFollowing: false,
        orbitAngleOffset: Math.random() * Math.PI * 2,
        orbitDistance: 45 + Math.random() * 75,
        isFreeRoam,
      };
    },
    []
  );

  // Khởi tạo các khối ban đầu (tăng số lượng theo yêu cầu người dùng)
  useEffect(() => {
    const initialList: GeometricEntity[] = [];
    const count = 28; // Nhiều hơn theo yêu cầu
    for (let i = 0; i < count; i++) {
      const type = ALL_SHAPE_TYPES[i % ALL_SHAPE_TYPES.length];
      const ent = createEntity(undefined, undefined, type);
      ent.scale = 0.8 + Math.random() * 0.2;
      ent.lifecycle = 'active';
      ent.lifeTimer = Math.floor(Math.random() * ent.maxLife * 0.6); // phân bổ thời gian sinh diệt so le
      initialList.push(ent);
    }
    entitiesRef.current = initialList;
  }, [createEntity]);

  // Kích hoạt vụ nổ trắng xóa & siêu tân tinh (Supernova TNT Explosion)
  const triggerSupernova = useCallback(() => {
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    // 1. Kích hoạt che màn hình màu trắng (Blinding Cosmic Flash)
    setFlashActive(true);
    setFlashOpacity(1);
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 650);

    // Sau 50ms, chuyển sang fade-out trong đúng 1 giây
    setTimeout(() => {
      setFlashOpacity(0);
    }, 60);

    // Sau đúng 1 giây (1060ms), kết thúc màn che
    setTimeout(() => {
      setFlashActive(false);
    }, 1060);

    setComboBanner({ text: '💥 VỤ NỔ VŨ TRỤ SIÊU TÂN TINH (SUPERNOVA BURST)!', count: 8 });
    setTimeout(() => setComboBanner(null), 2500);

    // 2. Thổi bay tất cả các khối theo hướng xuyên tâm từ vị trí chuột
    const entities = entitiesRef.current;
    entities.forEach((ent) => {
      const dx = ent.x - mx;
      const dy = ent.y - my;
      const dist = Math.hypot(dx, dy) || 1;
      const blastPower = 18 + Math.random() * 26;

      ent.vx = (dx / dist) * blastPower;
      ent.vy = (dy / dist) * blastPower;
      ent.vRotX = (Math.random() - 0.5) * 0.12;
      ent.vRotY = (Math.random() - 0.5) * 0.14;
      ent.vRotZ = (Math.random() - 0.5) * 0.12;
      ent.isFollowing = false;
      ent.isFreeRoam = true; // Chuyển sang chế độ DI CHUYỂN TỰ DO
    });

    // Tạo 45 hạt tia lửa vụ nổ
    const sparks = sparksRef.current;
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * 20;
      sparks.push({
        x: mx,
        y: my,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 5,
        alpha: 1,
        color: i % 2 === 0 ? '#ffffff' : '#d946ef',
      });
    }
  }, []);

  // Xử lý Click Chuột Trái Liên Tục (Combo Tracker)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Chỉ nhận chuột trái
      if (e.button !== 0) return;

      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;

      clickComboRef.current += 1;
      const combo = clickComboRef.current;

      // Xóa timer reset combo cũ
      if (comboTimerRef.current) {
        window.clearTimeout(comboTimerRef.current);
      }

      // Đặt timer 2.5s không ấn nữa thì reset combo
      comboTimerRef.current = window.setTimeout(() => {
        clickComboRef.current = 0;
        setComboBanner(null);
        // Nhẹ nhàng giải phóng các khối theo chuột nếu chưa nổ
        entitiesRef.current.forEach((ent) => {
          if (ent.isFollowing && !ent.isFreeRoam) {
            ent.isFollowing = false;
            ent.vx = (Math.random() - 0.5) * 2;
            ent.vy = (Math.random() - 0.5) * 2;
          }
        });
      }, 2500);

      // STAGE 2: Ấn chuột trái từ 3 lần trở lên -> có vài khối đi theo chuột
      if (combo >= 3 && combo < 8) {
        setComboBanner({
          text: `🧲 Lực Hút Lượng Tử: Khối Đi Theo Chuột (${combo}/8 click)`,
          count: combo,
        });

        // Chọn 5-7 khối gần nhất hoặc ngẫu nhiên để đi theo chuột
        const entities = entitiesRef.current;
        let followerCount = 0;
        entities.forEach((ent) => {
          if (followerCount < 7) {
            ent.isFollowing = true;
            ent.isFreeRoam = false;
            followerCount++;
          }
        });
      }

      // STAGE 3: Ấn nhiều lần nữa (>= 8 click) -> Tạo ra vụ nổ trắng che màn hình!
      if (combo >= 8) {
        clickComboRef.current = 0;
        triggerSupernova();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
    };
  }, [triggerSupernova]);

  // Main High-Performance Canvas Animation Engine (60 - 120 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // ==============================================================
    // 3D RENDERING ROUTINES FOR EACH REQUESTED SHAPE
    // ==============================================================

    // 1. Cầu (Nguyên tử) - Nucleus with orbiting electron rings
    const drawAtomSphere = (ent: GeometricEntity) => {
      const { x, y, size, scale, color } = ent;
      const r = size * scale * 0.7;

      ctx.save();
      ctx.translate(x, y);

      // Glowing Center Nucleus
      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, color.secondary);
      grad.addColorStop(1, color.primary);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Electron Orbits (3 elip xoay ở các góc 35deg, 95deg, 155deg)
      const orbitR = r * 1.9;
      const angles = [0.6, 1.65, 2.7];

      angles.forEach((ang, i) => {
        ctx.save();
        ctx.rotate(ang + ent.rotZ * 0.5);

        // Orbit path
        ctx.strokeStyle = color.glow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, orbitR, orbitR * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting Electron Dot
        const ePos = ent.electronAngle * (1 + i * 0.3);
        const ex = Math.cos(ePos) * orbitR;
        const ey = Math.sin(ePos) * (orbitR * 0.42);

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color.secondary;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      ctx.restore();
    };

    // 2. Cầu (Bình thường) - Smooth 3D Shaded Sphere
    const drawNormalSphere = (ent: GeometricEntity) => {
      const { x, y, size, scale, color } = ent;
      const r = size * scale;

      ctx.save();
      ctx.translate(x, y);

      const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
      grad.addColorStop(0, color.accent);
      grad.addColorStop(0.35, color.secondary);
      grad.addColorStop(0.85, color.primary);
      grad.addColorStop(1, '#050510');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Neon Rim Outline
      ctx.strokeStyle = color.glow;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    };

    // 3. Vuông (3D Cube / Voxel)
    const drawCube = (ent: GeometricEntity) => {
      const { x, y, size, scale, color, rotX, rotY } = ent;
      const s = size * scale;

      ctx.save();
      ctx.translate(x, y);

      // Isometric projection from 3D angles
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const sinX = Math.sin(rotX);

      const dx = s * cosY;
      const dy = s * sinY * sinX;
      const h = s * 0.9;

      // Front Face
      ctx.fillStyle = color.primary;
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(-dx, -dy);
      ctx.lineTo(dx, dy);
      ctx.lineTo(dx, dy + h);
      ctx.lineTo(-dx, -dy + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top Face
      ctx.fillStyle = color.secondary;
      ctx.beginPath();
      ctx.moveTo(-dx, -dy);
      ctx.lineTo(0, -dy - s * 0.5);
      ctx.lineTo(dx * 1.2, -dy * 0.4);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // 4. Chữ nhật (3D Rectangular Prism)
    const drawRectPrism = (ent: GeometricEntity) => {
      const { x, y, size, scale, color, rotZ } = ent;
      const w = size * scale * 1.8;
      const h = size * scale * 0.9;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotZ);

      // Base rectangle
      ctx.fillStyle = color.primary;
      ctx.strokeStyle = color.secondary;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill();
      ctx.stroke();

      // Inner neon depth line
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 3, 0);
      ctx.lineTo(w / 2 - 3, 0);
      ctx.stroke();

      ctx.restore();
    };

    // 5. Tam giác (3D Tetrahedron / Pyramid)
    const drawPyramid = (ent: GeometricEntity) => {
      const { x, y, size, scale, color, rotZ } = ent;
      const s = size * scale * 1.2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotZ);

      // Front face
      ctx.fillStyle = color.primary;
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.86, s * 0.5);
      ctx.lineTo(0, s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left face
      ctx.fillStyle = color.secondary;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(-s * 0.86, s * 0.5);
      ctx.lineTo(0, s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central glowing apex node
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -s, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // 6. Hình bình hành (Parallelogram)
    const drawParallelogram = (ent: GeometricEntity) => {
      const { x, y, size, scale, color, rotZ } = ent;
      const w = size * scale * 1.3;
      const h = size * scale * 0.8;
      const skew = w * 0.35;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotZ);

      ctx.fillStyle = color.primary;
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(-w / 2 + skew, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2 - skew, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // 7. Hình thang (Trapezoid)
    const drawTrapezoid = (ent: GeometricEntity) => {
      const { x, y, size, scale, color, rotZ } = ent;
      const topW = size * scale * 0.6;
      const botW = size * scale * 1.4;
      const h = size * scale * 0.9;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotZ);

      ctx.fillStyle = color.secondary;
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(-topW / 2, -h / 2);
      ctx.lineTo(topW / 2, -h / 2);
      ctx.lineTo(botW / 2, h / 2);
      ctx.lineTo(-botW / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // 8. Bát diện 3D (Octahedron / Diamond Crystal)
    const drawOctahedron = (ent: GeometricEntity) => {
      const { x, y, size, scale, color, rotZ } = ent;
      const s = size * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotZ);

      // Top triangle
      ctx.fillStyle = color.secondary;
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(s * 0.9, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(-s * 0.9, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom triangle
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(0, s * 1.2);
      ctx.lineTo(s * 0.9, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color.secondary;
      ctx.beginPath();
      ctx.moveTo(0, s * 1.2);
      ctx.lineTo(-s * 0.9, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    // ==============================================================
    // MAIN RAF SIMULATION LOOP
    // ==============================================================
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const entities = entitiesRef.current;
      const sparks = sparksRef.current;

      // 1. Cập nhật và vẽ các khối
      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];

        // Lifecycle & Respawn check: Có lúc biến mất và tạo ra khối mới
        ent.lifeTimer += 1;
        if (ent.lifecycle === 'spawning') {
          ent.scale += (ent.targetScale - ent.scale) * 0.08;
          if (ent.scale >= 0.95) {
            ent.scale = 1;
            ent.lifecycle = 'active';
          }
        } else if (ent.lifecycle === 'active') {
          // Khi hết vòng đời tự nhiên -> Chuyển sang biến mất
          if (ent.lifeTimer >= ent.maxLife && !ent.isFollowing) {
            ent.lifecycle = 'dissolving';
          }
        } else if (ent.lifecycle === 'dissolving') {
          ent.scale -= 0.04;
          // Tạo vài hạt bụi sao khi biến mất
          if (Math.random() < 0.3) {
            sparks.push({
              x: ent.x,
              y: ent.y,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              size: 2,
              alpha: 1,
              color: ent.color.accent,
            });
          }
          // Khi biến mất hoàn toàn -> TẠO KHỐI MỚI NGAY LẬP TỨC
          if (ent.scale <= 0.08) {
            entities[i] = createEntity(
              Math.random() * width,
              Math.random() * height,
              undefined,
              ent.isFreeRoam
            );
            continue;
          }
        }

        // VẬN TỐC & VỊ TRÍ
        if (ent.isFollowing) {
          // Bám theo chuột mượt mà (chế độ Swarm Attraction)
          ent.orbitAngleOffset += 0.03;
          const targetX = mx + Math.cos(ent.orbitAngleOffset) * ent.orbitDistance;
          const targetY = my + Math.sin(ent.orbitAngleOffset) * ent.orbitDistance;

          ent.vx += (targetX - ent.x) * 0.09;
          ent.vy += (targetY - ent.y) * 0.09;
          ent.vx *= 0.82;
          ent.vy *= 0.82;
        } else if (ent.isFreeRoam) {
          // DI CHUYỂN TỰ DO sau vụ nổ: phản xạ nảy tường mượt mà
          ent.vx *= 0.995; // Giảm tốc nhẹ tự nhiên
          ent.vy *= 0.995;

          // Giữ vận tốc tối thiểu để luôn di chuyển tự do khắp màn hình
          const spd = Math.hypot(ent.vx, ent.vy);
          if (spd < 1.2) {
            const ang = Math.random() * Math.PI * 2;
            ent.vx = Math.cos(ang) * 1.8;
            ent.vy = Math.sin(ang) * 1.8;
          }

          // Bật nảy biên màn hình
          if (ent.x - ent.size < 0) {
            ent.x = ent.size;
            ent.vx = Math.abs(ent.vx);
          } else if (ent.x + ent.size > width) {
            ent.x = width - ent.size;
            ent.vx = -Math.abs(ent.vx);
          }
          if (ent.y - ent.size < 0) {
            ent.y = ent.size;
            ent.vy = Math.abs(ent.vy);
          } else if (ent.y + ent.size > height) {
            ent.y = height - ent.size;
            ent.vy = -Math.abs(ent.vy);
          }
        } else {
          // Chế độ tuần tra êm ái bình thường (Ambient Drift)
          if (ent.x < -60) ent.x = width + 50;
          if (ent.x > width + 60) ent.x = -50;
          if (ent.y < -60) ent.y = height + 50;
          if (ent.y > height + 60) ent.y = -50;
        }

        ent.x += ent.vx;
        ent.y += ent.vy;

        // Góc xoay 3D
        ent.rotX += ent.vRotX;
        ent.rotY += ent.vRotY;
        ent.rotZ += ent.vRotZ;
        ent.electronAngle += 0.06;

        // Vẽ từng loại hình
        switch (ent.type) {
          case 'atom_sphere':
            drawAtomSphere(ent);
            break;
          case 'normal_sphere':
            drawNormalSphere(ent);
            break;
          case 'cube':
            drawCube(ent);
            break;
          case 'rect_prism':
            drawRectPrism(ent);
            break;
          case 'pyramid':
            drawPyramid(ent);
            break;
          case 'parallelogram':
            drawParallelogram(ent);
            break;
          case 'trapezoid':
            drawTrapezoid(ent);
            break;
          case 'octahedron':
            drawOctahedron(ent);
            break;
        }
      }

      // 2. Cập nhật và vẽ các hạt tia lửa (Sparks)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.94;
        sp.vy *= 0.94;
        sp.alpha -= 0.02;

        if (sp.alpha <= 0.05) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [createEntity]);

  return (
    <>
      {/* 1. Canvas 2D/3D Hardware-Accelerated Particles & Shapes (Zero Lag) */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] select-none"
        style={{
          contain: 'strict',
          willChange: 'transform',
        }}
      />

      {/* 2. Supernova Detonation Screen Flash (Màn hình che phủ màu trắng rồi biến mất sau 1s) */}
      {flashActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[9999] select-none transition-opacity duration-1000 ease-out"
          style={{
            opacity: flashOpacity,
            background:
              'radial-gradient(circle at center, #ffffff 50%, rgba(240, 171, 252, 0.9) 80%, rgba(192, 38, 211, 0.7) 100%)',
          }}
        />
      )}

      {/* 3. Screen Shake Wrapper Overlay (khi nổ) */}
      {screenShake && (
        <style>{`
          body {
            animation: supernova-shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
          }
          @keyframes supernova-shake {
            0%, 100% { transform: translate3d(0, 0, 0); }
            15%, 45%, 75% { transform: translate3d(-7px, 4px, 0); }
            30%, 60%, 90% { transform: translate3d(7px, -4px, 0); }
          }
        `}</style>
      )}

      {/* 4. Mini Combo Notification Badge (Hiển thị khi người dùng click liên tục) */}
      {comboBanner && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] animate-bounce select-none">
          <div className="px-5 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-purple-500/50 shadow-[0_0_25px_rgba(217,70,239,0.5)] flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-ping" />
            <span>{comboBanner.text}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default CosmicInteractiveCanvas;
