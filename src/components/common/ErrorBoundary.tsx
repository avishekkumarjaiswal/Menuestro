import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4 antialiased font-sans">
          <div className="max-w-md w-full bg-white rounded-[20px] p-6 sm:p-8 border border-[#E4E7EC] shadow-[0_20px_40px_rgba(16,24,40,0.08)] text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-200">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-[#101828] tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-[#667085] mt-2 mb-6">
              We encountered an unexpected display error. Reload the application or return to the main dashboard.
            </p>
            {this.state.error && (
              <div className="p-3 bg-[#F7F9FC] rounded-[10px] text-left text-xs font-mono text-slate-700 overflow-x-auto max-h-28 mb-6 border border-[#E4E7EC]">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 h-11 rounded-[10px] bg-[#078A55] hover:bg-[#067548] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 h-11 rounded-[10px] bg-white hover:bg-slate-50 text-[#101828] font-semibold text-sm border border-[#D0D5DD] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
