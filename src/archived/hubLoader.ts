/**
 * Tải trước chunk Hub (Dashboard). Gọi khi người dùng có ý định vào Hub
 * (hover / focus / chạm CTA) hoặc khi trình duyệt rảnh sau khi trang chủ đã hiển thị.
 */
export const loadDashboard = () => import('./components/Dashboard');

let started = false;

export const preloadHub = () => {
  if (started) return;
  started = true;
  loadDashboard().catch(() => {
    started = false; // lỗi mạng → cho phép thử lại lần sau
  });
};

/** Props gắn vào phần tử dẫn vào Hub để tải trước đúng lúc. */
export const hubIntentProps = {
  onPointerEnter: preloadHub,
  onFocus: preloadHub,
  onTouchStart: preloadHub,
};

/** Tải trước khi rảnh (không cạnh tranh băng thông với màn hình đầu). */
export const preloadHubWhenIdle = (delay = 2500) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const id = window.setTimeout(() => {
    if (w.requestIdleCallback) w.requestIdleCallback(preloadHub, { timeout: 4000 });
    else preloadHub();
  }, delay);
  return () => window.clearTimeout(id);
};
