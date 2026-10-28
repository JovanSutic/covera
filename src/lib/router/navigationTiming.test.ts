import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataRouter } from "react-router";
import { createNavigationTiming } from "./navigationTiming";
import { queryClient } from "@/lib/api/queryClient";
import { clearPreloadedHrefs, preloadRoute, registerRoutePreloader } from "./preloadRegistry";

/** A router stand-in that lets the test drive navigation state directly. */
function fakeRouter() {
  let listener: ((state: unknown) => void) | null = null;

  return {
    subscribe(next: (state: unknown) => void) {
      listener = next;
      return () => {
        listener = null;
      };
    },
    emit(state: unknown) {
      listener?.(state);
    },
    loading: (pathname = "/host/dashboard") => ({
      navigation: { state: "loading" },
      historyAction: "PUSH",
      location: { pathname, search: "" },
    }),
    idle: (pathname = "/host/dashboard") => ({
      navigation: { state: "idle" },
      historyAction: "PUSH",
      location: { pathname, search: "" },
    }),
  };
}

describe("navigationTiming", () => {
  beforeEach(() => {
    clearPreloadedHrefs();
    queryClient.clear();
  });

  it("records chunkMs on the idle transition", async () => {
    const router = fakeRouter();
    const recorder = createNavigationTiming();
    recorder.install(router as unknown as DataRouter);

    router.emit(router.loading());
    router.emit(router.idle());

    const [sample] = recorder.getTimings();
    expect(sample.chunkMs).toBeGreaterThanOrEqual(0);
    expect(sample.durationMs).toBe(sample.chunkMs);
  });

  it("leaves dataMs null when the navigation started no query", () => {
    const router = fakeRouter();
    const recorder = createNavigationTiming();
    recorder.install(router as unknown as DataRouter);

    router.emit(router.loading());
    router.emit(router.idle());

    expect(recorder.getTimings()[0].dataMs).toBeNull();
  });

  it("labels a sample prefetched when its href was preloaded", () => {
    const router = fakeRouter();
    const recorder = createNavigationTiming();
    recorder.install(router as unknown as DataRouter);

    registerRoutePreloader(() => undefined);
    preloadRoute("/host/dashboard");

    router.emit(router.loading());
    router.emit(router.idle());

    expect(recorder.getTimings()[0].prefetched).toBe(true);
  });

  it("does not label a cold navigation as prefetched", () => {
    const router = fakeRouter();
    const recorder = createNavigationTiming();
    recorder.install(router as unknown as DataRouter);

    router.emit(router.loading());
    router.emit(router.idle());

    expect(recorder.getTimings()[0].prefetched).toBe(false);
  });

  it("closes dataMs once a query started in the window settles", async () => {
    const router = fakeRouter();
    const recorder = createNavigationTiming();
    recorder.install(router as unknown as DataRouter);

    router.emit(router.loading());

    // Start a query while the navigation is in flight, with a resolver the test
    // controls, then settle it.
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((r) => {
      resolve = r;
    });

    void queryClient.prefetchQuery({
      queryKey: ["test", "dataMs"],
      queryFn: () => pending,
    });

    // Let the cache report `fetching` before settling.
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(["test", "dataMs"])?.fetchStatus).toBe("fetching"),
    );

    resolve("done");
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(["test", "dataMs"])?.fetchStatus).toBe("idle"),
    );

    router.emit(router.idle());

    expect(recorder.getTimings()[0].dataMs).not.toBeNull();
  });

  it("reports null medians with no samples", () => {
    const recorder = createNavigationTiming();
    expect(recorder.getMedians()).toEqual({ chunkMs: null, dataMs: null });
  });
});
