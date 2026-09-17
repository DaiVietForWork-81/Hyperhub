import React from 'react';
import { Github, Youtube, Globe } from 'lucide-react';
import { comingSoonPlatforms } from '../data/platforms';
import { SpotlightCard } from './SpotlightCard';

export const ComingSoon: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'github':
        return <Github className="w-5 h-5 text-white/50 group-hover/spotlight:text-white transition-colors" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-white/50 group-hover/spotlight:text-red-400 transition-colors" />;
      default:
        return <Globe className="w-5 h-5 text-white/50 group-hover/spotlight:text-purple-300 transition-colors" />;
    }
  };

  return (
    <div className="pt-10 border-t border-white/[0.08]">
      <div className="text-center mb-8">
        <span className="text-xs font-mono tracking-widest text-white/40 uppercase">
          NỀN TẢNG TIẾP THEO
        </span>
        <h3 className="text-xl font-bold text-white/80 mt-1">
          Sắp Ra Mắt Trên Nhiều Nền Tảng
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {comingSoonPlatforms.map((item) => (
          <SpotlightCard
            key={item.id}
            spotlightColor="rgba(255, 255, 255, 0.06)"
            borderColor="rgba(255, 255, 255, 0.15)"
            className="p-6 text-center space-y-3 opacity-60 hover:opacity-100 transition-all duration-300"
          >
            <div className="mx-auto h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center group-hover/spotlight:scale-105 group-hover/spotlight:border-white/20 transition-all duration-300">
              {getIcon(item.iconName)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white/90 group-hover/spotlight:text-white transition-colors">
                {item.name}
              </div>
              <div className="text-xs text-white/40 mt-1">{item.description}</div>
            </div>
            <div className="inline-block px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono tracking-wider text-purple-300/80">
              COMING SOON
            </div>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
};
