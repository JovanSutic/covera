import { useEffect } from "react";
import { useBlocker } from "react-router";

/**
 * D10: the two exits from a guide with unsaved photos, in one place.
 *
 *   in-app navigation → `useBlocker` (D9). It answers only for navigations the data
 *                       router performs, which is why the listener below is not redundant.
 *   tab close/refresh → `beforeunload`, the behaviour the old `ApartmentShotGuide` had
 *                       while uploading, kept and broadened to "has unsaved photos".
 *
 * `canLeave` must be passed in already-answered (`canLeaveGuide`, phase 6.1) rather than
 * the shots: the rule is the helper's, and a hook that decided it would be a second place
 * the two exits could drift apart.
 *
 * `useBlocker` is called unconditionally on every render — a hook behind a condition would
 * break the render order — so the boolean is the switch, not the call.
 */
export function useGuideExitGuard(canLeave: boolean) {
  const blocker = useBlocker(!canLeave);

  useEffect(() => {
    if (canLeave) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [canLeave]);

  return blocker;
}
