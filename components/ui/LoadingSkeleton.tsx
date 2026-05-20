import React from 'react';

/**
 * Skeleton de carga reutilizable.
 *
 * Uso:
 *   <LoadingSkeleton variant="table" rows={8} />
 *   <LoadingSkeleton variant="cards" count={6} />
 *   <LoadingSkeleton variant="form" />
 *   <LoadingSkeleton variant="list" rows={5} />
 */

interface LoadingSkeletonProps {
  variant?: 'table' | 'cards' | 'form' | 'list' | 'block';
  rows?: number;
  count?: number;
  className?: string;
}

const Pulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${className}`} />
);

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'block',
  rows = 6,
  count = 4,
  className = '',
}) => {
  if (variant === 'table') {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true" aria-live="polite">
        <Pulse className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`} aria-busy="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
            <Pulse className="h-32 w-full" />
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={`space-y-4 ${className}`} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Pulse className="h-3 w-32" />
            <Pulse className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Pulse className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-3 w-3/4" />
              <Pulse className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <Pulse className={`h-24 w-full ${className}`} />;
};
