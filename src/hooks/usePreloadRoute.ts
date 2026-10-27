import { useCallback, useEffect, useMemo, useRef } from "react";
import { preloadRoute } from "@/lib/router/preloadRegistry";

const INTENT_DELAY_MS = 100;

export interface PreloadHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onPointerDown: () => void;
}

/**
 * H8: hover or focus held for 100 ms starts the route's work; a pointer press
 * starts it immediately. Leaving cancels. Timers are cleared on unmount.
 */
export function usePreloadRoute(href: string | null, enabled = true): PreloadHandlers {
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = useCallback(() => {
    if (!enabled || !href) return;
    cancel();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      preloadRoute(href);
    }, INTENT_DELAY_MS);
  }, [cancel, enabled, href]);

  const startNow = useCallback(() => {
    if (!enabled || !href) return;
    cancel();
    preloadRoute(href);
  }, [cancel, enabled, href]);

  return useMemo(
    () => ({
      onMouseEnter: start,
      onFocus: start,
      onMouseLeave: cancel,
      onBlur: cancel,
      onPointerDown: startNow,
    }),
    [cancel, start, startNow],
  );
}
