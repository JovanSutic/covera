import { useCallback, useState } from "react";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";

/**
 * The captured photos, and the three things the flow does to them.
 *
 * D8/phase 3: this is the state the old `ApartmentShotGuide` kept inline as `shots` plus
 * `setShots`, lifted so the panel, the actions and the orchestrator do not each hold a
 * copy of the same accumulator. It is a hook rather than four `useState` calls in the
 * flow because the update rules (replace one step, never append; seed from the server
 * only once) are the part worth naming.
 *
 * `capture` replaces the step at `index`, it never appends or reorders: the API's shots
 * are the steps, and their order is the sequence (prep §1). A retake is therefore the
 * same call as a first capture, which is why there is one function and not two.
 */
export function useCapturedShots(initialShots: CapturedApartmentShot[]) {
  const [shots, setShots] = useState<CapturedApartmentShot[]>(initialShots);

  const capture = useCallback(
    (index: number, previewUrl: string, file?: File): void => {
      setShots((previous) =>
        previous.map((shot, shotIndex) =>
          shotIndex === index
            ? { ...shot, capturedImageUrl: previewUrl, rawFile: file }
            : shot,
        ),
      );
    },
    [],
  );

  return { shots, capture };
}
