/**
 * utils/routeParser.ts
 * Bộ phân tích điều hướng SPA thống nhất cho Orbit | Vietnam (Khử trùng lặp 3 nơi trong App.tsx).
 */

export type AppView = 'home' | 'dashboard';
export type DashboardTab =
  | 'overview'
  | 'courses'
  | 'forum'
  | 'vault'
  | 'get_exam'
  | 'submit_doc'
  | 'admin';

export interface ParsedAppRoute {
  view: AppView;
  tab: DashboardTab;
}

export function parseAppRoute(pathname: string = '/', hash: string = ''): ParsedAppRoute {
  const p = (pathname || '/').toLowerCase();
  const h = (hash || '').toLowerCase();

  if (p.startsWith('/admin') || h === '#admin') {
    return { view: 'dashboard', tab: 'admin' };
  }
  if (p.startsWith('/vault') || p.startsWith('/khode') || h === '#vault') {
    return { view: 'dashboard', tab: 'vault' };
  }
  if (p.startsWith('/get_exam') || h === '#get_exam') {
    return { view: 'dashboard', tab: 'get_exam' };
  }
  if (p.startsWith('/submit_doc') || h === '#submit_doc') {
    return { view: 'dashboard', tab: 'submit_doc' };
  }
  if (p.startsWith('/courses') || p.startsWith('/khoahoc') || h === '#courses') {
    return { view: 'dashboard', tab: 'courses' };
  }
  if (p.startsWith('/forum') || p.startsWith('/diendan') || h === '#forum') {
    return { view: 'dashboard', tab: 'forum' };
  }
  if (p.startsWith('/hub') || h === '#hub' || h === '#dashboard') {
    return { view: 'dashboard', tab: 'overview' };
  }

  return { view: 'home', tab: 'overview' };
}

export function buildAppRoutePath(
  view: AppView,
  tab: DashboardTab = 'overview',
  search: string = ''
): string {
  if (view === 'home') return '/';
  const s = search || '';
  if (tab === 'admin') return `/admin${s}`;
  if (tab === 'courses') return `/courses${s}`;
  if (tab === 'forum') return `/forum${s}`;
  return `/hub${s}`;
}
