import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  targetId: string;
}
export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ targetId }) => {
  const handleScroll = () => {
    const el = document.getElementById(targetId);
    if (el) {
      if (window.__lenis) {
        window.__lenis.scrollTo(el, { offset: -40, duration: 1.2 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleScroll}
      aria-label="Cuộn xuống phần giới thiệu về HyperHub"
      className="group flex flex-col items-center gap-2 text-white/40 hover:text-white transition-colors cursor-pointer p-2 rounded-lg focus-visible:ring-2 focus-visible:ring-purple-500"
    >
      <span className="text-[11px] tracking-[0.25em] font-medium uppercase transition-colors group-hover:text-purple-300">
        Cuộn Để Khám Phá
      </span>
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] group-hover:border-purple-500/40 group-hover:bg-purple-500/10 transition-all duration-200">
        <ChevronDown className="w-4 h-4 animate-bounce text-white/60 group-hover:text-purple-300" />
      </div>
    </button>
  );
};
