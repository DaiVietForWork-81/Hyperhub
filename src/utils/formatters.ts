/**
 * utils/formatters.ts
 * Tiện ích chuẩn hóa và hiển thị dữ liệu học thuật trên giao diện HyperHub.
 */

/**
 * Chuẩn hóa nhãn khối lớp hiển thị thân thiện:
 * "Không rõ khối (thuong) • [C++]" hoặc "Không rõ khối" -> "Chung ( chung cho tất cả khối )"
 */
export function formatEstimatedLevel(level?: string | null): string {
  if (!level || !level.trim()) return 'Chung ( chung cho tất cả khối )';
  const trimmed = level.trim();

  // Kiểm tra nếu là các dạng tài liệu chung / không thuộc riêng một khối nào
  if (
    trimmed.includes('Không rõ') ||
    trimmed.includes('Chưa rõ') ||
    trimmed.toLowerCase().startsWith('chung /') ||
    trimmed === 'Chung' ||
    trimmed === 'ALL'
  ) {
    return 'Chung ( chung cho tất cả khối )';
  }

  return trimmed;
}

/**
 * Chuẩn hóa dung lượng file sang KB/MB dễ đọc.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Không rõ';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
