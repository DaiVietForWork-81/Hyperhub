/**
 * utils/discordAuth.ts
 * Quản lý xác thực 2 bước Discord OAuth2 + Mã xác minh 5 phút từ kênh #🔐・verify:
 * 1. Bước 1: Ủy quyền & liên kết tài khoản Discord qua OAuth2 (lưu vào trạng thái pendingUser trên localStorage để đồng bộ giữa các tab).
 * 2. Bước 2: Nhập mã OTP 6 chữ số (hiệu lực 5 phút, tạo mã mới tự hủy mã cũ) lấy từ kênh #🔐・verify (1568268605085454416).
 */

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
  email: string;
  verified: boolean;
  connectedAt?: string;
  accessToken?: string;
  pendingSavedAt?: number;
}

const STORAGE_KEY = "hyperhub_discord_user";
const PENDING_STORAGE_KEY = "hyperhub_pending_discord_user";
const TOKEN_STORAGE_KEY = "hyperhub_discord_token";
const STATE_STORAGE_KEY = "hyperhub_oauth_state";
const RETURN_PATH_STORAGE_KEY = "hyperhub_oauth_return_path";

export const DISCORD_CLIENT_ID = "1536298634990325871";
export const DISCORD_VERIFY_CHANNEL_URL =
  "https://discord.com/channels/1532265330079174697/1568268605085454416";

// Cache promise chống gọi kép trong React StrictMode
let inflightOAuthPromise: Promise<DiscordUser | null> | null = null;

function emitPendingUserChanged(user: DiscordUser | null): void {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("orbit:pending-user-changed", { detail: user }));
    } catch {}
  }
}

export function getStoredDiscordUser(): DiscordUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const user = JSON.parse(data) as DiscordUser;
    const token = getDiscordAccessToken();
    if (token && !user.accessToken) {
      user.accessToken = token;
    }
    return user;
  } catch {
    return null;
  }
}

export function getDiscordAccessToken(): string | null {
  try {
    if (typeof sessionStorage !== "undefined") {
      const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) return token;
    }
    const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localToken) return localToken;

    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.accessToken || null;
    }
    const pendingData = localStorage.getItem(PENDING_STORAGE_KEY);
    if (pendingData) {
      const parsedPending = JSON.parse(pendingData);
      return parsedPending.accessToken || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDiscordUser(user: DiscordUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.removeItem(PENDING_STORAGE_KEY);
    if (user.accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      if (user.accessToken) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
      }
    }
    emitPendingUserChanged(null);
  } catch (e) {
    console.error("Không thể lưu tài khoản Discord:", e);
  }
}

export function savePendingDiscordUser(user: DiscordUser): void {
  try {
    const payload: DiscordUser = {
      ...user,
      pendingSavedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(PENDING_STORAGE_KEY, serialized);
    if (user.accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(PENDING_STORAGE_KEY, serialized);
      if (user.accessToken) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
      }
    }
    emitPendingUserChanged(payload);
  } catch (e) {
    console.error("Không thể lưu tài khoản chờ xác minh mã:", e);
  }
}

export function getPendingDiscordUser(): DiscordUser | null {
  try {
    const raw =
      localStorage.getItem(PENDING_STORAGE_KEY) ||
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(PENDING_STORAGE_KEY) : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscordUser;
    // Giữ trạng thái tài khoản đã liên kết chờ nhập mã trong tối đa 60 phút
    if (parsed.pendingSavedAt && Date.now() - parsed.pendingSavedAt > 60 * 60 * 1000) {
      clearPendingDiscordUser();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingDiscordUser(): void {
  try {
    localStorage.removeItem(PENDING_STORAGE_KEY);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
    }
    emitPendingUserChanged(null);
  } catch {}
}

export function removeDiscordUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PENDING_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(STATE_STORAGE_KEY);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(STATE_STORAGE_KEY);
    }
    emitPendingUserChanged(null);
  } catch (e) {
    console.error("Không thể xóa tài khoản Discord:", e);
  }
}

export function consumeOAuthReturnPath(): string | null {
  try {
    const saved = localStorage.getItem(RETURN_PATH_STORAGE_KEY);
    if (saved) {
      localStorage.removeItem(RETURN_PATH_STORAGE_KEY);
      return saved;
    }
  } catch {}
  return null;
}

/**
 * Đồng bộ tài khoản đã liên kết lên database server (POST /api/account/link).
 */
export async function syncLinkedAccount(apiBaseUrl: string): Promise<boolean> {
  const token = getDiscordAccessToken();
  if (!token) return false;
  try {
    const base = (apiBaseUrl || "").replace(/\/+$/, "");
    const res = await fetch(`${base}/api/account/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.success);
  } catch {
    return false;
  }
}

export async function isStoredTokenAlive(): Promise<boolean> {
  const token = getDiscordAccessToken();
  if (!token) return true; // Nếu đăng nhập qua xác thực mã OTP 5 phút thì giữ phiên ổn định
  try {
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return true;
  }
}

/**
 * Tạo URL ủy quyền Discord OAuth2.
 * Lưu ý: Chỉ gọi hàm này khi người dùng bấm nút đăng nhập (onClick), KHÔNG gọi trực tiếp trong JSX render.
 */
export function getDiscordOAuth2Url(trailingSlash: boolean = false): string {
  const origin = window.location.origin.replace(/\/+$/, "") + (trailingSlash ? "/" : "");
  const redirectUri = encodeURIComponent(origin);
  const scope = encodeURIComponent("identify email");

  let state = "";
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      state = crypto.randomUUID();
    } else {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      state = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  try {
    localStorage.setItem(STATE_STORAGE_KEY, state);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(STATE_STORAGE_KEY, state);
    }
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath && currentPath !== "/") {
      localStorage.setItem(RETURN_PATH_STORAGE_KEY, currentPath);
    }
  } catch (e) {
    console.warn("Không thể lưu OAuth state:", e);
  }

  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${encodeURIComponent(state)}`;
}

export function startDiscordOAuthLogin(): void {
  if (typeof window === "undefined") return;
  window.location.href = getDiscordOAuth2Url();
}

/**
 * Kiểm tra xem URL có chứa #access_token từ Discord OAuth2 redirect không.
 * Sau khi lấy thông tin user từ Discord API, lưu vào pendingUser (Bước 1 hoàn tất)
 * để yêu cầu người dùng nhập mã xác minh 5 phút từ kênh #🔐・verify (Bước 2).
 */
export async function handleDiscordOAuthCallback(): Promise<DiscordUser | null> {
  if (typeof window === "undefined") return null;

  if (inflightOAuthPromise) {
    return inflightOAuthPromise;
  }

  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return null;

  inflightOAuthPromise = (async () => {
    try {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");

      // Xóa ngay lập tức fragment khỏi thanh địa chỉ
      const returnPath = consumeOAuthReturnPath();
      const targetUrl = returnPath || window.location.pathname + window.location.search;
      window.history.replaceState(null, "", targetUrl);

      if (!accessToken) return null;

      try {
        localStorage.removeItem(STATE_STORAGE_KEY);
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(STATE_STORAGE_KEY);
          sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        }
      } catch {}

      const res = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        console.error("Lỗi lấy thông tin user từ Discord API:", res.status);
        return null;
      }

      const userData = await res.json();
      const discordUser: DiscordUser = {
        id: String(userData.id),
        username: userData.username,
        global_name: userData.global_name || userData.username,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || "0", 10) % 5}.png`,
        email: userData.email || "",
        verified: Boolean(userData.verified),
        connectedAt: new Date().toISOString(),
        accessToken: accessToken,
      };

      // Lưu vào trạng thái chờ nhập mã xác minh 5 phút từ kênh #🔐・verify
      savePendingDiscordUser(discordUser);
      return discordUser;
    } catch (err) {
      console.error("Lỗi xử lý Discord OAuth2 callback:", err);
      return null;
    } finally {
      inflightOAuthPromise = null;
    }
  })();

  return inflightOAuthPromise;
}
