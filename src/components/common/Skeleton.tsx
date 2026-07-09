import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonStat: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-9 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-20 mb-1" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    {/* Header */}
    <div className="flex gap-4 px-5 py-3.5 border-b border-border bg-muted/30">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === 0 ? 'w-8' : 'flex-1'}`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 px-5 py-4 border-b border-border/50 last:border-b-0">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton
            key={c}
            className={`h-4 ${c === 0 ? 'w-8' : c === 1 ? 'flex-1 max-w-[180px]' : 'flex-1'}`}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
    </div>
    <SkeletonTable rows={6} />
  </div>
);

export default Skeleton;
