/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ActionButton } from "@/components/shared/ActionButton";
import { setIncidentItemValue } from "@/lib/api/incidentClaims";
import { incidentQueryKey } from "@/lib/api/queries/incident";
import { incidentsQueryKey } from "@/lib/api/queries/incidents";
import { parsePositiveCentsFromInput } from "@/lib/helpers/claimMoney";
import { cn } from "@/lib/utils";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

interface IncidentItemValueEditorProps {
  incidentId: string;
  /** For invalidating the apartment's list, which the reservation page also reads. */
  apartmentId: string;
  items: readonly IncidentItem[];
  /** D12: `isIncidentEditable(incident)` — never a status comparison made here. */
  editable: boolean;
}

/**
 * Issue 4 / D10: the claim's figures mirror the claim's assets.
 *
 * One row per item, each with its OWN pending state (D13): there is no batch route, and a
 * row that fails must not look like it took its neighbours with it. The value is held per
 * row for the same reason — typing in the third asset must not re-render the first two
 * with a stale string.
 *
 * It replaces the single "amount to request" input; `finalPayoutRequestedCents` is no
 * longer written from this screen. `claimTotals` still reports an older figure if one
 * exists, which is why the panel above keeps its two-line summary.
 */
export function IncidentItemValueEditor({
  incidentId,
  apartmentId,
  items,
  editable,
}: IncidentItemValueEditorProps) {
  const { t } = useTranslation("host");

  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {t("incidentPage.filing.figures.noItems")}
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <IncidentItemValueRow
            incidentId={incidentId}
            apartmentId={apartmentId}
            item={item}
            editable={editable}
          />
        </li>
      ))}
    </ul>
  );
}

function IncidentItemValueRow({
  incidentId,
  apartmentId,
  item,
  editable,
}: {
  incidentId: string;
  apartmentId: string;
  item: IncidentItem;
  editable: boolean;
}) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();

  // The stored figure, always as a decimal string. A stored 0 therefore shows "0.00",
  // which is exactly the state issue 4 describes: an asset added, a value of zero, and
  // the input already complaining.
  const [value, setValue] = useState(() =>
    (item.estimatedPlaceholderValueCents / 100).toFixed(2),
  );

  const cents = parsePositiveCentsFromInput(value);
  const invalid = cents === null;

  const mutation = useMutation({
    mutationFn: (next: number) => setIncidentItemValue(incidentId, item.id, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentQueryKey(incidentId) });
      queryClient.invalidateQueries({
        queryKey: incidentsQueryKey({ apartmentId }),
      });
      toast.success(t("incidentPage.filing.figures.saved"));
    },
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("incidentPage.filing.toasts.payoutError"),
      );
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
          {item.asset.name}
        </span>

        <input
          inputMode="decimal"
          value={value}
          disabled={!editable}
          onChange={(event) => setValue(event.target.value)}
          aria-label={t("incidentPage.filing.figures.assetValue", {
            asset: item.asset.name,
          })}
          aria-invalid={invalid}
          className={cn(
            "w-28 rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-950 dark:text-gray-100",
            invalid
              ? "border-rose-400 dark:border-rose-700"
              : "border-gray-300 dark:border-gray-700",
          )}
        />

        {editable && (
          <ActionButton
            variant="neutral"
            size="sm"
            label={t("incidentPage.filing.figures.save")}
            loading={mutation.isPending}
            disabled={invalid}
            onClick={() => {
              if (cents === null) return;

              mutation.mutate(cents);
            }}
          />
        )}
      </div>

      {editable && invalid && (
        <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">
          {t("incidentPage.filing.figures.invalid")}
        </p>
      )}
    </div>
  );
}
