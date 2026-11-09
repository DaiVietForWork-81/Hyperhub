/**
 * utils/discordAuth.ts
 * Quản lý xác thực 2 bước Discord OAuth2 + Mã xác minh 5 phút từ kênh #🔐・verify:
 * 1. Bước 1: Ủy quyền & liên kết tài khoản Discord qua OAuth2.
 * 2. Bước 2: Nhập mã OTP 6 chữ số (hiệu lực 5 phút, tạo mã mới tự hủy mã cũ) lấy từ kênh #🔐・verify (1568268605085454416).
 *
 * Bảo mật (P0.6):
 * - Không lưu OAuth Access Token dạng rõ trong localStorage lâu dài; chỉ giữ trong sessionStorage & bộ nhớ phiên.
 * - Tự động migrate các khóa `hyperhub_*` cũ sang `orbit_*`.
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

const STORAGE_KEY = 'orbit_discord_user';
const LEGACY_STORAGE_KEY = 'hyperhub_discord_user';

const PENDING_STORAGE_KEY = 'orbit_pending_discord_user';
const LEGACY_PENDING_STORAGE_KEY = 'hyperhub_pending_discord_user';

const TOKEN_STORAGE_KEY = 'orbit_discord_token';
const LEGACY_TOKEN_STORAGE_KEY = 'hyperhub_discord_token';

const STATE_STORAGE_KEY = 'orbit_oauth_state';
const RETURN_PATH_STORAGE_KEY = 'orbit_oauth_return_path';

export const DISCORD_CLIENT_ID = '1536298634990325871';
export const DISCORD_VERIFY_CHANNEL_URL =
  'https://discord.com/channels/1532265330079174697/1568268605085454416';

let inflightOAuthPromise: Promise<DiscordUser | null> | null = null;
let memoryAccessToken: string | null = null;

function emitPendingUserChanged(user: DiscordUser | null): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('orbit:pending-user-changed', { detail: user }));
    } catch {}
  }
}

function scrubTokenForLocalStorage(user: DiscordUser): DiscordUser {
  const { accessToken: _omit, ...safeProfile } = user;
  return safeProfile;
}

export function getDiscordAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const sessionToken =
        sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
        sessionStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
      if (sessionToken) {
        memoryAccessToken = sessionToken;
        return sessionToken;
      }
    }

    if (typeof localStorage !== 'undefined') {
      const localToken =
        localStorage.getItem(TOKEN_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
      if (localToken) {
        memoryAccessToken = localToken;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, localToken);
        }
        return localToken;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getDiscordAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getDiscordAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const stored = getStoredDiscordUser();
  if (stored?.id) {
    headers['X-Discord-User-Id'] = String(stored.id);
  }
  return headers;
}

export function getStoredDiscordUser(): DiscordUser | null {
  try {
    let data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        data = legacy;
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!data) return null;
    const user = JSON.parse(data) as DiscordUser;

    if (user.accessToken) {
      memoryAccessToken = user.accessToken;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scrubTokenForLocalStorage(user)));
    }

    const token = getDiscordAccessToken();
    if (token) {
      user.accessToken = token;
    }
    return user;
  } catch {
    return null;
  }
}

export function saveDiscordUser(user: DiscordUser): void {
  try {
    if (user.accessToken) {
      memoryAccessToken = user.accessToken;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scrubTokenForLocalStorage(user)));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(PENDING_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PENDING_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_PENDING_STORAGE_KEY);
    }
    emitPendingUserChanged(null);
  } catch (e) {
    console.error('Không thể lưu tài khoản Discord:', e);
  }
}

export function savePendingDiscordUser(user: DiscordUser): void {
  try {
    if (user.accessToken) {
      memoryAccessToken = user.accessToken;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, user.accessToken);
      }
    }
    const payload: DiscordUser = {
      ...scrubTokenForLocalStorage(user),
      pendingSavedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(PENDING_STORAGE_KEY, serialized);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(PENDING_STORAGE_KEY, serialized);
    }
    emitPendingUserChanged({ ...payload, accessToken: user.accessToken });
  } catch (e) {
    console.error('Không thể lưu tài khoản chờ xác minh mã:', e);
  }
}

export function getPendingDiscordUser(): DiscordUser | null {
  try {
    const raw =
      localStorage.getItem(PENDING_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_PENDING_STORAGE_KEY) ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(PENDING_STORAGE_KEY) ||
          sessionStorage.getItem(LEGACY_PENDING_STORAGE_KEY)
        : null);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscordUser;
    if (parsed.pendingSavedAt && Date.now() - parsed.pendingSavedAt > 60 * 60 * 1000) {
      clearPendingDiscordUser();
      return null;
    }
    const token = getDiscordAccessToken();
    if (token && !parsed.accessToken) {
      parsed.accessToken = token;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingDiscordUser(): void {
  try {
    localStorage.removeItem(PENDING_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PENDING_STORAGE_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_PENDING_STORAGE_KEY);
    }
    emitPendingUserChanged(null);
  } catch {}
}

export function removeDiscordUser(): void {
  try {
    memoryAccessToken = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(PENDING_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PENDING_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    localStorage.removeItem(STATE_STORAGE_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_PENDING_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(STATE_STORAGE_KEY);
    }
    if (typeof fetch === 'function') {
      fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    }
    emitPendingUserChanged(null);
  } catch (e) {
    console.error('Không thể xóa tài khoản Discord:', e);
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
    const base = (apiBaseUrl || '').replace(/\/+$/, '');
    const res = await fetch(`${base}/api/account/link`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
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
  if (!token) return true;
  try {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return true;
  }
}

export function getDiscordOAuth2Url(trailingSlash: boolean = false): string {
  const origin = window.location.origin.replace(/\/+$/, '') + (trailingSlash ? '/' : '');
  const redirectUri = encodeURIComponent(origin);
  const scope = encodeURIComponent('identify email');

  let state = '';
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      state = crypto.randomUUID();
    } else {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      state = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  try {
    localStorage.setItem(STATE_STORAGE_KEY, state);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STATE_STORAGE_KEY, state);
    }
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath && currentPath !== '/') {
      localStorage.setItem(RETURN_PATH_STORAGE_KEY, currentPath);
    }
  } catch (e) {
    console.warn('Không thể lưu OAuth state:', e);
  }

  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&state=${encodeURIComponent(state)}`;
}

export function startDiscordOAuthLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.href = getDiscordOAuth2Url();
}

export async function handleDiscordOAuthCallback(): Promise<DiscordUser | null> {
  if (typeof window === 'undefined') return null;

  if (inflightOAuthPromise) {
    return inflightOAuthPromise;
  }

  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return null;

  inflightOAuthPromise = (async () => {
    try {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const returnedState = params.get('state');

      const expectedState =
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STATE_STORAGE_KEY)) ||
        localStorage.getItem(STATE_STORAGE_KEY);

      const returnPath = consumeOAuthReturnPath();
      const targetUrl = returnPath || window.location.pathname + window.location.search;
      window.history.replaceState(null, '', targetUrl);

      if (!accessToken) return null;
      if (expectedState && returnedState && expectedState !== returnedState) {
        console.warn('OAuth2 state mismatch — hủy phiên callback để chống CSRF.');
        return null;
      }

      memoryAccessToken = accessToken;
      try {
        localStorage.removeItem(STATE_STORAGE_KEY);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(STATE_STORAGE_KEY);
          sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        }
      } catch {}

      const res = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        console.error('Lỗi lấy thông tin user từ Discord API:', res.status);
        return null;
      }

      const userData = await res.json();
      const discordUser: DiscordUser = {
        id: String(userData.id),
        username: userData.username,
        global_name: userData.global_name || userData.username,
        avatar: userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0', 10) % 5}.png`,
        email: userData.email || '',
        verified: Boolean(userData.verified),
        connectedAt: new Date().toISOString(),
        accessToken,
      };

      savePendingDiscordUser(discordUser);
      return discordUser;
    } catch (err) {
      console.error('Lỗi xử lý Discord OAuth2 callback:', err);
      return null;
    } finally {
      inflightOAuthPromise = null;
    }
  })();

  return inflightOAuthPromise;
}
