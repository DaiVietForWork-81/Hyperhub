import React, { useEffect, useRef, useState } from 'react';
import { bindMagnetic, bindSurfacePointer } from '../../motion/pointer';
import { prefersReducedMotion } from '../../motion/capabilities';
import { sound } from '../../utils/audio';

/* --------------------------------------------------------------------------
   PixelButton - CTA quỹ đạo Orbit tích hợp phản hồi từ tính & âm thanh không gian.
   -------------------------------------------------------------------------- */
type Variant = 'primary' | 'ghost' | 'discord' | 'messenger';

type BaseProps = {
  variant?: Variant;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  magnetic?: boolean;
  loading?: boolean;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = BaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export const PixelButton: React.FC<ButtonProps | AnchorProps> = (props) => {
  const { variant = 'primary', icon, trailing, magnetic, loading, block, className = '', children, ...rest } = props;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => (magnetic ? bindMagnetic(ref.current, 5) : undefined), [magnetic]);

  const cls = `hh-btn hh-btn--${variant}${block ? ' hh-btn--block' : ''}${magnetic ? ' hh-btn--magnetic' : ''} ${className}`;
  const inner = (
    <>
      <span className="hh-btn-glow" aria-hidden="true" />
      <span className="hh-btn-fill" aria-hidden="true" />
      <span className="hh-btn-label">
        {icon ? <span className="hh-btn-icon">{icon}</span> : null}
        <span>{children}</span>
        {loading ? (
          <span className="hh-btn-spinner" aria-hidden="true" />
        ) : trailing ? (
          <span className="hh-btn-trail">{trailing}</span>
        ) : null}
      </span>
    </>
  );

  if ('href' in rest && rest.href) {
    const anchorRest = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={cls}
        {...anchorRest}
        onPointerEnter={(e) => {
          sound.playHover();
          anchorRest.onPointerEnter?.(e);
        }}
        onClick={(e) => {
          sound.playClick();
          anchorRest.onClick?.(e);
        }}
      >
        {inner}
      </a>
    );
  }
  const btnRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...btnRest}
      ref={ref as React.Ref<HTMLButtonElement>}
      type={btnRest.type ?? 'button'}
      className={cls}
      aria-busy={loading || undefined}
      disabled={btnRest.disabled || loading}
      onPointerEnter={(e) => {
        if (!btnRest.disabled && !loading) sound.playHover();
        btnRest.onPointerEnter?.(e);
      }}
      onClick={(e) => {
        if (!btnRest.disabled && !loading) sound.playClick();
        btnRest.onClick?.(e);
      }}
    >
      {inner}
    </button>
  );
};

/* --------------------------------------------------------------------------
   SpotSurface - bề mặt có spotlight bám con trỏ + âm thanh lướt tinh tế.
   -------------------------------------------------------------------------- */
export const SpotSurface: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { tilt?: number; spotColor?: string; as?: 'div' | 'article' | 'li' }
> = ({ tilt = 0, spotColor, className = '', style, as = 'div', children, onPointerEnter, ...rest }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => bindSurfacePointer(ref.current, { tilt }), [tilt]);
  const Tag = as as 'div';
  return (
    <Tag
      ref={ref}
      className={`hh-spot${tilt ? ' hh-tilt' : ''} ${className}`}
      style={{ ...style, ...(spotColor ? { ['--spot-color' as string]: spotColor } : {}) }}
      onPointerEnter={(e) => {
        sound.playHover();
        onPointerEnter?.(e);
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

/* --------------------------------------------------------------------------
   CountUp - CHỈ dùng cho số liệu thật từ API. Chạy một lần khi vào viewport.
   -------------------------------------------------------------------------- */
export const CountUp: React.FC<{ value: number; duration?: number; className?: string }> = ({
  value,
  duration = 900,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{display.toLocaleString('vi-VN')}</span>
      <span className="sr-only">{value.toLocaleString('vi-VN')}</span>
    </span>
  );
};
