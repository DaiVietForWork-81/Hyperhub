import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI KHÔNG GIAN 3D SIÊU MƯỢT (ULTRA HIGH-PERFORMANCE / ZERO LAG)
// - Số lượng tinh giản, thanh lịch: 6 khối trên Desktop, 3 khối trên Mobile
// - Phân bố rải rác ở viền màn hình, không chen chúc hay che khuất văn bản
// - Loại bỏ hoàn toàn shadowBlur (triệt tiêu 100% gánh nặng Gaussian Blur của GPU/CPU)
// - Khóa DPR = 1 (giảm 75% tải rasterizer so với DPR 2x trên màn hình Retina / 2K / 4K)
// - Delta-time Throttling ở 60 FPS mượt mà (chống nóng máy trên màn 144Hz - 240Hz)
// - Tự động Pause khi người dùng chuyển Tab (Page Visibility API)
// ============================================================================

type ShapeKind = 'cube' | 'sphere';

interface SpaceShape {
  id: number;
  kind: ShapeKind;
  x: number;
  y: number;
  zDepth: number; // 0.75 -> 1.25
  vx: number;
  vy: number;
  baseSize: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  alpha: number;
  orbitAngle: number;
  orbitSpeed: number;
}

export const SpaceCubeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Tối ưu Context: alpha = true, desynchronized nếu hỗ trợ
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let isPaused = false;
    let lastTime = 0;
    const targetInterval = 1000 / 60; // Khóa 60 FPS tối ưu năng lượng

    // Khóa DPR = 1 để background luôn siêu nhẹ trên mọi màn hình
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

    // 6 Vị trí thanh lịch phân bố ở các rìa không gian
    const isMobile = width < 768;
    const presetShapes: Array<{
      kind: ShapeKind;
      x: number;
      y: number;
      z: number;
      size: number;
    }> = isMobile
      ? [
          // Mobile: Chỉ 3 khối nhẹ nhàng
          { kind: 'cube',   x: 0.12, y: 0.20, z: 1.0, size: 38 },
          { kind: 'sphere', x: 0.85, y: 0.50, z: 0.9, size: 34 },
          { kind: 'cube',   x: 0.20, y: 0.82, z: 1.0, size: 36 },
        ]
      : [
          // Desktop: 6 khối (3 Cube + 3 Sphere) thoáng đãng, tuyệt đẹp
          { kind: 'cube',   x: 0.10, y: 0.18, z: 1.15, size: 46 }, // Trên trái (Hero)
          { kind: 'sphere', x: 0.88, y: 0.22, z: 1.10, size: 44 }, // Trên phải (Hero)
          { kind: 'sphere', x: 0.08, y: 0.52, z: 0.90, size: 38 }, // Giữa trái
          { kind: 'cube',   x: 0.90, y: 0.58, z: 0.95, size: 40 }, // Giữa phải
          { kind: 'sphere', x: 0.82, y: 0.82, z: 1.05, size: 42 }, // Dưới phải
          { kind: 'cube',   x: 0.16, y: 0.86, z: 1.10, size: 44 }, // Dưới trái
        ];

    const shapes: SpaceShape[] = [];

    for (let i = 0; i < presetShapes.length; i++) {
      const p = presetShapes[i];
      const moveAngle = Math.random() * Math.PI * 2;
      const speed = 0.14 + Math.random() * 0.18; // Trôi êm dịu, không giật

      shapes.push({
        id: i,
        kind: p.kind,
        x: p.x * width + (Math.random() - 0.5) * 30,
        y: p.y * height + (Math.random() - 0.5) * 30,
        zDepth: p.z,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        baseSize: p.size,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: 0.003 + (Math.random() - 0.5) * 0.004,
        vRotY: 0.004 + (Math.random() - 0.5) * 0.004,
        vRotZ: 0.002 + (Math.random() - 0.5) * 0.003,
        alpha: 0.55 + p.z * 0.35,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.018 + Math.random() * 0.015,
      });
    }

    // Parallax chuột nhẹ nhàng
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.035;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.035;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Tạm dừng khi chuyển Tab (Tiết kiệm 100% pin/CPU khi không xem trang)
    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Tọa độ chuẩn khối lập phương 3D (Cube)
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

    // Xoay 3D Euler nhanh gọn
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

    // Vẽ vòng tròn 3D tối ưu (16 bước thay vì 32)
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

    // Vòng lặp Render chính với Delta-time Throttling
    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      if (isPaused) return;

      // Throttle ở 60 FPS
      const delta = now - lastTime;
      if (delta < targetInterval) return;
      lastTime = now - (delta % targetInterval);

      // Parallax easing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);
      const fov = 340;

      for (let i = 0; i < shapes.length; i++) {
        const item = shapes[i];

        // Cập nhật vị trí
        item.x += item.vx;
        item.y += item.vy;

        // Xoay 3D
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
        const alpha = Math.min(1, Math.max(0.2, item.alpha));

        // 1. AURA TÍM HUYỀN ẢO XUNG QUANH KHỐI (Không dùng shadow, dùng gradient mềm nhẹ)
        const auraRadius = currentSize * 2.0;
        const auraGrad = ctx.createRadialGradient(
          screenX,
          screenY,
          currentSize * 0.2,
          screenX,
          screenY,
          auraRadius
        );
        auraGrad.addColorStop(0, `rgba(168, 85, 247, ${0.22 * alpha})`);
        auraGrad.addColorStop(0.6, `rgba(139, 92, 246, ${0.08 * alpha})`);
        auraGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. VẼ THEO LOẠI HÌNH: CUBE HOẶC SPHERE
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
            ctx.fillStyle = `rgba(168, 85, 247, ${0.11 * alpha})`;
            ctx.fill();
          }

          // 12 Cạnh wireframe tím neon sáng rõ (Không dùng shadowBlur)
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.80 * alpha})`;

          ctx.beginPath();
          for (let e = 0; e < cubeEdges.length; e++) {
            const [i1, i2] = cubeEdges[e];
            ctx.moveTo(projectedVerts[i1].x, projectedVerts[i1].y);
            ctx.lineTo(projectedVerts[i2].x, projectedVerts[i2].y);
          }
          ctx.stroke();

          // 8 Hạt đỉnh sáng hồng neon
          ctx.fillStyle = `rgba(244, 114, 182, ${0.90 * alpha})`;
          for (let v = 0; v < projectedVerts.length; v++) {
            ctx.beginPath();
            ctx.arc(projectedVerts[v].x, projectedVerts[v].y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // --- VẼ KHỐI CẦU 3D TINH GỌN (SPHERE) ---
          const R = currentSize;

          // Thân quả cầu kính 3D với tâm phản chiếu ánh sáng
          const sphereGrad = ctx.createRadialGradient(
            screenX - R * 0.3,
            screenY - R * 0.3,
            R * 0.1,
            screenX,
            screenY,
            R
          );
          sphereGrad.addColorStop(0, `rgba(216, 180, 254, ${0.28 * alpha})`);
          sphereGrad.addColorStop(0.6, `rgba(168, 85, 247, ${0.12 * alpha})`);
          sphereGrad.addColorStop(1, `rgba(126, 34, 206, ${0.04 * alpha})`);

          ctx.fillStyle = sphereGrad;
          ctx.beginPath();
          ctx.arc(screenX, screenY, R, 0, Math.PI * 2);
          ctx.fill();

          // Viền ngoài khối cầu
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.70 * alpha})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, R, 0, Math.PI * 2);
          ctx.stroke();

          // Xích đạo và Kinh tuyến (chỉ 2 vòng thanh mảnh, 16 steps)
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.55 * alpha})`;
          draw3DCircle(screenX, screenY, R, item.rotX, item.rotY, item.rotZ, fov, 'XZ', 16);
          draw3DCircle(screenX, screenY, R, item.rotX, item.rotY, item.rotZ, fov, 'YZ', 16);

          // Vành đai quỹ đạo quanh quả cầu (18 steps)
          const orbitR = R * 1.38;
          ctx.strokeStyle = `rgba(244, 114, 182, ${0.40 * alpha})`;
          draw3DCircle(screenX, screenY, orbitR, item.rotX + 0.3, item.rotY + 0.4, item.rotZ, fov, 'XZ', 18);

          // Hạt electron phát sáng bay quanh vành đai
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
