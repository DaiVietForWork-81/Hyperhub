/**
 * Cấu hình kết nối API cho Discord Bot & Backend Bridge.
 * Hỗ trợ tự động chuyển đổi giữa HTTPS Cloudflare Tunnel (khi chạy trên Vercel/Production)
 * và Localhost (khi chạy offline dev), đồng thời cho phép người dùng tùy chỉnh endpoint qua localStorage.
 */

export const DEFAULT_TUNNEL_URL = "https://trans-sherman-cables-mas.trycloudflare.com";
export const LOCAL_API_URL = "http://localhost:8080";

const STORAGE_KEY = "hyperhub_api_base_url";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Nếu người dùng tự cấu hình custom endpoint
    const userDefined = localStorage.getItem(STORAGE_KEY);
    if (userDefined && userDefined.trim()) {
      return userDefined.trim().replace(/\/+$/, "");
    }

    // 2. Nếu đang chạy trên HTTPS (ví dụ Vercel: https://hyperhub-one.vercel.app)
    // Tránh lỗi trình duyệt chặn Mixed Content (HTTP trên trang HTTPS)
    if (window.location.protocol === "https:") {
      return DEFAULT_TUNNEL_URL;
    }
  }

  // 3. Fallback khi ở HTTP / local
  return LOCAL_API_URL;
}

export function setCustomApiUrl(url: string | null): void {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ""));
    }
  }
}

export function isUsingDefaultTunnel(): boolean {
  if (typeof window === "undefined") return false;
  const current = getApiBaseUrl();
  return current === DEFAULT_TUNNEL_URL;
}
