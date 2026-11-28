/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/shared/ActionButton";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusChip } from "@/components/shared/StatusChip";
import {
  specialAccessListQueryKey,
  useSpecialAccessList,
} from "@/lib/api/queries/specialAccess";
import {
  createSpecialAccess,
  revokeSpecialAccess,
} from "@/lib/api/specialAccess";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { absoluteUrl } from "@/lib/helpers/absoluteUrl";
import { getActionWindows } from "@/lib/helpers/actionWindows";
import type {
  ActionWindowSubject,
  SiblingStay,
} from "@/lib/helpers/actionWindows";
import type { ClaimTone } from "@/lib/helpers/claimStatus";
import {
  grantState,
  grantStateLabelKey,
  isRevocable,
  type GrantState,
} from "@/lib/helpers/specialAccessState";
import { appPaths, buildPath } from "@/lib/router";

interface ReservationLinksSectionProps {
  /** The reservation the link is scoped to. */
  reservationId: string;
  /** For the apartment's reservation list invalidation after a revoke (invariant 6). */
  apartmentId: string;
  /** D14/D13: the stay itself — `status` and the four datetimes the windows are read from. */
  reservation: ActionWindowSubject;
  /** D14: the apartment's other stays, which bound buttons 2 and 4 in time. */
  siblings: readonly SiblingStay[];
  /**
   * The page's single clock, passed in rather than read here (invariant 10): the
   * reservation page already computes one `now`, and a second `Date.now()` in the same
   * render is a second answer to the same question.
   */
  now: number;
}

/**
 * The chip's colour per grant state. `StatusChip` owns the tone→classes map, so this is the
 * only thing a caller decides: what a state MEANS. Active is the only state a host can still
 * act on; used is a fact, not a fault; expired and revoked are both over.
 */
const GRANT_TONES: Record<GrantState, ClaimTone> = {
  active: "success",
  used: "info",
  revoked: "danger",
  expired: "neutral",
};

/**
 * Prep 5 / the Feature section: a host with several apartments cannot always be on site,
 * so they mint a short-lived link for a photographer or a cleaner who has no account.
 *
 * D17/D18: this section owns BOTH access-link affordances. The guest inspection link was
 * moved here from the actions bar, and beside it sits the special photo access grant. They
 * are the same kind of thing — a link for someone who has no account — so they are one
 * section with two windows, not two sections.
 *
 * D19: BOTH buttons mint the same `inspection_proof` grant. They differ only in WHEN each
 * may be issued (the window) and in what their copy explains.
 *
 * D18: ONLY `inspection_proof` is offered. `damage_evidence` is in the API enum but no
 * endpoint accepts it, so a link minted with it would open nothing.
 *
 * D6: the LIST is the source of truth, not this component's memory. `GET
 * /special-access?reservationId=…` returns every grant for the stay — including the ones
 * minted in a previous session — so a reload no longer hides a live link, and any listed
 * grant can be revoked. Nothing is held in state: the create mutation refetches the list
 * instead of remembering the grant it just made (invariant 7).
 *
 * The copy affordance is `IncidentFieldLink`'s (D22): a readonly input, a copy button,
 * and a 2 s tick that clears the "Copied" label.
 *
 * Invariant 9: every enable rule and every tooltip reason comes from `getActionWindows`.
 * Neither button does its own arithmetic.
 */
export function ReservationLinksSection({
  reservationId,
  apartmentId,
  reservation,
  siblings,
  now,
}: ReservationLinksSectionProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Invariant 9: the four windows from the ONE helper, computed from the page's own clock.
  const windows = getActionWindows({ reservation, siblings, now });

  const listQuery = useSpecialAccessList(reservationId);

  const invalidateList = () => {
    // D6: the new grant appears because this read is refetched, not because the
    // component remembered it — and `SPECIAL_ACCESS_CREATE` is nothing's read key.
    queryClient.invalidateQueries({
      queryKey: specialAccessListQueryKey(reservationId),
    });
  };

  // D19: the two buttons differ in their window and their copy, never in what they mint.
  const mintGrant = () =>
    createSpecialAccess({ scope: "inspection_proof", reservationId });

  const onGrantCreated = () => {
    invalidateList();
    toast.success(t("reservationPage.links.created"));
  };

  const onGrantError = (error: any) => {
    toast.error(error?.error?.message || t("reservationPage.links.createError"));
  };

  const guestLinkMutation = useMutation({
    mutationFn: mintGrant,
    onSuccess: onGrantCreated,
    onError: onGrantError,
  });

  const specialAccessMutation = useMutation({
    mutationFn: mintGrant,
    onSuccess: onGrantCreated,
    onError: onGrantError,
  });

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => revokeSpecialAccess(accessId),
    onSuccess: () => {
      invalidateList();
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });
      toast.success(t("reservationPage.links.revoked"));
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || t("reservationPage.links.revokeError"));
    },
  });

  // The tick is a courtesy, exactly as in `IncidentFieldLink`: it clears the "Copied"
  // label without the host having to look at it. Not a timer in the data path.
  useEffect(() => {
    if (!copiedId) return;

    const timer = window.setTimeout(() => setCopiedId(null), 2_000);

    return () => window.clearTimeout(timer);
  }, [copiedId]);

  // D16: the accessId travels as a query parameter — the transport the backend reads. The
  // URL is DERIVED from the grant every render and never stored: a stored one would outlive
  // the `window.location.origin` it was built from.
  const linkUrl = (accessId: string) =>
    absoluteUrl(
      buildPath(appPaths.inspectionGuide, { apartmentId, reservationId }),
      window.location.origin,
    ) + `?accessId=${accessId}`;

  const copyLink = async (accessId: string) => {
    try {
      await navigator.clipboard.writeText(linkUrl(accessId));
      setCopiedId(accessId);
    } catch {
      toast.error(t("reservationPage.links.copyError"));
    }
  };

  const grants = listQuery.data ?? [];

  const guestLinkLabel = t("reservationPage.links.create");
  const specialAccessLabel = t("reservationPage.links.grantSpecialAccess");

  return (
    <SectionCard title={t("reservationPage.links.title")}>
      {/* Button 2 (D17). Its window is the room the guest's own inspection needs: the
          link opens once the reservation is COVERED and closes an hour past check-in. */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("reservationPage.links.intro")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton
          variant="primary"
          size="md"
          icon={<Link2 className="w-4 h-4 shrink-0" />}
          label={
            guestLinkMutation.isPending
              ? t("reservationPage.links.creating")
              : guestLinkLabel
          }
          loading={guestLinkMutation.isPending}
          disabled={!windows.guestInspectionLink.enabled}
          tooltip={t(windows.guestInspectionLink.tooltipKey)}
          tooltipLabel={guestLinkLabel}
          onClick={() => guestLinkMutation.mutate()}
        />
      </div>

      {/* Button 4 (D18). The cleaner collects the PRE-reservation state, so its window is
          the gap between the previous stay's check-out and this stay's check-in. */}
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {t("reservationPage.links.specialAccessIntro")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton
          variant="primary"
          size="md"
          icon={<Camera className="w-4 h-4 shrink-0" />}
          label={
            specialAccessMutation.isPending
              ? t("reservationPage.links.creating")
              : specialAccessLabel
          }
          loading={specialAccessMutation.isPending}
          disabled={!windows.specialPhotoAccess.enabled}
          tooltip={t(windows.specialPhotoAccess.tooltipKey)}
          tooltipLabel={specialAccessLabel}
          onClick={() => specialAccessMutation.mutate()}
        />
      </div>

      {listQuery.isLoading && (
        <div className="mt-4 flex items-center" aria-busy="true">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
        </div>
      )}

      {listQuery.isError && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {t("reservationPage.links.listError")}
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && grants.length > 0 && (
        <>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("reservationPage.links.expiresHint")}
          </p>

          <ul className="mt-3 space-y-3">
            {grants.map((grant) => {
              const state = grantState(grant, now);
              const revoking =
                revokeMutation.isPending &&
                revokeMutation.variables === grant.accessId;

              return (
                <li key={grant.id} className="flex flex-wrap items-center gap-2">
                  <input
                    readOnly
                    value={linkUrl(grant.accessId)}
                    aria-label={t("reservationPage.links.label")}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                  />

                  <StatusChip
                    tone={GRANT_TONES[state]}
                    label={t(grantStateLabelKey(state))}
                  />

                  <ActionButton
                    variant={copiedId === grant.accessId ? "neutral" : "info"}
                    size="sm"
                    icon={
                      copiedId === grant.accessId ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0" />
                      )
                    }
                    label={
                      copiedId === grant.accessId
                        ? t("reservationPage.links.copied")
                        : t("reservationPage.links.copy")
                    }
                    onClick={() => copyLink(grant.accessId)}
                  />

                  {/* D6: only an active grant is worth revoking — the rest are already
                      dead, and a revoke button on them would promise nothing. */}
                  {isRevocable(state) && (
                    <ActionButton
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5 shrink-0" />}
                      label={
                        revoking
                          ? t("reservationPage.links.revoking")
                          : t("reservationPage.links.revoke")
                      }
                      loading={revoking}
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(grant.accessId)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
