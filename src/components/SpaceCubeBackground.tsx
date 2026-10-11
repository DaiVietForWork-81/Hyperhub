import React, { useEffect, useRef } from 'react';

// ============================================================================
// HỆ THỐNG KHỐI KHÔNG GIAN 3D: CUBE & SPHERE (8 KHỐI - 8S - VA CHẠM ĐÀN HỒI)
// - Đúng 8 khối không gian (4 Cube + 4 Sphere) luân phiên hiển thị nền
// - Vòng đời mỗi khối: đúng 8 giây (Fade in 1s -> Duy trì 6s -> Fade out 1s -> Tắt)
// - Sau 8s, khối cũ tắt hoàn toàn và 1 khối mới spawn ở vị trí ngẫu nhiên
// - CÁC KHỐI VA CHẠM VỚI NHAU: Khi 2 khối chạm nhau, chúng tự động bật nảy đàn hồi (Bounce),
//   đổi hướng bay, thay đổi góc xoay 3D và phát ra gợn sóng ánh sáng tại điểm va chạm
// - Va chạm đàn hồi với 4 cạnh màn hình: Giúp các khối luôn bay lượn trong tầm nhìn
// - Parallax nhẹ nhàng theo con trỏ chuột khi lướt web
// - Không dùng shadowBlur, khóa DPR=1, 60 FPS Throttling, 0% lag CPU/GPU
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

interface CollisionRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
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
    const ripples: CollisionRipple[] = [];

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

    // 8 Vùng không gian phân chia đều khắp màn hình (Balanced Spatial Sectors)
    const getZonePosition = (zoneId: number) => {
      const isPortrait = height > width;
      if (isPortrait) {
        // Màn hình dọc (Mobile): Chia 2 cột x 4 hàng trải dọc đều từ trên xuống
        const col = zoneId % 2;
        const row = Math.floor(zoneId / 2);
        const xBase = col === 0 ? 0.22 : 0.78;
        const yBase = 0.14 + row * 0.24;
        return {
          x: xBase * width + (Math.random() - 0.5) * (width * 0.12),
          y: yBase * height + (Math.random() - 0.5) * (height * 0.08),
        };
      } else {
        // Màn hình ngang (Desktop): Chia 4 cột x 2 hàng trải đều 4 góc và 4 biên
        const col = zoneId % 4;
        const row = Math.floor(zoneId / 4);
        const xBase = 0.12 + col * 0.253; // ~0.12, 0.37, 0.63, 0.88
        const yBase = row === 0 ? 0.22 : 0.78;
        return {
          x: xBase * width + (Math.random() - 0.5) * (width * 0.08),
          y: yBase * height + (Math.random() - 0.5) * (height * 0.10),
        };
      }
    };

    // Hàm tạo mới hoặc tái sinh một khối theo vùng được phân chia đều
    const spawnShape = (id: number, birthOffsetMs = 0): SpaceShape => {
      // Phân chia đều: 4 Cube (0, 2, 5, 7) và 4 Sphere (1, 3, 4, 6) xen kẽ đối xứng
      const kind: ShapeKind = [0, 2, 5, 7].includes(id % 8) ? 'cube' : 'sphere';
      const pos = getZonePosition(id % 8);

      // Hướng vận tốc ban đầu hướng nhẹ vào vùng không gian mở
      const col = (id % 8) % 4;
      const row = Math.floor((id % 8) / 4);
      const angleBiasX = col < 2 ? 0.35 : -0.35;
      const angleBiasY = row === 0 ? 0.35 : -0.35;
      const baseAngle = Math.atan2(angleBiasY, angleBiasX);
      const moveAngle = baseAngle + (Math.random() - 0.5) * 1.2;
      const speed = 0.20 + Math.random() * 0.22;
      const zDepth = 0.85 + Math.random() * 0.35;

      return {
        id,
        kind,
        x: Math.max(30, Math.min(width - 30, pos.x)),
        y: Math.max(30, Math.min(height - 30, pos.y)),
        zDepth,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        baseSize: 38 + Math.random() * 10,
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

      // ======================================================================
      // 1. CẬP NHẬT VỊ TRÍ, VÒNG ĐỜI & VA CHẠM BIÊN CỦA TỪNG KHỐI
      // ======================================================================
      for (let i = 0; i < shapes.length; i++) {
        let item = shapes[i];

        // Kiểm tra vòng đời 8 giây
        const age = now - item.birthTime;
        if (age >= LIFETIME_MS) {
          shapes[i] = spawnShape(item.id, 0);
          item = shapes[i];
        }

        // Cập nhật vị trí trôi
        item.x += item.vx;
        item.y += item.vy;
        item.rotX += item.vRotX;
        item.rotY += item.vRotY;
        item.rotZ += item.vRotZ;
        item.orbitAngle += item.orbitSpeed;

        // Va chạm đàn hồi với 4 cạnh màn hình (Bouncing off walls)
        const currentRadius = (item.baseSize * item.zDepth) / 2;
        const padding = 12;

        if (item.x < currentRadius + padding) {
          item.x = currentRadius + padding;
          item.vx = Math.abs(item.vx);
        } else if (item.x > width - currentRadius - padding) {
          item.x = width - currentRadius - padding;
          item.vx = -Math.abs(item.vx);
        }

        if (item.y < currentRadius + padding) {
          item.y = currentRadius + padding;
          item.vy = Math.abs(item.vy);
        } else if (item.y > height - currentRadius - padding) {
          item.y = height - currentRadius - padding;
          item.vy = -Math.abs(item.vy);
        }
      }

      // ======================================================================
      // 2. VẬT LÝ VA CHẠM ĐÀN HỒI GIỮA CÁC KHỐI VỚI NHAU (INTER-SHAPE COLLISIONS)
      // ======================================================================
      for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
          const a = shapes[i];
          const b = shapes[j];

          const ra = (a.baseSize * a.zDepth) / 2;
          const rb = (b.baseSize * b.zDepth) / 2;
          const minDist = ra + rb;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);

          // Phát hiện va chạm khi khoảng cách < tổng bán kính
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;

            // 1. Tách rời để không bị dính / lún vào nhau (Position Correction)
            const overlap = (minDist - dist) * 0.5;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            // 2. Phản xạ vận tốc đàn hồi (Elastic Impulse)
            const kx = a.vx - b.vx;
            const ky = a.vy - b.vy;
            const vn = kx * nx + ky * ny;

            // Chỉ bật nảy nếu 2 khối đang chuyển động tiến về phía nhau
            if (vn > 0) {
              const massA = ra;
              const massB = rb;
              const impulse = (2 * vn) / (massA + massB);

              a.vx -= impulse * massB * nx;
              a.vy -= impulse * massB * ny;
              b.vx += impulse * massA * nx;
              b.vy += impulse * massA * ny;

              // Khống chế vận tốc để duy trì chuyển động êm dịu
              const maxSpd = 0.85;
              const minSpd = 0.18;
              const spdA = Math.hypot(a.vx, a.vy);
              if (spdA > maxSpd) {
                a.vx = (a.vx / spdA) * maxSpd;
                a.vy = (a.vy / spdA) * maxSpd;
              } else if (spdA < minSpd && spdA > 0) {
                a.vx = (a.vx / spdA) * minSpd;
                a.vy = (a.vy / spdA) * minSpd;
              }
              const spdB = Math.hypot(b.vx, b.vy);
              if (spdB > maxSpd) {
                b.vx = (b.vx / spdB) * maxSpd;
                b.vy = (b.vy / spdB) * maxSpd;
              } else if (spdB < minSpd && spdB > 0) {
                b.vx = (b.vx / spdB) * minSpd;
                b.vy = (b.vy / spdB) * minSpd;
              }

              // Đổi nhẹ vận tốc xoay góc ngẫu nhiên khi va chạm
              a.vRotX = (Math.random() - 0.5) * 0.008;
              a.vRotY = (Math.random() - 0.5) * 0.008;
              b.vRotX = (Math.random() - 0.5) * 0.008;
              b.vRotY = (Math.random() - 0.5) * 0.008;

              // Tạo gợn sóng phát sáng nhẹ tại điểm tiếp xúc
              if (ripples.length < 10) {
                ripples.push({
                  x: a.x + nx * ra,
                  y: a.y + ny * ra,
                  radius: 4,
                  maxRadius: 36,
                  alpha: 0.6,
                });
              }
            }
          }
        }
      }

      // ======================================================================
      // 3. VẼ CÁC GỢN SÓNG PHÁT SÁNG KHI VA CHẠM (COLLISION RIPPLES)
      // ======================================================================
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rip = ripples[r];
        rip.radius += 1.4;
        rip.alpha -= 0.025;

        if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
          ripples.splice(r, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(rip.x + px * 0.8, rip.y + py * 0.8, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232, 121, 249, ${rip.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // ======================================================================
      // 4. VẼ TỪNG KHỐI KHÔNG GIAN 3D
      // ======================================================================
      for (let i = 0; i < shapes.length; i++) {
        const item = shapes[i];

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

        // Tọa độ màn hình + Parallax
        const screenX = item.x + px * item.zDepth;
        const screenY = item.y + py * item.zDepth;
        const currentSize = (item.baseSize * item.zDepth) / 2;

        // AURA TÍM HUYỀN ẢO DI CHUYỂN THEO KHỐI
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

        // VẼ THEO LOẠI HÌNH: CUBE HOẶC SPHERE
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
