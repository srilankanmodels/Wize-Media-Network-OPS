import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Trash2, Terminal, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SYSTEM RUNTIME EXCEPTION CAUGHT BY BOUNDARY:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      const keysToRemove = [
        'mw_session_user',
        'mw_projects',
        'mw_staff',
        'mw_clients',
        'mw_todos',
        'mw_events',
        'mw_notes',
        'mw_agency',
        'mw_messages',
        'mw_channels',
        'mw_notifications',
        'mw_procedures',
        'mw_leaves',
        'mw_pettyCash'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown runtime error';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-[#060709] text-white flex flex-col items-center justify-center p-6 bg-grid-pattern selection:bg-white selection:text-black">
          <div className="w-full max-w-2xl bg-[#0a0b0e] border border-rose-500/40 rounded-sm shadow-2xl overflow-hidden z-10">
            {/* Header */}
            <div className="p-6 bg-[#0e0f14] border-b border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-sm">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div className="font-mono text-[9px] text-rose-400 uppercase tracking-[0.25em]">
                    SYSTEM TELEMETRY // RUNTIME EXCEPTION GUARD
                  </div>
                  <h1 className="text-lg font-black text-white uppercase tracking-tight font-heading mt-0.5">
                    Workspace Protocol Interrupted
                  </h1>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono text-[10px] uppercase font-bold">
                RECOVERY MODE
              </span>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="bg-[#12141a] border border-neutral-800 rounded-sm p-4 font-mono text-xs text-neutral-300 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold uppercase text-[11px]">
                  <AlertTriangle size={14} />
                  <span>Exception Details:</span>
                </div>
                <div className="p-2.5 bg-[#060709] border border-neutral-800 text-rose-300 text-xs font-mono rounded-sm break-words">
                  {errorMessage}
                </div>
              </div>

              {componentStack && (
                <details className="bg-[#12141a] border border-neutral-800 rounded-sm p-3 font-mono text-[10px] text-neutral-400">
                  <summary className="cursor-pointer text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 hover:text-white">
                    <Terminal size={12} />
                    <span>View Component Stack Trace</span>
                  </summary>
                  <pre className="mt-3 p-3 bg-[#060709] border border-neutral-800 text-neutral-400 text-[9px] overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {componentStack}
                  </pre>
                </details>
              )}

              <p className="font-mono text-xs text-neutral-400 leading-relaxed">
                A non-critical interface exception was intercepted to prevent system crash. You can reload the workspace, or reset cached local telemetry to restore factory state.
              </p>

              {/* Recovery Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 py-3 bg-white text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <RefreshCw size={14} />
                  Reload Workspace
                </button>
                <button
                  type="button"
                  onClick={this.handleResetStorage}
                  className="py-3 px-5 bg-neutral-900 border border-neutral-700 hover:border-rose-500/60 text-neutral-300 hover:text-rose-300 font-mono text-xs uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  title="Clears corrupted local cache and restarts"
                >
                  <Trash2 size={14} />
                  Reset Local Cache & Restart
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
