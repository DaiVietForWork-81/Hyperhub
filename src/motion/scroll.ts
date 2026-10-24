/**
 * Scroll runtime: MỘT listener scroll (passive) + rAF throttle cho mọi hiệu ứng
 * phụ thuộc vị trí cuộn (parallax nền, chapter progress). Callback ghi style
 * trực tiếp lên phần tử - không setState theo từng frame.
 */

type ScrollFn = (scrollY: number, viewportH: number) => void;

const subscribers = new Set<ScrollFn>();
let frame = 0;
let listening = false;

const run = () => {
  frame = 0;
  const y = window.scrollY;
  const h = window.innerHeight;
  subscribers.forEach((fn) => fn(y, h));
};

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(run);
};

export const onScrollFrame = (fn: ScrollFn): (() => void) => {
  subscribers.add(fn);
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }
  // Chạy một lần để đồng bộ trạng thái ban đầu
  schedule();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && listening) {
      listening = false;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
};

/** Header cố định cao ~72px → chừa thêm khoảng để heading không bị che. */
export const ANCHOR_OFFSET = 88;

/** Cuộn tới phần tử: dùng Lenis nếu đang chạy, ngược lại cuộn native. */
export const scrollToElement = (el: HTMLElement | null) => {
  if (!el) return;
  const lenis = (window as Window & { __lenis?: { scrollTo: (t: HTMLElement, o: object) => void } }).__lenis;
  if (lenis) {
    lenis.scrollTo(el, { offset: -ANCHOR_OFFSET, duration: 1.05 });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  // Chuyển focus tới section để người dùng bàn phím/screen reader theo kịp
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
};
