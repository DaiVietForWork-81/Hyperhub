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
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: API_FETCH_HEADERS,
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
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
      return {
        bot: online ? 'online' : 'offline',
        pingMs: online && typeof status?.ping_ms === 'number' ? (status.ping_ms as number) : null,
        docCount: Number.isFinite(count) && count > 0 ? count : null,
      };
    });
  }
  return cache;
};

export const useHubPulse = (): HubPulse => {
  const [pulse, setPulse] = useState<HubPulse>({ bot: 'checking', pingMs: null, docCount: null });
  useEffect(() => {
    let alive = true;
    // Lấy nhanh tổng số đề từ Turso Cloud (~90ms) trước khi API local/tunnel kịp timeout
    getTursoStorageUsage()
      .then((t) => {
        if (alive && t && t.totalDocs > 0) {
          setPulse((prev) => (prev.docCount ? prev : { ...prev, docCount: t.totalDocs }));
        }
      })
      .catch(() => {});
    load().then((p) => {
      if (alive) setPulse(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return pulse;
};
