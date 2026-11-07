/**
 * src/courses/CoursesHub.tsx
 * Giao diện Trung tâm Khóa Học (Bản Thô / Modular Scaffold).
 * Đồng bộ trực tiếp và độc lập với kho mã nguồn:
 *   https://github.com/DaiVietForWork-81/khoahoc
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  BookOpen,
  Play,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  CourseItem,
  CourseSubjectId,
  CourseGradeLevel,
  CoursesCatalogPayload,
} from './types';
import {
  KHOAHOC_REPO_URL,
  getInitialCoursesCatalog,
  fetchRemoteCoursesCatalog,
} from './coursesCatalog';

interface CoursesHubProps {
  /** Callback tùy chọn khi người dùng muốn mở Kho Đề Thi của môn tương ứng trên Hub chính */
  onOpenExamVaultForSubject?: (subjectCode: string) => void;
}

const SUBJECT_TO_VAULT_MAP: Record<CourseSubjectId, string> = {
  TOAN: 'MATHEMATICS',
  VAN: 'LITERATURE',
  ANH: 'ENGLISH',
  LY: 'PHYSICS',
  HOA: 'CHEMISTRY',
  SINH: 'BIOLOGY',
  TIN: 'INFORMATICS',
  SU_DIA: 'HISTORY',
};

const GRADE_FILTERS: { id: 'ALL' | CourseGradeLevel; label: string }[] = [
  { id: 'ALL', label: 'Tất cả khối' },
  { id: '12', label: 'Lớp 12' },
  { id: '11', label: 'Lớp 11' },
  { id: '10', label: 'Lớp 10' },
  { id: 'THCS', label: 'Khối THCS (6–9)' },
  { id: 'CHUYEN', label: 'Chuyên & HSG' },
];

export const CoursesHub: React.FC<CoursesHubProps> = ({ onOpenExamVaultForSubject }) => {
  const [catalog, setCatalog] = useState<CoursesCatalogPayload>(() => getInitialCoursesCatalog());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedLive, setSyncedLive] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<'ALL' | CourseSubjectId>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | CourseGradeLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>('course-toan-12-2025');

  const syncWithKhoaHocRepo = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { catalog: nextCatalog, syncedFromRemote } = await fetchRemoteCoursesCatalog();
      setCatalog(nextCatalog);
      setSyncedLive(syncedFromRemote);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncWithKhoaHocRepo();
  }, [syncWithKhoaHocRepo]);

  const subjectCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of catalog.courses) {
      map[c.subjectId] = (map[c.subjectId] || 0) + 1;
    }
    return map;
  }, [catalog.courses]);

  const filteredCourses = useMemo(() => {
    return catalog.courses.filter((course) => {
      if (selectedSubject !== 'ALL' && course.subjectId !== selectedSubject) return false;
      if (selectedGrade !== 'ALL' && course.grade !== selectedGrade) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${course.title} ${course.summary} ${course.instructor} ${course.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog.courses, selectedSubject, selectedGrade, searchQuery]);

  const getSubjectMeta = (id: CourseSubjectId) =>
    catalog.subjects.find((s) => s.id === id) || catalog.subjects[0];

  const getStatusBadge = (status: CourseItem['status']) => {
    if (status === 'ready') {
      return {
        label: 'Bản thử nghiệm Beta',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    }
    if (status === 'draft') {
      return {
        label: 'Beta · Chưa hoàn thiện',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    }
    return {
      label: 'Đang phát triển (Chưa hoàn thiện)',
      className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BANNER CẢNH BÁO BETA (CHƯA HOÀN THIỆN)                                 */}
      {/* ===================================================================== */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/35 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider shrink-0">
            BETA · CHƯA HOÀN THIỆN
          </span>
          <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
            Phân hệ <strong>Khóa Học Chuyên Đề</strong> hiện đang trong giai đoạn thử nghiệm (<strong>Beta — Chưa hoàn thiện</strong>). Một số bài giảng, video và bài tập tự luyện đang được đội ngũ tiếp tục biên soạn và cập nhật.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* HEADER BANNER: TRUNG TÂM KHÓA HỌC ORBIT & CẦU NỐI REPO KHOAHOC       */}
      {/* ===================================================================== */}
      <div className="hh-command-deck p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#221a35]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>Phân hệ Khóa Học · BETA (Chưa hoàn thiện)</span>
              </span>
              <span className="text-[13px] font-mono px-2.5 py-1 rounded-lg bg-[#15131f] text-amber-200 border border-[#221e30] flex items-center gap-1.5 tabular-nums">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>
                  {syncedLive
                    ? 'Đang hoàn thiện nội dung (Đồng bộ khoahoc)'
                    : 'Đang trong quá trình xây dựng & hoàn thiện nội dung'}
                </span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-white tracking-tight leading-[1.18] flex flex-wrap items-center gap-2.5">
              <span>Trung tâm khóa học chuyên đề Orbit</span>
              <span className="text-xs sm:text-sm font-mono font-bold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/35">
                Beta · Chưa hoàn thiện
              </span>
            </h1>
            <p className="text-[13px] sm:text-sm text-white/65 max-w-3xl leading-relaxed">
              Khung lộ trình học tập theo chương trình GDPT 2018 &amp; Ôn thi Chuyên/HSG (Toán, Văn, Anh, Lý, Hóa, Sinh, Tin, Sử–Địa). Nội dung bài giảng được đồng bộ 1 chiều từ kho{' '}
              <strong className="text-[#FFB8E6]">DaiVietForWork-81/khoahoc</strong> để đội ngũ phát triển khóa học làm việc độc lập.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={syncWithKhoaHocRepo}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-[#161420] hover:bg-[#1e1b2c] border border-[#221e30] text-[13px] font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#FF4FCB] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ khoahoc'}</span>
            </button>

            <a
              href={KHOAHOC_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] border border-[#e13689] text-[13px] font-extrabold text-white flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Mở GitHub khoahoc</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MA TRẬN 8 MÔN HỌC (BẤM ĐỂ LỌC KHÓA HỌC THEO MÔN)                    */}
        {/* =================================================================== */}
        <div className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-white/80 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#C4A6FF]" />
              <span>Danh mục môn học ({catalog.subjects.length} phân ban)</span>
            </span>
            {selectedSubject !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSubject('ALL')}
                className="text-[13px] font-bold text-[#FFB8E6] hover:underline cursor-pointer"
              >
                Hiện tất cả môn học →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {catalog.subjects.map((subj) => {
              const isSelected = selectedSubject === subj.id;
              const count = subjectCounts[subj.id] ?? subj.totalCourses;
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() =>
                    setSelectedSubject((prev) => (prev === subj.id ? 'ALL' : subj.id))
                  }
                  style={{ ['--subject-accent' as string]: subj.accentColor }}
                  className={`hh-subject-cell text-left cursor-pointer ${
                    isSelected ? 'bg-[#1c152e] border-[#FF4FCB]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-white truncate">{subj.name}</span>
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#181424] border border-[#28203d] tabular-nums shrink-0"
                      style={{ color: subj.accentColor }}
                    >
                      {count} khóa
                    </span>
                  </div>
                  <p className="text-xs text-white/55 mt-1 line-clamp-1">
                    {subj.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* KHUNG DANH MỤC KHÓA HỌC & GIÁO TRÌNH MẪU (UNIFIED SURFACE)            */}
      {/* ===================================================================== */}
      <div className="hh-hub-surface p-5 sm:p-6 space-y-5">
        {/* Thanh bộ lọc khối lớp & tìm kiếm */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#221a35]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSubject('ALL')}
              data-active={selectedSubject === 'ALL'}
              className="hh-hub-chip"
            >
              <span>Tất cả môn ({catalog.courses.length})</span>
            </button>
            {GRADE_FILTERS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGrade(g.id)}
                data-active={selectedGrade === g.id}
                className="hh-hub-chip"
              >
                <span>{g.label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4A6FF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khóa học (Toán 12, Đọc hiểu, IELTS, C++...)"
              className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-[#0D0A14] border border-[#221a35] focus:border-[#FF4FCB] text-[13px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Lưới thẻ khóa học (items-start chống kéo giãn khoảng trống) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filteredCourses.map((course) => {
            const subj = getSubjectMeta(course.subjectId);
            const statusBadge = getStatusBadge(course.status);
            const isExpanded = expandedCourseId === course.id;

            return (
              <div
                key={course.id}
                className={`p-5 rounded-xl bg-[#0D0A14] border space-y-3.5 ${
                  isExpanded
                    ? 'lg:col-span-2 border-[#422039]'
                    : 'border-[#221a35]'
                }`}
              >
                {/* Hàng huy hiệu môn học + khối lớp + trạng thái */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#201833] border border-[#32244d]"
                      style={{ color: subj.accentColor }}
                    >
                      {subj.name}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#161420] text-white/85 border border-[#242033]">
                      {course.grade === 'THCS'
                        ? 'Khối THCS'
                        : course.grade === 'CHUYEN'
                        ? 'Hệ Chuyên / HSG'
                        : `Lớp ${course.grade}`}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#161420] text-[#C4A6FF] border border-[#242033]">
                      {course.level}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* Tiêu đề & Tóm tắt khóa học */}
                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                    {course.title}
                  </h2>
                  <p className="text-[13px] text-white/65 leading-relaxed">{course.summary}</p>
                </div>

                {/* Thông số khóa học */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-white/55 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#FF4FCB]" />
                    <span>{course.lessonsCount} bài giảng</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{course.durationHours} giờ học</span>
                  </span>
                  <span className="font-sans text-white/60">• {course.instructor}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-md bg-[#151221] text-white/70 border border-[#221a35]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Khung Chương & Bài giảng mẫu (Mở rộng khi bấm) */}
                {isExpanded && (
                  <div className="pt-3 border-t border-[#221a35] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#FFB8E6]">
                        Khung chương trình mẫu (Chỉnh sửa tại data/courses.json)
                      </span>
                      <span className="font-mono text-white/45 tabular-nums">
                        {course.chapters.length} chương mẫu
                      </span>
                    </div>

                    {course.chapters.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                        {course.chapters.map((ch) => (
                          <div
                            key={ch.id}
                            className="p-3.5 rounded-xl bg-[#130f1e] border border-[#241c38] space-y-2"
                          >
                            <div className="text-[13px] font-bold text-white">{ch.title}</div>
                            <div className="space-y-1.5">
                              {ch.lessons.map((ls) => (
                                <div
                                  key={ls.id}
                                  className="flex items-center justify-between gap-2 text-xs py-1 px-2.5 rounded-lg bg-[#191426] text-white/80"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {ls.type === 'video' ? (
                                      <Play className="w-3.5 h-3.5 text-[#FF4FCB] shrink-0" />
                                    ) : ls.type === 'document' ? (
                                      <FileText className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                    <span className="truncate">{ls.title}</span>
                                  </div>
                                  <span className="font-mono text-white/45 shrink-0 tabular-nums">
                                    {ls.durationMinutes}p
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#130f1e] border border-[#241c38] text-xs text-white/60">
                        Khóa học đang ở trạng thái chờ thêm chương mục trong tệp{' '}
                        <code className="text-[#FFB8E6] font-mono">data/courses.json</code> trên repo{' '}
                        <code className="text-emerald-300 font-mono">DaiVietForWork-81/khoahoc</code>.
                      </div>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="pt-3 border-t border-[#221a35] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCourseId((prev) => (prev === course.id ? null : course.id))
                    }
                    className="px-3.5 py-2 rounded-xl bg-[#d61f79] hover:bg-[#e11d84] text-white font-extrabold text-[13px] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Thu gọn khung bài giảng' : 'Xem khung bài giảng'}</span>
                  </button>

                  {onOpenExamVaultForSubject && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenExamVaultForSubject(SUBJECT_TO_VAULT_MAP[course.subjectId])
                      }
                      className="px-3 py-2 rounded-xl bg-[#161420] hover:bg-[#1e1b2c] border border-[#221e30] text-[13px] font-bold text-white/85 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Luyện đề {subj.shortName}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#FFB8E6]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
