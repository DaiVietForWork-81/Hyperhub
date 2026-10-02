import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Eye,
  Download,
  X,
  FileText,
  Check,
  Plus,
} from 'lucide-react';
import { DiscordUser } from '../utils/discordAuth';
import { formatEstimatedLevel, formatFileSize } from '../utils/formatters';

interface DocUploadZoneProps {
  apiBase: string;
  user: DiscordUser | null;
  onOpenAuthModal: () => void;
  onPreviewDoc?: (doc: any) => void;
  onUploadSuccess?: () => void;
}

export interface InspectionResult {
  id: number;
  title: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  detected_subject: string;
  estimated_level: string;
  exam_type: string;
  confidence_score: number;
  question_count: number;
  page_count: number;
  academic_year?: string;
  school_or_department?: string;
  summary: string;
  file_hash?: string;
  download_url: string;
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'duplicate' | 'error';
  result?: InspectionResult;
  errorMessage?: string;
}

export const DocUploadZone: React.FC<DocUploadZoneProps> = ({
  apiBase,
  user,
  onOpenAuthModal,
  onPreviewDoc,
  onUploadSuccess,
}) => {
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [generalError, setGeneralError] = useState<string>('');
  const [hasCompletedBatch, setHasCompletedBatch] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
    // Reset file input để có thể chọn lại các tệp cùng tên
    if (e.target) {
      e.target.value = '';
    }
  };

  const addFilesToQueue = (files: File[]) => {
    setGeneralError('');
    setHasCompletedBatch(false);

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const newItems: QueuedFile[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(ext)) {
        errors.push(`Tệp "${file.name}" không hợp lệ (chỉ hỗ trợ PDF, DOCX, DOC, TXT)`);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        errors.push(`Tệp "${file.name}" vượt quá 25MB`);
        return;
      }

      // Tránh thêm tệp trùng tên và dung lượng trong danh sách chờ
      const alreadyInQueue = fileQueue.some(
        (q) => q.file.name === file.name && q.file.size === file.size
      );
      if (alreadyInQueue) return;

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
      });
    });

    if (errors.length > 0 && newItems.length === 0) {
      setGeneralError(errors.join('. '));
      return;
    }

    // Giới hạn tối đa 15 tệp trong 1 đợt nộp
    setFileQueue((prev) => [...prev, ...newItems].slice(0, 15));
  };

  const removeFileFromQueue = (id: string) => {
    if (isUploading) return;
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isUploading) return;
    setFileQueue([]);
    setHasCompletedBatch(false);
    setGeneralError('');
  };

  // Nộp toàn bộ danh sách tệp theo tiến trình tuần tự có báo cáo chi tiết
  const handleBatchUpload = async () => {
    if (fileQueue.length === 0) return;

    if (!user) {
      onOpenAuthModal();
      return;
    }

    setIsUploading(true);
    setGeneralError('');
    setHasCompletedBatch(false);

    let hasSuccess = false;

    // Duyệt lần lượt từng tệp
    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'success') continue;

      setCurrentProcessingIndex(i);

      // Cập nhật trạng thái uploading
      setFileQueue((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'uploading' } : it))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('uploader_name', user.global_name || user.username);
        formData.append('uploader_id', user.id);

        const res = await fetch(`${apiBase}/api/documents/upload`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.is_duplicate) {
            setFileQueue((prev) =>
              prev.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      status: 'duplicate',
                      errorMessage: data.message || 'Tài liệu này đã tồn tại trong kho đề!',
                    }
                  : it
              )
            );
          } else {
            setFileQueue((prev) =>
              prev.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      status: 'error',
                      errorMessage: data.error || data.message || 'Lỗi khi kiểm định tệp.',
                    }
                  : it
              )
            );
          }
        } else {
          hasSuccess = true;
          setFileQueue((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: 'success',
                    result: data,
                  }
                : it
            )
          );
        }
      } catch (err: any) {
        setFileQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  errorMessage: err.message || 'Không thể kết nối máy chủ.',
                }
              : it
          )
        );
      }
    }

    setIsUploading(false);
    setCurrentProcessingIndex(-1);
    setHasCompletedBatch(true);

    if (hasSuccess && onUploadSuccess) {
      onUploadSuccess();
    }
  };

  const successCount = fileQueue.filter((f) => f.status === 'success').length;
  const duplicateCount = fileQueue.filter((f) => f.status === 'duplicate').length;
  const errorCount = fileQueue.filter((f) => f.status === 'error').length;
  const pendingCount = fileQueue.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header Giới Thiệu Nộp Hàng Loạt */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-blue-950/40 to-slate-950/90 border border-blue-500/20 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Kho Nộp Đề Trực Tuyến & Bot Nhận Dạng
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Hỗ trợ nộp nhiều tệp cùng lúc
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Kéo thả nhiều đề thi (PDF, Word) cùng lúc vào ô bên dưới. Bot AI sẽ tự động phân tích môn học, khối lớp, số câu hỏi và kiểm tra trùng lặp cho từng tệp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Upload Dropzone (Cho phép chọn hoặc thả nhiều tệp) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
            : 'border-white/10 hover:border-purple-500/40 bg-slate-950/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-950/20">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-white">
              {fileQueue.length > 0
                ? `Đã chọn ${fileQueue.length} tệp đề thi (Nhấn để thêm tiếp)`
                : 'Kéo & Thả một hoặc nhiều tệp đề thi vào đây'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Hoặc nhấn vào đây để duyệt và chọn nhiều tệp từ máy tính của bạn
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Định dạng: PDF, DOCX, DOC
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-300 border border-pink-500/20">
              Chọn nhiều tệp (Tối đa 15 tệp/lần)
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Chống trùng SHA-256
            </span>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi tổng nếu có */}
      {generalError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* DANH SÁCH CÁC TỆP ĐƯỢC CHỌN (FILE QUEUE) */}
      {fileQueue.length > 0 && (
        <div className="rounded-3xl bg-black/40 border border-white/10 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">
                Danh Sách Tệp Đang Nộp ({fileQueue.length} tệp)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {!isUploading && !hasCompletedBatch && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
                >
                  Xóa tất cả
                </button>
              )}

              {/* Nút Thực Hiện Nộp Hàng Loạt */}
              {!hasCompletedBatch && (
                <button
                  type="button"
                  onClick={handleBatchUpload}
                  disabled={isUploading || pendingCount === 0}
                  className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang Xử Lý ({currentProcessingIndex + 1}/{fileQueue.length})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Nộp Toàn Bộ {fileQueue.length} Đề Thi</span>
                    </>
                  )}
                </button>
              )}

              {hasCompletedBatch && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-white flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nộp thêm đợt đề khác</span>
                </button>
              )}
            </div>
          </div>

          {/* Thanh Tiến Trình Nếu Đang Xử Lý */}
          {isUploading && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                <span>
                  Đang quét và kiểm định: {fileQueue[currentProcessingIndex]?.file.name}
                </span>
                <span>
                  {Math.round(((currentProcessingIndex + 1) / fileQueue.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${((currentProcessingIndex + 1) / fileQueue.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Tóm tắt kết quả sau khi nộp xong đợt */}
          {hasCompletedBatch && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/40 to-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Hoàn tất đợt nộp đề:</span>
              </div>
              <div className="flex items-center gap-3 font-semibold">
                <span className="text-emerald-400">✅ {successCount} thành công</span>
                {duplicateCount > 0 && (
                  <span className="text-amber-400">⚠️ {duplicateCount} trùng lặp</span>
                )}
                {errorCount > 0 && (
                  <span className="text-rose-400">❌ {errorCount} lỗi</span>
                )}
              </div>
            </div>
          )}

          {/* Danh Sách Từng Tệp Trong Hàng Đợi */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {fileQueue.map((item) => {
              const res = item.result;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    item.status === 'uploading'
                      ? 'bg-purple-950/30 border-purple-500/50 shadow-md'
                      : item.status === 'success'
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : item.status === 'duplicate'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : item.status === 'error'
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Thông tin tệp */}
                    <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                          item.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'uploading'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : item.status === 'duplicate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.status === 'error'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {item.status === 'uploading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : item.status === 'success' ? (
                          <Check className="w-4 h-4" />
                        ) : item.status === 'duplicate' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          item.file.name.split('.').pop()
                        )}
                      </div>

                      <div className="overflow-hidden">
                        <div className="font-bold text-xs sm:text-sm text-white truncate max-w-md">
                          {item.file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatFileSize(item.file.size)}</span>
                          {item.status === 'pending' && (
                            <span className="text-slate-500">• Đang chờ nộp</span>
                          )}
                          {item.status === 'uploading' && (
                            <span className="text-purple-400 font-semibold">• Đang kiểm định AI...</span>
                          )}
                          {item.status === 'success' && res && (
                            <span className="text-emerald-400 font-semibold">
                              • Môn: {res.detected_subject} | {formatEstimatedLevel(res.estimated_level)} | {res.page_count} trang
                            </span>
                          )}
                          {item.status === 'duplicate' && (
                            <span className="text-amber-400 font-semibold">
                              • {item.errorMessage}
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-rose-400 font-semibold">
                              • {item.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động cho từng tệp */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {item.status === 'success' && res && (
                        <>
                          {onPreviewDoc && (
                            <button
                              type="button"
                              onClick={() => onPreviewDoc(res)}
                              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem Nhanh</span>
                            </button>
                          )}

                          <a
                            href={`${apiBase}${res.download_url}${
                              res.download_url.includes('?') ? '&' : '?'
                            }ngrok-skip-browser-warning=true`}
                            download={res.file_name}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải Về</span>
                          </a>
                        </>
                      )}

                      {!isUploading && item.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => removeFileFromQueue(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Bỏ tệp này"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocUploadZone;
