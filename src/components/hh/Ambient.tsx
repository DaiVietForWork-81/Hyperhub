import React, { useEffect, useRef } from 'react';
import { addPointerFollower } from '../../motion/pointer';
import { onScrollFrame } from '../../motion/scroll';
import { allowRichMotion, pointerTier } from '../../motion/capabilities';

interface AmbientFieldProps {
  mode?: 'home' | 'dashboard';
}

/**
 * AmbientField - Nền không gian quỹ đạo Orbit vẽ trên HTML5 Canvas đồng bộ xuyên suốt Trang Chủ & Hub:
 *  1. Tinh vân Tím Vũ Trụ (#9B5CFF) → Hồng Quỹ Đạo (#FF3CA6) → Cam Bình Minh (#FF9E7D) trên nền Đêm Thẳm (#08060E)
 *  2. Hai vành quỹ đạo lớn nghiêng 3D chuyển sắc phản hồi mượt theo vị trí cuộn trang, trọng lực con trỏ
 *     và nội suy mượt (lerp) góc nghiêng khi chuyển qua lại giữa Trang Chủ ↔ Bàn Điều Khiển Hub
 *  3. Trường sao ánh trăng hồng-tím tĩnh lặng tạo chiều sâu không gian mà không gây nhiễu chữ
 */
export const AmbientField: React.FC<AmbientFieldProps> = ({ mode = 'home' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeTargetRef = useRef<number>(mode === 'dashboard' ? 1 : 0);
  const modeCurrentRef = useRef<number>(mode === 'dashboard' ? 1 : 0);
  const triggerMorphRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    modeTargetRef.current = mode === 'dashboard' ? 1 : 0;
    triggerMorphRef.current?.();
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const stars = Array.from({ length: 48 }, (_, i) => ({
      x: ((i * 193 + 47) % 1000) / 1000,
      y: ((i * 317 + 89) % 1000) / 1000,
      r: (i % 3) * 0.45 + 0.65,
      alpha: 0.14 + (i % 5) * 0.055,
      tint: i % 3 === 0 ? '255, 196, 235' : i % 3 === 1 ? '232, 212, 255' : '255, 224, 210',
    }));

    let scrollY = window.scrollY || 0;
    let ptrX = width * 0.5;
    let ptrY = height * 0.35;
    let rafId = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      draw();
    };

    const draw = () => {
      const m = modeCurrentRef.current; // 0 = home, 1 = dashboard
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Nền Đêm Tinh Vân sâu thẳm theo nền logo Orbit
      ctx.fillStyle = '#08060E';
      ctx.fillRect(0, 0, width, height);

      // 2. Quầng sáng tinh vân Tím (#9B5CFF) & Hồng Quỹ Đạo (#FF3CA6) & Cam Đào (#FF9E7D)
      // Khi sang Hub (m -> 1), tâm tinh vân dịch nhẹ sang phải (nhường không gian cho thanh điều hướng bên trái)
      const shiftX = (ptrX - width * 0.5) * 0.05 + m * (width * 0.08);
      const shiftY = (ptrY - height * 0.35) * 0.05 - scrollY * 0.06;

      const zenith = ctx.createRadialGradient(
        width * 0.24 + shiftX,
        height * (0.14 + m * 0.04) + shiftY,
        10,
        width * 0.24 + shiftX,
        height * (0.14 + m * 0.04) + shiftY,
        Math.max(width, height) * 0.72
      );
      zenith.addColorStop(0, `rgba(155, 92, 255, ${(0.17 - m * 0.02).toFixed(3)})`);
      zenith.addColorStop(0.45, `rgba(255, 60, 166, ${(0.085 - m * 0.01).toFixed(3)})`);
      zenith.addColorStop(1, 'rgba(8, 6, 14, 0)');
      ctx.fillStyle = zenith;
      ctx.fillRect(0, 0, width, height);

      const horizon = ctx.createRadialGradient(
        width * 0.82 - shiftX * 0.45,
        height * (0.58 - m * 0.06) + shiftY * 0.4,
        10,
        width * 0.82 - shiftX * 0.45,
        height * (0.58 - m * 0.06) + shiftY * 0.4,
        Math.max(width, height) * 0.56
      );
      horizon.addColorStop(0, `rgba(255, 60, 166, ${(0.115 - m * 0.015).toFixed(3)})`);
      horizon.addColorStop(0.5, 'rgba(255, 158, 125, 0.048)');
      horizon.addColorStop(1, 'rgba(8, 6, 14, 0)');
      ctx.fillStyle = horizon;
      ctx.fillRect(0, 0, width, height);

      // 3. Sao nền tĩnh lặng mang sắc trăng hồng phấn & tím nhạt
      for (const s of stars) {
        const sx = ((s.x * width + m * 28) % width + width) % width;
        const sy = ((s.y * height - scrollY * 0.04 - m * 18) % height + height) % height;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.tint}, ${s.alpha.toFixed(3)})`;
        ctx.fill();
      }

      // 4. Hai đường quỹ đạo lớn chuyển sắc Tím → Hồng → Cam Đào theo logo Orbit
      ctx.save();
      ctx.translate(
        width * (0.5 + m * 0.07) + shiftX * 0.45,
        height * (0.36 + m * 0.06) + shiftY * 0.35
      );
      ctx.rotate(-0.22 + m * 0.14 + scrollY * 0.00008);

      const rx1 = Math.min(width * 0.46, 580) * (1 + m * 0.05);
      const ry1 = Math.min(height * 0.22, 195) * (1 - m * 0.04);
      const ringGrad1 = ctx.createLinearGradient(-rx1, ry1, rx1, -ry1);
      ringGrad1.addColorStop(0, 'rgba(155, 92, 255, 0.13)');
      ringGrad1.addColorStop(0.55, 'rgba(255, 60, 166, 0.15)');
      ringGrad1.addColorStop(1, 'rgba(255, 158, 125, 0.12)');
      ctx.beginPath();
      ctx.ellipse(0, 0, rx1, ry1, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ringGrad1;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.rotate(0.38 - m * 0.08);
      const rx2 = Math.min(width * 0.62, 760) * (1 + m * 0.04);
      const ry2 = Math.min(height * 0.28, 255);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx2, ry2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 168, 220, 0.075)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    const scheduleDraw = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(function tick() {
        rafId = 0;
        const diff = modeTargetRef.current - modeCurrentRef.current;
        if (Math.abs(diff) > 0.004) {
          modeCurrentRef.current += diff * 0.14;
          draw();
          rafId = requestAnimationFrame(tick);
        } else {
          modeCurrentRef.current = modeTargetRef.current;
          draw();
        }
      });
    };

    triggerMorphRef.current = scheduleDraw;

    resize();
    window.addEventListener('resize', resize);

    const offScroll = allowRichMotion()
      ? onScrollFrame((y) => {
          scrollY = y;
          scheduleDraw();
        })
      : undefined;

    const offPointer =
      pointerTier() !== 'lite' && allowRichMotion()
        ? addPointerFollower(0.14, (x, y) => {
            ptrX = x;
            ptrY = y;
            scheduleDraw();
          })
        : undefined;

    return () => {
      triggerMorphRef.current = null;
      window.removeEventListener('resize', resize);
      offScroll?.();
      offPointer?.();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="hh-ambient" aria-hidden="true">
      <canvas ref={canvasRef} className="hh-ambient-canvas" />
    </div>
  );
};

export const CursorAura: React.FC<{ subtle?: boolean }> = () => null;
