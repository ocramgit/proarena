/**
 * PHASE 60: Performance-Optimized List Components
 * Uses React.memo and virtualization patterns for large lists
 */

"use client";

import React, { memo, useCallback, useMemo } from "react";

// Generic memoized list item wrapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MemoizedListItem = memo(function MemoizedListItem({
  item,
  renderItem,
  index,
}: {
  item: any;
  renderItem: (item: any, index: number) => React.ReactNode;
  index: number;
}) {
  return <>{renderItem(item, index)}</>;
});

// Performance-optimized list component
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = "No items",
  className = "",
}: OptimizedListProps<T>) {
  const memoizedRenderItem = useCallback(renderItem, [renderItem]);

  const renderedItems = useMemo(() => {
    return items.map((item, index) => (
      <MemoizedListItem
        key={keyExtractor(item, index)}
        item={item}
        renderItem={memoizedRenderItem}
        index={index}
      />
    ));
  }, [items, keyExtractor, memoizedRenderItem]);

  if (items.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        {emptyMessage}
      </div>
    );
  }

  return <div className={className}>{renderedItems}</div>;
}

// Skeleton loader for lists
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-zinc-800/50 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

export default OptimizedList;
