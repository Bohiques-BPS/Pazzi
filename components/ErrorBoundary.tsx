import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { useTranslation } from '../contexts/GlobalSettingsContext';

const DefaultErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
        {t('cmp.error_boundary.title')}
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1 max-w-md">
        {t('cmp.error_boundary.message')}
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs text-left bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-2 max-w-xl overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2 mt-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
        >
          {t('cmp.error_boundary.retry')}
        </button>
        <a
          href="/"
          className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {t('cmp.error_boundary.go_home')}
        </a>
      </div>
    </div>
  );
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') return <>{fallback(this.state.error, this.reset)}</>;
      if (fallback) return <>{fallback}</>;

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}
