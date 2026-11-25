import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Terjadi kesalahan saat merender tampilan.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Idea Studio ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            color: 'var(--text-primary)',
          }}
          className="flex min-h-dvh items-center justify-center p-6"
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-float)',
            }}
            className="w-full max-w-md space-y-4 rounded-2xl border p-6 text-center"
          >
            <h1 className="text-base font-bold">Tampilan sempat terganggu</h1>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Data tim di Firebase tetap aman. Klik tombol di bawah untuk memulihkan papan.
            </p>
            {this.state.message && (
              <p
                className="font-mono-code rounded-xl px-3 py-2 text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {this.state.message}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: 'var(--btn-solid-bg)',
                color: 'var(--btn-solid-fg)',
              }}
              className="rounded-full px-5 py-2 text-xs font-semibold transition hover:opacity-90"
            >
              Muat Ulang Papan
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

