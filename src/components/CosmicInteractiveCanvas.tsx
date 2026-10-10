import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI HÌNH HỌC 3D WIREFRAME KÍNH TÍM SỐ LƯỢNG LỚN (CHUẨN 100% ẢNH MẪU)
// - Khối chữ nhật 3D (Đứng, có vạch chia ngang giữa y hệt ảnh người dùng gửi)
// - Khối vuông 3D (Cube)
// - Cầu nguyên tử (Atomic sphere với vòng electron)
// - Cầu 3D bình thường (Smooth sphere)
// - Khối tam giác 3D (Kim tự tháp / Tetrahedron)
// - Khối hình bình hành 3D (Parallelogram)
// - Khối hình thang 3D (Trapezoid)
//
// ĐẶC TÍNH:
// 1. SỐ LƯỢNG NHIỀU (48 khối) trải khắp toàn bộ background, luôn có hàng chục khối hiện diện
// 2. Mỗi khối tồn tại đúng 8 GIÂY, sau 8 giây tắt và hiện khối mới ở vị trí ngẫu nhiên
// 3. Khi di chuyển, có AURA KHỐI TÍM tỏa sáng rực rỡ di chuyển cùng chiều với khối
// 4. Khi ấn chuột: Càng ấn nhiều lần, CÀNG NHIỀU KHỐI TIẾN ĐẾN VÀ ĐI THEO CHUỘT
// ============================================================================

export type WireframeShapeType =
  | 'rect_box'       // Khối hộp chữ nhật đứng (chuẩn 100% ảnh mẫu)
  | 'cube'           // Khối lập phương
  | 'atom_sphere'    // Cầu nguyên tử
  | 'normal_sphere'  // Cầu bình thường
  | 'pyramid'        // Tam giác kim tự tháp
  | 'parallelogram'  // Hình bình hành
  | 'trapezoid';     // Hình thang

interface WireframeBlock {
  id: number;
  type: WireframeShapeType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  depth: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  electronAngle: number;
  birthTime: number; // ms
  lifespan: number;  // 8000ms (đúng 8 giây)
  isFollowingMouse: boolean;
  orbitAngle: number;
  orbitRadius: number;
}

const ALL_SHAPES: WireframeShapeType[] = [
  'rect_box',
  'rect_box', // Tăng tỷ lệ xuất hiện khối hộp chữ nhật theo đúng ảnh mẫu
  'cube',
  'atom_sphere',
  'normal_sphere',
  'pyramid',
  'parallelogram',
  'trapezoid',
];

export const CosmicInteractiveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Danh sách các khối (tăng lên 48 khối để ngoài background cực kỳ đông đảo và sống động)
  const TOTAL_BLOCKS = 48;
  const blocksRef = useRef<WireframeBlock[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    active: false,
  });

  const clickComboCountRef = useRef<number>(0);
  const clickResetTimerRef = useRef<number | null>(null);
  const nextIdRef = useRef<number>(1);

  // Tạo khối mới tại vị trí ngẫu nhiên
  const spawnBlock = (
    w: number,
    h: number,
    birthTimeOffset = 0,
    forcedType?: WireframeShapeType
  ): WireframeBlock => {
    const type =
      forcedType ?? ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];

    // Rải đều khắp toàn bộ màn hình, bao gồm cả lề và trung tâm
    const posX = Math.random() * w;
    const posY = Math.random() * h;

    const baseSpeed = 0.45 + Math.random() * 0.95;
    const moveAngle = Math.random() * Math.PI * 2;

    const baseSize = 34 + Math.random() * 20;
    const isBox = type === 'rect_box';

    return {
      id: nextIdRef.current++,
      type,
      x: posX,
      y: posY,
      vx: Math.cos(moveAngle) * baseSpeed,
      vy: Math.sin(moveAngle) * baseSpeed,
      width: baseSize,
      height: isBox ? baseSize * 1.45 : baseSize, // Chiều cao 1.45x như ảnh mẫu
      depth: baseSize * 0.65,
      rotX: 0.15 + (Math.random() - 0.5) * 0.4,
      rotY: 0.25 + (Math.random() - 0.5) * 0.4,
      rotZ: (Math.random() - 0.5) * 0.2,
      vRotX: (Math.random() - 0.5) * 0.014,
      vRotY: (Math.random() - 0.5) * 0.016,
      vRotZ: (Math.random() - 0.5) * 0.012,
      electronAngle: Math.random() * Math.PI * 2,
      birthTime: performance.now() - birthTimeOffset,
      lifespan: 8000, // ĐÚNG 8 GIÂY
      isFollowingMouse: false,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitRadius: 35 + Math.random() * 110,
    };
  };

  // Khởi tạo ban đầu: 48 khối với birthTime rải đều so le trong 8000ms
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const list: WireframeBlock[] = [];

    for (let i = 0; i < TOTAL_BLOCKS; i++) {
      // Phân bổ thời điểm sinh so le trong 8 giây
      const offset = (i / TOTAL_BLOCKS) * 8000;
      const type = ALL_SHAPES[i % ALL_SHAPES.length];
      list.push(spawnBlock(w, h, offset, type));
    }

    blocksRef.current = list;
  }, []);

  // Xử lý click chuột: Càng ấn nhiều lần -> CÀNG NHIỀU KHỐI TIẾN ĐẾN ĐI THEO CHUỘT
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Chỉ nhận chuột trái
      if (e.button !== 0) return;

      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;

      // Mỗi lần click -> Tăng số lượng khối hút theo chuột
      clickComboCountRef.current += 1;
      const clicks = clickComboCountRef.current;

      // Tăng mạnh số lượng khối tiến đến theo mỗi cú click:
      // 1 click: 6 khối gần nhất
      // 2 clicks: 15 khối
      // 3 clicks: 28 khối
      // 4+ clicks: TOÀN BỘ 48 KHỐI cùng nhau tiến đến theo chuột!
      const targetFollowerCount = Math.min(
        blocksRef.current.length,
        clicks === 1 ? 6 : clicks === 2 ? 15 : clicks === 3 ? 28 : blocksRef.current.length
      );

      // Sắp xếp theo khoảng cách tới chuột để các khối gần nhất lao đến trước
      const mx = e.clientX;
      const my = e.clientY;
      const sorted = [...blocksRef.current].sort((a, b) => {
        const da = Math.hypot(a.x - mx, a.y - my);
        const db = Math.hypot(b.x - mx, b.y - my);
        return da - db;
      });

      const followersSet = new Set(
        sorted.slice(0, targetFollowerCount).map((b) => b.id)
      );

      blocksRef.current.forEach((b) => {
        if (followersSet.has(b.id)) {
          b.isFollowingMouse = true;
        }
      });

      // Sau 3.5 giây không ấn chuột nữa, các khối sẽ nhẹ nhàng tản ra
      if (clickResetTimerRef.current) {
        window.clearTimeout(clickResetTimerRef.current);
      }

      clickResetTimerRef.current = window.setTimeout(() => {
        clickComboCountRef.current = 0;
        blocksRef.current.forEach((b) => {
          b.isFollowingMouse = false;
        });
      }, 3500);
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
      if (clickResetTimerRef.current) {
        window.clearTimeout(clickResetTimerRef.current);
      }
    };
  }, []);

  // Main Canvas Render Loop (Chuẩn Retina 4K, 60 - 120 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resizeCanvas = () => {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ========================================================================
    // 1. VẼ AURA KHỐI TÍM (RỰC RỠ, CHUYỂN ĐỘNG CÙNG KHỐI)
    // ========================================================================
    const drawBlockAura = (
      x: number,
      y: number,
      radius: number,
      alpha: number,
      isFollowing: boolean
    ) => {
      ctx.save();
      const auraRad = isFollowing ? radius * 2.2 : radius * 1.7;
      const grad = ctx.createRadialGradient(x, y, radius * 0.15, x, y, auraRad);

      const auraIntensity = isFollowing ? 0.75 : 0.48;
      grad.addColorStop(0, `rgba(192, 132, 252, ${auraIntensity * alpha})`);
      grad.addColorStop(0.45, `rgba(168, 85, 247, ${0.28 * alpha})`);
      grad.addColorStop(1, 'rgba(147, 51, 234, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, auraRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // ========================================================================
    // 2. VẼ KHỐI HỘP CHỮ NHẬT / VUÔNG 3D (ĐÚNG Y HỆT ẢNH MẪU NGƯỜI DÙNG TẢI LÊN)
    // Thân kính tím trong suốt + viền neon tím rực + vạch chia ngang giữa!
    // ========================================================================
    const drawWireframeBox = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w, height: h, depth: d, rotX, rotY, isFollowingMouse } = block;

      ctx.save();
      ctx.translate(x, y);

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const hw = w * 0.5;
      const hh = h * 0.5;
      const hd = d * 0.5;

      const project = (px: number, py: number, pz: number) => {
        const x1 = px * cosY + pz * sinY;
        const z1 = -px * sinY + pz * cosY;
        const y2 = py * cosX - z1 * sinX;
        return { x: x1, y: y2 };
      };

      const p0 = project(-hw, -hh, -hd);
      const p1 = project(hw, -hh, -hd);
      const p2 = project(hw, hh, -hd);
      const p3 = project(-hw, hh, -hd);

      const p4 = project(-hw, -hh, hd);
      const p5 = project(hw, -hh, hd);
      const p6 = project(hw, hh, hd);
      const p7 = project(-hw, hh, hd);

      // Điểm giữa các cạnh dọc (Vạch chia ngang ở giữa y hệt ảnh chụp)
      const m0 = project(-hw, 0, -hd);
      const m1 = project(hw, 0, -hd);
      const m2 = project(hw, 0, hd);
      const m3 = project(-hw, 0, hd);

      // Màu sắc rực rỡ, rõ nét đúng ảnh mẫu
      const strokeColor = isFollowingMouse
        ? `rgba(240, 171, 252, ${0.98 * alpha})`
        : `rgba(216, 180, 254, ${0.92 * alpha})`;
      const fillColor = isFollowingMouse
        ? `rgba(168, 85, 247, ${0.35 * alpha})`
        : `rgba(147, 51, 234, ${0.28 * alpha})`;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isFollowingMouse ? 2.4 : 2.0;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = isFollowingMouse ? 18 : 12;

      // Mặt trước
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(p4.x, p4.y);
      ctx.lineTo(p5.x, p5.y);
      ctx.lineTo(p6.x, p6.y);
      ctx.lineTo(p7.x, p7.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mặt sau (nhìn xuyên thấu kính trong suốt)
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4 cạnh nối các góc
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p4.x, p4.y);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p5.x, p5.y);
      ctx.moveTo(p2.x, p2.y); ctx.lineTo(p6.x, p6.y);
      ctx.moveTo(p3.x, p3.y); ctx.lineTo(p7.x, p7.y);
      ctx.stroke();

      // VẠCH PHÂN CHIA NGANG Ở GIỮA THÂN KHỐI (CHÍNH XÁC NHƯ ẢNH MẪU)
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y);
      ctx.lineTo(m2.x, m2.y); ctx.lineTo(m3.x, m3.y);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    };

    // 3. KHỐI CẦU NGUYÊN TỬ (Atomic Sphere with Electron Orbits)
    const drawAtomSphere = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w, electronAngle, isFollowingMouse } = block;
      const r = w * 0.44;

      ctx.save();
      ctx.translate(x, y);

      const strokeColor = isFollowingMouse
        ? `rgba(240, 171, 252, ${0.98 * alpha})`
        : `rgba(216, 180, 254, ${0.92 * alpha})`;

      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;

      // Hạt nhân cầu kính tím
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * alpha})`);
      grad.addColorStop(0.4, `rgba(192, 132, 252, ${0.55 * alpha})`);
      grad.addColorStop(1, `rgba(147, 51, 234, ${0.3 * alpha})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // 3 vòng elip quỹ đạo nguyên tử
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.8;

      const angles = [0.55, 1.6, 2.7];
      angles.forEach((ang, i) => {
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.85, r * 0.68, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Hạt electron phát sáng
        const pos = electronAngle * (1 + i * 0.35);
        const ex = Math.cos(pos) * (r * 1.85);
        const ey = Math.sin(pos) * (r * 0.68);

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();
    };

    // 4. KHỐI CẦU BÌNH THƯỜNG (Smooth 3D Sphere với vòng kính vĩ độ)
    const drawNormalSphere = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const r = w * 0.48;

      ctx.save();
      ctx.translate(x, y);

      const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
      grad.addColorStop(0, `rgba(245, 208, 254, ${0.85 * alpha})`);
      grad.addColorStop(0.45, `rgba(192, 132, 252, ${0.45 * alpha})`);
      grad.addColorStop(1, `rgba(147, 51, 234, ${0.25 * alpha})`);

      ctx.fillStyle = grad;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.92 * alpha})`;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Đường kính vĩ độ wireframe
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    // 5. KHỐI TAM GIÁC (3D Pyramid Wireframe)
    const drawPyramid = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const s = w * 0.62;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = `rgba(147, 51, 234, ${0.28 * alpha})`;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.92 * alpha})`;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.86, s * 0.6);
      ctx.lineTo(-s * 0.86, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s * 0.3);
      ctx.lineTo(s * 0.86, s * 0.6);
      ctx.moveTo(0, s * 0.3);
      ctx.lineTo(-s * 0.86, s * 0.6);
      ctx.stroke();

      ctx.restore();
    };

    // 6. KHỐI HÌNH BÌNH HÀNH 3D (Parallelogram Wireframe)
    const drawParallelogram = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const pw = w * 0.85;
      const ph = w * 0.58;
      const skew = pw * 0.35;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = `rgba(147, 51, 234, ${0.28 * alpha})`;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.92 * alpha})`;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(-pw / 2 + skew, -ph / 2);
      ctx.lineTo(pw / 2, -ph / 2);
      ctx.lineTo(pw / 2 - skew, ph / 2);
      ctx.lineTo(-pw / 2, ph / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const dOffset = 10;
      ctx.beginPath();
      ctx.moveTo(-pw / 2 + skew + dOffset, -ph / 2 - dOffset);
      ctx.lineTo(pw / 2 + dOffset, -ph / 2 - dOffset);
      ctx.lineTo(pw / 2 - skew + dOffset, ph / 2 - dOffset);
      ctx.stroke();

      ctx.restore();
    };

    // 7. KHỐI HÌNH THANG 3D (Trapezoid Wireframe)
    const drawTrapezoid = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const topW = w * 0.52;
      const botW = w * 0.98;
      const th = w * 0.62;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = `rgba(147, 51, 234, ${0.28 * alpha})`;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.92 * alpha})`;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(-topW / 2, -th / 2);
      ctx.lineTo(topW / 2, -th / 2);
      ctx.lineTo(botW / 2, th / 2);
      ctx.lineTo(-botW / 2, th / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-topW * 0.7, 0);
      ctx.lineTo(topW * 0.7, 0);
      ctx.stroke();

      ctx.restore();
    };

    // ========================================================================
    // CHU TRÌNH RENDER 120 FPS: ĐẢM BẢO ĐÚNG 8S VÀ TIẾN ĐẾN THEO CHUỘT
    // ========================================================================
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = performance.now();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const blocks = blocksRef.current;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const age = now - block.birthTime;

        // ĐÚNG 8 GIÂY: Sau 8 giây (8000ms), khối tắt và sinh ra khối mới ở vị trí ngẫu nhiên
        if (age >= block.lifespan) {
          blocks[i] = spawnBlock(width, height, 0);
          continue;
        }

        // Tính Alpha mượt mà trong chu kỳ 8s:
        // 0.0s -> 0.6s: Hiện dần (Fade in)
        // 0.6s -> 7.4s: Hiện sáng rõ (Full bright)
        // 7.4s -> 8.0s: Tắt dần (Fade out)
        let alpha = 1;
        if (age < 600) {
          alpha = age / 600;
        } else if (age > 7400) {
          alpha = Math.max(0, (8000 - age) / 600);
        }

        // CHUYỂN ĐỘNG:
        if (block.isFollowingMouse) {
          // KHI ẤN CHUỘT: KHỐI TIẾN ĐẾN VÀ ĐI THEO CHUỘT
          block.orbitAngle += 0.03;
          const targetX = mx + Math.cos(block.orbitAngle) * block.orbitRadius;
          const targetY = my + Math.sin(block.orbitAngle) * block.orbitRadius;

          block.vx += (targetX - block.x) * 0.085;
          block.vy += (targetY - block.y) * 0.085;
          block.vx *= 0.88;
          block.vy *= 0.88;
        } else {
          // BÌNH THƯỜNG: BAY LƯỢN TỰ DO QUANH BACKGROUND
          if (block.x < 25) block.vx = Math.abs(block.vx);
          if (block.x > width - 25) block.vx = -Math.abs(block.vx);
          if (block.y < 25) block.vy = Math.abs(block.vy);
          if (block.y > height - 25) block.vy = -Math.abs(block.vy);
        }

        block.x += block.vx;
        block.y += block.vy;

        // Góc xoay 3D
        block.rotX += block.vRotX;
        block.rotY += block.vRotY;
        block.rotZ += block.vRotZ;
        block.electronAngle += 0.05;

        // 1. VẼ AURA KHỐI TÍM (DI CHUYỂN CÙNG VỚI KHỐI)
        drawBlockAura(
          block.x,
          block.y,
          block.height * 0.75,
          alpha,
          block.isFollowingMouse
        );

        // 2. VẼ KHỐI 3D CHUẨN MẪU
        switch (block.type) {
          case 'rect_box':
          case 'cube':
            drawWireframeBox(block, alpha);
            break;
          case 'atom_sphere':
            drawAtomSphere(block, alpha);
            break;
          case 'normal_sphere':
            drawNormalSphere(block, alpha);
            break;
          case 'pyramid':
            drawPyramid(block, alpha);
            break;
          case 'parallelogram':
            drawParallelogram(block, alpha);
            break;
          case 'trapezoid':
            drawTrapezoid(block, alpha);
            break;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none"
      style={{
        contain: 'strict',
        willChange: 'transform',
      }}
    />
  );
};

export default CosmicInteractiveCanvas;
