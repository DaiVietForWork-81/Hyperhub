import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Dices,
  UploadCloud,
  Home,
  X,
  ChevronRight,
} from 'lucide-react';
import { ExamDocument, getEducationLevelBadgeInfo } from './Dashboard';
import { getGradeBadgeStyle } from '../utils/formatters';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ExamDocument[];
  onSelectExam: (doc: ExamDocument) => void;
  onNavigateTab: (tab: 'overview' | 'vault' | 'get_exam' | 'submit_doc') => void;
  onNavigateHome: () => void;
  onTriggerRandomExam: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  documents,
  onSelectExam,
  onNavigateTab,
  onNavigateHome,
  onTriggerRandomExam,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Bộ lọc kết quả
  const filteredExams = query.trim()
    ? documents
        .filter((d) => {
          const q = query.toLowerCase();
          return (
            (d.title || '').toLowerCase().includes(q) ||
            (d.file_name || '').toLowerCase().includes(q) ||
            (d.subject || '').toLowerCase().includes(q) ||
            (d.estimated_level || '').toLowerCase().includes(q) ||
            (d.academic_year || '').toLowerCase().includes(q) ||
            (d.school_or_department || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  const quickActions = [
    {
      id: 'action-random',
      title: 'Bốc Đề Thi Ngẫu Nhiên',
      category: 'Hành động nhanh',
      icon: <Dices className="w-4 h-4 text-amber-400" />,
      action: () => {
        onTriggerRandomExam();
        onClose();
      },
    },
    {
      id: 'action-vault',
      title: 'Xem Toàn Bộ Kho Đề Thi',
      category: 'Điều hướng',
      icon: <BookOpen className="w-4 h-4 text-[#FFA8DC]" />,
      action: () => {
        onNavigateTab('vault');
        onClose();
      },
    },
    {
      id: 'action-submit',
      title: 'Nộp Đề Thi Mới (PDF / Word / Google Drive)',
      category: 'Thao tác',
      icon: <UploadCloud className="w-4 h-4 text-[#FF3CA6]" />,
      action: () => {
        onNavigateTab('submit_doc');
        onClose();
      },
    },
    {
      id: 'action-home',
      title: 'Về Trang Chủ Orbit',
      category: 'Điều hướng',
      icon: <Home className="w-4 h-4 text-[#FFB396]" />,
      action: () => {
        onNavigateHome();
        onClose();
      },
    },
  ];

  // Bắt phím điều hướng & khóa cuộn nền
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      window.__lenis?.start();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh Orbit"
      className="fixed inset-0 z-[9995] flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/82 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#100B1A]/98 border border-[#FF3CA6]/35 shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-[#F8F5FF]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <Search className="w-5 h-5 text-[#FFA8DC] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            aria-label="Nhập từ khóa tìm kiếm đề thi hoặc thao tác nhanh"
            placeholder="Tìm kiếm đề thi, môn học, năm học hoặc thao tác nhanh... (Esc để thoát)"
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-[#988CB8] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xóa từ khóa tìm kiếm"
              className="p-1.5 rounded-lg text-[#988CB8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-[#CEC4E8] border border-white/10">
              ESC
            </span>
          )}
        </div>

        {/* Content List */}
        <div data-lenis-prevent className="max-h-[380px] overflow-y-auto overscroll-contain p-3 space-y-4">
          {/* Kết quả tìm kiếm đề thi */}
          {query.trim() && (
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#988CB8] px-3 py-1">
                Đề Thi Khớp Từ Khóa ({filteredExams.length})
              </div>

              {filteredExams.length > 0 ? (
                filteredExams.map((exam) => {
                  const gradeStyle = getGradeBadgeStyle(exam.estimated_level);
                  const eduBadge = getEducationLevelBadgeInfo(exam);
                  return (
                    <button
                      type="button"
                      key={exam.id}
                      onClick={() => {
                        onSelectExam(exam);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-2xl bg-white/[0.02] hover:bg-[#FF3CA6]/12 focus-visible:bg-[#FF3CA6]/15 border border-transparent hover:border-[#FF3CA6]/35 focus-visible:border-[#FFA8DC]/50 flex items-center justify-between gap-3 cursor-pointer transition-all group"
                    >
                      <div className="overflow-hidden space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3CA6]/18 text-[#FFA8DC] border border-[#FF3CA6]/30">
                            {exam.subject}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${eduBadge.badgeClass}`}
                          >
                            <span>{eduBadge.icon}</span>
                            <span>{eduBadge.shortLabel}</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${gradeStyle.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${gradeStyle.dotColor}`} />
                            <span>{gradeStyle.label}</span>
                          </span>
                          {exam.academic_year && (
                            <span className="text-[10px] text-[#988CB8] font-mono">
                              {exam.academic_year}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#FFA8DC] truncate">
                          {exam.title || exam.file_name}
                        </h4>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#988CB8] group-hover:text-[#FFA8DC] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#CEC4E8] space-y-1">
                  <p>Không tìm thấy đề thi phù hợp với từ khóa "{query}"</p>
                  <p className="text-[11px] text-[#988CB8]">Hãy thử tìm theo tên môn (Toán, Tin) hoặc khối lớp (12, 11...)</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions (Luôn hiển thị khi chưa gõ hoặc gõ từ khóa chung) */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#988CB8] px-3 py-1">
              Thao Tác Nhanh
            </div>
            {quickActions.map((qa) => (
              <button
                type="button"
                key={qa.id}
                onClick={qa.action}
                className="w-full text-left p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] focus-visible:bg-white/[0.08] border border-transparent hover:border-white/15 focus-visible:border-[#FFA8DC]/50 flex items-center justify-between gap-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                    {qa.icon}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">
                      {qa.title}
                    </h4>
                    <span className="text-[10px] text-[#988CB8]">{qa.category}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#988CB8] group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer shortcuts info */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#08060E]/75 flex items-center justify-between text-[11px] text-[#988CB8]">
          <div className="flex items-center gap-2">
            <span>Dùng</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#CEC4E8]">
              Esc
            </kbd>
            <span>để thoát</span>
          </div>
          <span className="flex items-center gap-1.5 text-[#FFA8DC] font-semibold">
            <Search className="w-3 h-3" />
            Tìm kiếm nhanh Orbit
          </span>
        </div>
      </div>
    </div>
  );
};
