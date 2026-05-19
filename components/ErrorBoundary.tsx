import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      console.error('[ErrorBoundary]', event.error);
      setHasError(true);
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (hasError) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
          Algo salió mal
        </h2>
        <p className="text-sm text-neutral-500 mb-4 max-w-md">
          Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
        >
          Recargar página
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
