import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI KHÔNG GIAN 3D (CUBE BACKGROUND)
// - Số lượng vừa vặn (13 khối không gian phân bổ tự nhiên theo chiều sâu)
// - Chuẩn hình học không gian 3D (Perspective projection, 8 đỉnh, 12 cạnh, 6 mặt kính tím)
// - Quay 3D chậm rãi đa trục (X, Y, Z), trôi êm ái trong không gian vũ trụ
// - Aura tím huyền ảo bao quanh từng khối
// - Hiệu ứng Parallax tương tác nhẹ nhàng theo con trỏ chuột
// - Tối ưu 60 - 120 FPS, pointer-events-none, không gây lag hay rối mắt
// ============================================================================

interface SpaceCube {
  id: number;
  x: number;
  y: number;
  zDepth: number; // 0.6 (xa) -> 1.4 (gần)
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
  pulseOffset: number;
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

    // Chuẩn bị 13 khối không gian 3D phân bố đều ở các tầng độ sâu và tọa độ
    // "cho nhiều nma ko quá nhiều": 13 khối tạo cảm giác vũ trụ bao la nhưng không che mắt người đọc
    const TOTAL_CUBES = 13;
    const cubes: SpaceCube[] = [];

    // Tạo vị trí trải đều trên toàn bộ màn hình
    const presetPositions = [
      { x: 0.12, y: 0.18, z: 1.1, size: 46 }, // Góc trên trái (Hero)
      { x: 0.88, y: 0.22, z: 1.25, size: 52 }, // Góc trên phải (Hero)
      { x: 0.28, y: 0.38, z: 0.75, size: 32 }, // Giữa trái xa
      { x: 0.76, y: 0.44, z: 0.9, size: 38 }, // Giữa phải
      { x: 0.08, y: 0.58, z: 1.2, size: 48 }, // Lề trái giữa
      { x: 0.92, y: 0.68, z: 1.15, size: 44 }, // Lề phải giữa
      { x: 0.35, y: 0.78, z: 0.7, size: 30 }, // Tầng dưới
      { x: 0.65, y: 0.82, z: 0.85, size: 36 }, // Tầng dưới phải
      { x: 0.18, y: 0.92, z: 1.0, size: 42 }, // Chân trang trái
      { x: 0.82, y: 0.94, z: 1.05, size: 44 }, // Chân trang phải
      { x: 0.50, y: 0.12, z: 0.65, size: 28 }, // Đỉnh giữa nền xa
      { x: 0.45, y: 0.60, z: 0.8, size: 34 }, // Trung tâm xa
      { x: 0.55, y: 0.32, z: 0.7, size: 30 }, // Giữa trên xa
    ];

    for (let i = 0; i < TOTAL_CUBES; i++) {
      const preset = presetPositions[i];
      const moveAngle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.3; // Chuyển động chậm rãi, thanh lịch

      cubes.push({
        id: i,
        x: preset.x * width + (Math.random() - 0.5) * 60,
        y: preset.y * height + (Math.random() - 0.5) * 60,
        zDepth: preset.z,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        baseSize: preset.size,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: 0.004 + (Math.random() - 0.5) * 0.006,
        vRotY: 0.005 + (Math.random() - 0.5) * 0.007,
        vRotZ: 0.003 + (Math.random() - 0.5) * 0.005,
        alpha: 0.45 + preset.z * 0.35,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Lắng nghe chuột để tạo hiệu ứng Parallax nhẹ nhàng
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.04;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.04;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Đỉnh và mặt của một khối lập phương chuẩn hình học không gian (Cube)
    const unitCubeVertices = [
      [-1, -1, -1], // 0
      [ 1, -1, -1], // 1
      [ 1,  1, -1], // 2
      [-1,  1, -1], // 3
      [-1, -1,  1], // 4
      [ 1, -1,  1], // 5
      [ 1,  1,  1], // 6
      [-1,  1,  1], // 7
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
      [0, 1], [1, 2], [2, 3], [3, 0], // Khung sau
      [4, 5], [5, 6], [6, 7], [7, 4], // Khung trước
      [0, 4], [1, 5], [2, 6], [3, 7], // Các cạnh nối dọc
    ];

    // Hàm xoay 3D theo 3 góc Euler
    const rotate3D = (
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number
    ): [number, number, number] => {
      // Xoay quanh trục X
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      const y1 = y * cx - z * sx;
      const z1 = y * sx + z * cx;

      // Xoay quanh trục Y
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;

      // Xoay quanh trục Z
      const cz = Math.cos(rz);
      const sz = Math.sin(rz);
      const x3 = x2 * cz - y1 * sz;
      const y3 = x2 * sz + y1 * cz;

      return [x3, y3, z2];
    };

    // Vòng lặp Render chuẩn 60-120 FPS
    const render = () => {

      // Parallax easing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      const px = mouseRef.current.x;
      const py = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // Cập nhật và vẽ từng khối lập phương
      for (let i = 0; i < cubes.length; i++) {
        const c = cubes[i];

        // Cập nhật vị trí trôi
        c.x += c.vx;
        c.y += c.vy;

        // Xoay 3D
        c.rotX += c.vRotX;
        c.rotY += c.vRotY;
        c.rotZ += c.vRotZ;

        // Giữ vị trí trong màn hình (wrap mượt mà quanh biên)
        const margin = 80;
        if (c.x < -margin) c.x = width + margin;
        if (c.x > width + margin) c.x = -margin;
        if (c.y < -margin) c.y = height + margin;
        if (c.y > height + margin) c.y = -margin;

        // Tọa độ tâm màn hình kèm hiệu ứng Parallax theo chiều sâu
        const screenX = c.x + px * c.zDepth;
        const screenY = c.y + py * c.zDepth;

        // Độ lớn và độ mờ theo độ sâu không gian
        const currentSize = (c.baseSize * c.zDepth) / 2;
        const alpha = Math.min(1, Math.max(0.2, c.alpha));

        // 1. VẼ AURA TÍM HUYỀN ẢO XUNG QUANH KHỐI
        const auraRadius = currentSize * 2.4;
        const auraGrad = ctx.createRadialGradient(
          screenX,
          screenY,
          currentSize * 0.2,
          screenX,
          screenY,
          auraRadius
        );
        auraGrad.addColorStop(0, `rgba(168, 85, 247, ${0.28 * alpha})`);
        auraGrad.addColorStop(0.45, `rgba(139, 92, 246, ${0.12 * alpha})`);
        auraGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. TÍNH TOÁN CÁC ĐỈNH 3D CHIẾU LÊN 2D
        const fov = 320;
        const projectedVerts: Array<{ x: number; y: number; z: number }> = [];

        for (let v = 0; v < unitCubeVertices.length; v++) {
          const uv = unitCubeVertices[v];
          const [rx, ry, rz] = rotate3D(
            uv[0] * currentSize,
            uv[1] * currentSize,
            uv[2] * currentSize,
            c.rotX,
            c.rotY,
            c.rotZ
          );

          // Phép chiếu phối cảnh Perspective
          const cameraZ = fov + rz;
          const scale = fov / Math.max(cameraZ, 50);

          projectedVerts.push({
            x: screenX + rx * scale,
            y: screenY + ry * scale,
            z: rz,
          });
        }

        // 3. VẼ CÁC MẶT KÍNH TRONG SUỐT (Sắp xếp độ sâu để vẽ mặt sau trước, mặt trước sau)
        const faceDepths = cubeFaces.map((faceIndices, idx) => {
          let sumZ = 0;
          for (let fi = 0; fi < 4; fi++) {
            sumZ += projectedVerts[faceIndices[fi]].z;
          }
          return { index: idx, face: faceIndices, avgZ: sumZ / 4 };
        });

        // Vẽ các mặt từ xa tới gần
        faceDepths.sort((a, b) => a.avgZ - b.avgZ);

        for (let fi = 0; fi < faceDepths.length; fi++) {
          const { face, avgZ } = faceDepths[fi];
          const p0 = projectedVerts[face[0]];
          const p1 = projectedVerts[face[1]];
          const p2 = projectedVerts[face[2]];
          const p3 = projectedVerts[face[3]];

          // Mặt kính tím có sắc thái sáng dần khi hướng ra phía trước
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

        // 4. VẼ CÁC CẠNH KHUNG DÂY WIREFRAME PHÁT SÁNG (Neon Violet Wireframe)
        ctx.save();
        ctx.lineWidth = c.zDepth > 1.0 ? 1.6 : 1.2;
        ctx.strokeStyle = `rgba(216, 180, 254, ${0.75 * alpha})`;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
        ctx.shadowBlur = c.zDepth > 1.0 ? 8 : 4;

        ctx.beginPath();
        for (let e = 0; e < cubeEdges.length; e++) {
          const [i1, i2] = cubeEdges[e];
          const p1 = projectedVerts[i1];
          const p2 = projectedVerts[i2];
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
        ctx.restore();

        // 5. CÁC ĐIỂM ĐỈNH PHÁT SÁNG NHỎ TẠI 8 GÓC (Vertex Glow Dots)
        ctx.fillStyle = `rgba(244, 114, 182, ${0.85 * alpha})`;
        const dotRadius = c.zDepth > 1.0 ? 1.8 : 1.2;
        for (let v = 0; v < projectedVerts.length; v++) {
          const pv = projectedVerts[v];
          ctx.beginPath();
          ctx.arc(pv.x, pv.y, dotRadius, 0, Math.PI * 2);
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
