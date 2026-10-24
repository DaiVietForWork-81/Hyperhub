import React, { useEffect, useRef } from 'react';
import { observeReveal } from '../../motion/reveal';

export type RevealPreset = 'fade' | 'rise' | 'slide-l' | 'slide-r' | 'panel' | 'draw' | 'pixel' | 'words';

type RevealProps<T extends React.ElementType> = {
  as?: T;
  preset?: RevealPreset;
  /** Độ trễ (ms) - dùng cho stagger trong nhóm. */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className' | 'style'>;

/**
 * Reveal khi cuộn tới. Trạng thái được ghi bằng data-attribute (không re-render).
 * Không có JS / reduced-motion → nội dung luôn hiển thị.
 */
export function Reveal<T extends React.ElementType = 'div'>({
  as,
  preset = 'fade',
  delay = 0,
  className,
  style,
  children,
  ...rest
}: RevealProps<T>) {
  const Tag = (as || 'div') as React.ElementType;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => observeReveal(ref.current), []);

  return (
    <Tag
      ref={ref}
      data-reveal={preset}
      className={className}
      style={{ ...style, ['--hh-delay' as string]: `${delay}ms` }}
      {...rest}
    >
      {/* pixel: clip đặt trên phần tử con - nếu clip chính phần tử được quan sát,
          IntersectionObserver coi diện tích = 0 và không bao giờ kích hoạt */}
      {preset === 'pixel' ? <span className="hh-pixel-inner">{children}</span> : children}
    </Tag>
  );
}

/**
 * Tách heading theo TỪ (không theo ký tự) để giữ nguyên dấu thanh tiếng Việt,
 * kerning và khả năng đọc. Không nhân đôi textContent trong DOM để tránh lỗi
 * copy-paste và trình đọc màn hình đọc lặp.
 * `accent`: các từ (theo chỉ số) được tô màu điểm nhấn.
 */
export const SplitWords: React.FC<{
  text: string;
  accent?: number[];
  accentClassName?: string;
  startIndex?: number;
}> = ({ text, accent = [], accentClassName = 'hh-accent-text', startIndex = 0 }) => {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          <span className="hh-word">
            <span
              className={`hh-word-inner${accent.includes(i) ? ` ${accentClassName}` : ''}`}
              style={{ ['--i' as string]: i + startIndex }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </>
  );
};
