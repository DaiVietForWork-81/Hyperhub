import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Dices,
  UploadCloud,
  Eye,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { getApiBaseUrl, API_FETCH_HEADERS } from '../utils/apiConfig';
import { formatEstimatedLevel, formatFileSize } from '../utils/formatters';
import { DocUploadZone } from './DocUploadZone';
import { PreviewableDocument } from './DocPreviewModal';
import { DiscordUser } from '../utils/discordAuth';

interface HomeStudyPortalProps {
  user: DiscordUser | null;
  onOpenAuthModal: () => void;
  onPreviewDoc: (doc: PreviewableDocument) => void;
  onNavigateToTab: (tab: 'vault' | 'get_exam' | 'submit_doc') => void;
}

interface ExamDocument {
  id: number;
  subject: string;
  title: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  estimated_level: string;
  question_count: number;
  page_count: number;
  author_name: string;
  jump_url?: string;
  download_url?: string;
  timestamp: string;
}

const SUBJECT_FILTERS = [
  { id: 'ALL', label: 'Tất Cả Môn' },
  { id: 'MATHEMATICS', label: 'Toán' },
  { id: 'LITERATURE', label: 'Ngữ Văn' },
  { id: 'ENGLISH', label: 'Tiếng Anh' },
  { id: 'INFORMATICS', label: 'Tin Học' },
  { id: 'PHYSICS', label: 'Vật Lý' },
  { id: 'CHEMISTRY', label: 'Hóa Học' },
];

export const HomeStudyPortal: React.FC<HomeStudyPortalProps> = ({
  user,
  onOpenAuthModal,
  onPreviewDoc,
  onNavigateToTab,
}) => {
  const [activeSection, setActiveSection] = useState<'vault' | 'get_exam' | 'submit_doc'>('vault');
  const [totalDocsCount, setTotalDocsCount] = useState<number>(28);
  const [featuredDocs, setFeaturedDocs] = useState<ExamDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // Trạng thái Bốc Đề Nhanh
  const [isPickingRandom, setIsPickingRandom] = useState<boolean>(false);
  const [pickedExam, setPickedExam] = useState<ExamDocument | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  // Tải danh sách đề thi mẫu & tổng số lượng đề từ database
  const fetchPortalDocs = async (subject: string = 'ALL') => {
    setIsLoadingDocs(true);
    try {
      const apiBase = getApiBaseUrl();
      const params = new URLSearchParams({
        limit: '6',
        ngrok_skip_browser_warning: 'true',
      });
      if (subject !== 'ALL') {
        params.append('subject', subject);
      }

      const res = await fetch(`${apiBase}/api/documents?${params.toString()}`, {
        headers: API_FETCH_HEADERS,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.total !== undefined) {
          setTotalDocsCount(data.total);
        }
        if (Array.isArray(data.documents)) {
          setFeaturedDocs(data.documents);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách tài liệu cổng học tập:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchPortalDocs(selectedSubject);
  }, [selectedSubject]);

  // Xử lý Bốc Đề Ngẫu Nhiên Ngay Tại Trang Chủ
  const handleRandomPick = async () => {
    setIsPickingRandom(true);
    setPickError(null);
    try {
      const apiBase = getApiBaseUrl();
      const params = new URLSearchParams({
        ngrok_skip_browser_warning: 'true',
      });
      if (selectedSubject !== 'ALL') {
        params.append('subject', selectedSubject);
      }

      const res = await fetch(`${apiBase}/api/documents/random?${params.toString()}`, {
        headers: API_FETCH_HEADERS,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.document) {
          setPickedExam(data.document);
          return;
        }
      }
      
      // Nếu API random không có môn lọc, bốc từ danh sách featuredDocs
      if (featuredDocs.length > 0) {
        const rand = featuredDocs[Math.floor(Math.random() * featuredDocs.length)];
        setPickedExam(rand);
      } else {
        setPickError('Hiện chưa có đề nào phù hợp với bộ lọc môn.');
      }
    } catch {
      if (featuredDocs.length > 0) {
        const rand = featuredDocs[Math.floor(Math.random() * featuredDocs.length)];
        setPickedExam(rand);
      } else {
        setPickError('Không thể kết nối đến máy chủ bot.');
      }
    } finally {
      setIsPickingRandom(false);
    }
  };

  return (
    <div id="home-study-portal" className="w-full space-y-8">
      {/* 1. Header & Điều Hướng 3 Chức Năng Chính */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Học Liệu & Đề Thi HyperHub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Kho Đề, Bốc Đề & Nộp Đề Trực Tuyến
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tra cứu tài liệu, bốc đề thi ngẫu nhiên và nộp đề có trợ lý AI nhận dạng tức thì.
          </p>
        </div>

        {/* 3 Tab Selector Lớn: Kho (Tách riêng) • Lấy Đề • Kho Nộp Đề */}
        <div className="flex items-center p-1.5 rounded-2xl bg-black/50 border border-white/10 w-full sm:w-auto overflow-x-auto">
          {/* Tab 1: Kho Đề (Tách riêng) với số lượng đề thực tế */}
          <button
            type="button"
            onClick={() => setActiveSection('vault')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'vault'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Kho Đề Thi</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white">
              {totalDocsCount}+
            </span>
          </button>

          {/* Tab 2: Lấy Đề */}
          <button
            type="button"
            onClick={() => setActiveSection('get_exam')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'get_exam'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Dices className="w-4 h-4" />
            <span>Lấy Đề</span>
          </button>

          {/* Tab 3: Kho Nộp Đề */}
          <button
            type="button"
            onClick={() => setActiveSection('submit_doc')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'submit_doc'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Kho Nộp Đề</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AI
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHẦN 1: KHO ĐỀ (TÁCH RIÊNG) - HIỆN SỐ ĐỀ ĐANG CÓ ({totalDocsCount}+)       */}
      {/* ========================================================================= */}
      {activeSection === 'vault' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Thanh Lọc Môn Học Nhanh */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {SUBJECT_FILTERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedSubject === s.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigateToTab('vault')}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer ml-auto"
            >
              <span>Xem toàn bộ kho trên Bảng điều khiển ({totalDocsCount}+)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lưới Thẻ Đề Thi Tiêu Biểu */}
          {isLoadingDocs ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-xs">Đang tải đề thi từ kho lưu trữ...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-3xl bg-black/40 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {doc.subject}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                          {formatEstimatedLevel(doc.estimated_level)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">
                        {doc.file_type || 'PDF'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                      {doc.title || doc.file_name}
                    </h4>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 font-mono">
                      <span>{doc.page_count} trang</span>
                      <span>• {formatFileSize(doc.file_size_bytes)}</span>
                      <span>• Nộp bởi {doc.author_name || 'Admin'}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-white/5 flex items-center gap-2">
                    {/* Nút Xem Nhanh Trực Tiếp */}
                    <button
                      type="button"
                      onClick={() => onPreviewDoc(doc)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem Nhanh</span>
                    </button>

                    {/* Nút Tải Về Trực Tiếp Bỏ Qua Cảnh Báo Ngrok */}
                    <a
                      href={`${getApiBaseUrl()}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.file_name || 'de_thi.pdf'}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Về</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Banner của Kho */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/40 to-pink-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-white">
                  Kho Lưu Trữ Hiện Có {totalDocsCount}+ Bộ Đề Tuyển Chọn
                </h4>
                <p className="text-xs text-slate-400">
                  Tất cả đều được kiểm định, phân loại khối và chuẩn bị sẵn file xem trước trực tuyến.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('vault')}
              className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/30 whitespace-nowrap cursor-pointer"
            >
              Mở Kho Đề Chi Tiết
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHẦN 2: LẤY ĐỀ (BỐC ĐỀ NGẪU NHIÊN)                                        */}
      {/* ========================================================================= */}
      {activeSection === 'get_exam' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-purple-500/30 space-y-6">
            <div className="max-w-xl mx-auto text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center mx-auto mb-2">
                <Dices className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Bốc Đề Thi Ngẫu Nhiên
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Chọn môn học mong muốn và bấm nút bốc đề. Bot sẽ chọn ngẫu nhiên một đề chất lượng cao từ kho tài liệu cho bạn.
              </p>
            </div>

            {/* Bộ Lọc Môn Trước Khi Bốc */}
            <div className="flex justify-center items-center gap-1.5 flex-wrap">
              {SUBJECT_FILTERS.map((s) => (
                <button
                  key={`pick-${s.id}`}
                  onClick={() => setSelectedSubject(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedSubject === s.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Nút Bốc Đề To */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleRandomPick}
                disabled={isPickingRandom}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-purple-900/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
              >
                {isPickingRandom ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Bốc Đề Từ Kho...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>🎲 Bốc Ngẫu Nhiên 1 Đề Thi</span>
                  </>
                )}
              </button>
            </div>

            {pickError && (
              <div className="text-center text-xs text-rose-400 font-semibold">
                {pickError}
              </div>
            )}

            {/* Khung Kết Quả Đề Đã Bốc */}
            {pickedExam && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/30 via-black/40 to-pink-950/30 border-2 border-purple-500/50 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Môn: {pickedExam.subject}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                      {formatEstimatedLevel(pickedExam.estimated_level)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/80">
                      {pickedExam.page_count} trang
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã bốc trúng đề!</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-lg sm:text-xl font-black text-white">
                    {pickedExam.title || pickedExam.file_name}
                  </h4>
                  <div className="text-xs text-slate-400 mt-1">
                    Tên tệp: <span className="font-mono text-purple-300">{pickedExam.file_name}</span> ({formatFileSize(pickedExam.file_size_bytes)})
                  </div>
                </div>

                {/* 2 Nút Thao Tác Sau Khi Bốc */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onPreviewDoc(pickedExam)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-950/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Xem Nhanh (PDF / Word)</span>
                  </button>

                  <a
                    href={`${getApiBaseUrl()}/api/documents/${pickedExam.id}/download?ngrok-skip-browser-warning=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={pickedExam.file_name || 'de_thi.pdf'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/40 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Về Máy ({(pickedExam.file_type || 'PDF').toUpperCase()})</span>
                  </a>

                  <button
                    onClick={() => onNavigateToTab('get_exam')}
                    className="ml-auto text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Mở trình bốc đề chuyên sâu trên Hub
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHẦN 3: KHO NỘP ĐỀ - Ô THẢ/NỘP ĐỂ USER NỘP & BOT NHẬN DẠNG + XEM TRƯỚC   */}
      {/* ========================================================================= */}
      {activeSection === 'submit_doc' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-emerald-500/30 space-y-4">
            <div className="max-w-2xl mx-auto text-center space-y-1 mb-4">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Ô Nộp Đề Thi & Trợ Lý Bot AI Nhận Dạng
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Thả tệp PDF, Word hoặc Ảnh đề thi vào khung bên dưới. Hệ thống C++ Native & DocInspector AI sẽ bóc tách môn, khối lớp và số câu hỏi ngay lập tức.
              </p>
            </div>

            {/* Khung Kéo Thả Tài Liệu DocUploadZone */}
            <DocUploadZone
              apiBase={getApiBaseUrl()}
              user={user}
              onOpenAuthModal={onOpenAuthModal}
              onPreviewDoc={onPreviewDoc}
              onUploadSuccess={() => fetchPortalDocs(selectedSubject)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default HomeStudyPortal;
