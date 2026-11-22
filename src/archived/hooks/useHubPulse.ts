import { useEffect, useState } from 'react';
import { getApiBaseUrl, API_FETCH_HEADERS } from '../utils/apiConfig';
import { getTursoStorageUsage } from '../utils/tursoClient';

/**
 * Trạng thái THẬT của hệ thống HyperHub cho trang chủ:
 *  - docCount: số đề trong kho (GET /api/documents/stats hoặc fallback trực tiếp từ Turso Cloud DB)
 *  - bot: trạng thái bot Discord (GET /api/status)
 * Một request dùng chung cho mọi component (cache theo module).
 * Không bao giờ hiển thị số giả: chỉ lấy từ API thật hoặc Turso Cloud DB thật.
 */
export type BotState = 'checking' | 'online' | 'offline';

export interface HubPulse {
  bot: BotState;
  pingMs: number | null;
  docCount: number | null;
}

let cache: Promise<HubPulse> | null = null;

const fetchJson = async (path: string): Promise<Record<string, unknown> | null> => {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}${path}`, {
      headers: API_FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      return (await res.json()) as Record<string, unknown>;
    }
  } catch {
    // Fallback sang Vercel API nếu gọi Local API bị gián đoạn
  }
  if (base && !base.includes('orbit-psi-black.vercel.app')) {
    try {
      const res2 = await fetch(`https://orbit-psi-black.vercel.app${path}`, {
        headers: API_FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (res2.ok) {
        return (await res2.json()) as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const load = (): Promise<HubPulse> => {
  if (!cache) {
    cache = Promise.all([
      fetchJson('/api/status'),
      fetchJson('/api/documents/stats'),
      getTursoStorageUsage().catch(() => null),
    ]).then(([status, stats, turso]) => {
      const online = status?.status === 'online';
      const apiCount = Number(stats?.total_real ?? stats?.total_items ?? 0);
      const tursoCount = Number(turso?.totalDocs ?? 0);
      const count = apiCount > 0 ? apiCount : tursoCount;
      const result: HubPulse = {
        bot: online ? 'online' : 'offline',
        pingMs: online && typeof status?.ping_ms === 'number' ? (status.ping_ms as number) : null,
        docCount: Number.isFinite(count) && count > 0 ? count : null,
      };
      if (result.bot !== 'online' || result.docCount === null) {
        // Không khoá cache vĩnh viễn nếu lần đầu bị cold-start
        setTimeout(() => {
          cache = null;
        }, 1500);
      }
      return result;
    });
  }
  return cache;
};

export const useHubPulse = (): HubPulse => {
  const [pulse, setPulse] = useState<HubPulse>({ bot: 'checking', pingMs: null, docCount: null });
  useEffect(() => {
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    // Lấy nhanh tổng số đề từ Turso Cloud (~90ms) trước khi API local/tunnel kịp timeout
    getTursoStorageUsage()
      .then((t) => {
        if (alive && t && t.totalDocs > 0) {
          setPulse((prev) => (prev.docCount ? prev : { ...prev, docCount: t.totalDocs }));
        }
      })
      .catch(() => {});
    const fetchPulse = (attempt = 0) => {
      load().then((p) => {
        if (!alive) return;
        setPulse(p);
        if ((p.bot !== 'online' || p.docCount === null) && attempt < 3) {
          retryTimer = setTimeout(() => {
            cache = null;
            fetchPulse(attempt + 1);
          }, 1600);
        }
      });
    };
    fetchPulse(0);
    return () => {
      alive = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);
  return pulse;
};
