
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-8 text-center font-mono">
          <h1 className="text-4xl text-red-500 mb-4 font-bold">CRITICAL FAILURE</h1>
          <p className="mb-4 text-sm">The universe has collapsed.</p>
          <div className="bg-black/50 p-4 rounded border border-slate-800 text-left overflow-auto max-h-64 max-w-2xl mb-8">
            <code className="text-red-300 text-xs">
              {this.state.error?.message}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-slate-200 transition-colors"
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
