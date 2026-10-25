/**
 * Reveal runtime: MỘT IntersectionObserver dùng chung cho toàn trang.
 * Khi phần tử vào viewport → ghi data-revealed="true" trực tiếp lên DOM
 * (không setState, không re-render React), rồi ngừng quan sát phần tử đó.
 */

let observer: IntersectionObserver | null = null;
let scrollGuardAttached = false;
let scrollRaf = 0;

const reveal = (el: Element) => {
  el.setAttribute('data-revealed', 'true');
};

const sweepVisibleUnrevealed = () => {
  scrollRaf = 0;
  if (typeof window === 'undefined') return;
  const pending = document.querySelectorAll('[data-reveal]:not([data-revealed])');
  if (pending.length === 0) return;
  const triggerBottom = window.innerHeight + 2400;
  pending.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= triggerBottom && rect.bottom >= -160) {
      reveal(el);
      observer?.unobserve(el);
    }
  });
};

const ensureScrollGuard = () => {
  if (scrollGuardAttached || typeof window === 'undefined') return;
  scrollGuardAttached = true;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(sweepVisibleUnrevealed);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
};

const getObserver = (): IntersectionObserver | null => {
  if (observer) return observer;
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer?.unobserve(entry.target);
        }
      }
    },
    // Kích hoạt sớm trước khi phần tử vào viewport để cuộn nhanh không bị khoảng trống
    { rootMargin: '240px 0px 2400px 0px', threshold: 0 }
  );
  return observer;
};

/** Đăng ký phần tử. Trả về hàm hủy. */
export const observeReveal = (el: Element | null): (() => void) => {
  if (!el) return () => {};
  // Không có chế độ motion (reduced-motion / no JS class) → hiện ngay
  if (!document.documentElement.classList.contains('hh-motion')) {
    reveal(el);
    return () => {};
  }
  const rect = el.getBoundingClientRect();
  if (rect.top <= window.innerHeight + 2400 && rect.bottom >= 0) {
    reveal(el);
    return () => {};
  }
  ensureScrollGuard();
  const io = getObserver();
  if (!io) {
    reveal(el);
    return () => {};
  }
  io.observe(el);
  return () => io.unobserve(el);
};

/**
 * Lưới an toàn: nếu vì lý do nào đó phần tử vẫn chưa reveal sau `ms`
 * (ví dụ tab ẩn, IO bị chặn, hoặc trình chụp toàn trang), hiện các phần tử đang trong tầm nhìn.
 */
export const revealAllAfter = (ms: number): (() => void) => {
  const id = window.setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.5) reveal(el);
    });
  }, ms);
  return () => window.clearTimeout(id);
};
