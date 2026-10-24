import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  GraduationCap,
  School,
  CheckCircle2,
  Circle,
  Backpack,
  X,
  RotateCcw,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { PixelButton, SpotSurface } from './hh/Controls';
import { useHubPulse } from '../hooks/useHubPulse';

interface ExamSession {
  idx: string;
  subject: string;
  dateStr: string;
  timeRange: string;
  duration: string;
}

type ExamMode = 'thpt' | 'grade10';
type CohortKey = '2026_2027' | '2027_2028' | '2028_2029';

interface CohortSchedule {
  key: CohortKey;
  label: string;
  badge: string;
  targetIso: string;
  examYear: number;
  birthYear: number;
  startYearIso: string;
  dateRangeStr: string;
  note: string;
  sessions: ExamSession[];
}

export const SCHEDULES_DATA: Record<ExamMode, Record<CohortKey, CohortSchedule>> = {
  thpt: {
    '2026_2027': {
      key: '2026_2027',
      label: 'Khóa 2026 – 2027',
      badge: '2k8 · Đã hoàn thành',
      targetIso: '2026-06-11T07:30:00+07:00',
      examYear: 2026,
      birthYear: 2008,
      startYearIso: '2025-09-05T00:00:00+07:00',
      dateRangeStr: '11/06 – 12/06/2026',
      note: 'Lịch thi chuẩn Chương trình GDPT 2018 (4 môn thi: Toán, Văn + 2 môn tự chọn).',
      sessions: [
        {
          idx: '01',
          subject: 'Ngữ văn (Tự luận)',
          dateStr: 'Sáng 11/06/2026',
          timeRange: '07:35 – 09:35',
          duration: '120 phút',
        },
        {
          idx: '02',
          subject: 'Toán học (Trắc nghiệm mới)',
          dateStr: 'Chiều 11/06/2026',
          timeRange: '14:30 – 16:00',
          duration: '90 phút',
        },
        {
          idx: '03',
          subject: 'Tự chọn Ca 1 (Lý / Hóa / Sinh / Sử / Địa / Anh / Tin…)',
          dateStr: 'Sáng 12/06/2026',
          timeRange: '07:35 – 08:25',
          duration: '50 phút',
        },
        {
          idx: '04',
          subject: 'Tự chọn Ca 2 (Môn tự chọn thứ 2)',
          dateStr: 'Sáng 12/06/2026',
          timeRange: '08:35 – 09:25',
          duration: '50 phút',
        },
      ],
    },
    '2027_2028': {
      key: '2027_2028',
      label: 'Khóa 2027 – 2028',
      badge: '2k9 · Kỳ thi chính sắp tới',
      targetIso: '2027-06-11T07:30:00+07:00',
      examYear: 2027,
      birthYear: 2009,
      startYearIso: '2026-09-05T00:00:00+07:00',
      dateRangeStr: '11/06 – 12/06/2027 (Dự kiến)',
      note: 'Kỳ thi Tốt nghiệp THPT 2027 dành cho học sinh sinh năm 2009 theo cấu trúc định dạng 2025 của Bộ GD&ĐT.',
      sessions: [
        {
          idx: '01',
          subject: 'Ngữ văn (Tự luận)',
          dateStr: 'Sáng 11/06/2027',
          timeRange: '07:35 – 09:35',
          duration: '120 phút',
        },
        {
          idx: '02',
          subject: 'Toán học (Trắc nghiệm 3 phần)',
          dateStr: 'Chiều 11/06/2027',
          timeRange: '14:30 – 16:00',
          duration: '90 phút',
        },
        {
          idx: '03',
          subject: 'Bài thi Tự chọn · Môn thứ 1',
          dateStr: 'Sáng 12/06/2027',
          timeRange: '07:35 – 08:25',
          duration: '50 phút',
        },
        {
          idx: '04',
          subject: 'Bài thi Tự chọn · Môn thứ 2',
          dateStr: 'Sáng 12/06/2027',
          timeRange: '08:35 – 09:25',
          duration: '50 phút',
        },
      ],
    },
    '2028_2029': {
      key: '2028_2029',
      label: 'Khóa 2028 – 2029',
      badge: '2k10 · Lộ trình sớm',
      targetIso: '2028-06-09T07:30:00+07:00',
      examYear: 2028,
      birthYear: 2010,
      startYearIso: '2027-09-05T00:00:00+07:00',
      dateRangeStr: '09/06 – 10/06/2028 (Dự kiến)',
      note: 'Lộ trình chuẩn bị sớm cho học sinh 2k10 hướng tới kỳ thi THPT 2028.',
      sessions: [
        {
          idx: '01',
          subject: 'Ngữ văn (Tự luận)',
          dateStr: 'Sáng 09/06/2028',
          timeRange: '07:35 – 09:35',
          duration: '120 phút',
        },
        {
          idx: '02',
          subject: 'Toán học (Trắc nghiệm 3 phần)',
          dateStr: 'Chiều 09/06/2028',
          timeRange: '14:30 – 16:00',
          duration: '90 phút',
        },
        {
          idx: '03',
          subject: 'Bài thi Tự chọn · Môn thứ 1',
          dateStr: 'Sáng 10/06/2028',
          timeRange: '07:35 – 08:25',
          duration: '50 phút',
        },
        {
          idx: '04',
          subject: 'Bài thi Tự chọn · Môn thứ 2',
          dateStr: 'Sáng 10/06/2028',
          timeRange: '08:35 – 09:25',
          duration: '50 phút',
        },
      ],
    },
  },
  grade10: {
    '2026_2027': {
      key: '2026_2027',
      label: 'Năm học 2026 – 2027',
      badge: '2k11 · Đã hoàn thành',
      targetIso: '2026-06-06T07:30:00+07:00',
      examYear: 2026,
      birthYear: 2011,
      startYearIso: '2025-09-05T00:00:00+07:00',
      dateRangeStr: '06/06 – 07/06/2026',
      note: 'Kỳ thi Tuyển sinh vào lớp 10 THPT công lập năm học 2026–2027.',
      sessions: [
        {
          idx: '01',
          subject: 'Ngữ văn (Tự luận)',
          dateStr: 'Sáng 06/06/2026',
          timeRange: '08:00 – 10:00',
          duration: '120 phút',
        },
        {
          idx: '02',
          subject: 'Ngoại ngữ (Tiếng Anh / Pháp / Nhật…)',
          dateStr: 'Chiều 06/06/2026',
          timeRange: '14:00 – 15:00',
          duration: '60 phút',
        },
        {
          idx: '03',
          subject: 'Toán học (Tự luận / Kết hợp)',
          dateStr: 'Sáng 07/06/2026',
          timeRange: '08:00 – 10:00',
          duration: '120 phút',
        },
        {
          idx: '04',
          subject: 'Môn Chuyên (Dành cho hệ THPT Chuyên)',
          dateStr: 'Ngày 08/06/2026',
          timeRange: '08:00 – 10:30',
          duration: '150 phút',
        },
      ],
    },
    '2027_2028': {
      key: '2027_2028',
      label: 'Năm học 2027 – 2028',
      badge: '2k12 · Kỳ thi chính sắp tới',
      targetIso: '2027-06-05T07:30:00+07:00',
      examYear: 2027,
      birthYear: 2012,
      startYearIso: '2026-09-05T00:00:00+07:00',
      dateRangeStr: '05/06 – 06/06/2027 (Dự kiến)',
      note: 'Kỳ thi Tuyển sinh vào lớp 10 THPT năm học 2027–2028 dành cho học sinh sinh năm 2012.',
      sessions: [
        {
          idx: '01',
          subject: 'Ngữ văn (Tự luận)',
          dateStr: 'Sáng 05/06/2027',
          timeRange: '08:00 – 10:00',
          duration: '120 phút',
        },
        {
          idx: '02',
          subject: 'Ngoại ngữ / Môn thứ 3',
          dateStr: 'Chiều 05/06/2027',
          timeRange: '14:00 – 15:00',
          duration: '60 phút',
        },
        {
          idx: '03',
          subject: 'Toán học',
          dateStr: 'Sáng 06/06/2027',
          timeRange: '08:00 – 10:00',
          duration: '120 phút',
        },
        {
          idx: '04',
          subject: 'Môn Chuyên (Hệ THPT Chuyên)',
          dateStr: 'Ngày 07/06/2027',
          timeRange: '08:00 – 10:30',
          duration: '150 phút',
        },
      ],
    },
    '2028_2029': {
      key: '2028_2029',
      label: 'Năm học 2028 – 2029',
      badge: '2k13 · Lộ trình sớm',
      targetIso: '2028-06-03T07:30:00+07:00',
      examYear: 2028,
      birthYear: 2013,
      startYearIso: '2027-09-05T00:00:00+07:00',
      dateRangeStr: '03/06 – 04/06/2028 (Dự kiến)',
      note: 'Lộ trình ôn luyện nền tảng THCS cho học sinh sinh năm 2013.',
      sessions: [
        {
          idx: '01',
          subject: 'Ngữ văn (Tự luận)',
          dateStr: 'Sáng 03/06/2028',
          timeRange: '08:00 – 10:00',
          duration: '120 phút',
        },
        {
          idx: '02',
          subject: 'Ngoại ngữ / Môn thứ 3',
          dateStr: 'Chiều 03/06/2028',
          timeRange: '14:00 – 15:00',
          duration: '60 phút',
        },
        {
          idx: '03',
          subject: 'Toán học',
          dateStr: 'Sáng 04/06/2028',
          timeRange: '08:00 – 10:00',
          duration: '120 phút',
        },
        {
          idx: '04',
          subject: 'Môn Chuyên (Hệ THPT Chuyên)',
          dateStr: 'Ngày 05/06/2028',
          timeRange: '08:00 – 10:30',
          duration: '150 phút',
        },
      ],
    },
  },
};

/**
 * Hàm dùng chung giữa Trang chủ và Hub để đồng bộ chính xác số ngày đếm ngược tới kỳ thi THPT tiếp theo.
 */
export function getNextThptExamInfo(nowMs: number = Date.now()): {
  examYear: number;
  daysLeft: number;
  targetIso: string;
  cohortKey: CohortKey;
} {
  const cohorts: CohortKey[] = ['2026_2027', '2027_2028', '2028_2029'];
  for (const key of cohorts) {
    const sched = SCHEDULES_DATA.thpt[key];
    const targetMs = new Date(sched.targetIso).getTime();
    if (nowMs < targetMs) {
      return {
        examYear: sched.examYear,
        daysLeft: Math.max(0, Math.floor((targetMs - nowMs) / (1000 * 60 * 60 * 24))),
        targetIso: sched.targetIso,
        cohortKey: key,
      };
    }
  }
  const fallback = SCHEDULES_DATA.thpt['2028_2029'];
  const diff = Math.max(0, new Date(fallback.targetIso).getTime() - nowMs);
  return {
    examYear: fallback.examYear,
    daysLeft: Math.floor(diff / (1000 * 60 * 60 * 24)),
    targetIso: fallback.targetIso,
    cohortKey: '2028_2029',
  };
}

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  desc: string;
  required: boolean;
}

const INSPIRATIONAL_QUOTES = [
  {
    quote: 'Trên con đường thành công, không có dấu chân của kẻ lười biếng.',
    author: 'Lỗ Tấn',
    tag: 'Kiên trì',
  },
  {
    quote: 'Mỗi bài tập bạn giải hôm nay là một bước tiến gần hơn đến cánh cổng Đại học mơ ước!',
    author: 'Orbit Mentor',
    tag: 'Quyết tâm',
  },
  {
    quote: 'Tri thức là sức mạnh. Đầu tư vào tri thức luôn mang lại lợi nhuận cao nhất.',
    author: 'Benjamin Franklin',
    tag: 'Tri thức',
  },
  {
    quote: 'Đừng dừng lại khi mệt mỏi, hãy dừng lại khi bạn đã hoàn thành bài thi.',
    author: 'Khuyết danh',
    tag: 'Bền bỉ',
  },
  {
    quote: '12 năm đèn sách kết tinh trong một mùa thi. Hãy chiến đấu hết mình để không nuối tiếc!',
    author: 'Lời chúc sĩ tử',
    tag: 'Tỏa sáng',
  },
  {
    quote: 'Tương lai thuộc về những ai tin tưởng vào vẻ đẹp của ước mơ của mình.',
    author: 'Eleanor Roosevelt',
    tag: 'Ước mơ',
  },
  {
    quote: 'Không có áp lực, không có kim cương. Vượt qua giới hạn để chạm đỉnh vinh quang!',
    author: 'Ngạn ngữ hiện đại',
    tag: 'Đột phá',
  },
  {
    quote: 'Mỗi giờ bạn tập trung cao độ hôm nay sẽ đổi lại sự tự tin tuyệt đối trong phòng thi.',
    author: 'Orbit Community',
    tag: 'Tập trung',
  },
];

const CHECKLIST_DATA: ChecklistItem[] = [
  {
    id: 'cccd',
    category: 'Giấy tờ bắt buộc',
    title: 'Căn cước công dân (CCCD) & Thẻ dự thi, Giấy báo dự thi bản gốc',
    desc: 'Kiểm tra kỹ thông tin họ tên, ngày sinh và số báo danh trước ngày làm thủ tục.',
    required: true,
  },
  {
    id: 'pen_pencil',
    category: 'Dụng cụ làm bài',
    title: 'Bút bi cùng màu mực (tối thiểu 2–3 cây xanh/đen), bút chì 2B–4B & tẩy chì',
    desc: 'Dùng tô phiếu trả lời trắc nghiệm và viết tự luận; tuyệt đối không dùng mực đỏ hoặc bút xóa.',
    required: true,
  },
  {
    id: 'calculator',
    category: 'Dụng cụ làm bài',
    title: 'Máy tính cầm tay thuộc danh mục Bộ GD&ĐT cho phép',
    desc: 'Casio FX-580VN X, FX-880BTG, Vinacal 680EX Plus… đã thay pin mới và không gắn thẻ nhớ.',
    required: true,
  },
  {
    id: 'atlat_geo',
    category: 'Dụng cụ hỗ trợ',
    title: 'Thước kẻ, compa, ê-ke (và Atlat nếu thi theo quy định riêng)',
    desc: 'Đựng toàn bộ dụng cụ trong túi hồ sơ nhựa trong suốt để giám thị kiểm tra nhanh.',
    required: false,
  },
  {
    id: 'water_watch',
    category: 'Sức khỏe & Thời gian',
    title: 'Chai nước lọc trong suốt (đã bóc nhãn), đồng hồ kim cơ học & khăn giấy',
    desc: 'Tuyệt đối không mang đồng hồ thông minh (smartwatch) hoặc điện thoại vào phòng thi.',
    required: false,
  },
];

const CHECKLIST_STORAGE_KEY = 'hyperhub_exam_checklist_v1';

interface ExamCountdownProps {
  onNavigateTab?: (tab: 'get_exam' | 'vault' | 'submit_doc') => void;
}

export const ExamCountdown: React.FC<ExamCountdownProps> = ({ onNavigateTab }) => {
  const pulse = useHubPulse();
  const [examMode, setExamMode] = useState<ExamMode>(() => {
    try {
      const saved = localStorage.getItem('orbit-exam-mode') || localStorage.getItem('hyperhub-exam-mode');
      if (saved === 'thpt' || saved === 'grade10') return saved;
    } catch {}
    return 'thpt';
  });
  const [selectedCohort, setSelectedCohort] = useState<CohortKey>(() => getNextThptExamInfo().cohortKey);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState<number>(() => Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length));

  const handleSelectMode = (mode: ExamMode) => {
    setExamMode(mode);
    try {
      localStorage.setItem('orbit-exam-mode', mode);
    } catch {}
  };

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { cccd: true, pen_pencil: true };
    } catch {
      return { cccd: true, pen_pencil: true };
    }
  });

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Hỗ trợ đóng Modal bằng phím Escape & khóa cuộn nền
  useEffect(() => {
    if (!isChecklistOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsChecklistOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.__lenis?.start();
    };
  }, [isChecklistOpen]);

  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  const resetChecklist = () => {
    setCheckedItems({});
    try {
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const activeSchedule = SCHEDULES_DATA[examMode][selectedCohort];

  const stats = useMemo(() => {
    const targetMs = new Date(activeSchedule.targetIso).getTime();
    const startMs = new Date(activeSchedule.startYearIso).getTime();
    const diffMs = Math.max(0, targetMs - nowMs);
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const totalSpan = Math.max(1, targetMs - startMs);
    const elapsed = Math.min(totalSpan, Math.max(0, nowMs - startMs));
    const yearProgress = Math.min(100, Math.max(0, (elapsed / totalSpan) * 100));

    return {
      isPast: nowMs >= targetMs,
      days,
      hours,
      minutes,
      seconds,
      yearProgress: Number(yearProgress.toFixed(1)),
    };
  }, [activeSchedule, nowMs]);

  const checkedCount = CHECKLIST_DATA.filter((item) => checkedItems[item.id]).length;

  return (
    <div className="hh-cd">
      {/* Thanh chuyển chế độ kỳ thi & khóa học */}
      <div className="hh-cd-toolbar">
        <div className="hh-cd-modes" role="group" aria-label="Chọn kỳ thi">
          <button
            type="button"
            className="hh-cd-mode-btn"
            aria-pressed={examMode === 'thpt'}
            onClick={() => handleSelectMode('thpt')}
          >
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
            <span>Tốt nghiệp THPT</span>
          </button>
          <button
            type="button"
            className="hh-cd-mode-btn"
            aria-pressed={examMode === 'grade10'}
            onClick={() => handleSelectMode('grade10')}
          >
            <School className="w-4 h-4" aria-hidden="true" />
            <span>Tuyển sinh vào 10</span>
          </button>
        </div>

        <div className="hh-cd-cohorts" role="group" aria-label="Chọn khóa thi">
          {(['2026_2027', '2027_2028', '2028_2029'] as CohortKey[]).map((key) => {
            const item = SCHEDULES_DATA[examMode][key];
            return (
              <button
                key={key}
                type="button"
                className="hh-cd-cohort-btn"
                aria-pressed={selectedCohort === key}
                onClick={() => setSelectedCohort(key)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bố cục 2 cột: Đồng hồ đếm ngược bên trái · Lịch thi từng ca bên phải */}
      <div className="hh-cd-grid">
        <SpotSurface as="article" className="hh-card hh-card--hero hh-lift" data-ui="exam-countdown">
          <h3 className="hh-card-title hh-card-title--lg">
            {examMode === 'thpt'
              ? `Kỳ thi Tốt nghiệp THPT ${activeSchedule.examYear}`
              : `Kỳ thi Tuyển sinh Lớp 10 (${activeSchedule.examYear})`}
          </h3>

          <div className="hh-card-top">
            <span className="hh-pill hh-pill--mint">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>{activeSchedule.dateRangeStr}</span>
            </span>
            <span className="hh-tag">{activeSchedule.badge}</span>
          </div>

          <p className="hh-card-text">{activeSchedule.note}</p>

          {/* 4 ô đếm ngược tabular-nums */}
          <div className="hh-cd-clock" role="timer" aria-live="off">
            <div className="hh-cd-unit hh-cd-unit--primary">
              <span className="hh-cd-num">{String(stats.days).padStart(2, '0')}</span>
              <span className="hh-cd-label">Ngày còn lại</span>
            </div>
            <div className="hh-cd-unit">
              <span className="hh-cd-num">{String(stats.hours).padStart(2, '0')}</span>
              <span className="hh-cd-label">Giờ</span>
            </div>
            <div className="hh-cd-unit">
              <span className="hh-cd-num">{String(stats.minutes).padStart(2, '0')}</span>
              <span className="hh-cd-label">Phút</span>
            </div>
            <div className="hh-cd-unit">
              <span className="hh-cd-num">{String(stats.seconds).padStart(2, '0')}</span>
              <span className="hh-cd-label">Giây</span>
            </div>
          </div>

          {/* Thanh tiến độ năm học */}
          <div className="hh-cd-progress-wrap">
            <div className="hh-cd-progress-meta">
              <span>Tiến độ hành trình năm học ({activeSchedule.examYear - 1} – {activeSchedule.examYear})</span>
              <strong>{stats.isPast ? 'Đã hoàn thành 100%' : `${stats.yearProgress}%`}</strong>
            </div>
            <div className="hh-cd-progress-bar" aria-hidden="true">
              <div
                className="hh-cd-progress-fill"
                style={{ width: `${stats.isPast ? 100 : stats.yearProgress}%` }}
              />
            </div>
          </div>

          {/* Lời nhắn nhủ mỗi ngày cho sĩ tử (tham khảo từ web gốc) */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between gap-3">
            <p className="hh-fine italic">
              “{INSPIRATIONAL_QUOTES[quoteIdx].quote}” · <strong>{INSPIRATIONAL_QUOTES[quoteIdx].author}</strong>
            </p>
            <button
              type="button"
              onClick={() => setQuoteIdx((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length)}
              className="hh-quiet-btn hh-press shrink-0"
              title="Đổi câu truyền cảm hứng khác"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đổi câu</span>
            </button>
          </div>

          {/* Hành động thực tế: Bốc đề luyện ngay + Mở Checklist phòng thi */}
          <div className="hh-eco-main-foot">
            <div className="flex flex-wrap items-center gap-3">
              <PixelButton
                variant="primary"
                onClick={() => onNavigateTab?.('get_exam')}
                trailing={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              >
                Bốc đề luyện ngay
              </PixelButton>
              <button
                type="button"
                className="hh-quiet-btn hh-press"
                onClick={() => setIsChecklistOpen(true)}
              >
                <Backpack className="w-4 h-4" aria-hidden="true" />
                <span>Hành trang phòng thi ({checkedCount}/{CHECKLIST_DATA.length})</span>
              </button>
            </div>
            {pulse.docCount !== null && (
              <p className="hh-fine tabular-nums">
                Sẵn sàng {pulse.docCount.toLocaleString('vi-VN')} đề chuẩn hóa trong kho
              </p>
            )}
          </div>
        </SpotSurface>

        {/* Bảng lịch thi chi tiết 4 buổi */}
        <SpotSurface as="article" className="hh-card hh-lift" data-ui="exam-sessions">
          <div className="hh-card-top">
            <span className="hh-icon-tile hh-tone-violet" aria-hidden="true">
              <Clock className="w-5 h-5" />
            </span>
            <h3 className="hh-card-title">Khung giờ làm bài theo từng môn</h3>
          </div>
          <p className="hh-card-text">
            Canh đúng khung giờ thực tế khi tự luyện đề ở nhà để làm quen nhịp độ phòng thi.
          </p>

          <ol className="hh-cd-sessions">
            {activeSchedule.sessions.map((s) => (
              <li key={s.idx} className="hh-cd-session">
                <span className="hh-cd-session-idx" aria-hidden="true">
                  Ca {Number(s.idx)}
                </span>
                <div>
                  <h4 className="hh-cd-session-title">{s.subject}</h4>
                  <p className="hh-cd-session-sub">
                    {s.dateStr} · {s.timeRange}
                  </p>
                </div>
                <span className="hh-cd-session-badge">{s.duration}</span>
              </li>
            ))}
          </ol>

          <div className="hh-eco-main-foot">
            <p className="hh-fine">
              Gợi ý: bấm giờ theo đúng thời lượng từng ca khi làm đề thử tại nhà.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="hh-quiet-btn hh-press"
                onClick={() => onNavigateTab?.('vault')}
              >
                <span>Kho lưu trữ đề</span>
              </button>
              <button
                type="button"
                className="hh-inline-cta"
                onClick={() => onNavigateTab?.('submit_doc')}
              >
                <span>Đóng góp đề thi</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </SpotSurface>
      </div>

      {/* Modal Checklist Hành Trang Phòng Thi */}
      {isChecklistOpen && (
        <div
          className="hh-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hh-checklist-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsChecklistOpen(false);
          }}
        >
          <div className="hh-modal-dialog">
            <div className="hh-modal-head">
              <div>
                <span className="hh-tag">Danh mục kiểm tra trước giờ G</span>
                <h3 id="hh-checklist-modal-title" className="hh-card-title mt-2">
                  Hành trang vật dụng phòng thi
                </h3>
              </div>
              <button
                type="button"
                className="hh-quiet-btn hh-press"
                onClick={() => setIsChecklistOpen(false)}
                aria-label="Đóng bảng kiểm tra hành trang"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="hh-modal-body">
              {CHECKLIST_DATA.map((item) => {
                const checked = !!checkedItems[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCheckItem(item.id)}
                    aria-pressed={checked}
                    className="hh-cd-session text-left w-full cursor-pointer"
                    style={{
                      borderColor: checked ? 'rgba(111, 227, 176, 0.45)' : undefined,
                      background: checked ? 'rgba(111, 227, 176, 0.08)' : undefined,
                    }}
                  >
                    <span
                      className="hh-cd-session-idx"
                      style={{
                        color: checked ? 'var(--hh-mint)' : 'var(--hh-text-3)',
                        borderColor: checked ? 'rgba(111, 227, 176, 0.4)' : 'var(--hh-line)',
                        background: checked ? 'rgba(111, 227, 176, 0.14)' : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      {checked ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="hh-cd-session-title">{item.title}</h4>
                      <p className="hh-cd-session-sub">{item.desc}</p>
                    </div>
                    <span className="hh-tag">{item.required ? 'Bắt buộc' : 'Khuyến nghị'}</span>
                  </button>
                );
              })}
            </div>

            <div className="hh-modal-foot">
              <button type="button" className="hh-quiet-btn hh-press" onClick={resetChecklist}>
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Đặt lại danh sách</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="hh-fine tabular-nums">
                  Đã chuẩn bị {checkedCount}/{CHECKLIST_DATA.length} mục
                </span>
                <PixelButton variant="primary" onClick={() => setIsChecklistOpen(false)} icon={<CheckCircle2 className="w-4 h-4" />}>
                  Hoàn tất
                </PixelButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCountdown;
