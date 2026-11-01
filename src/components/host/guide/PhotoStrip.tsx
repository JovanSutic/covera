import { useTranslation } from "react-i18next";

import type { StripItem } from "@/lib/helpers/guideFlow";
import { PhotoStripItem } from "./PhotoStripItem";

interface PhotoStripProps {
  items: StripItem[];
  /**
   * How many PHOTOS the guide has — the count the items' position labels interpolate.
   * It is NOT `items.length`, which is now one larger (the confirmation, prep §3).
   */
  photoCount: number;
  onSelect: (index: number) => void;
}

/**
 * The Photos transparency list (prep §1, §3): every step the apartment requires plus the
 * confirmation, as a horizontally scrollable row of small photo components, blank until
 * taken, with the current step highlighted and an already-done step the host is looking
 * at marked active.
 *
 * It holds no state and computes no reachability (invariant 10): `items` arrives from
 * `inspectionGuideSteps()` and `onSelect` is the flow's `selectStep`.
 *
 * The row that scrolls carries `p-1` and the wrapper carries `py-1`: the current item's
 * ring is a box-shadow painted 3px outside its box (`ring-2` + `ring-offset-1`), and an
 * `overflow-x-auto` element clips its own scrollport — so the padding has to sit on the
 * row, where it is inside the clip, rather than on the wrapper, which cannot release a
 * clip applied by its descendant. The wrapper's `py-1` keeps the bar's height unchanged.
 */
export function PhotoStrip({ items, photoCount, onSelect }: PhotoStripProps) {
  const { t } = useTranslation("assets");

  if (items.length === 0) return null;

  return (
    <div
      data-testid="guide-photo-strip"
      className="sticky top-12 z-30 -mx-4 mb-3 border-b border-gray-100 bg-white/95 px-4 py-1 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95"
      role="list"
      aria-label={t("shotGuide.strip.ariaLabel")}
    >
      <div className="flex items-center gap-2 overflow-x-auto p-1">
        {items.map((item) => (
          <div key={item.shotId} role="listitem">
            <PhotoStripItem
              item={item}
              total={item.isConfirm ? 1 : photoCount}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
