import React, { useState } from 'react';
import { X, Sparkles, ExternalLink, RefreshCw, LayoutGrid, Search, Cpu } from 'lucide-react';

interface LucianStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialElementId?: string;
}

const FEATURED_ELEMENTS = [
  { id: '001', name: 'Liquid Glass Button', category: 'Buttons', tag: 'UX-001', desc: 'Nút kính lỏng với hiệu ứng phản chiếu ánh sáng và lượn sóng đàn hồi.' },
  { id: '004', name: 'Fill Progress Download', category: 'Loading', tag: 'UX-004', desc: 'Thanh tiến trình nạp đầy biến đổi nút bấm sang trạng thái hoàn tất.' },
  { id: '007', name: 'Play–Pause Morph', category: 'Audio/Visual', tag: 'UX-007', desc: 'Nút phát nhạc SVG morphing mượt mà kết hợp thanh Equalizer sống động.' },
  { id: '009', name: 'Rolling Label Button', category: 'Buttons', tag: 'UX-009', desc: 'Hiệu ứng lật chữ 3D từng ký tự khi hover và icon chuyển động.' },
  { id: '025', name: 'Floating Label Field', category: 'Inputs', tag: 'UX-025', desc: 'Ô nhập liệu thông minh với nhãn lơ lửng và đường viền phát sáng.' },
  { id: '026', name: 'OTP Code Input', category: 'Inputs', tag: 'UX-026', desc: 'Ô nhập mã OTP 6 số tự động nhảy với con trỏ nhấp nháy tinh xảo.' },
  { id: '032', name: 'Drag-and-Drop Upload', category: 'Inputs', tag: 'UX-032', desc: 'Khung kéo thả nộp tệp với viền xoay phát sáng và nhận diện định dạng.' },
  { id: '036', name: 'Password Strength', category: 'Inputs', tag: 'UX-036', desc: 'Thanh đo độ mạnh mật khẩu 4 cấp độ với hoạt ảnh chuyển màu động.' },
  { id: '039', name: 'Sliding Pill Tabs', category: 'Navigation', tag: 'UX-039', desc: 'Thanh chuyển tab viên thuốc bám theo vị trí tab với vật lý lò xo (spring).' },
  { id: '138', name: 'Redaction Editor', category: 'Editing', tag: 'UX-138', desc: 'Công cụ che mờ vùng văn bản nhạy cảm chuyên nghiệp.' },
  { id: '147', name: 'Regex Tester', category: 'Editing', tag: 'UX-147', desc: 'Bộ kiểm tra biểu thức chính quy (Regex) trực quan với highlight màu.' },
  { id: '170', name: 'Incident Timeline', category: 'Data', tag: 'UX-170', desc: 'Dòng thời gian sự cố và nhật ký tương tác dạng node đồ thị.' },
];

const CATEGORIES = [
  'Tất Cả (200)',
  'Buttons',
  'Toggles & Pickers',
  'Inputs & Search',
  'Menus & Tabs',
  'Cards & Content',
  'Loading & Progress',
  'Document & Data',
  'Analytics & Charts'
];

export const LucianStudioModal: React.FC<LucianStudioModalProps> = ({ isOpen, onClose, initialElementId }) => {
  const [selectedElement, setSelectedElement] = useState<string>(initialElementId || '001');
  const [activeCategory, setActiveCategory] = useState<string>('Tất Cả (200)');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    setSelectedElement(id);
    const iframe = document.getElementById('lucian-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = `/ux-lab/index.html#${id}`;
    }
  };

  const filteredFeatured = FEATURED_ELEMENTS.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.id.includes(searchQuery);
    const matchesCat = activeCategory === 'Tất Cả (200)' || 
                       e.category.toLowerCase().includes(activeCategory.toLowerCase().slice(0, 4));
    return matchesSearch && matchesCat;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-[#0b0c14] border border-purple-500/25 rounded-3xl shadow-2xl shadow-purple-950/50 text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Lucian UX/UI Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-purple-500 to-emerald-400 text-black">
                  200 Elements Live
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-purple-200">
                  Zero Dependency · MIT
                </span>
              </div>
              <p className="text-xs text-white/60">
                Thư viện tương tác Micro-Interactions cao cấp Seokwoooo/lucian-uxui tích hợp cho HyperHub.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/ux-lab/index.html#${selectedElement}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Mở toàn màn hình tab mới"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Toàn Màn Hình</span>
            </a>

            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Tải lại Sandbox"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area: Split View (Sidebar Elements Explorer + Main Iframe Sandbox) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Column: Quick Explorer & Presets */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col bg-black/40 p-3 sm:p-4 shrink-0 overflow-y-auto">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm element (#001, drop, button...)"
                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
              {CATEGORIES.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/[0.05] text-white/70 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Highlighted Elements List */}
            <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                <span>Thành Phần Nổi Bật ({filteredFeatured.length})</span>
              </span>
              <span className="text-[10px] text-purple-400 font-mono">D:\Project\Skills</span>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {filteredFeatured.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedElement === item.id
                      ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-md shadow-purple-900/20'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs flex items-center gap-1.5 text-white">
                      <span className="font-mono text-purple-300 text-[10px] bg-purple-500/20 px-1 rounded">
                        #{item.id}
                      </span>
                      <span>{item.name}</span>
                    </span>
                    <span className="text-[10px] text-white/50">{item.category}</span>
                  </div>
                  <p className="text-[11px] text-white/60 line-clamp-1">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Quick Skills Info Pill */}
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 to-black/60 border border-purple-500/20 text-xs">
              <div className="flex items-center gap-2 text-purple-300 font-semibold mb-1">
                <Cpu className="w-3.5 h-3.5" />
                <span>CLI Tự Động Hóa</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed font-mono">
                node D:\Project\Skills\lucian-uxui\scripts\lucian-uxui.mjs get {selectedElement}
              </p>
            </div>
          </div>

          {/* Right Column: Full Interactive Sandbox Iframe */}
          <div className="flex-1 relative flex flex-col bg-[#07080d]">
            <iframe
              id="lucian-iframe"
              key={iframeKey}
              src={`/ux-lab/index.html#${selectedElement}`}
              title="Lucian UX/UI Lab"
              className="w-full h-full border-none"
              allow="clipboard-write"
            />
          </div>

        </div>

      </div>
    </div>
  );
};
export default LucianStudioModal;
