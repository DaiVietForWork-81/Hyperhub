import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI KHÔNG GIAN 3D: CUBE & SPHERE (8 KHỐI - 8S LIFECYCLE - ZERO LAG)
// - Đúng 8 khối không gian (4 Cube + 4 Sphere) luân phiên hiển thị nền
// - Vòng đời mỗi khối: đúng 8 giây (Fade in 1s -> Duy trì 6s -> Fade out 1s -> Tắt)
// - Sau 8s, khối cũ tắt hoàn toàn và 1 khối mới spawn ở vị trí ngẫu nhiên
// - Khởi tạo lệch pha 1 giây: chuyển động liên tục, êm dịu, không chớp giật
// - Parallax nhẹ nhàng theo con trỏ chuột khi lướt web (không cần bấm chuột)
// - Aura tím huyền ảo di chuyển đồng bộ cùng từng khối
// - Tối ưu hiệu năng cao: Không dùng shadowBlur, khóa DPR=1, 60 FPS Throttling
// ============================================================================

type ShapeKind = 'cube' | 'sphere';

interface SpaceShape {
  id: number;
  kind: ShapeKind;
  x: number;
  y: number;
  zDepth: number;
  vx: number;
  vy: number;
  baseSize: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  baseAlpha: number;
  birthTime: number; // Timestamp lúc sinh ra
  orbitAngle: number;
  orbitSpeed: number;
}

const LIFETIME_MS = 8000; // Đúng 8 giây mỗi khối
const FADE_MS = 1000;     // 1 giây đầu Fade in, 1 giây cuối Fade out
const TOTAL_SHAPES = 8;   // Đúng 8 khối

export const SpaceCubeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
  }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let isPaused = false;
    let lastTime = 0;
    const targetInterval = 1000 / 60; // 60 FPS

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Hàm tạo mới hoặc tái sinh một khối tại vị trí ngẫu nhiên
    const spawnShape = (id: number, birthOffsetMs = 0): SpaceShape => {
      const kind: ShapeKind = id % 2 === 0 ? 'cube' : 'sphere';
      const moveAngle = Math.random() * Math.PI * 2;
      const speed = 0.16 + Math.random() * 0.22;
      const zDepth = 0.8 + Math.random() * 0.45;

      return {
        id,
        kind,
        x: Math.random() * width,
        y: Math.random() * height,
        zDepth,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        baseSize: 38 + Math.random() * 12,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: 0.003 + (Math.random() - 0.5) * 0.004,
        vRotY: 0.004 + (Math.random() - 0.5) * 0.004,
        vRotZ: 0.002 + (Math.random() - 0.5) * 0.003,
        baseAlpha: 0.65 + zDepth * 0.3,
        birthTime: performance.now() - birthOffsetMs,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.02 + Math.random() * 0.015,
      };
    };

    // Khởi tạo 8 khối với thời gian lệch pha nhau đúng 1 giây
    const shapes: SpaceShape[] = [];
    for (let i = 0; i < TOTAL_SHAPES; i++) {
      shapes.push(spawnShape(i, i * (LIFETIME_MS / TOTAL_SHAPES)));
    }

    // Parallax di chuyển chuột nhẹ nhàng (không bắt sự kiện click)
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.035;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.035;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Tự động tạm dừng khi ẩn tab
    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Dữ liệu đỉnh & cạnh Cube 3D
    const unitCubeVertices = [
      [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1],
      [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1],
    ];

    const cubeFaces = [
      [0, 1, 2, 3], // Sau
      [4, 5, 6, 7], // Trước
      [0, 1, 5, 4], // Đáy
      [2, 3, 7, 6], // Đỉnh
      [0, 3, 7, 4], // Trái
      [1, 2, 6, 5], // Phải
    ];

    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    // Xoay 3D Euler
    const rotate3D = (
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number
    ): [number, number, number] => {
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      const y1 = y * cx - z * sx;
      const z1 = y * sx + z * cx;

      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;

      const cz = Math.cos(rz);
      const sz = Math.sin(rz);
      const x3 = x2 * cz - y1 * sz;
      const y3 = x2 * sz + y1 * cz;

      return [x3, y3, z2];
    };

    // Vẽ vòng tròn 3D tối ưu (16 bước)
    const draw3DCircle = (
      screenX: number,
      screenY: number,
      radius: number,
      rx: number,
      ry: number,
      rz: number,
      fov: number,
      plane: 'XZ' | 'YZ',
      steps = 16
    ) => {
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        const lx = plane === 'XZ' ? radius * Math.cos(theta) : 0;
        const ly = plane === 'YZ' ? radius * Math.cos(theta) : 0;
        const lz = radius * Math.sin(theta);

        const [rotXVal, rotYVal, rotZVal] = rotate3D(lx, ly, lz, rx, ry, rz);
        const scale = fov / (fov + rotZVal);
        const px = screenX + rotXVal * scale;
        const py = screenY + rotYVal * scale;

        if (s === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    };

    // Vòng lặp Render chính
    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      if (isPaused) return;

      const delta = now - lastTime;
      if (delta < targetInterval) return;
      lastTime = now - (delta % targetInterval);

      // Parallax chuột mượt mà
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);
      const fov = 340;

      for (let i = 0; i < shapes.length; i++) {
        let item = shapes[i];

        // 1. KIỂM TRA VÒNG ĐỜI (8 GIÂY)
        const age = now - item.birthTime;
        if (age >= LIFETIME_MS) {
          // Sau đúng 8s, khối cũ tắt và spawn khối mới ở vị trí ngẫu nhiên
          shapes[i] = spawnShape(item.id, 0);
          item = shapes[i];
        }

        // Tính toán độ mờ (Fade In 1s đầu -> 100% -> Fade Out 1s cuối)
        const currentAge = now - item.birthTime;
        let fadeFactor = 1;
        if (currentAge < FADE_MS) {
          fadeFactor = currentAge / FADE_MS;
        } else if (currentAge > LIFETIME_MS - FADE_MS) {
          fadeFactor = Math.max(0, (LIFETIME_MS - currentAge) / FADE_MS);
        }
        fadeFactor = fadeFactor * fadeFactor * (3 - 2 * fadeFactor);
        const alpha = Math.min(1, Math.max(0.01, item.baseAlpha * fadeFactor));

        if (alpha <= 0.01) continue;

        // 2. CHUYỂN ĐỘNG TRÔI TỰ NHIÊN
        item.x += item.vx;
        item.y += item.vy;
        item.rotX += item.vRotX;
        item.rotY += item.vRotY;
        item.rotZ += item.vRotZ;
        item.orbitAngle += item.orbitSpeed;

        // Wrap màn hình
        const margin = 70;
        if (item.x < -margin) item.x = width + margin;
        if (item.x > width + margin) item.x = -margin;
        if (item.y < -margin) item.y = height + margin;
        if (item.y > height + margin) item.y = -margin;

        // Tọa độ màn hình + Parallax
        const screenX = item.x + px * item.zDepth;
        const screenY = item.y + py * item.zDepth;
        const currentSize = (item.baseSize * item.zDepth) / 2;

        // 3. AURA TÍM HUYỀN ẢO DI CHUYỂN THEO KHỐI
        const auraRadius = currentSize * 2.2;
        const auraGrad = ctx.createRadialGradient(
          screenX,
          screenY,
          currentSize * 0.15,
          screenX,
          screenY,
          auraRadius
        );
        auraGrad.addColorStop(0, `rgba(168, 85, 247, ${0.28 * alpha})`);
        auraGrad.addColorStop(0.55, `rgba(139, 92, 246, ${0.10 * alpha})`);
        auraGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 4. VẼ THEO LOẠI HÌNH: CUBE HOẶC SPHERE
        if (item.kind === 'cube') {
          // --- VẼ KHỐI LẬP PHƯƠNG 3D ---
          const projectedVerts: Array<{ x: number; y: number; z: number }> = [];

          for (let v = 0; v < unitCubeVertices.length; v++) {
            const uv = unitCubeVertices[v];
            const [rx, ry, rz] = rotate3D(
              uv[0] * currentSize,
              uv[1] * currentSize,
              uv[2] * currentSize,
              item.rotX,
              item.rotY,
              item.rotZ
            );

            const scale = fov / (fov + rz);
            projectedVerts.push({
              x: screenX + rx * scale,
              y: screenY + ry * scale,
              z: rz,
            });
          }

          // Vẽ 6 mặt kính mờ màu tím
          for (let fi = 0; fi < cubeFaces.length; fi++) {
            const face = cubeFaces[fi];
            const p0 = projectedVerts[face[0]];
            const p1 = projectedVerts[face[1]];
            const p2 = projectedVerts[face[2]];
            const p3 = projectedVerts[face[3]];

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fillStyle = `rgba(168, 85, 247, ${0.12 * alpha})`;
            ctx.fill();
          }

          // 12 Cạnh wireframe tím neon sáng
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.82 * alpha})`;

          ctx.beginPath();
          for (let e = 0; e < cubeEdges.length; e++) {
            const [i1, i2] = cubeEdges[e];
            ctx.moveTo(projectedVerts[i1].x, projectedVerts[i1].y);
            ctx.lineTo(projectedVerts[i2].x, projectedVerts[i2].y);
          }
          ctx.stroke();

          // 8 Hạt đỉnh hồng phát sáng
          ctx.fillStyle = `rgba(244, 114, 182, ${0.92 * alpha})`;
          for (let v = 0; v < projectedVerts.length; v++) {
            ctx.beginPath();
            ctx.arc(projectedVerts[v].x, projectedVerts[v].y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // --- VẼ KHỐI CẦU 3D TINH GỌN (SPHERE) ---
          const R = currentSize;

          // Thân quả cầu kính 3D
          const sphereGrad = ctx.createRadialGradient(
            screenX - R * 0.3,
            screenY - R * 0.3,
            R * 0.1,
            screenX,
            screenY,
            R
          );
          sphereGrad.addColorStop(0, `rgba(216, 180, 254, ${0.30 * alpha})`);
          sphereGrad.addColorStop(0.6, `rgba(168, 85, 247, ${0.14 * alpha})`);
          sphereGrad.addColorStop(1, `rgba(126, 34, 206, ${0.05 * alpha})`);

          ctx.fillStyle = sphereGrad;
          ctx.beginPath();
          ctx.arc(screenX, screenY, R, 0, Math.PI * 2);
          ctx.fill();

          // Viền ngoài khối cầu
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.72 * alpha})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, R, 0, Math.PI * 2);
          ctx.stroke();

          // Xích đạo và Kinh tuyến
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.58 * alpha})`;
          draw3DCircle(screenX, screenY, R, item.rotX, item.rotY, item.rotZ, fov, 'XZ', 16);
          draw3DCircle(screenX, screenY, R, item.rotX, item.rotY, item.rotZ, fov, 'YZ', 16);

          // Vành đai quỹ đạo quanh quả cầu
          const orbitR = R * 1.38;
          ctx.strokeStyle = `rgba(244, 114, 182, ${0.42 * alpha})`;
          draw3DCircle(screenX, screenY, orbitR, item.rotX + 0.3, item.rotY + 0.4, item.rotZ, fov, 'XZ', 18);

          // Hạt electron phát sáng bay trên vành đai
          const elX = orbitR * Math.cos(item.orbitAngle);
          const elZ = orbitR * Math.sin(item.orbitAngle);
          const [rotElX, rotElY, rotElZ] = rotate3D(elX, 0, elZ, item.rotX + 0.3, item.rotY + 0.4, item.rotZ);
          const elScale = fov / (fov + rotElZ);
          const elScreenX = screenX + rotElX * elScale;
          const elScreenY = screenY + rotElY * elScale;

          ctx.fillStyle = `rgba(255, 182, 255, ${0.95 * alpha})`;
          ctx.beginPath();
          ctx.arc(elScreenX, elScreenY, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none"
      style={{
        contain: 'strict',
      }}
    />
  );
};

export default SpaceCubeBackground;
