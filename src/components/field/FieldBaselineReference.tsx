import { useTranslation } from "react-i18next";
import { Baseline } from "lucide-react";

import type { FieldBaselinePhoto } from "@/api/generated/requests/types.gen";

interface FieldBaselineReferenceProps {
  /** The previous stay's photos of THIS asset. `[]` when there are none. */
  photos: readonly FieldBaselinePhoto[];
}

/**
 * D19: the framing reference — the previous stay's photo of the same asset, dimmed, so a
 * cleaner can line the current state up against it. It is a STILL, not a viewfinder: no
 * `getUserMedia`, no `<canvas>`, no MediaStream. The capture path stays the native camera
 * picker every other photo flow in this app uses.
 *
 * `downloadUrl` is already signed by the backend (`getBaselinePhotos` returns five-minute
 * URLs, asset-scoped). It is used AS-IS. Prefixing it with `VITE_R2_IMAGE_URL` — which is
 * what the host panel does with a bare `storageKey` — would produce a URL that 404s, and
 * the page would look like it had simply lost the photo.
 *
 * No heading of its own: the `SectionCard` above it is already titled, and the copy key is
 * NOT repeated here. Renders nothing when there are none — the spec's row 5 names "framing
 * reference absent" as a state, and it is the normal one for a first stay, since there is
 * nothing to compare to.
 */
export function FieldBaselineReference({ photos }: FieldBaselineReferenceProps) {
  const { t } = useTranslation("guest");

  if (photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((photo) => (
          <img
            key={photo.storageKey}
            // Signed and short-lived — never prefixed, never cached past the session.
            src={photo.downloadUrl}
            alt={t("fieldIncident.baseline.alt")}
            // The blueprint's `opacity: 0.4`, as a Tailwind step.
            className="h-28 w-28 shrink-0 rounded-lg border border-gray-200 object-cover opacity-40 dark:border-gray-800"
          />
        ))}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Baseline className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("fieldIncident.baseline.caption")}
      </p>
    </div>
  );
}
