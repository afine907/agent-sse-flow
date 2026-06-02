import { useRef, useCallback, useEffect, useReducer } from 'react';

/**
 * useVisibleRows — IntersectionObserver-based visibility tracking for virtual rows.
 *
 * Only rows that are intersecting the viewport get full content rendered;
 * off-screen rows render a lightweight placeholder. This complements virtual
 * scrolling by reducing rendering work for partially-visible rows.
 *
 * @param rootRef - Ref to the scroll container (used as IntersectionObserver root)
 * @returns A ref callback to attach to each row element and a Set of visible row keys
 */
export function useVisibleRows(rootRef: React.RefObject<HTMLDivElement | null>) {
  const visibleRef = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Force re-render when visibility changes
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  // Lazily create the observer when first needed
  const ensureObserver = useCallback(() => {
    if (observerRef.current) return;
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isNaN(index)) continue;

          if (entry.isIntersecting) {
            if (!visibleRef.current.has(index)) {
              visibleRef.current.add(index);
              changed = true;
            }
          }
          // Intentionally do NOT remove rows from the visible set when they
          // leave the viewport. Once a row has been scrolled into view and its
          // full content rendered, keeping it avoids a flash of placeholder
          // content if the user scrolls back. The virtualizer already removes
          // off-screen DOM nodes, so there is no memory penalty.
        }
        if (changed) {
          forceUpdate();
        }
      },
      { root, threshold: 0 },
    );
  }, [rootRef]);

  /**
   * Ref callback to attach to each virtual row element.
   * Call this in a ref callback alongside virtualizer.measureElement.
   */
  const measureRef = useCallback(
    (element: Element | null) => {
      if (!element) return;
      ensureObserver();
      observerRef.current?.observe(element);
    },
    [ensureObserver],
  );

  /** Check whether a row at the given index is visible (has entered viewport) */
  const isVisible = useCallback(
    (index: number): boolean => {
      // When IO is unavailable (SSR, old browsers), treat all rows as visible
      if (!observerRef.current) return true;
      return visibleRef.current.has(index);
    },
    [],
  );

  return { measureRef, isVisible };
}
