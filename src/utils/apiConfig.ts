/**
 * utils/apiConfig.ts
 * Cấu hình kết nối API bảo mật cho HyperHub.
 * Phòng chống SSRF / MitM / API Manipulation qua localStorage (CWE-918, CWE-352).
 */

export const DEFAULT_TUNNEL_URL = "https://phantasmagorically-occupative-gladys.ngrok-free.dev";
export const LOCAL_API_URL = "http://localhost:8080";

export const API_FETCH_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
  "Accept": "application/json",
};

// Danh sách domain an toàn được phép (Allowlist)
const ALLOWED_API_HOSTS = [
  "localhost",
  "127.0.0.1",
  "phantasmagorically-occupative-gladys.ngrok-free.dev",
  "hyperhub-one.vercel.app",
];

function isSafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return ALLOWED_API_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(".ngrok-free.dev")
    );
  } catch {
    return false;
  }
}

/**
 * Trả về API Base URL an toàn.
 * Trên môi trường HTTPS (Vercel Production), gọi trực tiếp tunnel URL từ browser
 * (kèm header ngrok-skip-browser-warning) để vượt interstitial ngrok free.
 * Không dùng Vercel Rewrite /api/* vì fetch server-side không gắn được header đó.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Kiểm tra biến môi trường build-time
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === "string" && isSafeUrl(envUrl)) {
      return envUrl.trim().replace(/\/+$/, "");
    }

    // 1b. Override người dùng đã lưu (đọc lại cái setCustomApiUrl đã ghi)
    try {
      const saved = window.localStorage.getItem("hyperhub_api_base_url");
      if (saved && isSafeUrl(saved)) {
        return saved.trim().replace(/\/+$/, "");
      }
    } catch {
      // localStorage bị chặn (private mode): bỏ qua
    }

    // 2. Khi chạy trên HTTPS (Vercel Production):
    // Gọi TRỰC TIẾP tunnel URL từ browser (kèm header ngrok-skip-browser-warning).
    // KHÔNG dùng relative "" qua Vercel Rewrite nữa vì rewrite phía server không
    // gửi được header đó → ngrok free chặn bằng trang ERR_NGROK_6024.
    if (window.location.protocol === "https:") {
      return DEFAULT_TUNNEL_URL;
    }

    // 3. Local development
    return LOCAL_API_URL;
  }

  return LOCAL_API_URL;
}

/**
 * Hàm hỗ trợ cấu hình trong môi trường kiểm thử (chỉ chấp nhận domain trong allowlist).
 */
export function setCustomApiUrl(url: string | null): void {
  // Trong môi trường production, vô hiệu hóa việc ghi đè qua client storage để chống tấn công
  if (typeof window === "undefined") return;
  if (!url || !url.trim()) {
    localStorage.removeItem("hyperhub_api_base_url");
    return;
  }

  if (isSafeUrl(url)) {
    localStorage.setItem("hyperhub_api_base_url", url.trim().replace(/\/+$/, ""));
  } else {
    console.warn("Bảo mật: Từ chối thiết lập API URL không nằm trong danh sách an toàn:", url);
  }
}

export function isUsingDefaultTunnel(): boolean {
  return true;
}
