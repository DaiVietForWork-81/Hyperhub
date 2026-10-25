import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Microscope,
  Compass,
  Calculator,
  BookOpen,
  Globe,
  Atom,
  FlaskConical,
  Dna,
  Hourglass,
  Cpu,
  Laptop,
  Scale,
  Terminal,
  Code2,
  Trophy,
  Brain,
  Award,
  GraduationCap,
  ChevronDown,
  Search,
} from 'lucide-react';
import { PixelWordmark } from './hh/PixelWordmark';
import { PixelButton } from './hh/Controls';
import { DiscordGlyph } from './hh/BrandGlyphs';
import { useHubPulse } from '../hooks/useHubPulse';
import { allowRichMotion } from '../motion/capabilities';
import { hubIntentProps } from '../hubLoader';

export interface OrbitHubPrefilter {
  subject?: string;
  grade?: string;
  educationLevel?: 'ALL' | 'CAP_3' | 'CAP_2';
  examType?: string;
  search?: string;
}

export function launchHubWithFilter(
  onNavigateVault: () => void,
  filter: OrbitHubPrefilter
) {
  try {
    sessionStorage.setItem('orbit_hub_prefilter', JSON.stringify(filter));
  } catch {
    // ignore storage quota errors
  }
  onNavigateVault();
}

const SCHOOL_SUBJECTS = [
  { name: 'Toán Học', subjectId: 'MATHEMATICS', icon: Calculator, tone: '#8FA8FF' },
  { name: 'Ngữ Văn', subjectId: 'LITERATURE', icon: BookOpen, tone: '#FF8FB8' },
  { name: 'Tiếng Anh', subjectId: 'ENGLISH', icon: Globe, tone: '#7FD4FF' },
  { name: 'Vật Lý', subjectId: 'PHYSICS', icon: Atom, tone: '#FFC46B' },
  { name: 'Hóa Học', subjectId: 'CHEMISTRY', icon: FlaskConical, tone: '#6FE3B0' },
  { name: 'Sinh Học', subjectId: 'BIOLOGY', icon: Dna, tone: '#8CE07A' },
  { name: 'Lịch Sử', subjectId: 'HISTORY', icon: Hourglass, tone: '#FFA36B' },
  { name: 'Địa Lý', subjectId: 'GEOGRAPHY', icon: Compass, tone: '#5FD6C8' },
  { name: 'Giáo Dục Công Dân', subjectId: 'ECONOMIC_LEGAL_EDU', icon: Scale, tone: '#C49BFF' },
  { name: 'Công Nghệ', subjectId: 'TECHNOLOGY', icon: Laptop, tone: '#6FD8F0' },
  { name: 'Tin Học', subjectId: 'INFORMATICS', icon: Cpu, tone: '#9C9BFF' },
  { name: 'Khoa Học Tự Nhiên', subjectId: 'NATURAL_SCIENCE', icon: Microscope, tone: '#6FE3B0' },
  { name: 'Khoa Học Xã Hội', subjectId: 'HISTORY_GEOGRAPHY', icon: BookOpen, tone: '#FF8FD0' },
];

const TECH_TOPICS = [
  { name: 'Python', subjectId: 'INFORMATICS', icon: Terminal, tone: '#FFD86B' },
  { name: 'C / C++', subjectId: 'INFORMATICS', icon: Code2, tone: '#8FA8FF' },
  { name: 'Lập Trình Thuật Toán', subjectId: 'INFORMATICS', icon: Trophy, tone: '#FF8FD0' },
  { name: 'Lập Trình Cơ Bản & Nâng Cao', subjectId: 'INFORMATICS', icon: Code2, tone: '#6FD8F0' },
  { name: 'Khoa Học Dữ Liệu & AI', subjectId: 'INFORMATICS', icon: Brain, tone: '#B89BFF' },
  { name: 'Phát Triển Web & Phần Mềm', subjectId: 'INFORMATICS', icon: Laptop, tone: '#7FD4FF' },
  { name: 'Ôn Thi Chuyên & HSG', subjectId: 'ALL', examType: 'CHUYEN', icon: Award, tone: '#F08BFF' },
  { name: 'Luyện Thi THPT Quốc Gia', subjectId: 'ALL', grade: '12', icon: GraduationCap, tone: '#FF8F8F' },
  { name: 'Olympic Tin Học & Toán', subjectId: 'ALL', examType: 'HSG', icon: Trophy, tone: '#FFC46B' },
];

const QUICK_GRADES: Array<{
  label: string;
  badge: string;
  filter: OrbitHubPrefilter;
}> = [
  { label: 'Lớp 12', badge: 'THPT', filter: { grade: '12', educationLevel: 'ALL' } },
  { label: 'Lớp 11', badge: 'THPT', filter: { grade: '11', educationLevel: 'ALL' } },
  { label: 'Lớp 10', badge: 'THPT', filter: { grade: '10', educationLevel: 'ALL' } },
  { label: 'Khối 6–9', badge: 'THCS', filter: { grade: 'ALL', educationLevel: 'CAP_2' } },
];

const PILLARS = [
  { word: 'LEARN', hint: 'Ôn đề thực chiến', d: 420 },
  { word: 'GROW', hint: 'Bứt phá năng lực', d: 520 },
  { word: 'CONNECT', hint: 'Cùng một quỹ đạo', d: 620 },
] as const;

/* 6 hạt bụi sao quỹ đạo trôi chậm - đồng điệu với tinh vân trong biểu tượng Orbit */
const STARDUST = [
  { x: '8%', s: 6, dur: 22, delay: -4 },
  { x: '23%', s: 4, dur: 27, delay: -15 },
  { x: '41%', s: 5, dur: 24, delay: -9 },
  { x: '62%', s: 7, dur: 29, delay: -20 },
  { x: '78%', s: 4, dur: 21, delay: -2 },
  { x: '92%', s: 5, dur: 26, delay: -12 },
];

interface TopicItem {
  name: string;
  subjectId: string;
  grade?: string;
  examType?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

const StreamColumn: React.FC<{
  items: TopicItem[];
  direction: 'up' | 'down';
  label: string;
  onSelectTopic?: (item: TopicItem) => void;
}> = ({ items, direction, label, onSelectTopic }) => (
  <div className={`hh-stream hh-stream--${direction}`}>
    <p className="sr-only">{label}</p>
    <div className="hh-marquee-track">
      {[0, 1].map((copy) => (
        <ul key={copy} className="hh-stream-list" aria-hidden={copy === 1 || undefined}>
          {items.map((t) => {
            const Icon = t.icon;
            const isPrimary = copy === 0;
            return (
              <li
                key={t.name}
                role={isPrimary ? 'button' : undefined}
                tabIndex={isPrimary ? 0 : -1}
                className="hh-chip hh-choice cursor-pointer focus-visible:outline-2 focus-visible:outline-[#FFA8DC]"
                style={{ ['--tone' as string]: t.tone }}
                onClick={() => onSelectTopic?.(t)}
                onKeyDown={
                  isPrimary
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectTopic?.(t);
                        }
                      }
                    : undefined
                }
                title={`Tra cứu đề ${t.name} trong Orbit Hub`}
              >
                <Icon className="hh-chip-icon" aria-hidden="true" />
                <span>{t.name}</span>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  </div>
);

interface HeroProps {
  onOpenDashboard?: () => void;
  onSelectSubject?: (subjectName: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDashboard, onSelectSubject }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const pulse = useHubPulse();
  const [quickQuery, setQuickQuery] = useState('');

  // Tạm dừng marquee + stardust khi hero rời khỏi màn hình (tiết kiệm GPU)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.inview = String(entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showStardust = allowRichMotion();

  const navigateWithPrefilter = (filter: OrbitHubPrefilter, fallbackLabel?: string) => {
    try {
      sessionStorage.setItem('orbit_hub_prefilter', JSON.stringify(filter));
    } catch {
      // ignore
    }
    if (onSelectSubject) {
      onSelectSubject(fallbackLabel || filter.search || filter.subject || 'ALL');
    } else {
      onOpenDashboard?.();
    }
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickQuery.trim();
    navigateWithPrefilter({
      search: trimmed || undefined,
      educationLevel: 'ALL',
    });
  };

  return (
    <section ref={sectionRef} id="hero" className="hh-hero" data-inview="true" aria-labelledby="hero-title">
      {showStardust && (
        <div className="hh-petals" aria-hidden="true">
          {STARDUST.map((p, i) => (
            <span
              key={i}
              className="hh-petal"
              style={{
                ['--x' as string]: p.x,
                ['--s' as string]: `${p.s}px`,
                ['--dur' as string]: `${p.dur}s`,
                ['--delay' as string]: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="hh-hero-inner">
        <div className="hh-hero-main">
          <div className="hh-hero-mark" role="img" aria-label="Orbit · Learn, Chill, Study">
            <PixelWordmark className="hh-wordmark" />
          </div>

          <h1 id="hero-title" className="hh-hero-lede">
            <span className="hh-accent-text">Kho đề chuẩn hóa</span>
            <br />
            &amp; cộng đồng ôn thi.
          </h1>

          <p className="hh-hero-sub hh-intro-rise" style={{ ['--d' as string]: '360ms' }}>
            Mỗi người có một quỹ đạo riêng, nhưng chúng ta gặp nhau tại Orbit để ôn đề thực chiến, bứt phá năng lực và cùng nhau tiến xa hơn. Kho đề được thẩm định, bot Discord hỗ trợ 24/7 và lịch thi cập nhật theo ngày.
          </p>

          {/* TRẠM TRA CỨU & LỌC KHỐI LỚP TỨC THÌ NGAY TRÊN MÀN HÌNH ĐẦU */}
          <div className="hh-hero-quickbar hh-intro-rise" style={{ ['--d' as string]: '400ms' }}>
            <form onSubmit={handleQuickSearchSubmit} className="hh-hero-search-form" role="search">
              <Search className="w-4 h-4 text-[#FFA8DC] shrink-0" aria-hidden="true" />
              <input
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Tìm nhanh đề Toán 12, Chuyên Anh, Vật lý, ĐGNL..."
                aria-label="Tìm nhanh đề thi trong kho Orbit"
                className="hh-hero-search-input"
              />
              <button type="submit" className="hh-hero-search-submit hh-press">
                <span>Tra cứu</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>

            <div className="hh-hero-grade-strip" role="group" aria-label="Lọc nhanh theo khối lớp">
              {QUICK_GRADES.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => navigateWithPrefilter(g.filter, g.label)}
                  className="hh-hero-grade-chip hh-choice"
                >
                  <span className="hh-hero-grade-name">{g.label}</span>
                  <span className="hh-hero-grade-badge">{g.badge}</span>
                </button>
              ))}
            </div>
          </div>

          <ul className="hh-pillars" aria-label="Giá trị cốt lõi của Orbit">
            {PILLARS.map((p) => (
              <li key={p.word} className={`hh-pillar hh-tone-${p.word.toLowerCase()}`}>
                <span className="hh-pillar-word hh-intro-pixel" style={{ ['--d' as string]: `${p.d}ms` }}>
                  {p.word}
                </span>
                <span className="hh-pillar-hint hh-intro-fade" style={{ ['--d' as string]: `${p.d + 220}ms` }}>
                  {p.hint}
                </span>
              </li>
            ))}
          </ul>

          <div className="hh-hero-ctas">
            <span className="hh-intro-rise" style={{ ['--d' as string]: '660ms' }}>
              <PixelButton
                variant="primary"
                magnetic
                onClick={onOpenDashboard}
                {...hubIntentProps}
                trailing={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              >
                Vào Orbit Hub &amp; lấy đề
              </PixelButton>
            </span>
            <span className="hh-intro-rise" style={{ ['--d' as string]: '740ms' }}>
              <PixelButton
                variant="ghost"
                href="https://discord.gg/D34HX87bGe"
                target="_blank"
                rel="noopener noreferrer"
                icon={<DiscordGlyph className="w-4 h-4" />}
              >
                Tham gia Discord
                <span className="sr-only"> (mở tab mới)</span>
              </PixelButton>
            </span>
          </div>

          <p className="hh-hero-live hh-intro-fade" style={{ ['--d' as string]: '840ms' }} aria-live="polite">
            <span className="hh-status" data-state={pulse.bot === 'offline' && pulse.docCount ? 'online' : pulse.bot}>
              <span className="hh-status-dot" aria-hidden="true" />
              {pulse.bot === 'checking' && 'Đang đồng bộ dữ liệu quỹ đạo…'}
              {pulse.bot === 'online' &&
                `Bot Orbit trực tuyến${pulse.pingMs !== null ? ` · ${Math.round(pulse.pingMs)} ms` : ''}`}
              {pulse.bot === 'offline' &&
                (pulse.docCount ? 'Kho đề Orbit Cloud trực tuyến · Sẵn sàng tra cứu' : 'Bot tạm thời ngoại tuyến')}
            </span>
            {pulse.docCount !== null && (
              <span className="hh-live-count">
                <strong className="tabular-nums">{pulse.docCount.toLocaleString('vi-VN')}</strong> đề trong kho
              </span>
            )}
          </p>
        </div>

        <aside className="hh-hero-streams hh-intro-fade" data-ui="hero-streams" style={{ ['--d' as string]: '700ms' }} aria-label="Môn học và chuyên đề">
          <StreamColumn
            items={SCHOOL_SUBJECTS}
            direction="up"
            label="Các môn học phổ thông"
            onSelectTopic={(t) =>
              navigateWithPrefilter(
                { subject: t.subjectId, grade: t.grade, examType: t.examType, educationLevel: 'ALL' },
                t.name
              )
            }
          />
          <StreamColumn
            items={TECH_TOPICS}
            direction="down"
            label="Lập trình và chuyên đề nâng cao"
            onSelectTopic={(t) =>
              navigateWithPrefilter(
                { subject: t.subjectId, grade: t.grade, examType: t.examType, educationLevel: 'ALL' },
                t.name
              )
            }
          />
        </aside>
      </div>

      <a href="#chapter-learn" className="hh-scroll-cue hh-intro-fade" style={{ ['--d' as string]: '1300ms' }}>
        <span>Khám phá quỹ đạo Orbit</span>
        <ChevronDown className="hh-scroll-cue-icon" aria-hidden="true" />
      </a>
    </section>
  );
};

export default Hero;
