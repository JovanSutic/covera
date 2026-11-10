/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/shared/ActionButton";
import { CopyMessageSection } from "@/components/shared/CopyMessageSection";
import { SectionCard } from "@/components/shared/SectionCard";
import {
  confirmAirbnbFiling,
  setIncidentPayout,
} from "@/lib/api/incidentClaims";
import { incidentQueryKey } from "@/lib/api/queries/incident";
import { incidentsQueryKey } from "@/lib/api/queries/incidents";
import {
  claimUrgency,
  countdownParts,
  getClaimDeadlineState,
} from "@/lib/helpers/claimDeadline";
import type { ClaimUrgency } from "@/lib/helpers/claimDeadline";
import { buildClaimMessage } from "@/lib/helpers/claimMessage";
import type { ClaimMessageLabels } from "@/lib/helpers/claimMessage";
import {
  claimTotals,
  formatCents,
  parseCentsFromInput,
} from "@/lib/helpers/claimMoney";
import { canFileClaim } from "@/lib/helpers/claimStatus";
import { cn } from "@/lib/utils";
import type { IncidentWithItems } from "@/api/generated/requests/types.gen";

/**
 * D24: the resolution centre's entry point. UNVERIFIED from this environment — no
 * network probe of airbnb.com was made. It is one constant precisely so that being
 * wrong costs one line, and the phase-8 browser pass is where it gets confirmed.
 */
const AIRBNB_RESOLUTION_CENTER_URL = "https://www.airbnb.com/resolutions";

/**
 * `buildClaimMessage` (phase 2) takes its sentences as i18n KEYS and resolves them
 * through the `t` it is handed. So these are keys, not translated strings, and the
 * map is a module constant rather than a per-render object.
 *
 * The item lines deliberately carry the asset's OWN name and room — free text the host
 * wrote — while the fixed sentences are translated. The host pastes this into an
 * English-language Airbnb form that Airbnb's support reads; a Turkish item name would
 * produce a claim nobody there can process (phase 2's note, unchanged).
 */
const MESSAGE_LABELS: ClaimMessageLabels = {
  header: "incidentPage.message.header",
  itemLine: "incidentPage.message.itemLine",
  totalLine: "incidentPage.message.totalLine",
  footer: "incidentPage.message.footer",
  typeLabels: {
    damage: "incidentPage.itemType.damage",
    theft: "incidentPage.itemType.theft",
  },
  missingEvidence: "incidentPage.message.missingEvidence",
};

/**
 * The urgency band → container classes. A total `Record` over phase 1's `ClaimUrgency`
 * union, not a chain of comparisons — for the same reason `EVIDENCE_LABEL_KEYS` in
 * `incidentEvidence.ts` is one (phase 1): a band the helper adds is a compile error
 * here rather than a container with no styling, and it keeps this file free of the
 * string comparisons invariant 9 forbids.
 *
 * `neutral` is unreachable in practice while the countdown is on screen (the band is
 * `soon` at the narrowest), but a `Record` has to cover every key.
 */
const URGENCY_CLASSES: Record<ClaimUrgency, string> = {
  emergency: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
  soon: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  normal: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
};

interface ClaimFilingPanelProps {
  incident: IncidentWithItems;
  /** For invalidating the apartment's list, which the reservation page also reads. */
  apartmentId: string;
  guestName: string;
  apartmentName: string;
  /** The page's clock, from `useClaimClock` (D32/D46). Never read here. */
  now: number;
}

/**
 * The filing panel — the spec's row 4, and the blueprint's View C.
 *
 * Four states, all of them reached by data rather than by a status string:
 *
 *   emergency   — `isEmergencyMode`. A sticky red banner, above everything else.
 *   ready       — `canFileClaim` (phase 1) says the claim may be filed.
 *   filing      — the confirm mutation is pending.
 *   filed       — `guestDeadlineTime !== null`. The countdown replaces the controls.
 *
 * "Filed" is the DEADLINE existing, not a status comparison: `confirmAirbnbFiling` sets
 * `guestResponseDeadlineAt` in the same write that files the claim, so the deadline is
 * the fact and the status string is a second way of saying it (phase 5's rule, reused).
 */
export function ClaimFilingPanel({
  incident,
  apartmentId,
  guestName,
  apartmentName,
  now,
}: ClaimFilingPanelProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();

  const totals = claimTotals(incident, incident.items);
  const deadline = getClaimDeadlineState(incident, now);
  const urgency = claimUrgency(incident, now);
  const isFiled = deadline.guestDeadlineTime !== null;
  const countdown = countdownParts(deadline.msUntilGuestDeadline);

  // Seeded from the subtotal: the common case is "ask for what the items are worth",
  // and the host edits it only when they want a different figure. A `useState`
  // initialiser runs once, so an item added after first paint does not overwrite a
  // figure the host has already edited — the right trade for a form field.
  const [amount, setAmount] = useState(() =>
    totals.requestedCents > 0 ? (totals.requestedCents / 100).toFixed(2) : "",
  );
  const parsedAmount = parseCentsFromInput(amount);

  const message = buildClaimMessage({
    guestName,
    apartmentName,
    items: incident.items,
    requestedCents: totals.requestedCents,
    t,
    labels: MESSAGE_LABELS,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: incidentQueryKey(incident.id) });
    queryClient.invalidateQueries({
      queryKey: incidentsQueryKey({ apartmentId }),
    });
  };

  const payoutMutation = useMutation({
    mutationFn: (cents: number) => setIncidentPayout(incident.id, cents),
    onSuccess: () => {
      invalidate();
      toast.success(t("incidentPage.filing.toasts.payoutSaved"));
    },
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("incidentPage.filing.toasts.payoutError"),
      );
    },
  });

  const filingMutation = useMutation({
    mutationFn: () => confirmAirbnbFiling(incident.id),
    onSuccess: (filed) => {
      // D52: the response is `Incident`, which has no `items` — the cache entry is an
      // `IncidentWithItems`. Merging keeps the items this panel is still rendering; a
      // bare `setQueryData(filed)` would blank the item list for a render and then
      // bring it back when the invalidation below resolves.
      if (filed) {
        queryClient.setQueryData<IncidentWithItems | undefined>(
          incidentQueryKey(incident.id),
          (previous) => (previous ? { ...previous, ...filed } : previous),
        );
      }

      invalidate();
      toast.success(t("incidentPage.filing.toasts.filed"));
    },
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("incidentPage.filing.toasts.fileError"),
      );
    },
  });

  return (
    <div className="space-y-4">
      {/* D18: sticky, saturated red, a pulsing icon — and deliberately NOT flashing.
          The blueprint asks for "sticky flashing red"; a large flashing region is a
          WCAG 2.2.2 hazard, so the pulse is on a small icon and the region is still.
          This is a named deviation and belongs in the PR. */}
      {incident.isEmergencyMode && (
        <div
          role="alert"
          className="sticky top-0 z-20 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-600 px-4 py-3 text-white shadow-lg dark:border-rose-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-semibold">
              {t("incidentPage.filing.emergency.title")}
            </p>
            <p className="mt-0.5 text-xs text-rose-50">
              {t("incidentPage.filing.emergency.body")}
            </p>
          </div>
        </div>
      )}

      <SectionCard title={t("incidentPage.filing.figures.title")}>
        <dl className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">
              {t("incidentPage.filing.figures.itemsSubtotal")}
            </dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">
              {formatCents(totals.itemsSubtotalCents)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">
              {totals.hasFinalFigure
                ? t("incidentPage.filing.figures.final")
                : t("incidentPage.filing.figures.provisional")}
            </dt>
            <dd className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCents(totals.requestedCents)}
            </dd>
          </div>
        </dl>

        {/* One controlled input and one button — deliberately not a react-hook-form
            form. There is no submit event and no field set, and invariant 8's rule is
            about forms. The "is this a usable amount" question is answered by phase 2's
            `parseCentsFromInput`, which is the same answer the add-item form gets. */}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              {t("incidentPage.filing.figures.valueHint")}
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label={t("incidentPage.filing.figures.valueHint")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </label>

          <ActionButton
            variant="neutral"
            size="md"
            label={t("incidentPage.filing.figures.save")}
            loading={payoutMutation.isPending}
            // `null` is "not a usable amount" (empty, or not a number) — the save is
            // withheld rather than sending 0 for a figure the host has not stated.
            disabled={parsedAmount === null}
            onClick={() => {
              if (parsedAmount === null) return;

              payoutMutation.mutate(parsedAmount);
            }}
          />
        </div>
      </SectionCard>

      <CopyMessageSection
        title={t("incidentPage.filing.message.title")}
        message={message}
        copyLabel={t("incidentPage.filing.message.copy")}
        copySuccess={t("incidentPage.filing.toasts.copied")}
        copyError={t("incidentPage.filing.toasts.copyError")}
        action={
          <a
            href={AIRBNB_RESOLUTION_CENTER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {t("incidentPage.filing.openResolutionCenter")}
          </a>
        }
      />

      {!isFiled && (
        <SectionCard title={t("incidentPage.filing.confirm")}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {canFileClaim(incident)
              ? t("incidentPage.filing.confirmHint")
              : t("incidentPage.filing.notReadyHint")}
          </p>

          <div className="mt-4">
            <ActionButton
              variant="primary"
              size="md"
              icon={<Send className="h-4 w-4 shrink-0" />}
              label={
                filingMutation.isPending
                  ? t("incidentPage.filing.confirming")
                  : t("incidentPage.filing.confirm")
              }
              loading={filingMutation.isPending}
              // D16-adjacent: phase 1 decides whether the claim may be filed. A control
              // whose own precondition the page has not met is the failure this prevents.
              disabled={!canFileClaim(incident)}
              onClick={() => filingMutation.mutate()}
            />
          </div>
        </SectionCard>
      )}

      {isFiled && (
        <SectionCard title={t("incidentPage.filing.countdown.title")}>
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3",
              URGENCY_CLASSES[urgency],
            )}
          >
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />

            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {deadline.isGuestResponseOverdue
                  ? t("incidentPage.filing.countdown.guestOverdue")
                  : t("incidentPage.filing.countdown.guest", {
                      hours: countdown.hours,
                      minutes: countdown.minutes,
                    })}
              </p>

              <p className="text-gray-500 dark:text-gray-400">
                {deadline.isAircoverOverdue
                  ? t("incidentPage.filing.countdown.aircoverOverdue")
                  : t("incidentPage.filing.countdown.aircover", {
                      days: deadline.daysUntilAircover,
                    })}
              </p>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
