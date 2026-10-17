import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render/lifecycle errors anywhere in the
 * React tree so a single crashing component cannot blank the entire window.
 * The MPV video surface lives in a separate native HWND, so playback is
 * unaffected and the fallback offers an in-place retry as well as a full reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EYTAA UI error boundary caught an error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-950 text-neutral-100 p-6 select-none">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4 text-center shadow-2xl backdrop-blur-xl">
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-neutral-400">
              EYTAA hit an unexpected error. Your playback and library data are safe.
            </p>
          </div>

          {this.state.error?.message && (
            <pre className="text-[11px] text-left font-mono bg-black/40 border border-white/10 rounded-xl p-3 overflow-auto max-h-32 text-rose-300 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white transition cursor-pointer"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }
}
