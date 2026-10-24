import React, { createContext, useContext } from 'react';

// ============================================================================
// TYPES & FIXED CLEAN LAYOUT CONFIGURATION (Đã gỡ bỏ bảng tùy chỉnh Bố Cục)
// ============================================================================
export interface WidgetSize {
  width?: number;
  height?: number;
  scale?: number;
  colSpan?: 1 | 2 | 3;
}

export interface HubLayoutConfig {
  sidebarWidth: number;
  globalScale: number;
  vaultGridCols: '1' | '2' | '3';
  fontSizeLevel: 'normal' | 'large' | 'huge';
  editMode: boolean;
  widgetSizes: Record<string, WidgetSize>;
  widgetOrder: Record<string, string[]>;
}

const DEFAULT_CONFIG: HubLayoutConfig = {
  sidebarWidth: 300,
  globalScale: 0.9,
  vaultGridCols: '2',
  fontSizeLevel: 'normal',
  editMode: false,
  widgetSizes: {},
  widgetOrder: {
    quick_actions: ['quick_exam', 'quick_vault', 'quick_submit', 'quick_bookmarks'],
    status_grid: ['status_bot', 'status_vault', 'status_account'],
  },
};

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

const noop = () => {};

const STATIC_CONTEXT_VALUE: HubLayoutContextType = {
  config: DEFAULT_CONFIG,
  updateConfig: noop,
  setWidgetSize: noop,
  resetWidgetSize: noop,
  resetAll: noop,
  reorderWidgets: noop,
  isEditMode: false,
  toggleEditMode: noop,
};

const HubLayoutContext = createContext<HubLayoutContextType>(STATIC_CONTEXT_VALUE);

export const useHubLayout = () => useContext(HubLayoutContext);

export const HubLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HubLayoutContext.Provider value={STATIC_CONTEXT_VALUE}>{children}</HubLayoutContext.Provider>
);

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
  draggableGroup?: string;
  dragIndex?: number;
  onDragStart?: (index: number) => void;
  onDragEnter?: (index: number) => void;
  onDragEnd?: () => void;
}

export const ResizableCard: React.FC<ResizableCardProps> = ({ children, className = '' }) => (
  <div className={`relative h-full flex flex-col ${className}`}>{children}</div>
);

export const SidebarResizeDivider: React.FC = () => null;

export const HubStudioToolbar: React.FC = () => null;
