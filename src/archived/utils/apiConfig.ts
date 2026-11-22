/**
 * utils/apiConfig.ts
 * Cấu hình kết nối API bảo mật cho Orbit | Vietnam (Sử dụng trực tiếp Vercel Serverless Bridge + Turso Cloud).
 * Không cần ngrok hay Cloudflare Tunnel.
 */

export const DEFAULT_VERCEL_URL = "https://orbit-psi-black.vercel.app";
export const DEFAULT_TUNNEL_URL = DEFAULT_VERCEL_URL;
export const LOCAL_API_URL = "http://127.0.0.1:8080";

export const API_FETCH_HEADERS: Record<string, string> = {
  "Accept": "application/json",
};

// Danh sách domain an toàn được phép (Allowlist)
const ALLOWED_API_HOSTS = [
  "localhost",
  "127.0.0.1",
  "orbit-psi-black.vercel.app",
  "hyperhub-one.vercel.app", // domain cũ — giữ để tương thích URL/localStorage cũ
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
 * - Trên môi trường HTTPS (https://orbit-psi-black.vercel.app): trả về "" (same-origin /api/* ngay trên chính Vercel!).
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

export const DISCORD_WEB_SYNC_WEBHOOK_ID = "1556682296235393034";
export const DISCORD_WEB_SYNC_WEBHOOK_URL = "";

export interface WebhookHandshakeOptions {
  event?: string;
  view?: string;
  tab?: string;
  username?: string;
  userId?: string;
  force?: boolean;
}

/**
 * Kết nối trực tiếp giữa Orbit Web và Discord Bot qua Cầu nối Bảo mật 7 Lớp (Turso Cloud RPC).
 * Đã tắt hoàn toàn thông báo Discord Webhook theo yêu cầu.
 */
export async function notifyBotViaWebhookHandshake(
  opts: WebhookHandshakeOptions = {}
): Promise<{ ok: boolean; webhook_id: string; bot_online?: boolean; bot_status?: any }> {
  const event = opts.event || "web_active";
  const origin =
    typeof window !== "undefined" ? window.location.origin : DEFAULT_VERCEL_URL;
  const view = opts.view || "home";
  const tab = opts.tab || "overview";
  const username = opts.username || "Khách truy cập";

  if (typeof window !== "undefined" && !opts.force) {
    try {
      const key = `orbit_direct_handshake_${event}`;
      const prevTs = Number(window.sessionStorage.getItem(key) || "0");
      const nowMs = Date.now();
      const cooldownMs = event === "web_boot" ? 180_000 : 90_000;
      if (nowMs - prevTs < cooldownMs) {
        return { ok: true, webhook_id: DISCORD_WEB_SYNC_WEBHOOK_ID };
      }
      window.sessionStorage.setItem(key, String(nowMs));
    } catch {}
  }

  const baseUrl = getApiBaseUrl();
  try {
    const resp = await fetch(`${baseUrl}/api/webhook/handshake`, {
      method: "POST",
      headers: {
        ...API_FETCH_HEADERS,
        "Content-Type": "application/json",
        ...(opts.userId ? { "X-Discord-User-Id": opts.userId } : {}),
      },
      body: JSON.stringify({
        event,
        origin,
        view,
        tab,
        username,
        user_id: opts.userId || "",
        notify_discord: false,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        ok: true,
        webhook_id: DISCORD_WEB_SYNC_WEBHOOK_ID,
        bot_online: data.bot_online ?? true,
        bot_status: data.bot_status || data,
      };
    }
  } catch {}

  return { ok: false, webhook_id: DISCORD_WEB_SYNC_WEBHOOK_ID };
}
