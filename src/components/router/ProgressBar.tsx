import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const VISIBLE_AFTER_MS = 200;

/**
 * A navigation that finishes under 200 ms must not flash a bar (R9). The bar
 * appears only once a wait is long enough to be worth acknowledging.
 */
export function ProgressBar({ isNavigating }: { isNavigating: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isNavigating) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(true), VISIBLE_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [isNavigating]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-0.5 bg-blue-600 transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
