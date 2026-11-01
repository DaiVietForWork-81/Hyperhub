#!/usr/bin/env node
/**
 * scripts/sync-khoahoc.mjs
 * Đồng bộ 1 chiều phân hệ Khóa Học từ kho mã nguồn độc lập:
 *   https://github.com/DaiVietForWork-81/khoahoc -> d:\Project\Web\src\courses
 *
 * Chỉ cập nhật đúng thư mục `src/courses/*` của Web, tuyệt đối KHÔNG đồng bộ ngược
 * các thành phần khác (Bot, DocInspector, phần còn lại của Web) sang repo `khoahoc`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const TARGET_COURSES_DIR = path.join(WEB_ROOT, 'src', 'courses');
const REPO_GIT_URL = 'https://github.com/DaiVietForWork-81/khoahoc.git';

const FILES_TO_SYNC = [
  { remote: 'src/courses/types.ts', local: 'types.ts' },
  { remote: 'src/courses/coursesCatalog.ts', local: 'coursesCatalog.ts' },
  { remote: 'src/courses/CoursesHub.tsx', local: 'CoursesHub.tsx' },
];

function resolveLatestCommitSha() {
  try {
    const out = execSync(`git ls-remote ${REPO_GIT_URL} refs/heads/main`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const sha = out.split(/\s+/)[0];
    if (sha && /^[0-9a-f]{40}$/i.test(sha)) {
      return sha;
    }
  } catch {
    // Fallback to 'main'
  }
  return 'main';
}

async function main() {
  const ref = resolveLatestCommitSha();
  const rawBase = `https://raw.githubusercontent.com/DaiVietForWork-81/khoahoc/${ref}`;
  console.log(
    `🔄 Đang đồng bộ phân hệ Khóa Học từ https://github.com/DaiVietForWork-81/khoahoc (ref: ${ref.slice(0, 7)}) ...`
  );
  await fs.mkdir(TARGET_COURSES_DIR, { recursive: true });

  for (const item of FILES_TO_SYNC) {
    const url = `${rawBase}/${item.remote}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Không thể tải ${item.remote} (HTTP ${res.status})`);
    }
    const content = await res.text();
    const destPath = path.join(TARGET_COURSES_DIR, item.local);
    await fs.writeFile(destPath, content, 'utf8');
    console.log(`  ✅ Đã cập nhật: src/courses/${item.local}`);
  }

  console.log('🎉 Hoàn tất đồng bộ Khóa Học từ DaiVietForWork-81/khoahoc vào Web!');
}

main().catch((err) => {
  console.error('❌ Lỗi đồng bộ khoahoc:', err.message);
  process.exit(1);
});
