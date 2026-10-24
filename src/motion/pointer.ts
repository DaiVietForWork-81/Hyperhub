/**
 * Pointer field: MỘT listener pointermove (passive) + MỘT vòng rAF cho mọi lớp
 * phản ứng theo con trỏ. Mỗi "follower" có hệ số làm mượt riêng → tạo độ trễ
 * khác nhau giữa các lớp glow (chiều sâu). Ghi style trực tiếp, không qua React.
 * Vòng rAF tự ngủ khi mọi follower đã đứng yên.
 */
import { hasFinePointer, prefersReducedMotion } from './capabilities';

type ApplyFn = (x: number, y: number) => void;

interface Follower {
  ease: number;
  x: number;
  y: number;
  apply: ApplyFn;
}

const followers = new Set<Follower>();
let targetX = 0;
let targetY = 0;
let hasPointer = false;
let rafId = 0;
let listening = false;

const tick = () => {
  let moving = false;
  followers.forEach((f) => {
    const dx = targetX - f.x;
    const dy = targetY - f.y;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
      f.x = targetX;
      f.y = targetY;
    } else {
      f.x += dx * f.ease;
      f.y += dy * f.ease;
      moving = true;
    }
    f.apply(f.x, f.y);
  });
  rafId = moving ? requestAnimationFrame(tick) : 0;
};

const wake = () => {
  if (!rafId) rafId = requestAnimationFrame(tick);
};

const onMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') return;
  targetX = e.clientX;
  targetY = e.clientY;
  if (!hasPointer) {
    hasPointer = true;
    // Lần đầu: đặt follower ngay tại con trỏ, tránh glow bay từ góc màn hình
    followers.forEach((f) => {
      f.x = targetX;
      f.y = targetY;
    });
    document.documentElement.setAttribute('data-pointer', 'active');
  }
  wake();
};

const onLeave = () => {
  hasPointer = false;
  document.documentElement.setAttribute('data-pointer', 'idle');
};

const start = () => {
  if (listening) return;
  listening = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
};

const stop = () => {
  if (!listening || followers.size > 0) return;
  listening = false;
  window.removeEventListener('pointermove', onMove);
  document.documentElement.removeEventListener('pointerleave', onLeave);
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
};

/** Cursor effects chỉ chạy với chuột thật và khi không bật reduced-motion. */
export const pointerEffectsEnabled = (): boolean => hasFinePointer() && !prefersReducedMotion();

/**
 * Đăng ký một lớp đi theo con trỏ. `ease` 0..1 - càng nhỏ càng trễ.
 * Trả về hàm hủy đăng ký.
 */
export const addPointerFollower = (ease: number, apply: ApplyFn): (() => void) => {
  if (!pointerEffectsEnabled()) return () => {};
  const f: Follower = { ease, x: window.innerWidth / 2, y: window.innerHeight * 0.35, apply };
  followers.add(f);
  start();
  return () => {
    followers.delete(f);
    stop();
  };
};

/**
 * Spotlight/tilt cục bộ cho một bề mặt: ghi --px/--py (và tùy chọn --rx/--ry)
 * lên chính phần tử, throttle bằng rAF, chỉ khi đang hover.
 */
export const bindSurfacePointer = (
  el: HTMLElement | null,
  opts: { tilt?: number } = {}
): (() => void) => {
  if (!el || !pointerEffectsEnabled()) return () => {};
  let frame = 0;
  let lastEvent: PointerEvent | null = null;
  const tilt = opts.tilt ?? 0;

  const paint = () => {
    frame = 0;
    if (!lastEvent) return;
    const r = el.getBoundingClientRect();
    const px = lastEvent.clientX - r.left;
    const py = lastEvent.clientY - r.top;
    el.style.setProperty('--px', `${px}px`);
    el.style.setProperty('--py', `${py}px`);
    if (tilt) {
      const nx = px / r.width - 0.5;
      const ny = py / r.height - 0.5;
      el.style.setProperty('--ry', `${(nx * tilt).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-ny * tilt).toFixed(2)}deg`);
    }
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    lastEvent = e;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const leave = () => {
    lastEvent = null;
    if (tilt) {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    }
  };
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    if (frame) cancelAnimationFrame(frame);
  };
};

/**
 * Magnetic: phần tử dịch tối đa `strength` px về phía con trỏ khi hover.
 * Giới hạn nhỏ để vùng bấm không trượt khỏi tay người dùng.
 */
export const bindMagnetic = (el: HTMLElement | null, strength = 5): (() => void) => {
  if (!el || !pointerEffectsEnabled()) return () => {};
  let frame = 0;
  let mx = 0;
  let my = 0;
  const paint = () => {
    frame = 0;
    el.style.setProperty('--mag-x', `${mx.toFixed(2)}px`);
    el.style.setProperty('--mag-y', `${my.toFixed(2)}px`);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    mx = Math.max(-1, Math.min(1, nx)) * strength;
    my = Math.max(-1, Math.min(1, ny)) * strength * 0.6;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const leave = () => {
    mx = 0;
    my = 0;
    if (!frame) frame = requestAnimationFrame(paint);
  };
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    if (frame) cancelAnimationFrame(frame);
  };
};
