import React, { useEffect, useRef } from 'react';

interface AmbientFieldProps {
  mode?: 'home' | 'dashboard';
}

/**
 * AmbientField - Nền không gian quỹ đạo Orbit vẽ 1 lần lên HTML5 Canvas (GPU texture tĩnh):
 *  1. Tinh vân Tím Vũ Trụ (#9B5CFF) → Hồng Quỹ Đạo (#FF3CA6) → Cam Bình Minh (#FF9E7D) trên nền Đêm Thẳm (#08060E)
 *  2. Hai vành quỹ đạo lớn nghiêng 3D chuyển sắc đồng bộ giữa Trang Chủ & Hub
 *  3. Trường sao ánh trăng hồng-tím tĩnh lặng
 *  4. Chuyển đổi Home ↔ Hub bằng CSS GPU transform (0ms CPU, không vẽ lại Canvas mỗi frame để chống khựng/lag)
 */
export const AmbientField: React.FC<AmbientFieldProps> = ({ mode = 'home' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const stars = Array.from({ length: 48 }, (_, i) => ({
      x: ((i * 193 + 47) % 1000) / 1000,
      y: ((i * 317 + 89) % 1000) / 1000,
      r: (i % 3) * 0.45 + 0.65,
      alpha: 0.15 + (i % 5) * 0.055,
      tint: i % 3 === 0 ? '255, 196, 235' : i % 3 === 1 ? '232, 212, 255' : '255, 224, 210',
    }));

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Dùng DPR = 1 cho lớp nền tinh vân mờ: nhẹ hơn 4x băng thông GPU, hình ảnh tương đương 100%
      canvas.width = width;
      canvas.height = height;

      // 1. Nền Đêm Tinh Vân sâu thẳm theo nền logo Orbit
      ctx.fillStyle = '#08060E';
      ctx.fillRect(0, 0, width, height);

      // 2. Quầng sáng tinh vân Tím (#9B5CFF) & Hồng Quỹ Đạo (#FF3CA6) & Cam Đào (#FF9E7D)
      const zenith = ctx.createRadialGradient(
        width * 0.26,
        height * 0.16,
        10,
        width * 0.26,
        height * 0.16,
        Math.max(width, height) * 0.72
      );
      zenith.addColorStop(0, 'rgba(155, 92, 255, 0.165)');
      zenith.addColorStop(0.45, 'rgba(255, 60, 166, 0.082)');
      zenith.addColorStop(1, 'rgba(8, 6, 14, 0)');
      ctx.fillStyle = zenith;
      ctx.fillRect(0, 0, width, height);

      const horizon = ctx.createRadialGradient(
        width * 0.82,
        height * 0.56,
        10,
        width * 0.82,
        height * 0.56,
        Math.max(width, height) * 0.56
      );
      horizon.addColorStop(0, 'rgba(255, 60, 166, 0.11)');
      horizon.addColorStop(0.5, 'rgba(255, 158, 125, 0.048)');
      horizon.addColorStop(1, 'rgba(8, 6, 14, 0)');
      ctx.fillStyle = horizon;
      ctx.fillRect(0, 0, width, height);

      // 3. Sao nền tĩnh lặng mang sắc trăng hồng phấn & tím nhạt
      for (const s of stars) {
        const sx = s.x * width;
        const sy = s.y * height;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.tint}, ${s.alpha.toFixed(3)})`;
        ctx.fill();
      }

      // 4. Hai đường quỹ đạo lớn chuyển sắc Tím → Hồng → Cam Đào theo logo Orbit
      ctx.save();
      ctx.translate(width * 0.52, height * 0.38);
      ctx.rotate(-0.18);

      const rx1 = Math.min(width * 0.46, 590);
      const ry1 = Math.min(height * 0.22, 195);
      const ringGrad1 = ctx.createLinearGradient(-rx1, ry1, rx1, -ry1);
      ringGrad1.addColorStop(0, 'rgba(155, 92, 255, 0.135)');
      ringGrad1.addColorStop(0.55, 'rgba(255, 60, 166, 0.155)');
      ringGrad1.addColorStop(1, 'rgba(255, 158, 125, 0.12)');
      ctx.beginPath();
      ctx.ellipse(0, 0, rx1, ry1, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ringGrad1;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.rotate(0.36);
      const rx2 = Math.min(width * 0.62, 760);
      const ry2 = Math.min(height * 0.28, 255);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx2, ry2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 168, 220, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    draw();
    window.addEventListener('resize', draw);
    return () => {
      window.removeEventListener('resize', draw);
    };
  }, []);

  return (
    <div className="hh-ambient" data-mode={mode} aria-hidden="true">
      <canvas ref={canvasRef} className="hh-ambient-canvas" />
    </div>
  );
};

export const CursorAura: React.FC<{ subtle?: boolean }> = () => null;
