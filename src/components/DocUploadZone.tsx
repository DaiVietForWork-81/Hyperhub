import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Eye,
  Download,
  Hash,
  School,
  Calendar,
} from 'lucide-react';
import { DiscordUser } from '../utils/discordAuth';

interface DocUploadZoneProps {
  apiBase: string;
  user: DiscordUser | null;
  onOpenAuthModal: () => void;
  onPreviewDoc?: (doc: any) => void;
  onUploadSuccess?: () => void;
}

interface InspectionResult {
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

export const DocUploadZone: React.FC<DocUploadZoneProps> = ({
  apiBase,
  user,
  onOpenAuthModal,
  onPreviewDoc,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<InspectionResult | null>(null);

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
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    setErrorMessage('');
    setUploadResult(null);

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMessage(
        'Định dạng không được hỗ trợ! Vui lòng chỉ tải lên tệp PDF, DOCX hoặc DOC.'
      );
      return;
    }

    // Giới hạn 25MB
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Dung lượng tệp quá lớn! Vui lòng chọn tệp nhỏ hơn 25 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadAndInspect = async () => {
    if (!selectedFile) return;

    if (!user) {
      onOpenAuthModal();
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setUploadResult(null);

    setScanStep('1/3. Đang tải lên và tính mã băm SHA-256 chống trùng...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploader_name', user.global_name || user.username);
      formData.append('uploader_id', user.id);

      setTimeout(() => {
        setScanStep('2/3. Bot DocInspector đang phân tích cấu trúc đề, câu hỏi & môn học...');
      }, 700);

      const res = await fetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });

      setScanStep('3/3. Đang lưu trữ và đồng bộ vào kho đề HyperHub...');

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.is_duplicate) {
          setErrorMessage(`⚠️ ${data.message}`);
        } else {
          setErrorMessage(data.error || data.message || 'Lỗi khi kiểm định và nộp đề thi.');
        }
        return;
      }

      setUploadResult(data);
      setSelectedFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (e: any) {
      setErrorMessage(`Lỗi kết nối máy chủ: ${e.message || 'Không thể gửi tệp tới Bot'}`);
    } finally {
      setIsUploading(false);
      setScanStep('');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Header Giới Thiệu */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-blue-950/40 to-slate-950/90 border border-blue-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Kho Nộp Đề Trực Tuyến & Bot Nhận Dạng
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 dark:text-white/70">
              Kéo thả đề thi (PDF, Word) vào ô bên dưới. Bot DocInspector sẽ tự động phân tích môn học, khối lớp, số câu hỏi và kiểm tra trùng lặp trong tích tắc.
            </p>
          </div>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-white/10 hover:border-purple-500/40 bg-slate-50 dark:bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
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
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {selectedFile ? selectedFile.name : 'Kéo & Thả tệp đề thi vào đây'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/50">
              {selectedFile
                ? `Dung lượng: ${formatFileSize(selectedFile.size)} • Nhấn để chọn tệp khác`
                : 'Hoặc nhấn vào đây để duyệt tệp từ máy tính của bạn'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Định dạng: PDF, DOCX, DOC
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Tối đa: 25 MB
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Chống trùng SHA-256
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons & Status */}
      {selectedFile && !uploadResult && (
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-300 shrink-0 font-bold text-xs uppercase">
              {selectedFile.name.split('.').pop()}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-white truncate max-w-sm">
                {selectedFile.name}
              </div>
              <div className="text-xs text-slate-400">
                {formatFileSize(selectedFile.size)} • Sẵn sàng gửi đến Bot DocInspector
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFile(null)}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              Hủy
            </button>

            <button
              onClick={handleUploadAndInspect}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Kiểm Định...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Quét & Nộp Đề Thi</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scanning Step Status */}
      {isUploading && scanStep && (
        <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
          <div className="text-xs sm:text-sm font-semibold text-purple-200">
            {scanStep}
          </div>
        </div>
      )}

      {/* Error / Duplicate Warning Banner */}
      {errorMessage && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Thông báo từ hệ thống kiểm định:</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Inspection Result Card (Thẻ Kết Quả Nhận Dạng Của Bot) */}
      {uploadResult && (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Kiểm Định Thành Công
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                  Đề thi đã được tiếp nhận vào Kho Đề!
                </h3>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Độ tin cậy: <strong className="text-emerald-400 font-bold">{(uploadResult.confidence_score * 100).toFixed(0)}%</strong>
            </div>
          </div>

          {/* Extracted Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400">Môn Học</div>
              <div className="font-bold text-sm text-purple-300">
                {uploadResult.detected_subject}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400">Khối Lớp</div>
              <div className="font-bold text-sm text-pink-300">
                {uploadResult.estimated_level}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400">Số Câu Hỏi</div>
              <div className="font-bold text-sm text-white">
                {uploadResult.question_count > 0 ? `${uploadResult.question_count} câu` : 'Tài liệu lý thuyết'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="text-[11px] text-slate-400">Số Trang</div>
              <div className="font-bold text-sm text-white">
                {uploadResult.page_count} trang
              </div>
            </div>
          </div>

          {/* Academic Year & School if any */}
          {(uploadResult.academic_year || uploadResult.school_or_department) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              {uploadResult.academic_year && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Năm học: <strong className="text-white">{uploadResult.academic_year}</strong>
                </span>
              )}
              {uploadResult.school_or_department && (
                <span className="flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-pink-400" />
                  Nguồn ra đề: <strong className="text-white">{uploadResult.school_or_department}</strong>
                </span>
              )}
            </div>
          )}

          {/* SHA-256 Badge */}
          {uploadResult.file_hash && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              <span>SHA-256: {uploadResult.file_hash.slice(0, 24)}...</span>
            </div>
          )}

          {/* Action Buttons for Result */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {onPreviewDoc && (
              <button
                onClick={() => onPreviewDoc(uploadResult)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Xem Nhanh Đề Vừa Nộp</span>
              </button>
            )}

            <a
              href={`${apiBase}${uploadResult.download_url}`}
              download={uploadResult.file_name}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải Về Máy</span>
            </a>

            <button
              onClick={() => {
                setUploadResult(null);
                setSelectedFile(null);
              }}
              className="ml-auto text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Nộp thêm đề khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
