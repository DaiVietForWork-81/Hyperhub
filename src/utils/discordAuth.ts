/**
 * utils/discordAuth.ts
 * Quản lý xác thực và liên kết tài khoản Discord (Client-side & OAuth2 token exchange).
 * Bắt buộc kiểm tra email đã xác minh (verified: true).
 */

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
  email: string;
  verified: boolean; // Bắt buộc email đã xác minh trên Discord
  connectedAt?: string;
}

const STORAGE_KEY = "hyperhub_discord_user";
export const DISCORD_CLIENT_ID = "1536298634990325871";

export function getStoredDiscordUser(): DiscordUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as DiscordUser;
  } catch {
    return null;
  }
}

export function saveDiscordUser(user: DiscordUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Không thể lưu tài khoản Discord vào localStorage:", e);
  }
}

export function removeDiscordUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Không thể xóa tài khoản Discord:", e);
  }
}

/**
 * Tạo URL ủy quyền Discord OAuth2 (Implicit Grant Flow lấy Access Token trực tiếp).
 */
export function getDiscordOAuth2Url(): string {
  const redirectUri = encodeURIComponent(window.location.origin);
  const scope = encodeURIComponent("identify email");
  return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
}

/**
 * Kiểm tra xem URL có chứa #access_token từ Discord OAuth2 redirect không.
 * Nếu có, tự động gọi API Discord để lấy thông tin người dùng và lưu phiên.
 */
export async function handleDiscordOAuthCallback(): Promise<DiscordUser | null> {
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return null;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    if (!accessToken) return null;

    // Xóa hash trên thanh địa chỉ để an toàn và thẩm mỹ
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

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
    };

    saveDiscordUser(discordUser);
    return discordUser;
  } catch (err) {
    console.error("Lỗi xử lý Discord OAuth2 callback:", err);
    return null;
  }
}
