/**
 * utils/apiConfig.ts
 * Cấu hình kết nối API bảo mật cho HyperHub (Sử dụng trực tiếp Vercel Serverless Bridge + Turso Cloud).
 * Không cần ngrok hay Cloudflare Tunnel.
 */

export const DEFAULT_VERCEL_URL = "https://hyperhub-one.vercel.app";
export const DEFAULT_TUNNEL_URL = DEFAULT_VERCEL_URL;
export const LOCAL_API_URL = "http://127.0.0.1:8080";

export const API_FETCH_HEADERS: Record<string, string> = {
  "Accept": "application/json",
};

// Danh sách domain an toàn được phép (Allowlist)
const ALLOWED_API_HOSTS = [
  "localhost",
  "127.0.0.1",
  "hyperhub-one.vercel.app",
];

function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_API_HOSTS.includes(host)) return true;
    return host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/**
 * Trả về API Base URL an toàn.
 * - Trên môi trường HTTPS (https://hyperhub-one.vercel.app): trả về "" (same-origin /api/* ngay trên chính Vercel!).
 * - Trên môi trường Local (http://localhost:5173): dùng http://localhost:8080 hoặc fallback về Vercel.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";

    // Dọn dẹp URL ngrok cũ nếu từng lưu trong localStorage
    try {
      const saved = window.localStorage.getItem("hyperhub_api_base_url");
      if (saved && (saved.includes("ngrok") || saved.includes("trycloudflare"))) {
        window.localStorage.removeItem("hyperhub_api_base_url");
      } else if (saved && isSafeUrl(saved)) {
        if (!isHttps || saved.startsWith("https://")) {
          return saved.trim().replace(/\/+$/, "");
        }
      }
    } catch {}

    // 1. Khi chạy trên chính Vercel (HTTPS): dùng đường dẫn tương đối "" để gọi thẳng /api/* trên Vercel
    if (isHttps) {
      return "";
    }

    // 2. Local development
    return LOCAL_API_URL;
  }

  return DEFAULT_VERCEL_URL;
}

export function setCustomApiUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  if (!url || !url.trim()) {
    try {
      localStorage.removeItem("hyperhub_api_base_url");
    } catch {}
    return;
  }

  const cleanUrl = url.trim().replace(/\/+$/, "");
  if (window.location.protocol === "https:" && !cleanUrl.startsWith("https://")) {
    return;
  }

  if (isSafeUrl(cleanUrl)) {
    try {
      localStorage.setItem("hyperhub_api_base_url", cleanUrl);
    } catch {}
  }
}

export function isUsingDefaultTunnel(): boolean {
  return false;
}
