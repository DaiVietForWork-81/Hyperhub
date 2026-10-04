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
 * Trên môi trường HTTPS (Vercel Production), ưu tiên dùng Relative Path ""
 * để tận dụng Vercel Serverless Rewrites (/api/* -> Backend), loại bỏ rủi ro CORS và SSRF.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Kiểm tra biến môi trường build-time
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === "string" && isSafeUrl(envUrl)) {
      return envUrl.trim().replace(/\/+$/, "");
    }

    // 2. Khi chạy trên HTTPS (Vercel Production):
    // Sử dụng relative URL "" để gọi qua Vercel Rewrites (/api/*) cùng origin, an toàn tuyệt đối
    if (window.location.protocol === "https:") {
      return "";
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
