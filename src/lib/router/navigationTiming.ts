import type { DataRouter } from "react-router";
import { queryClient } from "@/lib/api/queryClient";
import { consumePreloaded } from "./preloadRegistry";

export interface NavigationTiming {
  /** Where the navigation started from. */
  from: string;
  /** Where it went. */
  to: string;
  /** Wall-clock ms from the router entering "loading" to being back at "idle". */
  durationMs: number;
  /** D11: `durationMs` renamed for what it actually measures — chunk/loader time. */
  chunkMs: number;
  /**
   * D11: ms from navigation start until every query started during that
   * navigation settled. `null` when the navigation started no query, or when a
   * query never settled before the recorder was cleared. Data readiness is a
   * different number from chunk readiness, and this is the one the prefetch work
   * is meant to move.
   */
  dataMs: number | null;
  /** D11: was this href preloaded before the navigation? The flag the gain shows up in. */
  prefetched: boolean;
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
  /** The middle `chunkMs` and `dataMs` over the samples that have each. */
  getMedians(): { chunkMs: number | null; dataMs: number | null };
  clear(): void;
}

const CAPACITY = 50;

export function createNavigationTiming(): NavigationTimingRecorder {
  const timings: NavigationTiming[] = [];
  let startedAt: number | null = null;
  let prefetched = false;

  // Queries observed as "fetching" during the current navigation, and the ones
  // already settled. A query is only counted if it STARTED in this window — a
  // cache hit that never fetched is not a data wait.
  let navQueries = new Set<string>();
  let settledQueries = new Set<string>();

  /**
   * D11: the wall-clock instant the LAST query of this navigation settled. This
   * is the metric — measuring it at the `idle` transition instead would only
   * report "data was ready by the time the chunk loaded", which is true of every
   * fast API and would hide the very difference this feature makes.
   */
  let dataReadyAt: number | null = null;

  const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
    if (startedAt === null) return;

    const key = event.query.queryHash;

    if (event.type === "updated" && event.query.state.fetchStatus === "fetching") {
      navQueries.add(key);
      settledQueries.delete(key);
      return;
    }

    if (
      event.type === "updated" &&
      navQueries.has(key) &&
      event.query.state.fetchStatus === "idle" &&
      event.query.state.status !== "pending"
    ) {
      settledQueries.add(key);

      // A query that failed still counts as settled: the page has its answer and
      // can render its error branch.
      if (dataReadyAt === null && settledQueries.size >= navQueries.size) {
        dataReadyAt = performance.now();
      }
    }
  });

  function reset(): void {
    startedAt = null;
    prefetched = false;
    navQueries = new Set();
    settledQueries = new Set();
    dataReadyAt = null;
  }

  return {
    install(router) {
      const unsubscribeRouter = router.subscribe((state) => {
        if (state.navigation.state === "loading") {
          if (startedAt === null) {
            startedAt = performance.now();
            prefetched = consumePreloaded(state.location.pathname + state.location.search);
            navQueries = new Set();
            settledQueries = new Set();
            dataReadyAt = null;
          }
          return;
        }

        // Back to idle: close the sample. `startedAt` is null for the initial
        // render, so no bogus sample is recorded for it.
        if (state.navigation.state === "idle" && startedAt !== null) {
          const now = performance.now();
          const durationMs = now - startedAt;

          timings.push({
            from: state.historyAction,
            to: state.location.pathname,
            durationMs,
            chunkMs: durationMs,
            // null when the navigation started no query, or when its queries had
            // not settled by the time the chunk was ready — the cold case.
            dataMs: dataReadyAt === null ? null : dataReadyAt - startedAt,
            prefetched,
          });

          if (timings.length > CAPACITY) timings.shift();
          reset();
        }
      });

      return () => {
        unsubscribeRouter();
        unsubscribeCache();
      };
    },

    getTimings: () => timings,

    getMedian() {
      return this.getMedians().chunkMs;
    },

    getMedians() {
      const middle = (values: number[]): number | null => {
        if (values.length === 0) return null;
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };

      return {
        chunkMs: middle(timings.map((entry) => entry.chunkMs)),
        dataMs: middle(
          timings
            .map((entry) => entry.dataMs)
            .filter((value): value is number => value !== null),
        ),
      };
    },

    clear() {
      timings.length = 0;
      reset();
    },
  };
}
