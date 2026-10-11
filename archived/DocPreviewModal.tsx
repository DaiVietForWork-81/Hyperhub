/**
 * [ARCHIVED COMPONENT] DocPreviewModal.tsx
 * Trình đọc PDF/Word nhúng iframe trước đây.
 * Đã chuyển sang kho lưu trữ (Archived) theo yêu cầu hệ thống.
 * Thay vào đó, người dùng sẽ tải trực tiếp hoặc mở file qua Discord CDN / Native Download để đảm bảo 100% độ tương thích và không bị chặn bởi browser sandbox.
 */

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
        // Fallback
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
  const activeFileUrl = directFileUrl || fallbackDownloadUrl;

  const isPdf =
    (document.file_type && document.file_type.toUpperCase() === 'PDF') ||
    document.file_name.toLowerCase().endsWith('.pdf');
  const isDocx =
    (document.file_type &&
      (document.file_type.toUpperCase() === 'DOCX' ||
        document.file_type.toUpperCase() === 'DOC')) ||
    document.file_name.toLowerCase().endsWith('.docx') ||
    document.file_name.toLowerCase().endsWith('.doc');

  let previewIframeSrc = '';
  if (isPdf) {
    previewIframeSrc = activeFileUrl;
  } else if (isDocx) {
    previewIframeSrc = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(activeFileUrl)}`;
  } else {
    previewIframeSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(activeFileUrl)}&embedded=true`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full flex flex-col bg-[#0d0f1e] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-6xl h-[92vh]'
        }`}
      >
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

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={activeFileUrl}
              download={document.file_name}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all cursor-pointer shadow-md shadow-purple-900/20 hover:-translate-y-0.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải Về</span>
            </a>
            <a
              href={activeFileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
        </div>

        <div className="relative flex-1 w-full bg-[#070814] overflow-hidden">
          {isLoadingIframe && !iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#070814]/90 z-10">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <div className="text-sm font-semibold text-white/90">
                Đang nạp xem trước đề thi...
              </div>
            </div>
          )}

          <iframe
            src={previewIframeSrc}
            title={document.title}
            className="w-full h-full border-0"
            onLoad={() => setIsLoadingIframe(false)}
            onError={() => {
              setIsLoadingIframe(false);
              setIframeError(true);
            }}
          />

          {iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#070814]/95 gap-4">
              <AlertCircle className="w-12 h-12 text-amber-400" />
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">
                  Trình duyệt không cho phép nhúng trực tiếp tệp này
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <a
                  href={activeFileUrl}
                  download={document.file_name}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải Về Máy
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
