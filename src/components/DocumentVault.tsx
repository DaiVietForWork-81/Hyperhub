import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Database, 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  FolderOpen
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { ScrollReveal } from './ScrollReveal';
import { getApiBaseUrl } from '../utils/apiConfig';
import { formatEstimatedLevel } from '../utils/formatters';

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
    file_hash: "a4f8c2b910e34d12..."
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
    file_hash: "9af18e5e048d6f0e..."
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
    file_hash: "3b8c9d1a2f4e5a6b..."
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
    file_hash: "7c6d5e4f3a2b1098..."
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
    file_hash: "2e1d0c9b8a7f6e5d..."
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
    file_hash: "8f7e6d5c4b3a2109..."
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

  // Fetch real data from Bot API bridge if running
  useEffect(() => {
    let isMounted = true;
    const fetchApiDocs = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/api/documents?limit=50`, {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.documents && data.documents.length > 0 && isMounted) {
            setDocuments(data.documents);
            setIsLiveApi(true);
          }
        }
      } catch {
        // Fallback to static sample documents
      }
    };

    fetchApiDocs();
    return () => { isMounted = false; };
  }, []);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchSubject = selectedSubject === 'ALL' || doc.subject.toUpperCase() === selectedSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        doc.title.toLowerCase().includes(q) || 
        doc.file_name.toLowerCase().includes(q) ||
        doc.estimated_level.toLowerCase().includes(q) ||
        doc.author_name.toLowerCase().includes(q);
      return matchSubject && matchQuery;
    });
  }, [documents, selectedSubject, searchQuery]);

  const totalBytes = useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.file_size_bytes || 0), 0);
  }, [documents]);

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
              DocInspector Engine & C++ Native
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Kho Tài Liệu & <span className="bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-500 bg-clip-text text-transparent">Đề Thi Tự Động</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium">
              Được tự động tiếp nhận, quét an toàn SHA-256, bóc tách cấu trúc và lưu trữ chuẩn mực 
              bởi hệ sinh thái bot Discord HyperHub.
            </p>
          </div>
        </ScrollReveal>

        {/* Live Metric Cards */}
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 mb-10">
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {documents.length}+
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Tài Liệu Đã Lưu Trữ
                  </div>
                </div>
              </div>
            </div>

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

            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    &lt; 25 ms
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Tốc Độ C++ Native Core
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    100%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Quét An Toàn & Chống Trùng
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filter Controls & Search Bar */}
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
                {isLiveApi ? 'Đã kết nối Live Bot API' : 'Kho Đề Sẵn Sàng'}
              </div>
            </div>

            {/* Subject Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {SUBJECT_FILTERS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubject(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
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
            <ScrollReveal key={doc.id} delay={idx * 40}>
              <SpotlightCard
                className="h-full flex flex-col justify-between p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl group hover:border-purple-500/50 transition-all duration-300"
                spotlightColor="rgba(168, 85, 247, 0.15)"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                      {doc.subject}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {doc.file_type} • {formatBytes(doc.file_size_bytes)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-purple-500 transition-colors">
                    {doc.title}
                  </h3>

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
                  </div>
                </div>

                {/* Footer Meta & Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Đóng góp bởi <span className="font-semibold text-slate-600 dark:text-slate-300">{doc.author_name}</span>
                  </div>

                  {doc.jump_url ? (
                    <a
                      href={doc.jump_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-600 dark:text-purple-300 hover:text-white font-semibold transition-all"
                    >
                      <span>Xem Bài</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-purple-500 font-semibold">Đã lưu trữ</span>
                  )}
                </div>
              </SpotlightCard>
            </ScrollReveal>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-semibold">Không tìm thấy tài liệu phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Hãy thử tìm với từ khóa khác hoặc chọn &quot;Tất Cả Môn&quot;</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DocumentVault;
