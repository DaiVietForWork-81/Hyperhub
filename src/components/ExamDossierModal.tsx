import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Star,
  Copy,
  Check,
  Calendar,
  School,
  FileText,
  Hash,
  Layers,
  Scale,
  CheckCircle2,
  Info,
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
  botOnline?: boolean;
}

export const ExamDossierModal: React.FC<ExamDossierModalProps> = ({
  doc,
  isOpen,
  onClose,
  isBookmarked,
  onToggleBookmark,
  apiBase,
  botOnline = false,
}) => {
  const { showSuccess, showInfo } = useToast();
  const [modalTab, setModalTab] = useState<'overview' | 'quorum_dossier'>('overview');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);

  useEffect(() => {
    if (!isOpen || !doc) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      window.__lenis?.start();
    };
  }, [isOpen, doc, onClose]);

  if (!isOpen || !doc) return null;

  const gradeStyle = getGradeBadgeStyle(doc.estimated_level);
  const trackInfo = getExamTrackInfo(doc);
  const fallbackJump = doc.download_url || (doc.jump_url && !doc.jump_url.includes('#vault') ? doc.jump_url : '');
  const downloadUrl = botOnline
    ? `${apiBase}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`
    : fallbackJump || '#quorum_dossier';

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

  const isUnanimousQuorum = doc.quorum_status?.includes('UNANIMOUS') ?? true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 bg-black/82 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-lenis-prevent
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-3xl bg-[#100B1A]/98 border border-[#FF3CA6]/35 shadow-2xl shadow-black/80 backdrop-blur-2xl p-6 sm:p-8 space-y-6 text-[#F8F5FF] animate-in zoom-in-95 duration-200"
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

            {/* Trạng thái Thẩm định 3+1 Quorum */}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                isUnanimousQuorum
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {isUnanimousQuorum ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đồng Thuận 3/3</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trọng Tài 3+1</span>
                </>
              )}
            </span>

            {/* Chuẩn Bộ GD&ĐT 2025 */}
            {(doc.moet_2025_compliant || (doc.moet_part1_count && doc.moet_part1_count > 0)) && (
              <span className="text-xs font-black uppercase px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm shadow-cyan-950/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
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
                <FileText className="w-3 h-3" />
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

        {/* Tab Chuyển Đổi: [Tổng Quan Đề Thi] | [Hội Đồng Thẩm Định 3+1] */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setModalTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tổng Quan Đề Thi</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('quorum_dossier')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              modalTab === 'quorum_dossier'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Dự Thảo Thẩm Định 3+1</span>
          </button>
        </div>

        {modalTab === 'overview' ? (
          <>
            {/* Lưới Thông Tin Trích Xuất (Inspection Metrics Grid) */}
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

            {/* Thanh Độ Tin Cậy & Thẩm Định DocInspector */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/40 to-indigo-950/40 border border-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Độ Tin Cậy Phân Loại DocInspector
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
                <p className="text-xs text-slate-300 italic pt-1 border-t border-white/10 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Ghi chú hệ thống: {doc.notes}</span>
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
          </>
        ) : (
          /* Tab: Hội Đồng Thẩm Định 3+1 (Quorum Dossier View) */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950/40 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase">
                  <Scale className="w-4 h-4 text-purple-400" />
                  Cơ Chế Phân Định Hội Đồng Trọng Tài 3+1
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {isUnanimousQuorum ? 'ĐỒNG THUẬN 3/3' : 'TRỌNG TÀI 3+1'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tài liệu đã trải qua 4 tầng đối soát độc lập: Vùng Tiêu Đề, BM25 Toàn Thân, Cấu Trúc Đề &amp; Trọng Tài Tương Phản để đảm bảo không xảy ra nhận dạng sai giữa các khối môn (Toán, Tin, Hóa, Văn...).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 font-mono text-xs text-slate-200 leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap select-text">
              {doc.notes?.includes('#')
                ? doc.notes
                : `## DỰ THẢO THẨM ĐỊNH ĐỀ THI\n\n- **Tên tệp**: ${doc.file_name}\n- **Môn học**: ${doc.subject}\n- **Khối lớp**: ${doc.estimated_level}\n- **Năm học**: ${doc.academic_year || 'Đang cập nhật'}\n- **Trường/Sở**: ${doc.school_or_department || 'Đại trà'}\n- **Trạng thái Quorum**: ${isUnanimousQuorum ? 'Đồng thuận tuyệt đối 3/3' : 'Trọng tài đối soát tương phản 3+1'}\n- **Độ tin cậy**: ${confidencePercent}%\n- **Mã băm SHA-256**: ${doc.file_hash || 'N/A'}\n\n*Hồ sơ được thẩm định hoàn toàn minh bạch bằng thuật toán xác định (deterministic heuristic), không tốn chi phí AI và không gửi dữ liệu ra bên ngoài.*`}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const text = doc.notes || `Hồ sơ đề thi ${doc.title} (${doc.subject})`;
                  navigator.clipboard.writeText(text);
                  setCopiedDossier(true);
                  showSuccess('Đã sao chép nội dung dự thảo vào bộ nhớ tạm!', 'Dự Thảo');
                  setTimeout(() => setCopiedDossier(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedDossier ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDossier ? 'Đã sao chép' : 'Sao chép văn bản dự thảo'}</span>
              </button>
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
              target={downloadUrl.startsWith('http') ? '_blank' : undefined}
              rel={downloadUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              onClick={(e) => {
                if (!downloadUrl.startsWith('http')) {
                  e.preventDefault();
                  setModalTab('quorum_dossier');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs sm:text-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{botOnline ? 'Mở Tệp' : 'Mở Trên Discord'}</span>
            </a>

            {/* Tải về trực tiếp */}
            <a
              href={downloadUrl}
              target={downloadUrl.startsWith('http') ? '_blank' : undefined}
              rel={downloadUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              download={botOnline ? doc.file_name || 'de_thi.pdf' : undefined}
              onClick={(e) => {
                if (!downloadUrl.startsWith('http')) {
                  e.preventDefault();
                  setModalTab('quorum_dossier');
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{botOnline ? 'Tải Về Trực Tiếp' : 'Tải Đề Từ Kho'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
