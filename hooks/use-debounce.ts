"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a debounced version of the callback that delays invocation
 * until after `delay` ms have elapsed since the last call.
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending timer when the component unmounts to prevent calling
  // stale callbacks on an already-unmounted component.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}
