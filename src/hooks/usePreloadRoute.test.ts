import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreloadRoute } from "./usePreloadRoute";
import { registerRoutePreloader } from "@/lib/router/preloadRegistry";

describe("usePreloadRoute", () => {
  let preloaded: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    preloaded = [];
    registerRoutePreloader((href) => {
      preloaded.push(href);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preloads after a 100 ms hover", () => {
    const { result } = renderHook(() => usePreloadRoute("/host/apartments"));

    result.current.onMouseEnter();
    expect(preloaded).toEqual([]);

    vi.advanceTimersByTime(100);
    expect(preloaded).toEqual(["/host/apartments"]);
  });

  it("does not preload when the pointer leaves before 100 ms", () => {
    const { result } = renderHook(() => usePreloadRoute("/host/apartments"));

    result.current.onMouseEnter();
    vi.advanceTimersByTime(50);
    result.current.onMouseLeave();
    vi.advanceTimersByTime(1000);

    expect(preloaded).toEqual([]);
  });

  it("preloads immediately on pointer down, without waiting", () => {
    const { result } = renderHook(() => usePreloadRoute("/host/apartments"));

    result.current.onPointerDown();

    expect(preloaded).toEqual(["/host/apartments"]);
  });

  it("never preloads when disabled", () => {
    const { result } = renderHook(() =>
      usePreloadRoute("/host/apartments", false),
    );

    result.current.onMouseEnter();
    vi.advanceTimersByTime(500);
    result.current.onPointerDown();

    expect(preloaded).toEqual([]);
  });

  it("never preloads a null href", () => {
    const { result } = renderHook(() => usePreloadRoute(null));

    result.current.onMouseEnter();
    result.current.onPointerDown();
    vi.advanceTimersByTime(500);

    expect(preloaded).toEqual([]);
  });

  it("clears a pending timer on unmount", () => {
    const { result, unmount } = renderHook(() =>
      usePreloadRoute("/host/apartments"),
    );

    result.current.onMouseEnter();
    unmount();
    vi.advanceTimersByTime(1000);

    expect(preloaded).toEqual([]);
  });
});
