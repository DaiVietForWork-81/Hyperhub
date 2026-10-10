import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI HÌNH HỌC 3D WIREFRAME KÍNH TÍM (CHUẨN THEO ẢNH MẪU CỦA NGƯỜI DÙNG)
// - Khối chữ nhật 3D (đứng, có vạch chia ngang giữa y hệt ảnh)
// - Khối vuông 3D (Cube)
// - Cầu nguyên tử (Atomic sphere với vòng electron)
// - Cầu 3D bình thường (Smooth sphere)
// - Khối tam giác 3D (Kim tự tháp / Tetrahedron)
// - Khối hình bình hành 3D (Parallelogram)
// - Khối hình thang 3D (Trapezoid)
//
// ĐẶC TÍNH:
// 1. Mỗi khối tồn tại đúng 8 GIÂY, sau 8 giây tắt và hiện khối mới ở vị trí ngẫu nhiên
// 2. Khi di chuyển, có AURA KHỐI màu tím phát sáng halo xung quanh
// 3. Khi ấn chuột, càng ấn nhiều lần thì CÀNG NHIỀU KHỐI TIẾN ĐẾN VÀ ĐI THEO CHUỘT
// ============================================================================

export type WireframeShapeType =
  | 'rect_box'       // Khối hộp chữ nhật (chuẩn ảnh mẫu)
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
  birthTime: number; // Thời điểm sinh ra (ms)
  lifespan: number;  // Đúng 8000ms (8 giây)
  isFollowingMouse: boolean;
  orbitAngle: number;
  orbitRadius: number;
}

const ALL_SHAPES: WireframeShapeType[] = [
  'rect_box',
  'cube',
  'atom_sphere',
  'normal_sphere',
  'pyramid',
  'parallelogram',
  'trapezoid',
];

export const CosmicInteractiveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Danh sách các khối
  const blocksRef = useRef<WireframeBlock[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    active: false,
  });

  // Số lượng khối được kích hoạt đi theo chuột (tăng dần khi ấn chuột)
  const clickComboCountRef = useRef<number>(0);
  const clickResetTimerRef = useRef<number | null>(null);
  const nextIdRef = useRef<number>(1);

  // Helper: Tạo 1 khối wireframe tím mới tại vị trí ngẫu nhiên
  const spawnBlock = (
    w: number,
    h: number,
    birthTimeOffset = 0,
    forcedType?: WireframeShapeType
  ): WireframeBlock => {
    const type =
      forcedType ?? ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];

    const posX = 60 + Math.random() * (w - 120);
    const posY = 60 + Math.random() * (h - 120);

    const baseSpeed = 0.5 + Math.random() * 0.9;
    const moveAngle = Math.random() * Math.PI * 2;

    const baseSize = 36 + Math.random() * 16;
    const isBox = type === 'rect_box';

    return {
      id: nextIdRef.current++,
      type,
      x: posX,
      y: posY,
      vx: Math.cos(moveAngle) * baseSpeed,
      vy: Math.sin(moveAngle) * baseSpeed,
      width: baseSize,
      height: isBox ? baseSize * 1.45 : baseSize, // Khối chữ nhật cao 1.45x như ảnh mẫu
      depth: baseSize * 0.6,
      rotX: 0.2 + (Math.random() - 0.5) * 0.4,
      rotY: 0.3 + (Math.random() - 0.5) * 0.4,
      rotZ: (Math.random() - 0.5) * 0.2,
      vRotX: (Math.random() - 0.5) * 0.012,
      vRotY: (Math.random() - 0.5) * 0.015,
      vRotZ: (Math.random() - 0.5) * 0.01,
      electronAngle: Math.random() * Math.PI * 2,
      birthTime: performance.now() - birthTimeOffset,
      lifespan: 8000, // Đúng 8 GIÂY để hiện
      isFollowingMouse: false,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitRadius: 45 + Math.random() * 95,
    };
  };

  // Khởi tạo ban đầu với các thời điểm sinh so le nhau trong 8 giây
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const initialCount = 18; // Số lượng khối trên màn hình
    const list: WireframeBlock[] = [];

    for (let i = 0; i < initialCount; i++) {
      // Phân bổ birthTime so le trong khoảng 8000ms để không tắt đồng loạt
      const offset = (i / initialCount) * 8000;
      const type = ALL_SHAPES[i % ALL_SHAPES.length];
      list.push(spawnBlock(w, h, offset, type));
    }

    blocksRef.current = list;
  }, []);

  // Bắt sự kiện ấn chuột: Càng ấn nhiều lần -> Càng nhiều khối tiến đến đi theo chuột
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Chỉ nhận chuột trái
      if (e.button !== 0) return;

      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;

      // Mỗi lần ấn chuột -> Tăng số lượng khối đi theo chuột
      clickComboCountRef.current += 1;
      const clicks = clickComboCountRef.current;

      // Tính số khối bị hút theo số lần click:
      // 1 click: 2 khối
      // 2 clicks: 5 khối
      // 3 clicks: 9 khối
      // 4+ clicks: toàn bộ các khối trên màn hình!
      const targetFollowerCount = Math.min(
        blocksRef.current.length,
        clicks <= 1 ? 2 : clicks === 2 ? 5 : clicks === 3 ? 9 : blocksRef.current.length
      );

      // Sắp xếp các khối theo khoảng cách tới chuột để các khối gần nhất tiến đến trước
      const mx = e.clientX;
      const my = e.clientY;
      const sorted = [...blocksRef.current].sort((a, b) => {
        const da = Math.hypot(a.x - mx, a.y - my);
        const db = Math.hypot(b.x - mx, b.y - my);
        return da - db;
      });

      // Gán trạng thái theo dõi chuột
      const followersSet = new Set(
        sorted.slice(0, targetFollowerCount).map((b) => b.id)
      );

      blocksRef.current.forEach((b) => {
        if (followersSet.has(b.id)) {
          b.isFollowingMouse = true;
        }
      });

      // Reset timer: Sau 3.5 giây không ấn chuột nữa, số lượng khối theo chuột sẽ từ từ giảm về 0
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

  // Main Canvas Render Loop (60 - 120 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // ========================================================================
    // HÀM VẼ AURA KHỐI TÍM (Hào quang tím bao quanh và di chuyển cùng khối)
    // ========================================================================
    const drawBlockAura = (
      x: number,
      y: number,
      radius: number,
      alpha: number,
      isFollowing: boolean
    ) => {
      ctx.save();
      const auraRad = isFollowing ? radius * 1.9 : radius * 1.5;
      const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, auraRad);

      const auraIntensity = isFollowing ? 0.65 : 0.38;
      grad.addColorStop(0, `rgba(192, 132, 252, ${auraIntensity * alpha})`);
      grad.addColorStop(0.5, `rgba(147, 51, 234, ${0.2 * alpha})`);
      grad.addColorStop(1, 'rgba(147, 51, 234, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, auraRad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // ========================================================================
    // HÀM VẼ CÁC KHỐI THEO PHONG CÁCH ẢNH MẪU (Translucent Purple + Neon Edges)
    // ========================================================================

    // 1. KHỐI HỘP CHỮ NHẬT / VUÔNG 3D (ĐÚNG Y HỆT ẢNH MẪU NGƯỜI DÙNG TẢI LÊN)
    // Có vạch chia ngang ở giữa, kính tím trong suốt, viền tím sáng!
    const drawWireframeBox = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w, height: h, depth: d, rotX, rotY, isFollowingMouse } = block;

      ctx.save();
      ctx.translate(x, y);

      // Phối cảnh 3D góc nhìn
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // 8 đỉnh của khối hộp chữ nhật 3D
      const hw = w * 0.5;
      const hh = h * 0.5;
      const hd = d * 0.5;

      const project = (px: number, py: number, pz: number) => {
        // Xoay Y
        const x1 = px * cosY + pz * sinY;
        const z1 = -px * sinY + pz * cosY;
        // Xoay X
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

      // Điểm giữa của các cạnh dọc (Vạch chia ngang ở giữa như ảnh mẫu)
      const m0 = project(-hw, 0, -hd);
      const m1 = project(hw, 0, -hd);
      const m2 = project(hw, 0, hd);
      const m3 = project(-hw, 0, hd);

      // Màu sắc chuẩn ảnh mẫu: Kính tím bán trong suốt + viền neon tím rực rỡ
      const strokeColor = isFollowingMouse
        ? `rgba(232, 121, 249, ${0.95 * alpha})`
        : `rgba(216, 180, 254, ${0.85 * alpha})`;
      const fillColor = `rgba(147, 51, 234, ${0.18 * alpha})`;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = isFollowingMouse ? 16 : 10;

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

      // Mặt sau (nhìn xuyên qua được kính trong suốt)
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4 cạnh nối mặt trước và mặt sau
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p4.x, p4.y);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p5.x, p5.y);
      ctx.moveTo(p2.x, p2.y); ctx.lineTo(p6.x, p6.y);
      ctx.moveTo(p3.x, p3.y); ctx.lineTo(p7.x, p7.y);
      ctx.stroke();

      // VẠCH PHÂN CHIA NGANG Ở GIỮA (ĐÚNG Y HỆT ẢNH MẪU NGƯỜI DÙNG TẢI LÊN!)
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y);
      ctx.lineTo(m2.x, m2.y); ctx.lineTo(m3.x, m3.y);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    };

    // 2. KHỐI CẦU NGUYÊN TỬ (Atomic Sphere with Electron Rings)
    const drawAtomSphere = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w, electronAngle, isFollowingMouse } = block;
      const r = w * 0.42;

      ctx.save();
      ctx.translate(x, y);

      const strokeColor = isFollowingMouse
        ? `rgba(232, 121, 249, ${0.95 * alpha})`
        : `rgba(216, 180, 254, ${0.85 * alpha})`;

      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;

      // Hạt nhân cầu kính tím bên trong
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * alpha})`);
      grad.addColorStop(0.4, `rgba(192, 132, 252, ${0.45 * alpha})`);
      grad.addColorStop(1, `rgba(147, 51, 234, ${0.2 * alpha})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Vòng quỹ đạo nguyên tử 1 & 2
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.3;

      const angles = [0.55, 2.1];
      angles.forEach((ang, i) => {
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.8, r * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Hạt electron phát sáng xoay quanh
        const pos = electronAngle * (1 + i * 0.4);
        const ex = Math.cos(pos) * (r * 1.8);
        const ey = Math.sin(pos) * (r * 0.65);

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();
    };

    // 3. KHỐI CẦU BÌNH THƯỜNG (Smooth 3D Sphere với vòng kính vĩ tuyến)
    const drawNormalSphere = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const r = w * 0.48;

      ctx.save();
      ctx.translate(x, y);

      const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 0, 0, 0, r);
      grad.addColorStop(0, `rgba(245, 208, 254, ${0.75 * alpha})`);
      grad.addColorStop(0.45, `rgba(192, 132, 252, ${0.35 * alpha})`);
      grad.addColorStop(1, `rgba(147, 51, 234, ${0.15 * alpha})`);

      ctx.fillStyle = grad;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.85 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Đường kính vĩ độ wireframe bên trong
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    // 4. KHỐI TAM GIÁC (3D Pyramid / Tetrahedron Wireframe)
    const drawPyramid = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const s = w * 0.6;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = `rgba(147, 51, 234, ${0.18 * alpha})`;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.85 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;

      // Mặt trước
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.86, s * 0.6);
      ctx.lineTo(-s * 0.86, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Đỉnh nối tâm đáy
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s * 0.3);
      ctx.lineTo(s * 0.86, s * 0.6);
      ctx.moveTo(0, s * 0.3);
      ctx.lineTo(-s * 0.86, s * 0.6);
      ctx.stroke();

      ctx.restore();
    };

    // 5. KHỐI HÌNH BÌNH HÀNH 3D (Parallelogram Wireframe)
    const drawParallelogram = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const pw = w * 0.8;
      const ph = w * 0.55;
      const skew = pw * 0.35;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = `rgba(147, 51, 234, ${0.18 * alpha})`;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.85 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;

      // Mặt trước
      ctx.beginPath();
      ctx.moveTo(-pw / 2 + skew, -ph / 2);
      ctx.lineTo(pw / 2, -ph / 2);
      ctx.lineTo(pw / 2 - skew, ph / 2);
      ctx.lineTo(-pw / 2, ph / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Chiều sâu 3D phía sau
      const dOffset = 8;
      ctx.beginPath();
      ctx.moveTo(-pw / 2 + skew + dOffset, -ph / 2 - dOffset);
      ctx.lineTo(pw / 2 + dOffset, -ph / 2 - dOffset);
      ctx.lineTo(pw / 2 - skew + dOffset, ph / 2 - dOffset);
      ctx.stroke();

      ctx.restore();
    };

    // 6. KHỐI HÌNH THANG 3D (Trapezoid Wireframe)
    const drawTrapezoid = (block: WireframeBlock, alpha: number) => {
      const { x, y, width: w } = block;
      const topW = w * 0.5;
      const botW = w * 0.95;
      const th = w * 0.6;

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = `rgba(147, 51, 234, ${0.18 * alpha})`;
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.85 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(-topW / 2, -th / 2);
      ctx.lineTo(topW / 2, -th / 2);
      ctx.lineTo(botW / 2, th / 2);
      ctx.lineTo(-botW / 2, th / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vạch ngang bên trong
      ctx.beginPath();
      ctx.moveTo(-topW * 0.7, 0);
      ctx.lineTo(topW * 0.7, 0);
      ctx.stroke();

      ctx.restore();
    };

    // ========================================================================
    // CHU TRÌNH RENDER LIÊN TỤC (TÍNH TOÁN 8 GIÂY & ĐI THEO CHUỘT)
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

        // KIỂM TRA ĐÚNG 8 GIÂY: Sau 8 giây thì tắt và hiện khối mới ở vị trí ngẫu nhiên
        if (age >= block.lifespan) {
          blocks[i] = spawnBlock(width, height, 0);
          continue;
        }

        // Tính độ mờ Alpha mượt mà:
        // 0.0s -> 0.7s: Hiện dần (Fade in)
        // 0.7s -> 7.3s: Hiện rõ (Full opacity)
        // 7.3s -> 8.0s: Tắt dần (Fade out)
        let alpha = 1;
        if (age < 700) {
          alpha = age / 700;
        } else if (age > 7300) {
          alpha = Math.max(0, (8000 - age) / 700);
        }

        // CHUYỂN ĐỘNG:
        if (block.isFollowingMouse) {
          // KHI ẤN CHUỘT: KHỐI TIẾN ĐẾN VÀ ĐI THEO CHUỘT
          block.orbitAngle += 0.025;
          const targetX = mx + Math.cos(block.orbitAngle) * block.orbitRadius;
          const targetY = my + Math.sin(block.orbitAngle) * block.orbitRadius;

          block.vx += (targetX - block.x) * 0.08;
          block.vy += (targetY - block.y) * 0.08;
          block.vx *= 0.86;
          block.vy *= 0.86;
        } else {
          // BÌNH THƯỜNG: BAY LƯỢN ÊM Ả KHẮP TRANG WEB
          // Bật nảy nhẹ khi chạm mép màn hình
          if (block.x < 30) block.vx = Math.abs(block.vx);
          if (block.x > width - 30) block.vx = -Math.abs(block.vx);
          if (block.y < 30) block.vy = Math.abs(block.vy);
          if (block.y > height - 30) block.vy = -Math.abs(block.vy);
        }

        block.x += block.vx;
        block.y += block.vy;

        // Xoay 3D nhẹ nhàng
        block.rotX += block.vRotX;
        block.rotY += block.vRotY;
        block.rotZ += block.vRotZ;
        block.electronAngle += 0.05;

        // VẼ AURA KHỐI TÍM (DI CHUYỂN CÙNG VỚI KHỐI)
        drawBlockAura(
          block.x,
          block.y,
          block.height * 0.7,
          alpha,
          block.isFollowingMouse
        );

        // VẼ KHỐI 3D CHUẨN MẪU THEO TỪNG LOẠI HÌNH
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
      window.removeEventListener('resize', handleResize);
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
