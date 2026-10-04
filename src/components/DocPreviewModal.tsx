import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { API_FETCH_HEADERS } from '../utils/apiConfig';
import { formatEstimatedLevel, formatFileSize } from '../utils/formatters';

export interface PreviewableDocument {
  id: number;
  title: string;
  file_name: string;
  file_type?: string;
  file_size_bytes?: number;
  estimated_level?: string;
  subject?: string;
  question_count?: number;
  page_count?: number;
  author_name?: string;
  jump_url?: string;
  download_url?: string;
}

interface DocPreviewModalProps {
  document: PreviewableDocument | null;
  apiBase: string;
  onClose: () => void;
}

export const DocPreviewModal: React.FC<DocPreviewModalProps> = ({
  document,
  apiBase,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingIframe, setIsLoadingIframe] = useState<boolean>(true);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [directFileUrl, setDirectFileUrl] = useState<string | null>(null);

  // Đóng khi nhấn phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lấy link trực tiếp (Discord CDN) để xem trước siêu tốc và bỏ qua hoàn toàn cảnh báo ngrok
  useEffect(() => {
    if (!document) return;
    setIsLoadingIframe(true);
    setIframeError(false);
    setDirectFileUrl(null);

    let isMounted = true;
    const fetchDirectUrl = async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/documents/${document.id}/file_url?ngrok-skip-browser-warning=true`,
          {
            headers: API_FETCH_HEADERS,
            signal: AbortSignal.timeout(4000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.direct_url) {
            setDirectFileUrl(data.direct_url);
            return;
          }
        }
      } catch {
        // Fallback dùng download endpoint
      }

      if (isMounted) {
        setDirectFileUrl(
          `${apiBase}/api/documents/${document.id}/download?ngrok-skip-browser-warning=true`
        );
      }
    };

    fetchDirectUrl();
    return () => {
      isMounted = false;
    };
  }, [document, apiBase]);

  if (!document) return null;

  const fallbackDownloadUrl = `${apiBase}/api/documents/${document.id}/download?ngrok-skip-browser-warning=true`;
  const rawActiveUrl = directFileUrl || fallbackDownloadUrl;

  // Kiểm tra giao thức URL an toàn (chống javascript:, data:, vbscript:)
  const isSafeProtocol = (url: string): boolean => {
    if (!url) return false;
    if (url.startsWith('/')) return true;
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const activeFileUrl = isSafeProtocol(rawActiveUrl) ? rawActiveUrl : fallbackDownloadUrl;

  const isPdf =
    (document.file_type && document.file_type.toUpperCase() === 'PDF') ||
    document.file_name.toLowerCase().endsWith('.pdf');
  const isDocx =
    (document.file_type &&
      (document.file_type.toUpperCase() === 'DOCX' ||
        document.file_type.toUpperCase() === 'DOC')) ||
    document.file_name.toLowerCase().endsWith('.docx') ||
    document.file_name.toLowerCase().endsWith('.doc');

  // URL xem trước trực tiếp trên Web
  let previewIframeSrc = '';
  if (activeFileUrl) {
    if (isPdf) {
      // Trực tiếp mở PDF trong iframe (trình duyệt có native PDF reader tích hợp)
      previewIframeSrc = activeFileUrl;
    } else if (isDocx) {
      // Dùng Microsoft Office Online Viewer
      previewIframeSrc = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(activeFileUrl)}`;
    } else {
      // Dùng Google Docs Viewer
      previewIframeSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(activeFileUrl)}&embedded=true`;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full flex flex-col bg-[#0d0f1e] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-6xl h-[92vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/80 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Eye className="w-5 h-5" />
            </div>

            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {document.file_type || (isPdf ? 'PDF' : isDocx ? 'DOCX' : 'DOCUMENT')}
                </span>
                <span className="text-[11px] text-purple-300 font-medium truncate hidden sm:inline">
                  {formatEstimatedLevel(document.estimated_level)}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md sm:max-w-xl" title={document.title}>
                {document.title}
              </h3>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tải về */}
            <a
              href={activeFileUrl}
              download={document.file_name}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all cursor-pointer shadow-md shadow-purple-900/20 hover:-translate-y-0.5 active:scale-95"
              title="Tải tệp đề thi về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải Về</span>
            </a>

            {/* Mở tab mới */}
            <a
              href={activeFileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Toàn màn hình */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer hidden sm:block"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Nút Đóng */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Đóng (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Metadata Bar */}
        <div className="px-4 sm:px-6 py-2 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span>Dung lượng: <strong className="text-white">{formatFileSize(document.file_size_bytes)}</strong></span>
            {document.question_count !== undefined && document.question_count > 0 && (
              <span>• Số câu: <strong className="text-white">{document.question_count} câu</strong></span>
            )}
            {document.page_count !== undefined && document.page_count > 0 && (
              <span>• Số trang: <strong className="text-white">{document.page_count} trang</strong></span>
            )}
            {document.author_name && (
              <span>• Người nộp: <strong className="text-purple-300">{document.author_name}</strong></span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 hidden md:block">
            Xem trước trực tiếp không cần tải về • Nhấn <strong className="text-pink-300">Tải Về</strong> để lưu bản gốc.
          </div>
        </div>

        {/* Main Preview Frame Container */}
        <div className="relative flex-1 w-full bg-[#070814] overflow-hidden">
          {/* Loading Indicator */}
          {isLoadingIframe && !iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#070814]/90 z-10">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <div className="text-sm font-semibold text-white/90">
                Đang nạp xem trước đề thi...
              </div>
              <div className="text-xs text-slate-400">
                Kết nối tới kho Discord CDN siêu tốc
              </div>
            </div>
          )}

          {/* Iframe Reader */}
          <iframe
            src={previewIframeSrc}
            title={document.title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
            onLoad={() => setIsLoadingIframe(false)}
            onError={() => {
              setIsLoadingIframe(false);
              setIframeError(true);
            }}
          />

          {/* Fallback khi Iframe bị chặn hoặc trình duyệt không hỗ trợ */}
          {iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#070814]/95 gap-4">
              <AlertCircle className="w-12 h-12 text-amber-400" />
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">
                  Trình duyệt không cho phép nhúng trực tiếp tệp này
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  Một số tệp DOCX hoặc PDF được bảo vệ có thể yêu cầu mở trong tab mới hoặc tải về máy để xem trọn vẹn định dạng.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <a
                  href={activeFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở Tệp Trong Tab Mới
                </a>

                <a
                  href={activeFileUrl}
                  download={document.file_name}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Tải Về Máy Ngay
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocPreviewModal;
