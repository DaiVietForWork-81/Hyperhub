import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  GripHorizontal,
  Sliders,
  Check,
  LayoutGrid,
  Columns2,
  Columns3,
  Save,
} from 'lucide-react';

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================
export interface WidgetSize {
  width?: number;
  height?: number;
  scale?: number; // 0.7 to 1.8
  colSpan?: 1 | 2 | 3;
}

export interface HubLayoutConfig {
  sidebarWidth: number;
  globalScale: number; // 0.85 to 1.5
  vaultGridCols: '1' | '2' | '3';
  fontSizeLevel: 'normal' | 'large' | 'huge';
  editMode: boolean; // Show drag borders & handles
  widgetSizes: Record<string, WidgetSize>;
  widgetOrder: Record<string, string[]>; // e.g. { overview_quick: [...], overview_status: [...] }
}

const STORAGE_KEY = 'orbit_layout_customizer_v1';
const LEGACY_STORAGE_KEY = 'hyperhub_layout_customizer_v1';

const DEFAULT_CONFIG: HubLayoutConfig = {
  sidebarWidth: 320,
  globalScale: 1.0,
  vaultGridCols: '2',
  fontSizeLevel: 'normal',
  editMode: true, // Always on as requested ("cứ để đi do web chỉ có tôi và ko ai vào")
  widgetSizes: {},
  widgetOrder: {
    quick_actions: ['quick_exam', 'quick_vault', 'quick_submit', 'quick_bookmarks'],
    status_grid: ['status_bot', 'status_vault', 'status_account']
  }
};

// ============================================================================
// CONTEXT
// ============================================================================
interface HubLayoutContextType {
  config: HubLayoutConfig;
  updateConfig: (updater: (prev: HubLayoutConfig) => HubLayoutConfig) => void;
  setWidgetSize: (widgetId: string, size: Partial<WidgetSize>) => void;
  resetWidgetSize: (widgetId: string) => void;
  resetAll: () => void;
  reorderWidgets: (groupKey: string, fromIndex: number, toIndex: number) => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
}

const HubLayoutContext = createContext<HubLayoutContextType | null>(null);

export const useHubLayout = () => {
  const ctx = useContext(HubLayoutContext);
  if (!ctx) {
    throw new Error('useHubLayout must be used within HubLayoutProvider');
  }
  return ctx;
};

// ============================================================================
// PROVIDER
// ============================================================================
export const HubLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<HubLayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          widgetSizes: parsed.widgetSizes || {},
          widgetOrder: {
            ...DEFAULT_CONFIG.widgetOrder,
            ...(parsed.widgetOrder || {})
          }
        };
      }
    } catch (e) {
      console.warn('Failed to load orbit layout config:', e);
    }
    return DEFAULT_CONFIG;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save layout config:', e);
    }
  }, [config]);

  const updateConfig = useCallback((updater: (prev: HubLayoutConfig) => HubLayoutConfig) => {
    setConfig((prev) => updater(prev));
  }, []);

  const setWidgetSize = useCallback((widgetId: string, size: Partial<WidgetSize>) => {
    setConfig((prev) => ({
      ...prev,
      widgetSizes: {
        ...prev.widgetSizes,
        [widgetId]: {
          ...(prev.widgetSizes[widgetId] || {}),
          ...size
        }
      }
    }));
  }, []);

  const resetWidgetSize = useCallback((widgetId: string) => {
    setConfig((prev) => {
      const nextSizes = { ...prev.widgetSizes };
      delete nextSizes[widgetId];
      return {
        ...prev,
        widgetSizes: nextSizes
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const reorderWidgets = useCallback((groupKey: string, fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const list = [...(prev.widgetOrder[groupKey] || [])];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) {
        return prev;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return {
        ...prev,
        widgetOrder: {
          ...prev.widgetOrder,
          [groupKey]: list
        }
      };
    });
  }, []);

  const isEditMode = config.editMode;
  const toggleEditMode = useCallback(() => {
    setConfig((prev) => ({ ...prev, editMode: !prev.editMode }));
  }, []);

  return (
    <HubLayoutContext.Provider
      value={{
        config,
        updateConfig,
        setWidgetSize,
        resetWidgetSize,
        resetAll,
        reorderWidgets,
        isEditMode,
        toggleEditMode
      }}
    >
      <div
        style={{
          // Apply global scale if customized
          zoom: config.globalScale !== 1.0 ? config.globalScale : undefined
        }}
        className={
          config.fontSizeLevel === 'large'
            ? 'text-[105%]'
            : config.fontSizeLevel === 'huge'
            ? 'text-[112%]'
            : ''
        }
      >
        {children}
      </div>
    </HubLayoutContext.Provider>
  );
};

// ============================================================================
// RESIZABLE CARD COMPONENT (KÉO THẢ CHỈNH KÍCH THƯỚC TRỰC TIẾP)
// ============================================================================
interface ResizableCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  allowResizeWidth?: boolean;
  allowResizeHeight?: boolean;
  // Drag & drop ordering props
  draggableGroup?: string;
  dragIndex?: number;
  onDragStart?: (index: number) => void;
  onDragEnter?: (index: number) => void;
  onDragEnd?: () => void;
}

export const ResizableCard: React.FC<ResizableCardProps> = ({
  id,
  children,
  className = '',
  defaultHeight,
  minHeight = 80,
  maxHeight = 1200,
  minWidth = 160,
  maxWidth = 1600,
  allowResizeWidth = true,
  allowResizeHeight = true,
  draggableGroup,
  dragIndex,
  onDragStart,
  onDragEnter,
  onDragEnd
}) => {
  const { config, setWidgetSize, resetWidgetSize, isEditMode } = useHubLayout();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [liveDimensions, setLiveDimensions] = useState<{ width?: number; height?: number } | null>(null);

  const customSize = config.widgetSizes[id] || {};
  const currentScale = customSize.scale ?? 1.0;
  const currentHeight = customSize.height ?? defaultHeight;
  const currentWidth = customSize.width;

  // Mouse / Touch Resize Handler
  const handleStartResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!cardRef.current) return;

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialRect = cardRef.current.getBoundingClientRect();
    const startWidth = initialRect.width;
    const startHeight = initialRect.height;

    setIsResizing(true);

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      const newWidth = allowResizeWidth ? Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + deltaX))) : undefined;
      const newHeight = allowResizeHeight ? Math.max(minHeight, Math.min(maxHeight, Math.round(startHeight + deltaY))) : undefined;

      setLiveDimensions({ width: newWidth, height: newHeight });

      if (cardRef.current) {
        if (newHeight) cardRef.current.style.minHeight = `${newHeight}px`;
        if (newWidth) cardRef.current.style.width = `${newWidth}px`;
      }
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      setIsResizing(false);

      if (cardRef.current) {
        const finalRect = cardRef.current.getBoundingClientRect();
        setWidgetSize(id, {
          width: allowResizeWidth ? Math.round(finalRect.width) : undefined,
          height: allowResizeHeight ? Math.round(finalRect.height) : undefined
        });
      }
      setLiveDimensions(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // Quick scale buttons
  const handleScaleChange = (delta: number) => {
    const next = Math.max(0.7, Math.min(1.8, Math.round((currentScale + delta) * 10) / 10));
    setWidgetSize(id, { scale: next });
  };

  return (
    <div
      ref={cardRef}
      draggable={Boolean(draggableGroup && dragIndex !== undefined && isEditMode)}
      onDragStart={() => onDragStart && dragIndex !== undefined && onDragStart(dragIndex)}
      onDragEnter={() => onDragEnter && dragIndex !== undefined && onDragEnter(dragIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => draggableGroup && e.preventDefault()}
      style={{
        minHeight: currentHeight ? `${currentHeight}px` : undefined,
        width: currentWidth ? `${currentWidth}px` : undefined,
        transform: currentScale !== 1.0 ? `scale(${currentScale})` : undefined,
        transformOrigin: 'top left'
      }}
      className={`relative group/resizable transition-all duration-150 ${
        isEditMode ? 'hover:ring-1 hover:ring-purple-400/40 rounded-3xl' : ''
      } ${isResizing ? 'ring-2 ring-purple-500 shadow-2xl select-none z-30' : ''} ${className}`}
    >
      {/* Visual Live Dimension Badge when dragging */}
      {isResizing && liveDimensions && (
        <div className="absolute top-2 left-2 z-40 px-2.5 py-1 rounded-lg bg-purple-600 text-white font-mono text-xs font-black shadow-lg pointer-events-none flex items-center gap-1.5 animate-pulse">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>
            {liveDimensions.width ? `${liveDimensions.width}px` : ''}
            {liveDimensions.width && liveDimensions.height ? ' × ' : ''}
            {liveDimensions.height ? `${liveDimensions.height}px` : ''}
          </span>
        </div>
      )}

      {/* Card Content */}
      {children}

      {/* Floating Micro Controls on Hover in Edit Mode */}
      {isEditMode && (
        <div className="absolute top-2 right-2 opacity-0 group-hover/resizable:opacity-100 transition-opacity z-30 flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-1 rounded-xl border border-white/20 shadow-lg text-white">
          {/* Drag to reorder handle */}
          {draggableGroup && (
            <div
              className="p-1 rounded-lg hover:bg-white/20 cursor-grab active:cursor-grabbing text-purple-300"
              title="Kéo để đổi vị trí"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Scale Down */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleScaleChange(-0.1);
            }}
            className="p-1 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
            title="Thu nhỏ 10%"
          >
            <Minimize2 className="w-3 h-3" />
          </button>

          {/* Scale label */}
          <span className="text-[10px] font-mono px-1 font-bold text-purple-300">
            {Math.round(currentScale * 100)}%
          </span>

          {/* Scale Up */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleScaleChange(0.1);
            }}
            className="p-1 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
            title="Phóng to 10%"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Reset custom size */}
          {(customSize.height || customSize.width || customSize.scale) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetWidgetSize(id);
                if (cardRef.current) {
                  cardRef.current.style.minHeight = '';
                  cardRef.current.style.width = '';
                }
              }}
              className="p-1 rounded-lg hover:bg-rose-500/30 text-rose-300 cursor-pointer"
              title="Khôi phục kích thước ban đầu"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Corner Interactive Drag Resize Handle (Góc dưới bên phải) */}
      {isEditMode && (
        <div
          onMouseDown={handleStartResize}
          onTouchStart={handleStartResize}
          className="absolute bottom-1 right-1 w-6 h-6 flex items-end justify-end p-1 cursor-nwse-resize z-30 opacity-40 hover:opacity-100 group-hover/resizable:opacity-90 transition-opacity"
          title="Kéo góc này để chỉnh to/nhỏ tùy ý (Tự động lưu lại)"
        >
          <div className="w-3.5 h-3.5 border-r-2 border-b-2 border-purple-400 rounded-br-sm shadow-sm hover:border-pink-400 hover:scale-125 transition-transform" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SIDEBAR RESIZER DIVIDER (KÉO RỘNG/HẸP THANH BÊN)
// ============================================================================
export const SidebarResizeDivider: React.FC = () => {
  const { updateConfig } = useHubLayout();
  const [isDragging, setIsDragging] = useState(false);

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const nextWidth = Math.max(220, Math.min(520, Math.round(clientX)));
      updateConfig((prev) => ({ ...prev, sidebarWidth: nextWidth }));
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  return (
    <div
      onMouseDown={handleStartDrag}
      onTouchStart={handleStartDrag}
      className={`hidden lg:flex w-2 hover:w-2.5 -mr-1 z-40 cursor-col-resize items-center justify-center transition-all ${
        isDragging
          ? 'bg-purple-500 shadow-[0_0_12px_#a855f7]'
          : 'bg-transparent hover:bg-purple-500/50'
      }`}
      title="Kéo sang trái/phải để chỉnh độ rộng thanh bên (Tự động lưu)"
    >
      <div className="w-0.5 h-8 rounded-full bg-white/20 group-hover:bg-white/60" />
    </div>
  );
};

// ============================================================================
// FLOATING STUDIO TOOLBAR (BẢNG ĐIỀU KHIỂN BỐ CỤC NỔI)
// ============================================================================
export const HubStudioToolbar: React.FC = () => {
  const { config, updateConfig, resetAll } = useHubLayout();
  const [isOpen, setIsOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleSavePrompt = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 select-none">
      {/* Panel Popup */}
      {isOpen && (
        <div className="w-80 sm:w-96 p-5 rounded-3xl bg-[#0d0f1d]/95 backdrop-blur-2xl border border-purple-500/40 shadow-2xl shadow-purple-950/80 space-y-4 animate-in slide-in-from-bottom-5 duration-200 text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Tùy Chỉnh Kích Thước & Bố Cục</h4>
                <p className="text-[11px] text-white/50">Kéo góc ↘ trên thẻ hoặc chỉnh slider</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          {/* 1. Zoom toàn bộ Hub */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Phóng To Toàn Hub:</span>
              <span className="font-mono text-purple-400 font-black">
                {Math.round(config.globalScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.85"
              max="1.45"
              step="0.05"
              value={config.globalScale}
              onChange={(e) =>
                updateConfig((prev) => ({ ...prev, globalScale: parseFloat(e.target.value) }))
              }
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40 font-mono">
              <span>85% (Nhỏ gọn)</span>
              <span>100% (Chuẩn)</span>
              <span>145% (Cực to)</span>
            </div>
          </div>

          {/* 2. Độ rộng Sidebar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Độ Rộng Thanh Bên:</span>
              <span className="font-mono text-purple-400 font-black">
                {config.sidebarWidth}px
              </span>
            </div>
            <input
              type="range"
              min="240"
              max="460"
              step="10"
              value={config.sidebarWidth}
              onChange={(e) =>
                updateConfig((prev) => ({ ...prev, sidebarWidth: parseInt(e.target.value) }))
              }
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* 3. Số Cột Kho Đề Thi (Vault Grid) */}
          <div className="space-y-1.5">
            <span className="font-bold text-xs text-slate-300 block">Số Cột Kho Đề Thi:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, vaultGridCols: '1' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  config.vaultGridCols === '1'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>1 Cột (Siêu to)</span>
              </button>
              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, vaultGridCols: '2' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  config.vaultGridCols === '2'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>2 Cột (Chuẩn)</span>
              </button>
              <button
                type="button"
                onClick={() => updateConfig((prev) => ({ ...prev, vaultGridCols: '3' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  config.vaultGridCols === '3'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>3 Cột (Rộng)</span>
              </button>
            </div>
          </div>

          {/* 4. Tự động lưu & Khôi phục */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSavePrompt}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              {justSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
              <span>{justSaved ? 'Đã Lưu!' : 'Lưu Vào Máy'}</span>
            </button>

            <button
              type="button"
              onClick={resetAll}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 text-xs font-semibold cursor-pointer transition-all"
            >
              Khôi Phục Mặc Định
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm shadow-2xl shadow-purple-950/80 border border-white/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all group"
      >
        <Sliders className="w-4 h-4 group-hover:rotate-45 transition-transform" />
        <span>📐 Chỉnh Kích Thước Bố Cục</span>
        {Object.keys(config.widgetSizes).length > 0 && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>
    </div>
  );
};
