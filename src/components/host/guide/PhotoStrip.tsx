import { useTranslation } from "react-i18next";

import type { StripItem } from "@/lib/helpers/guideFlow";
import { PhotoStripItem } from "./PhotoStripItem";

interface PhotoStripProps {
  items: StripItem[];
  onSelect: (index: number) => void;
}

/**
 * The Photos transparency list (prep §1): every step the apartment requires, as a
 * horizontally scrollable row of small photo components, blank until taken, with the
 * current step highlighted. Visible in every flow state except while the camera is open
 * (D14) — the flow decides that, not this component.
 *
 * It holds no state and computes no reachability (invariant 10): `items` arrives from
 * `stripItems()` and `onSelect` is the flow's `selectStep`.
 *
 * The row that scrolls carries `p-1` and the wrapper carries `py-1`: the current item's
 * ring is a box-shadow painted 3px outside its box (`ring-2` + `ring-offset-1`), and an
 * `overflow-x-auto` element clips its own scrollport — so the padding has to sit on the
 * row, where it is inside the clip, rather than on the wrapper, which cannot release a
 * clip applied by its descendant. The wrapper's `py-1` keeps the bar's height unchanged.
 */
export function PhotoStrip({ items, onSelect }: PhotoStripProps) {
  const { t } = useTranslation("assets");

  if (items.length === 0) return null;

  return (
    <div
      data-testid="guide-photo-strip"
      // D13: pinned under the `h-12` header (Header.tsx:68) while the page scrolls, at a
      // z-index below the header's z-40. The -mx-4/px-4 pair lets items scroll under the
      // page's own px-4 edge while the bar's background stays opaque across the full width.
      className="sticky top-12 z-30 -mx-4 mb-3 border-b border-gray-100 bg-white/95 px-4 py-1 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95"
      role="list"
      aria-label={t("shotGuide.strip.ariaLabel")}
    >
      <div className="flex items-center gap-2 overflow-x-auto p-1">
        {items.map((item) => (
          <div key={item.shotId} role="listitem">
            <PhotoStripItem item={item} total={items.length} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
