import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#08060E] text-[#F8F5FF] selection:bg-[#FF3CA6] selection:text-white">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#100B1A]/95 border border-[#FF3CA6]/35 shadow-2xl shadow-black/80 backdrop-blur-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Holographic Icon */}
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/30">
              <AlertOctagon className="w-8 h-8 stroke-[2.2]" />
            </div>

            {/* Title & Desc */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#F8F5FF] tracking-tight">
                Đã Xảy Ra Gián Đoạn Giao Diện
              </h1>
              <p className="text-xs sm:text-sm text-[#CEC4E8] leading-relaxed">
                Ứng dụng gặp một ngoại lệ không mong muốn khi hiển thị. Bộ đệm và dữ liệu của bạn đã được bảo vệ an toàn.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#D61F79] to-[#FF3CA6] hover:from-[#FF3CA6] hover:to-[#FF55B8] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#D61F79]/30 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tải Lại Trang</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Trang Chủ</span>
              </button>
            </div>

            {/* Developer Details Toggle */}
            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{this.state.showDetails ? 'Ẩn thông tin lỗi chi tiết' : 'Xem chi tiết mã lỗi (Dev)'}</span>
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono text-rose-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
