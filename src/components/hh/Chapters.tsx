import React, { useEffect, useRef } from 'react';
import { onScrollFrame, scrollToElement } from '../../motion/scroll';
import { Reveal } from './Reveal';

export interface ChapterDef {
  id: string;
  word: 'LEARN' | 'GROW' | 'CHILL' | 'CONNECT';
  label: string;
}

export const CHAPTERS: ChapterDef[] = [
  { id: 'chapter-learn', word: 'LEARN', label: 'Học tập & kho đề' },
  { id: 'chapter-chill', word: 'GROW', label: 'Bứt phá & mục tiêu' },
  { id: 'chapter-connect', word: 'CONNECT', label: 'Cùng một quỹ đạo' },
];

/**
 * Chapter rail (desktop ≥1480px): chỉ báo tiến độ câu chuyện LEARN → GROW → CONNECT.
 * Có chức năng thật: cho biết đang ở chương nào, bấm để nhảy tới chương.
 * Tiến độ ghi thẳng vào transform của thanh fill (không re-render).
 */
export const ChapterRail: React.FC = () => {
  const railRef = useRef<HTMLElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const mq = window.matchMedia('(min-width: 1480px)');
    let off: (() => void) | null = null;
    const start = () => {
      off?.();
      off = mq.matches ? track(rail) : null;
    };
    start();
    mq.addEventListener('change', start);
    return () => {
      mq.removeEventListener('change', start);
      off?.();
    };
  }, []);

  const track = (rail: HTMLElement) => {
    let lastActive = -2;
    let lastVisible: boolean | null = null;
    return onScrollFrame((_, vh) => {
      const rects = CHAPTERS.map((c) => document.getElementById(c.id)?.getBoundingClientRect() ?? null);
      const mid = vh * 0.45;
      let active = -1;
      const progress = rects.map((r, i) => {
        if (!r) return 0;
        if (r.top <= mid && r.bottom > mid) active = i;
        return Math.min(1, Math.max(0, (mid - r.top) / r.height));
      });
      const first = rects[0];
      const last = rects[rects.length - 1];
      const visible = !!first && !!last && first.top < vh * 0.7 && last.bottom > vh * 0.3;

      progress.forEach((p, i) => {
        const fill = fillRefs.current[i];
        if (fill) fill.style.transform = `scaleY(${p.toFixed(3)})`;
      });
      if (active !== lastActive) {
        lastActive = active;
        itemRefs.current.forEach((el, i) => {
          if (!el) return;
          if (i === active) el.setAttribute('aria-current', 'step');
          else el.removeAttribute('aria-current');
        });
      }
      if (visible !== lastVisible) {
        lastVisible = visible;
        rail.dataset.visible = String(visible);
      }
    });
  };

  return (
    <nav ref={railRef} className="hh-rail" aria-label="Các chương của quỹ đạo Orbit" data-visible="false">
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              className="hh-rail-item"
              onClick={() => scrollToElement(document.getElementById(c.id))}
            >
              <span className="hh-rail-track" aria-hidden="true">
                <span
                  ref={(el) => {
                    fillRefs.current[i] = el;
                  }}
                  className="hh-rail-fill"
                />
              </span>
              <span className="hh-rail-text">
                <span className={`hh-rail-word hh-word-${c.word.toLowerCase()}`}>{c.word}</span>
                <span className="hh-rail-label">{c.label}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};

/**
 * Mở đầu mỗi chương của Orbit: nhãn chương + câu dẫn (reveal theo từ) + đường quỹ đạo sáng vẽ dần.
 */
export const ChapterOpener: React.FC<{
  word: ChapterDef['word'];
  index?: number;
  title: string;
  accent?: number[];
  lede: string;
}> = ({ word, title, lede }) => (
  <header className={`hh-chapter-opener hh-tone-${word.toLowerCase()}`}>
    <div className="hh-chapter-opener-main">
      <Reveal as="h2" preset="rise" className="hh-chapter-title">
        <span className={`hh-chapter-word-inline hh-word-${word.toLowerCase()}`}>{word} · </span>
        {title}
      </Reveal>
    </div>
    <div className="hh-chapter-opener-side">
      <Reveal as="p" preset="fade" delay={140} className="hh-chapter-lede">
        {lede}
      </Reveal>
    </div>
  </header>
);
