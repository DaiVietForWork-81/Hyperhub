import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Database, 
  ShieldCheck, 
  ExternalLink, 
  FolderOpen,
  Copy,
  CheckCircle,
  Download,
  AlertTriangle,
  RefreshCw,
  Star,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { ScrollReveal } from './ScrollReveal';
import { getApiBaseUrl, API_FETCH_HEADERS } from '../utils/apiConfig';
import { formatEstimatedLevel } from '../utils/formatters';
import { getBookmarkedExamIds, toggleBookmarkExam } from '../utils/bookmarkStorage';

export interface DocumentItem {
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
  timestamp: string;
  file_hash?: string;
  is_duplicate?: boolean;
  is_duplicate_copy?: boolean;
  original_id?: number | null;
  duplicate_count?: number;
  download_url?: string;
}

const FALLBACK_DOCUMENTS: DocumentItem[] = [
  {
    id: 1,
    subject: "MATHEMATICS",
    title: "Đề Thi Học Kỳ 1 Toán 12 - Chuyên Hà Nội - Amsterdam",
    file_name: "De_Thi_HK1_Toan_12_Ams_2024.pdf",
    file_size_bytes: 2450000,
    file_type: "PDF",
    estimated_level: "Lớp 12 (chuyên)",
    question_count: 50,
    page_count: 6,
    author_name: "HyperHub Member",
    jump_url: "https://discord.com/channels/1532265330079174697/1534147951797080174",
    timestamp: "2024-12-15T08:30:00Z",
    file_hash: "a4f8c2b910e34d12...",
    is_duplicate: false,
  },
  {
    id: 2,
    subject: "INFORMATICS",
    title: "Đề Thi Chọn Đội Tuyển HSG Quốc Gia Tin Học - Quy Hoạch Động & Đồ Thị",
    file_name: "De_Chon_Doi_Tuyen_Tin_Hoc_2024.pdf",
    file_size_bytes: 1850000,
    file_type: "PDF",
    estimated_level: "Chuyên / HSG Quốc Gia",
    question_count: 4,
    page_count: 5,
    author_name: "Algorithm Master",
    jump_url: "https://discord.com/channels/1532265330079174697/1534147951797080174",
    timestamp: "2024-11-20T14:15:00Z",
    file_hash: "9af18e5e048d6f0e...",
    is_duplicate: false,
  },
  {
    id: 3,
    subject: "ENGLISH",
    title: "Bộ Đề Dự Đoán Tuyển Sinh 10 Chuyên Anh & IELTS Academic 7.5+",
    file_name: "IELTS_Academic_Reading_Writing_Vol1.pdf",
    file_size_bytes: 3200000,
    file_type: "PDF",
    estimated_level: "IELTS 6.5 -> 8.0+",
    question_count: 40,
    page_count: 12,
    author_name: "English Scholar",
    jump_url: "https://discord.com/channels/1532265330079174697/1534147951797080174",
    timestamp: "2024-12-01T09:00:00Z",
    file_hash: "3b8c9d1a2f4e5a6b...",
    is_duplicate: false,
  },
  {
    id: 4,
    subject: "PHYSICS",
    title: "Đề Khảo Sát Chất Lượng Vật Lý 12 - Dao Động Cơ & Sóng Điện Từ",
    file_name: "Khao_Sat_Vat_Ly_12_KHTN.pdf",
    file_size_bytes: 1420000,
    file_type: "PDF",
    estimated_level: "Lớp 12 (thường)",
    question_count: 40,
    page_count: 4,
    author_name: "Physicist_Vn",
    jump_url: "https://discord.com/channels/1532265330079174697/1534147951797080174",
    timestamp: "2024-12-10T16:20:00Z",
    file_hash: "7c6d5e4f3a2b1098...",
    is_duplicate: false,
  },
  {
    id: 5,
    subject: "CHEMISTRY",
    title: "Đề Thi Thử Tốt Nghiệp THPT Hóa Học - Chuẩn Cấu Trúc Bộ GD&ĐT 2025",
    file_name: "De_Thi_Thu_Hoa_Hoc_MOET_2025.pdf",
    file_size_bytes: 2100000,
    file_type: "PDF",
    estimated_level: "Lớp 12 (Chuẩn 2025)",
    question_count: 28,
    page_count: 4,
    author_name: "Chemistry Prodigy",
    jump_url: "https://discord.com/channels/1532265330079174697/1534147951797080174",
    timestamp: "2024-12-18T10:45:00Z",
    file_hash: "2e1d0c9b8a7f6e5d...",
    is_duplicate: false,
  },
  {
    id: 6,
    subject: "LITERATURE",
    title: "Tổng Hợp Dàn Ý & Bài Văn Mẫu Nghị Luận Văn Học Chuyên Sâu 12",
    file_name: "Nghi_Luan_Van_Hoc_12_Nang_Cao.docx",
    file_size_bytes: 980000,
    file_type: "DOCX",
    estimated_level: "Lớp 12 (Nâng cao)",
    question_count: 2,
    page_count: 18,
    author_name: "VanHocGiaoVien",
    jump_url: "https://discord.com/channels/1532265330079174697/1534147951797080174",
    timestamp: "2024-12-22T11:00:00Z",
    file_hash: "8f7e6d5c4b3a2109...",
    is_duplicate: false,
  }
];

const SUBJECT_FILTERS = [
  { id: 'ALL', name: 'Tất Cả Môn', icon: '📚' },
  { id: 'MATHEMATICS', name: 'Toán Học', icon: '📐' },
  { id: 'INFORMATICS', name: 'Tin Học', icon: '💻' },
  { id: 'ENGLISH', name: 'Tiếng Anh', icon: '🇬🇧' },
  { id: 'PHYSICS', name: 'Vật Lý', icon: '⚡' },
  { id: 'CHEMISTRY', name: 'Hóa Học', icon: '🧪' },
  { id: 'BIOLOGY', name: 'Sinh Học', icon: '🧬' },
  { id: 'LITERATURE', name: 'Ngữ Văn', icon: '📖' },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const DocumentVault: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>(FALLBACK_DOCUMENTS);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Bộ lọc xem trùng đề hay không (all | unique | duplicate)
  const [filterDup, setFilterDup] = useState<'all' | 'unique' | 'duplicate'>('all');

  // Tính năng Bookmark / Lưu tài liệu yêu thích
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(() => new Set(getBookmarkedExamIds()));
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  useEffect(() => {
    const handleBookmarkChange = () => {
      setBookmarkedIds(new Set(getBookmarkedExamIds()));
    };
    window.addEventListener('hyperhub_bookmark_changed', handleBookmarkChange);
    return () => window.removeEventListener('hyperhub_bookmark_changed', handleBookmarkChange);
  }, []);

  // Thống kê số lượng đề thực tế trong Bot
  const [stats, setStats] = useState<{
    total_real: number;
    unique_items: number;
    duplicate_items: number;
    total_bytes: number;
  }>({
    total_real: 29,
    unique_items: 28,
    duplicate_items: 2,
    total_bytes: 108571266,
  });

  // Tải thống kê số đề thật từ Bot
  const fetchStats = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/documents/stats`, {
        headers: API_FETCH_HEADERS,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats({
            total_real: data.total_real || data.total_items || 29,
            unique_items: data.unique_items || 28,
            duplicate_items: data.duplicate_items || 0,
            total_bytes: data.total_bytes || 0,
          });
        }
      }
    } catch {
      // Giữ mặc định
    }
  }, []);

  // Tải danh sách đề thi theo bộ lọc trùng lặp & môn
  const fetchDocuments = useCallback(async (dupFilter: 'all' | 'unique' | 'duplicate') => {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const q = new URLSearchParams();
      q.set('limit', '100');
      q.set('filter_dup', dupFilter);

      const res = await fetch(`${apiBase}/api/documents?${q.toString()}`, {
        headers: API_FETCH_HEADERS,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.documents) && data.documents.length > 0) {
          setDocuments(data.documents);
          setIsLiveApi(true);
          if (data.total_real) {
            setStats((prev) => ({ ...prev, total_real: data.total_real }));
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchDocuments(filterDup);
  }, [fetchStats, fetchDocuments, filterDup]);

  const handleDupFilterChange = (mode: 'all' | 'unique' | 'duplicate') => {
    setFilterDup(mode);
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (showBookmarksOnly && !bookmarkedIds.has(doc.id)) {
        return false;
      }
      const matchSubject = selectedSubject === 'ALL' || doc.subject.toUpperCase() === selectedSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        doc.title.toLowerCase().includes(q) || 
        doc.file_name.toLowerCase().includes(q) ||
        doc.estimated_level.toLowerCase().includes(q) ||
        doc.author_name.toLowerCase().includes(q);
      return matchSubject && matchQuery;
    });
  }, [documents, selectedSubject, searchQuery, showBookmarksOnly, bookmarkedIds]);

  const totalBytes = useMemo(() => {
    return stats.total_bytes > 0 
      ? stats.total_bytes 
      : documents.reduce((acc, d) => acc + (d.file_size_bytes || 0), 0);
  }, [documents, stats.total_bytes]);

  return (
    <section id="doc-vault" className="relative py-24 sm:py-32 w-full overflow-hidden">
      {/* Background radial gradient accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-purple-600/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-semibold tracking-wide uppercase">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>DocInspector Engine & C++ Native Core</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Kho Tài Liệu & <span className="bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-500 bg-clip-text text-transparent">Đề Thi Tự Động</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium">
              Được tự động tiếp nhận, kiểm tra trùng lặp bằng mã băm SHA-256, bóc tách cấu trúc và lưu trữ chuẩn mực 
              bởi hệ sinh thái bot Discord HyperHub.
            </p>
          </div>
        </ScrollReveal>

        {/* Live Metric Cards: Hiển thị số đề thật có trong bot */}
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 mb-8">
            {/* Card 1: Tổng số đề thật có trong bot */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.total_real} Đề
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Trong Kho Đề Bot
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Số đề độc bản (Unique) */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.unique_items} Đề Độc Bản
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Nội Dung Không Trùng
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Số đề phát hiện trùng lặp */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.duplicate_items} Bản Trùng
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Phát Hiện Qua SHA-256
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Tổng Dung Lượng */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatBytes(totalBytes)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Tổng Dung Lượng Kho
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filter Controls & Search Bar & BỘ LỌC TRÙNG ĐỀ */}
        <ScrollReveal delay={150}>
          <div className="p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl space-y-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Search Bar Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm đề thi, trường học, năm học, tác giả..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-transparent focus:border-purple-500/50 focus:bg-white dark:focus:bg-black/40 text-slate-900 dark:text-white text-sm outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 self-end md:self-auto">
                <span className={`w-2 h-2 rounded-full ${isLiveApi ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'}`} />
                {isLiveApi ? `Đã kết nối Live Bot API (${stats.total_real} Đề)` : 'Kho Đề Sẵn Sàng'}
              </div>
            </div>

            {/* BỘ LỌC XEM TRÙNG ĐỀ HAY KHÔNG (Yêu cầu chính của User) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Lọc Trùng Đề:</span>
                </span>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => handleDupFilterChange('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterDup === 'all'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tất Cả ({stats.total_real})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDupFilterChange('unique')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      filterDup === 'unique'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-300'
                    }`}
                  >
                    <span>Đề Độc Bản</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                      {stats.unique_items}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDupFilterChange('duplicate')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      filterDup === 'duplicate'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-300'
                    }`}
                  >
                    <span>Đề Trùng Lặp</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                      {stats.duplicate_items}
                    </span>
                  </button>
                </div>
              </div>

              {/* Nút lọc Tủ Sách Yêu Thích & Làm Mới */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBookmarksOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    showBookmarksOnly
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-amber-500/10 text-amber-500 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                  }`}
                  title="Xem các đề thi bạn đã bấm ⭐ lưu vào tủ sách cá nhân"
                >
                  <Star className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current' : ''}`} />
                  <span>⭐ Tủ Sách Của Tôi ({bookmarkedIds.size})</span>
                </button>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={() => {
                    fetchStats();
                    fetchDocuments(filterDup);
                  }}
                  disabled={isLoading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Làm Mới</span>
                </button>
              </div>
            </div>

            {/* Subject Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {SUBJECT_FILTERS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubject(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedSubject === tab.id
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc, idx) => (
            <ScrollReveal key={doc.id} delay={idx * 30}>
              <SpotlightCard
                className={`h-full flex flex-col justify-between p-6 rounded-2xl border backdrop-blur-xl group transition-all duration-300 ${
                  doc.is_duplicate_copy
                    ? 'border-amber-500/40 bg-amber-950/10 dark:bg-amber-950/20 hover:border-amber-500/70'
                    : 'border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 hover:border-purple-500/50'
                }`}
                spotlightColor={doc.is_duplicate_copy ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)'}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                        {doc.subject}
                      </span>

                      {/* BADGE TRÙNG LẶP / ĐỘC BẢN */}
                      {doc.is_duplicate_copy ? (
                        <span 
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                          title={`Bản trùng của đề ID #${doc.original_id || 'gốc'}`}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Bản Trùng (#{doc.id})</span>
                        </span>
                      ) : doc.is_duplicate ? (
                        <span 
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                          title={`Bản gốc lưu trữ sớm nhất (Có ${doc.duplicate_count ? doc.duplicate_count - 1 : 1} bản sao trùng)`}
                        >
                          <CheckCircle className="w-3 h-3 text-blue-400" />
                          <span>Bản Gốc</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✨ Độc Bản
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-medium text-slate-400">
                      {doc.file_type} • {formatBytes(doc.file_size_bytes)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-purple-500 transition-colors">
                    {doc.title || doc.file_name}
                  </h3>

                  {/* Subtitle / Filename */}
                  <div className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1 truncate" title={doc.file_name}>
                    {doc.file_name}
                  </div>

                  {/* Level & Question count */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/5">
                      🎓 {formatEstimatedLevel(doc.estimated_level)}
                    </span>
                    {doc.question_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/5">
                        📑 {doc.question_count} câu hỏi
                      </span>
                    )}
                    {doc.page_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/5">
                        📄 {doc.page_count} trang
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Meta & Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Đóng góp bởi <span className="font-semibold text-slate-600 dark:text-slate-300">{doc.author_name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Nút ⭐ Lưu vào tủ sách */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmarkExam(doc.id);
                        setBookmarkedIds(new Set(getBookmarkedExamIds()));
                      }}
                      className={`p-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        bookmarkedIds.has(doc.id)
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                      }`}
                      title={bookmarkedIds.has(doc.id) ? 'Bỏ lưu khỏi tủ sách cá nhân' : '⭐ Lưu vào tủ sách của tôi'}
                    >
                      <Star className={`w-3.5 h-3.5 ${bookmarkedIds.has(doc.id) ? 'fill-current' : ''}`} />
                    </button>

                    {/* Tải về */}
                    <a
                      href={`${getApiBaseUrl()}/api/documents/${doc.id}/download?ngrok-skip-browser-warning=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white font-semibold transition-all"
                      title="Tải tệp đề thi về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {/* Xem bài Discord */}
                    {doc.jump_url ? (
                      <a
                        href={doc.jump_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-600 dark:text-purple-300 hover:text-white font-semibold transition-all"
                      >
                        <span>Discord</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-purple-500 font-semibold px-2 py-1">Đã lưu trữ</span>
                    )}
                  </div>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold">Không tìm thấy tài liệu phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterDup === 'duplicate' 
                ? 'Không có đề thi nào bị trùng lặp trong nhóm môn này!' 
                : 'Hãy thử tìm với từ khóa khác hoặc chọn "Tất Cả Môn"'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DocumentVault;
