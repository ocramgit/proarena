/**
 * PHASE 60: Lazy Loading Component Wrappers
 * Reduces initial bundle size by code-splitting heavy routes
 */

"use client";

import { Suspense, lazy, ComponentType } from "react";
import { Loader2 } from "lucide-react";

// Generic loading fallback
function LoadingFallback({ message = "A carregar..." }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-zinc-500 text-sm">{message}</p>
      </div>
    </div>
  );
}

// Full page loading
export function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-zinc-400">A carregar página...</p>
      </div>
    </div>
  );
}

// Wrapper for lazy-loaded components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLazyLoading<P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallbackMessage?: string
) {
  const LazyComponent = lazy(importFn);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Skeleton components for common patterns
export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3" />
      <div className="h-3 bg-zinc-800 rounded w-1/2 mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-2/3" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 bg-zinc-800 rounded" />
        </td>
      ))}
    </tr>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-zinc-800 rounded-xl" />
        <div className="flex-1">
          <div className="h-5 bg-zinc-800 rounded w-32 mb-2" />
          <div className="h-3 bg-zinc-800 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="h-6 bg-zinc-700 rounded mb-1" />
            <div className="h-2 bg-zinc-700 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default withLazyLoading;
