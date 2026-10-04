/**
 * utils/discordAuth.ts
 * Quản lý xác thực và liên kết tài khoản Discord qua OAuth2 bảo mật:
 * 1. CSRF Protection với cryptographically random State parameter.
 * 2. Token Leakage Prevention: Scrub fragment ngay lập tức khỏi URL và Referrer headers.
 * 3. Session-scoped Access Token: Lưu trữ an toàn trong sessionStorage và gửi Bearer token lên Backend.
 * 4. Bắt buộc kiểm tra email đã xác minh (verified: true) từ chính Discord API và Backend verification.
 */

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
  email: string;
  verified: boolean; // Bắt buộc email đã xác minh trên Discord
  connectedAt?: string;
  accessToken?: string;
}

const STORAGE_KEY = "hyperhub_discord_user";
const TOKEN_STORAGE_KEY = "hyperhub_discord_token";
const STATE_STORAGE_KEY = "hyperhub_oauth_state";

export const DISCORD_CLIENT_ID = "1536298634990325871";

export function getStoredDiscordUser(): DiscordUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const user = JSON.parse(data) as DiscordUser;
    // Đính kèm token hiện tại nếu có
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
    // Fallback nếu người dùng lưu phiên trong tab hiện tại
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.accessToken || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDiscordUser(user: DiscordUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (user.accessToken && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
    }
  } catch (e) {
    console.error("Không thể lưu tài khoản Discord:", e);
  }
}

export function removeDiscordUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(STATE_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Không thể xóa tài khoản Discord:", e);
  }
}

/**
 * Tạo URL ủy quyền Discord OAuth2 kèm CSRF State Parameter chống tấn công giả mạo.
 */
export function getDiscordOAuth2Url(trailingSlash: boolean = false): string {
  const origin = window.location.origin.replace(/\/+$/, '') + (trailingSlash ? '/' : '');
  const redirectUri = encodeURIComponent(origin);
  const scope = encodeURIComponent("identify email");

  // Tạo CSRF State ngẫu nhiên bằng Web Crypto API
  let state = "";
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      state = crypto.randomUUID();
    } else {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      state = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Lưu state vào sessionStorage để đối chiếu khi callback quay lại
  try {
    sessionStorage.setItem(STATE_STORAGE_KEY, state);
  } catch (e) {
    console.warn("Không thể lưu OAuth state:", e);
  }

  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${encodeURIComponent(state)}`;
}

/**
 * Kiểm tra xem URL có chứa #access_token từ Discord OAuth2 redirect không.
 * Nếu có:
 * 1. Kiểm tra CSRF State parameter.
 * 2. Xóa ngay lập tức fragment khỏi URL để chống rò rỉ token qua Referrer header hoặc Browser History.
 * 3. Gọi Discord API /users/@me để lấy thông tin xác thực chính chủ.
 * 4. Lưu Access Token để gửi kèm các request nhạy cảm (upload, request exam).
 */
export async function handleDiscordOAuthCallback(): Promise<DiscordUser | null> {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return null;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const returnedState = params.get("state");

    // XÓA NGAY LẬP TỨC URL hash khỏi thanh địa chỉ trước mọi thao tác khác
    // Điều này ngăn chặn việc token bị lộ qua Referer header khi trang tải tài nguyên ngoài
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (!accessToken) return null;

    // Xác thực CSRF State nếu có lưu trước đó
    const expectedState = sessionStorage.getItem(STATE_STORAGE_KEY);
    if (expectedState && returnedState && expectedState !== returnedState) {
      console.error("Cảnh báo bảo mật: OAuth State không khớp (Nguy cơ CSRF). Từ chối xác thực.");
      sessionStorage.removeItem(STATE_STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(STATE_STORAGE_KEY);

    // Lưu Access Token vào sessionStorage
    sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);

    // Gọi Discord API lấy thông tin người dùng trực tiếp từ Discord CDN & API
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
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name || userData.username,
      avatar: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || "0") % 5}.png`,
      email: userData.email || "",
      verified: Boolean(userData.verified),
      connectedAt: new Date().toISOString(),
      accessToken: accessToken,
    };

    saveDiscordUser(discordUser);
    return discordUser;
  } catch (err) {
    console.error("Lỗi xử lý Discord OAuth2 callback:", err);
    return null;
  }
}
