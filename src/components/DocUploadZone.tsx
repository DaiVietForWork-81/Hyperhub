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
  Link2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RefreshCw,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { DiscordUser, getDiscordAccessToken } from '../utils/discordAuth';
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
  security_verification?: {
    layer1_url_auth?: string;
    layer2_pre_probe?: string;
    layer3_sandbox_download?: string;
    layer4_antivirus_magic?: string;
    layer5_doc_inspector?: string;
  };
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'duplicate' | 'error';
  result?: InspectionResult;
  errorMessage?: string;
}

interface GDriveBlockedDetail {
  layer: number;
  reason: string;
  detectedTitle?: string;
  detectedExt?: string;
}

export const DocUploadZone: React.FC<DocUploadZoneProps> = ({
  apiBase,
  user,
  onOpenAuthModal,
  onPreviewDoc,
  onUploadSuccess,
}) => {
  // Tab chuyển đổi: Tải tệp trực tiếp HOẶC Nộp link Google Drive
  const [activeTab, setActiveTab] = useState<'file_upload' | 'gdrive_link'>('file_upload');

  // --- TRẠNG THÁI TAB TẢI TỆP TRỰC TIẾP ---
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [generalError, setGeneralError] = useState<string>('');
  const [hasCompletedBatch, setHasCompletedBatch] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TRẠNG THÁI TAB GOOGLE DRIVE 5 LỚP BẢO MẬT ---
  const [gdriveUrl, setGdriveUrl] = useState<string>('');
  const [isGDriveSubmitting, setIsGDriveSubmitting] = useState<boolean>(false);
  const [gdriveProcessingStep, setGdriveProcessingStep] = useState<number>(0);
  const [gdriveResults, setGdriveResults] = useState<any[]>([]);
  const [gdriveError, setGdriveError] = useState<string>('');
  const [gdriveBlockedInfo, setGdriveBlockedInfo] = useState<GDriveBlockedDetail | null>(null);

  // ----------------------------------------------------
  // LOGIC TAB 1: KÉO THẢ TỆP TRỰC TIẾP
  // ----------------------------------------------------
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

    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'success') continue;

      setCurrentProcessingIndex(i);

      setFileQueue((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'uploading' } : it))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('uploader_name', user.global_name || user.username);
        formData.append('uploader_id', user.id);

        const uploadHeaders: Record<string, string> = {
          'ngrok-skip-browser-warning': 'true',
        };
        const token = user?.accessToken || getDiscordAccessToken();
        if (token) {
          uploadHeaders['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBase}/api/documents/upload`, {
          method: 'POST',
          headers: uploadHeaders,
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

  // ----------------------------------------------------
  // LOGIC TAB 2: GOOGLE DRIVE 5 LỚP BẢO MẬT
  // ----------------------------------------------------
  const handleGDriveSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanUrl = gdriveUrl.trim();
    if (!cleanUrl) {
      setGdriveError('Vui lòng dán liên kết Google Drive của đề thi.');
      return;
    }

    if (!user) {
      onOpenAuthModal();
      return;
    }

    setIsGDriveSubmitting(true);
    setGdriveError('');
    setGdriveBlockedInfo(null);
    setGdriveResults([]);
    setGdriveProcessingStep(1); // Lớp 1: Bắt đầu xác thực Link & Chống SSRF

    // Tạo hiệu ứng tiến trình từng lớp bảo mật
    const timerProbe = setTimeout(() => setGdriveProcessingStep(2), 700);
    const timerSandbox = setTimeout(() => setGdriveProcessingStep(3), 1600);
    const timerScan = setTimeout(() => setGdriveProcessingStep(4), 2700);

    try {
      const token = user?.accessToken || getDiscordAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/api/documents/import_gdrive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: cleanUrl }),
      });

      clearTimeout(timerProbe);
      clearTimeout(timerSandbox);
      clearTimeout(timerScan);
      setGdriveProcessingStep(5); // Lớp 5: Hoàn tất phân tích DocInspector

      const data = await res.json();

      if (!res.ok || (!data.success && !data.new_imported)) {
        const rawResults = data.results || [];
        const blockedItem = rawResults.find((r: any) => r.blocked);
        const dupItem = rawResults.find((r: any) => r.is_duplicate);

        if (blockedItem) {
          setGdriveBlockedInfo({
            layer: blockedItem.security_layer || 2,
            reason: blockedItem.error || 'Tệp bị từ chối bởi hệ thống bảo mật đa tầng.',
            detectedTitle: blockedItem.detected_title,
            detectedExt: blockedItem.detected_ext,
          });
        } else if (dupItem) {
          setGdriveError(
            `Tài liệu này đã tồn tại trong kho đề: "${dupItem.existing_title || dupItem.file_name}" nộp bởi ${dupItem.author || 'thành viên khác'}.`
          );
        } else {
          setGdriveError(
            data.error || data.message || 'Không thể nhập tài liệu từ Google Drive.'
          );
        }
        setGdriveResults(rawResults);
      } else {
        setGdriveResults(data.results || []);
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: any) {
      clearTimeout(timerProbe);
      clearTimeout(timerSandbox);
      clearTimeout(timerScan);
      setGdriveError(err.message || 'Không thể kết nối máy chủ để kiểm định Google Drive.');
    } finally {
      setIsGDriveSubmitting(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGdriveUrl(text.trim());
        setGdriveError('');
        setGdriveBlockedInfo(null);
      }
    } catch {
      // Bỏ qua nếu người dùng không cấp quyền clipboard
    }
  };

  const resetGDriveForm = () => {
    setGdriveUrl('');
    setGdriveResults([]);
    setGdriveError('');
    setGdriveBlockedInfo(null);
    setGdriveProcessingStep(0);
  };

  const successCount = fileQueue.filter((f) => f.status === 'success').length;
  const duplicateCount = fileQueue.filter((f) => f.status === 'duplicate').length;
  const errorCount = fileQueue.filter((f) => f.status === 'error').length;
  const pendingCount = fileQueue.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header Giới Thiệu Nộp Hàng Loạt & 5 Lớp Bảo Mật */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/95 via-blue-950/40 to-slate-950/95 border border-blue-500/20 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Kho Nộp Đề Trực Tuyến & Bot Thẩm Định AI
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Kiểm duyệt an toàn
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Tiếp nhận đề thi qua tệp trực tiếp hoặc liên kết Google Drive. Hệ thống tự động xác thực và phân loại tài liệu vào kho đề.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* THANH CHUYỂN TAB: [📁 TẢI TỆP TRỰC TIẾP] | [🔗 LINK GOOGLE DRIVE] */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/10 w-fit backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setActiveTab('file_upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'file_upload'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>📁 Tải Tệp Trực Tiếp (PDF/Word)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gdrive_link')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'gdrive_link'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-900/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>🔗 Nộp Link Google Drive</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* NỘI DUNG TAB 1: KÉO THẢ TỆP CỤC BỘ                                        */}
      {/* ========================================================================= */}
      {activeTab === 'file_upload' && (
        <div className="space-y-6">
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

          {generalError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

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
      )}

      {/* ========================================================================= */}
      {/* NỘI DUNG TAB 2: NỘP LINK GOOGLE DRIVE (KIỂM ĐỊNH 5 LỚP BẢO MẬT)           */}
      {/* ========================================================================= */}
      {activeTab === 'gdrive_link' && (
        <div className="space-y-6">
          {/* Ô Nhập Link Google Drive */}
          <div className="rounded-3xl bg-slate-950/70 border border-emerald-500/20 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <form onSubmit={handleGDriveSubmit} className="space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-emerald-400" />
                  Đường dẫn Google Drive (Tệp Đơn hoặc Thư Mục Đề Thi)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={gdriveUrl}
                    onChange={(e) => {
                      setGdriveUrl(e.target.value);
                      if (gdriveError) setGdriveError('');
                      if (gdriveBlockedInfo) setGdriveBlockedInfo(null);
                    }}
                    placeholder="https://drive.google.com/file/d/... hoặc https://drive.google.com/drive/folders/..."
                    disabled={isGDriveSubmitting}
                    className="w-full px-4 py-3.5 sm:py-4 rounded-2xl bg-black/60 border border-white/10 hover:border-emerald-500/40 focus:border-emerald-400 focus:outline-none text-white text-xs sm:text-sm pr-24 placeholder:text-slate-500 transition-all font-mono"
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    {gdriveUrl ? (
                      <button
                        type="button"
                        onClick={() => setGdriveUrl('')}
                        disabled={isGDriveSubmitting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Xóa link"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        disabled={isGDriveSubmitting}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                        title="Dán từ bộ nhớ tạm"
                      >
                        Dán
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Đảm bảo quyền chia sẻ tệp là: <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong>.
                </p>
              </div>

              {/* Hàng nút bấm */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hệ thống kiểm duyệt và tiếp nhận tài liệu tự động</span>
                </div>

                <div className="flex items-center gap-2">
                  {gdriveResults.length > 0 && (
                    <button
                      type="button"
                      onClick={resetGDriveForm}
                      disabled={isGDriveSubmitting}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Nhập link khác</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isGDriveSubmitting || !gdriveUrl.trim()}
                    className="px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGDriveSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang Kiểm Tra...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Xác Minh &amp; Tiếp Nhận Đề</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* QUY TRÌNH KIỂM DUYỆT TÀI LIỆU AN TOÀN */}
          <div className="rounded-3xl bg-black/40 border border-white/10 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Quy Trình Kiểm Duyệt &amp; Tiếp Nhận Tài Liệu
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                {isGDriveSubmitting ? `Tiến trình: Giai đoạn ${gdriveProcessingStep}/5` : 'Tiêu chuẩn bảo mật cao'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Bước 1 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 1
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 1</span>
                  {gdriveProcessingStep >= 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Xác Thực Liên Kết</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Kiểm tra tính an toàn và tính hợp lệ của đường liên kết.
                </div>
              </div>

              {/* Bước 2 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 2
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 2</span>
                  {gdriveProcessingStep >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Xác Minh Định Dạng</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Kiểm tra định dạng tài liệu học tập được hỗ trợ.
                </div>
              </div>

              {/* Bước 3 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 3
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 3</span>
                  {gdriveProcessingStep >= 3 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Tiếp Nhận An Toàn</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Quy trình tiếp nhận độc lập và kiểm soát dung lượng.
                </div>
              </div>

              {/* Bước 4 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 4
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 4</span>
                  {gdriveProcessingStep >= 4 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Kiểm Tra Tiêu Chuẩn</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Xác thực tính toàn vẹn và tiêu chuẩn an toàn của tệp.
                </div>
              </div>

              {/* Bước 5 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  gdriveProcessingStep >= 5
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Bước 5</span>
                  {gdriveProcessingStep >= 5 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-xs text-white">Phân Loại &amp; Lưu Trữ</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Nhận dạng môn học, khối lớp và lưu trữ vào kho đề.
                </div>
              </div>
            </div>
          </div>

          {/* CẢNH BÁO TỆP KHÔNG THỂ TIẾP NHẬN */}
          {gdriveBlockedInfo && (
            <div className="p-5 sm:p-6 rounded-3xl bg-rose-950/40 border border-rose-500/50 backdrop-blur-xl space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm sm:text-base text-rose-200">
                      TÀI LIỆU KHÔNG THỂ TIẾP NHẬN
                    </h4>
                  </div>

                  <p className="text-xs sm:text-sm text-rose-300 mt-1 font-medium">
                    Tài liệu hoặc liên kết bạn cung cấp không đáp ứng tiêu chuẩn an toàn của hệ thống. Vui lòng kiểm tra lại liên kết hoặc tệp của bạn.
                  </p>

                  <div className="text-[11px] text-slate-400 mt-2">
                    🛡️ Hệ thống tự động từ chối các tệp không đáp ứng tiêu chuẩn an toàn nhằm bảo vệ môi trường học tập.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THÔNG BÁO LỖI HOẶC TRÙNG LẶP */}
          {gdriveError && !gdriveBlockedInfo && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{gdriveError}</span>
            </div>
          )}

          {/* DANH SÁCH KẾT QUẢ ĐÃ THẨM ĐỊNH THÀNH CÔNG */}
          {gdriveResults.length > 0 && gdriveResults.some((r) => r.success) && (
            <div className="rounded-3xl bg-black/40 border border-emerald-500/30 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Tài Liệu Đã Được Tiếp Nhận Thành Công ({gdriveResults.filter((r) => r.success).length} tệp)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Đã lưu vào Kho Đề
                </span>
              </div>

              <div className="space-y-3">
                {gdriveResults
                  .filter((r) => r.success)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {item.file_type || 'PDF'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white truncate max-w-lg">
                              {item.title || item.file_name}
                            </div>
                            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                                Môn: {item.detected_subject}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                {formatEstimatedLevel(item.estimated_level)}
                              </span>
                              {item.page_count && (
                                <span className="text-slate-400">
                                  {item.page_count} trang
                                </span>
                              )}
                              {item.question_count > 0 && (
                                <span className="text-slate-400">
                                  • {item.question_count} câu hỏi
                                </span>
                              )}
                              {item.academic_year && (
                                <span className="text-emerald-400 font-semibold">
                                  • Năm học: {item.academic_year}
                                </span>
                              )}
                              {item.school && (
                                <span className="text-cyan-400 font-semibold">
                                  • Nguồn: {item.school}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {onPreviewDoc && (
                            <button
                              type="button"
                              onClick={() => onPreviewDoc(item)}
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem Nhanh</span>
                            </button>
                          )}

                          {item.download_url && (
                            <a
                              href={`${apiBase}${item.download_url}${
                                item.download_url.includes('?') ? '&' : '?'
                              }ngrok-skip-browser-warning=true`}
                              download={item.file_name}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tải Về</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Trạng Thái Xác Minh An Toàn */}
                      {item.security_verification && (
                        <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-slate-300 space-y-1">
                          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Đã Xác Minh An Toàn</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tài liệu đã vượt qua quy trình kiểm duyệt tiêu chuẩn và được cập nhật vào kho học tập.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocUploadZone;
