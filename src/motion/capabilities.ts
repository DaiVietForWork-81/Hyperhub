/**
 * Phát hiện năng lực thiết bị để quyết định bật/tắt từng lớp chuyển động.
 * Mọi hàm đều an toàn khi chạy ngoài trình duyệt.
 */

const mq = (query: string): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;

export const prefersReducedMotion = (): boolean => mq('(prefers-reduced-motion: reduce)');

/** Chuột thật (hover + con trỏ chính xác) - điều kiện cho cursor aura, spotlight, magnetic, tilt. */
export const hasFinePointer = (): boolean => mq('(hover: hover) and (pointer: fine)');

/**
 * Thiết bị yếu / tiết kiệm dữ liệu: giảm lớp glow, bỏ petal, bỏ parallax.
 * Dựa trên Save-Data, số nhân CPU và bộ nhớ (nếu trình duyệt cung cấp).
 */
export const isLowPowerDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return true;
  return false;
};

/** Có nên chạy chuyển động giàu (parallax, ambient drift, petals)? */
export const allowRichMotion = (): boolean => !prefersReducedMotion() && !isLowPowerDevice();

/**
 * Bậc hiệu ứng con trỏ (đo trên CPU throttle 4×: mỗi lớp glow di chuyển tốn ~10–15% khung hình):
 *  - 'rich'     ≥6 luồng CPU và RAM không nhỏ: aura gần + aura xa + bloom grid
 *  - 'standard' máy phổ thông (≤4 luồng / ≤4GB): aura gần + bloom grid
 *  - 'lite'     máy yếu / Save-Data: chỉ aura gần
 */
export type PointerTier = 'rich' | 'standard' | 'lite';
export const pointerTier = (): PointerTier => {
  if (isLowPowerDevice()) return 'lite';
  if (typeof navigator === 'undefined') return 'standard';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory;
  if (cores >= 6 && (mem === undefined || mem >= 8)) return 'rich';
  return 'standard';
};
