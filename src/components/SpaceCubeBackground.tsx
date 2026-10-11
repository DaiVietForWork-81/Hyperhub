import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI KHÔNG GIAN 3D: CUBE (LẬP PHƯƠNG) & SPHERE (HÌNH CẦU)
// - Số lượng vừa vặn: 15 khối không gian (8 Lập phương + 7 Hình cầu)
// - Phân bổ tự nhiên khắp background theo các tầng chiều sâu (zDepth)
// - Khối lập phương: 3D Perspective, 8 đỉnh, 12 cạnh wireframe, 6 mặt kính tím
// - Khối cầu 3D: Mặt cầu thủy tinh tím đổ bóng 3D, hệ kinh - vĩ tuyến quay không gian,
//   kèm vành đai quỹ đạo electron lấp lánh quay quanh
// - Aura tím huyền ảo di chuyển đồng bộ cùng từng khối
// - Parallax tương tác nhẹ nhàng theo con trỏ chuột
// - Tối ưu 60 - 120 FPS, pointer-events-none, không che khuất chữ
// ============================================================================

type ShapeKind = 'cube' | 'sphere';

interface SpaceShape {
  id: number;
  kind: ShapeKind;
  x: number;
  y: number;
  zDepth: number; // 0.6 (xa) -> 1.35 (gần)
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

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // 15 Vị trí cân đối trải đều không gian: 8 Khối lập phương + 7 Khối cầu
    const presetShapes: Array<{
      kind: ShapeKind;
      x: number;
      y: number;
      z: number;
      size: number;
    }> = [
      // 1. Tầng Hero (Góc trên)
      { kind: 'cube',   x: 0.10, y: 0.16, z: 1.15, size: 48 }, // Trên trái (Cube)
      { kind: 'sphere', x: 0.88, y: 0.18, z: 1.25, size: 50 }, // Trên phải (Sphere)
      { kind: 'sphere', x: 0.48, y: 0.10, z: 0.70, size: 30 }, // Đỉnh giữa nền xa (Sphere)

      // 2. Tầng Countdown & Giữa trang
      { kind: 'cube',   x: 0.24, y: 0.35, z: 0.80, size: 34 }, // Giữa trái (Cube)
      { kind: 'sphere', x: 0.76, y: 0.36, z: 0.95, size: 40 }, // Giữa phải (Sphere)
      { kind: 'cube',   x: 0.92, y: 0.48, z: 1.10, size: 46 }, // Biên phải giữa (Cube)
      { kind: 'sphere', x: 0.08, y: 0.52, z: 1.20, size: 48 }, // Biên trái giữa (Sphere)

      // 3. Tầng Trung tâm & Thẻ đề thi
      { kind: 'cube',   x: 0.38, y: 0.58, z: 0.75, size: 32 }, // Trung tâm trái xa (Cube)
      { kind: 'cube',   x: 0.62, y: 0.64, z: 0.85, size: 36 }, // Trung tâm phải (Cube)
      { kind: 'sphere', x: 0.85, y: 0.72, z: 1.05, size: 42 }, // Phía dưới phải (Sphere)

      // 4. Tầng Dưới & Cộng đồng
      { kind: 'cube',   x: 0.14, y: 0.75, z: 1.10, size: 44 }, // Dưới trái (Cube)
      { kind: 'sphere', x: 0.34, y: 0.84, z: 0.75, size: 32 }, // Dưới giữa trái (Sphere)
      { kind: 'cube',   x: 0.68, y: 0.86, z: 0.90, size: 38 }, // Dưới giữa phải (Cube)

      // 5. Tầng Chân trang (Footer)
      { kind: 'sphere', x: 0.18, y: 0.94, z: 1.05, size: 42 }, // Chân trang trái (Sphere)
      { kind: 'cube',   x: 0.84, y: 0.93, z: 1.15, size: 46 }, // Chân trang phải (Cube)
    ];

    const shapes: SpaceShape[] = [];

    for (let i = 0; i < presetShapes.length; i++) {
      const p = presetShapes[i];
      const moveAngle = Math.random() * Math.PI * 2;
      const speed = 0.18 + Math.random() * 0.28; // Tốc độ trôi êm ái

      shapes.push({
        id: i,
        kind: p.kind,
        x: p.x * width + (Math.random() - 0.5) * 50,
        y: p.y * height + (Math.random() - 0.5) * 50,
        zDepth: p.z,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        baseSize: p.size,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: 0.003 + (Math.random() - 0.5) * 0.005,
        vRotY: 0.004 + (Math.random() - 0.5) * 0.006,
        vRotZ: 0.002 + (Math.random() - 0.5) * 0.004,
        alpha: 0.45 + p.z * 0.35,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.02 + Math.random() * 0.02,
      });
    }

    // Parallax tương tác nhẹ nhàng theo chuột
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.04;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.04;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Khung chuẩn Khối lập phương 3D (Cube)
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

    // Hàm xoay Euler 3D
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

    // Hàm vẽ một đường tròn xoay 3D (dùng cho các vĩ tuyến & kinh tuyến của khối cầu)
    const draw3DCircle = (
      screenX: number,
      screenY: number,
      radius: number,
      yOffset: number,
      rx: number,
      ry: number,
      rz: number,
      fov: number,
      plane: 'XZ' | 'YZ' | 'XY',
      steps = 28
    ) => {
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        let lx = 0;
        let ly = 0;
        let lz = 0;

        if (plane === 'XZ') {
          lx = radius * Math.cos(theta);
          ly = yOffset;
          lz = radius * Math.sin(theta);
        } else if (plane === 'YZ') {
          lx = yOffset;
          ly = radius * Math.cos(theta);
          lz = radius * Math.sin(theta);
        } else {
          lx = radius * Math.cos(theta);
          ly = radius * Math.sin(theta);
          lz = yOffset;
        }

        const [rotXVal, rotYVal, rotZVal] = rotate3D(lx, ly, lz, rx, ry, rz);
        const scale = fov / Math.max(fov + rotZVal, 50);
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

    // Vòng lặp Render chuẩn 60-120 FPS
    const render = () => {
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

        // Wrap quanh màn hình
        const margin = 80;
        if (item.x < -margin) item.x = width + margin;
        if (item.x > width + margin) item.x = -margin;
        if (item.y < -margin) item.y = height + margin;
        if (item.y > height + margin) item.y = -margin;

        // Tọa độ trên màn hình kèm Parallax
        const screenX = item.x + px * item.zDepth;
        const screenY = item.y + py * item.zDepth;
        const currentSize = (item.baseSize * item.zDepth) / 2;
        const alpha = Math.min(1, Math.max(0.2, item.alpha));

        // 1. AURA TÍM HUYỀN ẢO XUNG QUANH KHỐI
        const auraRadius = currentSize * 2.3;
        const auraGrad = ctx.createRadialGradient(
          screenX,
          screenY,
          currentSize * 0.15,
          screenX,
          screenY,
          auraRadius
        );
        auraGrad.addColorStop(0, `rgba(168, 85, 247, ${0.26 * alpha})`);
        auraGrad.addColorStop(0.5, `rgba(139, 92, 246, ${0.10 * alpha})`);
        auraGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. VẼ THEO LOẠI HÌNH: CUBE HOẶC SPHERE (HÌNH CẦU)
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

            const scale = fov / Math.max(fov + rz, 50);
            projectedVerts.push({
              x: screenX + rx * scale,
              y: screenY + ry * scale,
              z: rz,
            });
          }

          // Vẽ mặt kính tím từ xa đến gần
          const faceDepths = cubeFaces.map((faceIndices, idx) => {
            let sumZ = 0;
            for (let fi = 0; fi < 4; fi++) {
              sumZ += projectedVerts[faceIndices[fi]].z;
            }
            return { index: idx, face: faceIndices, avgZ: sumZ / 4 };
          });

          faceDepths.sort((a, b) => a.avgZ - b.avgZ);

          for (let fi = 0; fi < faceDepths.length; fi++) {
            const { face, avgZ } = faceDepths[fi];
            const p0 = projectedVerts[face[0]];
            const p1 = projectedVerts[face[1]];
            const p2 = projectedVerts[face[2]];
            const p3 = projectedVerts[face[3]];

            const faceAlpha = Math.max(0.04, Math.min(0.22, 0.12 + (avgZ / currentSize) * 0.08)) * alpha;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fillStyle = `rgba(168, 85, 247, ${faceAlpha})`;
            ctx.fill();
          }

          // Cạnh wireframe tím neon
          ctx.save();
          ctx.lineWidth = item.zDepth > 1.0 ? 1.6 : 1.2;
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.75 * alpha})`;
          ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
          ctx.shadowBlur = item.zDepth > 1.0 ? 8 : 4;

          ctx.beginPath();
          for (let e = 0; e < cubeEdges.length; e++) {
            const [i1, i2] = cubeEdges[e];
            ctx.moveTo(projectedVerts[i1].x, projectedVerts[i1].y);
            ctx.lineTo(projectedVerts[i2].x, projectedVerts[i2].y);
          }
          ctx.stroke();
          ctx.restore();

          // Hạt đỉnh 3D phát sáng
          ctx.fillStyle = `rgba(244, 114, 182, ${0.85 * alpha})`;
          const dotRadius = item.zDepth > 1.0 ? 1.8 : 1.2;
          for (let v = 0; v < projectedVerts.length; v++) {
            ctx.beginPath();
            ctx.arc(projectedVerts[v].x, projectedVerts[v].y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // --- VẼ KHỐI CẦU KHÔNG GIAN 3D (SPHERE) ---
          const R = currentSize;

          // 1. Thân quả cầu kính tím 3D với tâm phản chiếu ánh sáng
          const sphereGrad = ctx.createRadialGradient(
            screenX - R * 0.32,
            screenY - R * 0.32,
            R * 0.1,
            screenX,
            screenY,
            R
          );
          sphereGrad.addColorStop(0, `rgba(216, 180, 254, ${0.30 * alpha})`);
          sphereGrad.addColorStop(0.55, `rgba(168, 85, 247, ${0.14 * alpha})`);
          sphereGrad.addColorStop(1, `rgba(126, 34, 206, ${0.05 * alpha})`);

          ctx.fillStyle = sphereGrad;
          ctx.beginPath();
          ctx.arc(screenX, screenY, R, 0, Math.PI * 2);
          ctx.fill();

          // 2. Viền ngoài phát sáng của khối cầu
          ctx.save();
          ctx.lineWidth = item.zDepth > 1.0 ? 1.6 : 1.2;
          ctx.strokeStyle = `rgba(216, 180, 254, ${0.65 * alpha})`;
          ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
          ctx.shadowBlur = item.zDepth > 1.0 ? 7 : 4;
          ctx.beginPath();
          ctx.arc(screenX, screenY, R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 3. Hệ thống Kinh tuyến & Vĩ tuyến quay 3D chuẩn hình học không gian
          ctx.save();
          ctx.lineWidth = item.zDepth > 1.0 ? 1.2 : 0.9;
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.55 * alpha})`;

          // Xích đạo (Equator)
          draw3DCircle(screenX, screenY, R, 0, item.rotX, item.rotY, item.rotZ, fov, 'XZ');

          // Kinh tuyến 1 (Meridian 1)
          draw3DCircle(screenX, screenY, R, 0, item.rotX, item.rotY, item.rotZ, fov, 'YZ');

          // Kinh tuyến 2 (Meridian 2)
          draw3DCircle(screenX, screenY, R, 0, item.rotX, item.rotY, item.rotZ, fov, 'XY');

          // 2 Vĩ tuyến Bắc & Nam (Parallel Latitude Rings)
          const latR = R * Math.cos(Math.PI / 4); // ~0.707 R
          const latY = R * Math.sin(Math.PI / 4);
          draw3DCircle(screenX, screenY, latR, latY, item.rotX, item.rotY, item.rotZ, fov, 'XZ', 20);
          draw3DCircle(screenX, screenY, latR, -latY, item.rotX, item.rotY, item.rotZ, fov, 'XZ', 20);
          ctx.restore();

          // 4. Vành đai Quỹ đạo Electron bao quanh khối cầu (Celestial Orbit Ring)
          ctx.save();
          const orbitR = R * 1.42;
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = `rgba(244, 114, 182, ${0.45 * alpha})`;
          ctx.setLineDash([4, 4]); // Đường nét đứt công nghệ cao
          draw3DCircle(screenX, screenY, orbitR, 0, item.rotX + 0.35, item.rotY + 0.45, item.rotZ, fov, 'XZ', 32);
          ctx.restore();

          // Hạt electron phát sáng bay quanh vành đai quỹ đạo
          const elX = orbitR * Math.cos(item.orbitAngle);
          const elZ = orbitR * Math.sin(item.orbitAngle);
          const [rotElX, rotElY, rotElZ] = rotate3D(elX, 0, elZ, item.rotX + 0.35, item.rotY + 0.45, item.rotZ);
          const elScale = fov / Math.max(fov + rotElZ, 50);
          const elScreenX = screenX + rotElX * elScale;
          const elScreenY = screenY + rotElY * elScale;

          ctx.fillStyle = `rgba(255, 182, 255, ${0.95 * alpha})`;
          ctx.shadowColor = '#e879f9';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(elScreenX, elScreenY, item.zDepth > 1.0 ? 2.4 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
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

export default SpaceCubeBackground;
