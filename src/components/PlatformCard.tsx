import React from 'react';
import { ArrowUpRight, MessageSquare, Facebook, Send } from 'lucide-react';
import { PlatformItem } from '../data/platforms';
import { SpotlightCard } from './SpotlightCard';

interface PlatformCardProps {
  platform: PlatformItem;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({ platform }) => {
  // Brand specific icons using SVG / Logo for Discord
  const renderIcon = () => {
    if (platform.id === 'discord') {
      return (
        <div className="relative flex items-center justify-center">
          <img
            src="/logo.png"
            alt="HyperHub Logo"
            className="w-8 h-8 rounded-xl object-cover ring-1 ring-purple-500/40"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      );
    }

    switch (platform.iconName) {
      case 'facebook':
        return <Facebook className="w-6 h-6 text-blue-400 group-hover/spotlight:text-blue-300 transition-colors" />;
      case 'messenger':
        return <MessageSquare className="w-6 h-6 text-pink-400 group-hover/spotlight:text-pink-300 transition-colors" />;
      default:
        return <Send className="w-6 h-6 text-purple-400 group-hover/spotlight:text-purple-300 transition-colors" />;
    }
  };

  const getColors = () => {
    switch (platform.id) {
      case 'discord':
        return {
          spotlight: 'rgba(147, 51, 234, 0.24)',
          border: 'rgba(168, 85, 247, 0.6)',
        };
      case 'facebook':
        return {
          spotlight: 'rgba(59, 130, 246, 0.20)',
          border: 'rgba(96, 165, 250, 0.45)',
        };
      case 'messenger':
        return {
          spotlight: 'rgba(236, 72, 153, 0.22)',
          border: 'rgba(244, 114, 182, 0.5)',
        };
      default:
        return {
          spotlight: 'rgba(147, 51, 234, 0.2)',
          border: 'rgba(168, 85, 247, 0.4)',
        };
    }
  };

  const { spotlight, border } = getColors();
  const isPlaceholder = platform.url.startsWith('YOUR_');

  return (
    <SpotlightCard
      spotlightColor={spotlight}
      borderColor={border}
      className="liquid-glass p-8 flex flex-col justify-between hover:shadow-2xl hover:shadow-purple-950/40 h-full"
    >
      <div>
        {/* Header with Icon, Badge & Member Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 group-hover/spotlight:scale-105 group-hover/spotlight:border-purple-400 dark:group-hover/spotlight:border-purple-500/40 transition-all duration-300">
            {renderIcon()}
          </div>
          <div className="flex items-center gap-2">
            {platform.memberCount && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
                <span>{platform.memberCount}</span>
              </span>
            )}
            {platform.badge && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/20 group-hover/spotlight:border-purple-400 dark:group-hover/spotlight:border-purple-500/40 transition-colors">
                {platform.badge}
              </span>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover/spotlight:text-purple-600 dark:group-hover/spotlight:text-purple-300 transition-colors">
          {platform.name}
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed mb-6 font-sans">
          {platform.description}
        </p>
      </div>

      {/* Action Button */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-white/[0.06]">
        {isPlaceholder ? (
          <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/50">
            <span>Link kết nối:</span>
            <code className="text-purple-300 font-mono text-[11px] bg-purple-950/50 px-2 py-0.5 rounded">
              {platform.url}
            </code>
          </div>
        ) : (
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-shimmer btn-motion w-full inline-flex items-center justify-center gap-2 py-3 px-5 min-h-[48px] rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-950/40 hover:shadow-purple-900/60 hover:-translate-y-1 active:scale-95 transition-all duration-200 group cursor-pointer"
          >
            <span>Tham Gia Máy Chủ Ngay</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
          </a>
        )}
      </div>
    </SpotlightCard>
  );
};
