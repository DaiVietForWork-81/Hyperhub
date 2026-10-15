import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Star,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  School,
  FileText,
  Hash,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ExamDocument, getEducationLevelBadgeInfo } from './Dashboard';
import { getGradeBadgeStyle, getExamTrackInfo, formatFileSize } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

interface ExamDossierModalProps {
  doc: ExamDocument | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (docId: number) => void;
  apiBase: string;
}

export const ExamDossierModal: React.FC<ExamDossierModalProps> = ({
  doc,
  isOpen,
  onClose,
  isBookmarked,
  onToggleBookmark,
  apiBase,
}) => {
  const { showSuccess, showInfo } = useToast();
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  if (!isOpen || !doc) return null;

  const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
  const trackInfo = getExamTrackInfo(doc);
  const downloadUrl = `${apiBase}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`;

  const handleCopyHash = () => {
    if (doc.file_hash) {
      navigator.clipboard.writeText(doc.file_hash);
      setCopiedHash(true);
      showInfo('Đã sao chép mã băm SHA-256 vào bộ nhớ tạm.', 'Bảo Mật');
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/hub#exam-${doc.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    showSuccess('Đã sao chép liên kết đề thi vào bộ nhớ tạm!', 'Chia Sẻ');
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const confidencePercent =
    doc.confidence != null ? Math.round(Number(doc.confidence) * 100) : 95;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950/95 border border-purple-500/30 shadow-2xl shadow-purple-950/50 backdrop-blur-2xl p-6 sm:p-8 space-y-6 text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng hồ sơ đề thi"
          className="absolute top-5 right-5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hồ Sơ */}
        <div className="space-y-3 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            {/* Môn học */}
            <span className="text-xs font-black uppercase px-3 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {doc.subject}
            </span>

            {/* Bậc giáo dục: Chung, Cấp 2, Cấp 3 */}
            {(() => {
              const eduBadge = getEducationLevelBadgeInfo(doc);
              return (
                <span className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${eduBadge.badgeClass}`}>
                  <span>{eduBadge.icon}</span>
                  <span>{eduBadge.label}</span>
                </span>
              );
            })()}

            {/* Khối lớp chuẩn 7 Discord Roles */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${gradeStyle.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${gradeStyle.dotColor}`} />
              <span>{gradeStyle.label}</span>
            </span>

            {/* Phân loại Track */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-md border flex items-center gap-1.5 ${trackInfo.badgeClass}`}
            >
              <span>{trackInfo.icon}</span>
              <span>{trackInfo.label}</span>
            </span>

            {/* Trạng thái Thẩm định */}
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{doc.verdict === 'XAC_MINH' ? 'Đã Thẩm Định ✅' : 'Tài Liệu Hợp Lệ'}</span>
            </span>

            {/* Chuẩn Bộ GD&ĐT 2025 */}
            {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) && (
              <span className="text-xs font-black uppercase px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm shadow-cyan-950/40">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chuẩn Bộ GD&ĐT 2025</span>
              </span>
            )}

            {/* Trạng thái Đáp án */}
            {doc.has_answer_keys && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Có Đáp Án</span>
              </span>
            )}

            {/* Trạng thái Lời giải */}
            {doc.has_detailed_solutions && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Lời Giải Chi Tiết</span>
              </span>
            )}
          </div>

          <h2 id="dossier-title" className="text-xl sm:text-2xl font-black text-white leading-tight">
            {doc.title || doc.file_name}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Tệp gốc: <span className="text-slate-300">{doc.file_name}</span> • Dung lượng:{' '}
            <span className="text-slate-300">{formatFileSize(doc.file_size_bytes)}</span>
          </p>
        </div>

        {/* Lưới Thông Tin Trích Xuất (AI Inspection Metrics Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Năm học */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Năm Học</span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {doc.academic_year || 'Đang cập nhật'}
            </div>
          </div>

          {/* Trường / Nguồn ra đề */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <School className="w-3.5 h-3.5 text-violet-400" />
              <span>Trường / Đơn Vị</span>
            </div>
            <div className="text-sm font-bold text-white truncate" title={doc.school_or_department || ''}>
              {doc.school_or_department || 'Đại trà'}
            </div>
          </div>

          {/* Số câu hỏi */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <FileText className="w-3.5 h-3.5 text-pink-400" />
              <span>Ước Tính</span>
            </div>
            <div className="text-sm font-bold text-white">
              {doc.question_count ? `${doc.question_count} Câu` : 'Đề tự luận / Trắc nghiệm'}
            </div>
          </div>

          {/* Số trang */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quy Mô</span>
            </div>
            <div className="text-sm font-bold text-white">
              {doc.page_count ? `${doc.page_count} Trang` : '1-4 Trang'}
            </div>
          </div>
        </div>

        {/* Khối Cấu Trúc Đề Thi Chuẩn Bộ GD&ĐT 2025 */}
        {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0) || (doc.moet_part2_count && doc.moet_part2_count > 0) || (doc.moet_part3_count && doc.moet_part3_count > 0)) && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-indigo-950/30 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-cyan-400" />
                Cấu Trúc Đề Thi Chuẩn Bộ GD&ĐT 2025
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                Form Mới
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <div className="text-[11px] text-slate-400 font-medium">Phần I: 4 Phương Án</div>
                <div className="font-bold text-white text-sm">
                  {doc.moet_part1_count ? `${doc.moet_part1_count} câu` : '12 câu'}
                </div>
                <div className="text-[10px] text-cyan-400/80">Chọn 1 phương án đúng</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <div className="text-[11px] text-slate-400 font-medium">Phần II: Đúng / Sai</div>
                <div className="font-bold text-white text-sm">
                  {doc.moet_part2_count ? `${doc.moet_part2_count} câu` : '4 câu'}
                </div>
                <div className="text-[10px] text-emerald-400/80">4 ý a, b, c, d mỗi câu</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                <div className="text-[11px] text-slate-400 font-medium">Phần III: Trả Lời Ngắn</div>
                <div className="font-bold text-white text-sm">
                  {doc.moet_part3_count ? `${doc.moet_part3_count} câu` : '6 câu'}
                </div>
                <div className="text-[10px] text-indigo-400/80">Điền số / kết quả ngắn</div>
              </div>
            </div>
          </div>
        )}

        {/* Thanh Độ Tin Cậy & Thẩm Định AI */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/40 to-indigo-950/40 border border-purple-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Độ Tin Cậy Phân Loại AI (DocInspector)
            </span>
            <span className="font-mono font-bold text-white bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
              {confidencePercent}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>

          {doc.notes && (
            <p className="text-xs text-slate-300 italic pt-1 border-t border-white/10">
              💡 Ghi chú hệ thống: {doc.notes}
            </p>
          )}
        </div>

        {/* Xác Thực Cryptographic SHA-256 (Chống Giả Mạo & Trùng Lặp) */}
        {doc.file_hash && (
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                Mã Băm Nhị Phân SHA-256 (C++ Fast Engine)
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <div className="font-mono text-[10px] text-slate-400 break-all bg-black/80 p-2 rounded-xl border border-white/5 selection:bg-purple-500 selection:text-white">
              {doc.file_hash}
            </div>
          </div>
        )}

        {/* Thanh Tác Vụ Chính */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => onToggleBookmark(doc.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border flex items-center gap-2 transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${isBookmarked ? 'fill-current text-amber-400' : ''}`} />
              <span>{isBookmarked ? 'Đã Lưu Tủ Sách' : 'Lưu Tủ Sách'}</span>
            </button>

            {/* Copy Share Link */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Sao chép liên kết chia sẻ đề thi"
            >
              {copiedShareLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mở xem tệp tab mới */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs sm:text-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở Tệp</span>
            </a>

            {/* Tải về trực tiếp */}
            <a
              href={downloadUrl}
              download={doc.file_name || 'de_thi.pdf'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Tải Về Trực Tiếp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
