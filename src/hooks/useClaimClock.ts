import { useEffect, useState } from "react";

/**
 * D32: the one interval in this feature.
 *
 * The panel does not need a second-accurate clock. The guest window is 24 hours and the
 * AirCover window is 30 days, so the display's granularity is minutes and days: a
 * 15-second tick is enough to keep "23h 59m" from sitting visibly stale, and it is 5,760
 * renders a day rather than 86,400.
 *
 * D46: this hook is the ONLY `Date.now()` in the claim surface, and the page that calls
 * it passes the value DOWN as a `now: number` prop. Nothing below a page reads a clock.
 *
 * The hook is deliberately untested (see the index's test plan): asserting that an
 * interval fired is not the same as asserting the screen updated, and the arithmetic that
 * can actually be wrong is `getClaimDeadlineState`, which phase 1 covers. Phase 8's test
 * drives the panel with an INJECTED `now` instead.
 */
export const CLAIM_CLOCK_INTERVAL_MS = 15_000;

export function useClaimClock(intervalMs: number = CLAIM_CLOCK_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
