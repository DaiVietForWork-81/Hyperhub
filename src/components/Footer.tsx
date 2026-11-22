import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PixelMark } from './hh/PixelMark';
import { PixelButton } from './hh/Controls';
import { Reveal } from './hh/Reveal';
import { hubIntentProps } from '../hubLoader';

const LINKS = [
  { href: '#hero', label: 'Trang chủ' },
  { href: '#chapter-learn', label: 'Mùa thi & kho đề' },
  { href: '#chapter-chill', label: 'Mục tiêu & ước mơ' },
  { href: '#community-channels', label: 'Cộng đồng' },
  { href: '#co-founders', label: 'Đồng sáng lập' },
];

export const Footer: React.FC<{ onOpenDashboard?: () => void }> = ({ onOpenDashboard }) => (
  <footer className="hh-footer">
    {onOpenDashboard && (
      <div className="hh-footer-cta">
        <Reveal as="p" preset="rise" className="hh-footer-cta-title">
          Những con đường khác nhau. Cùng một quỹ đạo.
        </Reveal>
        <Reveal preset="fade" delay={200}>
          <PixelButton variant="primary" magnetic onClick={onOpenDashboard} {...hubIntentProps} trailing={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
            Bắt đầu trong Orbit Hub
          </PixelButton>
        </Reveal>
      </div>
    )}

    <div className="hh-footer-base">
      <div className="hh-footer-brand">
        <div className="hh-footer-brand-row">
          <PixelMark className="hh-footer-mark" />
          <span className="hh-footer-name">Orbit</span>
        </div>
        <p className="hh-footer-tagline">
          <span className="hh-word-learn">LEARN</span> · <span className="hh-word-grow">GROW</span> ·{' '}
          <span className="hh-word-connect">CONNECT</span>
        </p>
        <p className="hh-fine">Different paths. One orbit. · Đồng sáng lập: Dai Viet, GithuZ, Nguyễn Duy, Lê Minh</p>
      </div>

      <nav aria-label="Liên kết chân trang">
        <ul className="hh-footer-links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hh-link">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p className="hh-footer-copy">
        © 2026 Orbit. Phụng sự thế hệ sĩ tử Việt Nam.
      </p>
    </div>
  </footer>
);

export default Footer;
