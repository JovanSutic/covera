import type { DataRouter } from "react-router";

export interface NavigationTiming {
  /** Where the navigation started from. */
  from: string;
  /** Where it went. */
  to: string;
  /** Wall-clock ms from the router entering "loading" to being back at "idle". */
  durationMs: number;
}

/**
 * Records route-transition durations so the NT p75 in
 * docs/routing-performance-baseline.md can be measured without a profiler
 * (playbook §0, R33). Kept deliberately tiny: a subscribe callback and a ring
 * buffer, no timers, no DOM.
 */
export interface NavigationTimingRecorder {
  install(router: DataRouter): () => void;
  /** Oldest first, capped at `CAPACITY`. */
  getTimings(): readonly NavigationTiming[];
  /** The middle value, or null with no samples — the "p75" of 5 runs is the 3rd. */
  getMedian(): number | null;
  clear(): void;
}

const CAPACITY = 50;

export function createNavigationTiming(): NavigationTimingRecorder {
  const timings: NavigationTiming[] = [];
  let startedAt: number | null = null;

  return {
    install(router) {
      return router.subscribe((state) => {
        if (state.navigation.state === "loading") {
          startedAt ??= performance.now();
          return;
        }

        // Back to idle: close the sample. `startedAt` is null for the initial
        // render, so no bogus sample is recorded for it.
        if (state.navigation.state === "idle" && startedAt !== null) {
          timings.push({
            from: state.historyAction,
            to: state.location.pathname,
            durationMs: performance.now() - startedAt,
          });

          if (timings.length > CAPACITY) timings.shift();
          startedAt = null;
        }
      });
    },

    getTimings: () => timings,

    getMedian() {
      if (timings.length === 0) return null;
      const sorted = [...timings].map((entry) => entry.durationMs).sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    },

    clear() {
      timings.length = 0;
      startedAt = null;
    },
  };
}
