import { useTranslation } from "react-i18next";
import { Package, TriangleAlert } from "lucide-react";

import { StatusChip } from "@/components/shared/StatusChip";
import { formatCents } from "@/lib/helpers/claimMoney";
import { itemStatusCopy } from "@/lib/helpers/claimStatus";
import {
  activePhotoCount,
  evidenceLabelKey,
  missingPhotoTypes,
  requiredPhotoTypes,
} from "@/lib/helpers/incidentEvidence";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

interface IncidentItemListProps {
  items: readonly IncidentItem[];
}

/**
 * The claim's items, one row each.
 *
 * It reads phase 1's vocabulary and renders it — it does NOT decide what a status
 * means (invariant 9). `itemStatusCopy` returns the tone and the label key;
 * `requiredPhotoTypes` / `missingPhotoTypes` / `activePhotoCount` answer "what is
 * still needed". A second `Record` of label keys here, or an `=== "complete"`, is
 * drift.
 *
 * The room comes from `assets:roomLocations.*`: `roomLocations` is an `assets.json`
 * key and this component's `t` is bound to `host`, so the namespace prefix is
 * load-bearing — without it the row shows the raw key string. `ReservationPhotoGallery`
 * carries the same prefix for the same reason.
 */
export function IncidentItemList({ items }: IncidentItemListProps) {
  const { t } = useTranslation("host");

  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3">
        <Package className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("incidentPage.items.empty")}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const copy = itemStatusCopy(item.status);
        const required = requiredPhotoTypes(item.type);
        const missing = missingPhotoTypes(item);

        return (
          <li
            key={item.id}
            className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.asset.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {t(`assets:roomLocations.${item.asset.roomLocation}`, {
                    defaultValue: item.asset.roomLocation,
                  })}
                  {" · "}
                  {t(`incidentPage.itemType.${item.type}`)}
                  {" · "}
                  {formatCents(item.estimatedPlaceholderValueCents)}
                </p>
              </div>

              <StatusChip tone={copy.tone} label={t(copy.labelKey)} />
            </div>

            {/* What the evidence must contain for THIS item's type (D21). The list is
                phase 1's answer, not a second copy of the backend's rule. */}
            <div className="mt-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("incidentPage.items.views")}
              </p>

              <ul className="mt-1 space-y-0.5">
                {required.map((type) => {
                  const collected = activePhotoCount(item, type) > 0;

                  return (
                    <li
                      key={type}
                      className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
                    >
                      {!collected && (
                        <TriangleAlert className="h-3 w-3 shrink-0 text-amber-500" />
                      )}
                      <span
                        className={
                          collected ? "" : "text-gray-500 dark:text-gray-400"
                        }
                      >
                        {t(evidenceLabelKey(type))}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {missing.length === 0
                  ? t("incidentPage.items.viewsComplete")
                  : t("incidentPage.items.viewsMissing", { count: missing.length })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}