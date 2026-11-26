/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/shared/ActionButton";
import { SectionCard } from "@/components/shared/SectionCard";
import {
  createSpecialAccess,
  revokeSpecialAccess,
} from "@/lib/api/specialAccess";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { absoluteUrl } from "@/lib/helpers/absoluteUrl";
import { appPaths, buildPath } from "@/lib/router";

interface ReservationLinksSectionProps {
  /** The reservation the link is scoped to. */
  reservationId: string;
  /** For the apartment's reservation list invalidation after a revoke (invariant 6). */
  apartmentId: string;
}

/**
 * Prep 5 / the Feature section: a host with several apartments cannot always be on site,
 * so they mint a short-lived link for a photographer or a cleaner who has no account.
 *
 * D18: ONLY `inspection_proof` is offered. `damage_evidence` is in the API enum but no
 * endpoint accepts it, so a link minted with it would open nothing.
 *
 * D23: the link lives in this component's state for the session only. There is no list
 * endpoint, so a link minted in a previous session cannot be shown or revoked — the same
 * limit D50 records for cleaner tokens. The revoke button is therefore offered only for
 * the link this session created.
 *
 * The copy affordance is `IncidentFieldLink`'s (D22): a readonly input, a copy button,
 * and a 2 s tick that clears the "Copied" label.
 */
export function ReservationLinksSection({
  reservationId,
  apartmentId,
}: ReservationLinksSectionProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();
  const [link, setLink] = useState<{ accessId: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      createSpecialAccess({ scope: "inspection_proof", reservationId }),
    onSuccess: (access) => {
      if (!access) return;

      // D16: the accessId travels as a query parameter — the transport the backend reads.
      const url =
        absoluteUrl(
          buildPath(appPaths.inspectionGuide, { apartmentId, reservationId }),
          window.location.origin,
        ) + `?accessId=${access.accessId}`;

      setLink({ accessId: access.accessId, url });
      queryClient.invalidateQueries({
        queryKey: QUERY_ACTIONS.SPECIAL_ACCESS_CREATE,
      });
      toast.success(t("reservationPage.links.created"));
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || t("reservationPage.links.createError"));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => revokeSpecialAccess(accessId),
    onSuccess: () => {
      setLink(null);
      queryClient.invalidateQueries({
        queryKey: QUERY_ACTIONS.SPECIAL_ACCESS_CREATE,
      });
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
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 2_000);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      toast.error(t("reservationPage.links.copyError"));
    }
  };

  return (
    <SectionCard title={t("reservationPage.links.title")}>
      {link === null ? (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("reservationPage.links.intro")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton
              variant="primary"
              size="md"
              icon={<Link2 className="w-4 h-4 shrink-0" />}
              label={
                createMutation.isPending
                  ? t("reservationPage.links.creating")
                  : t("reservationPage.links.create")
              }
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            />
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t("reservationPage.links.expiresHint")}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={link.url}
              aria-label={t("reservationPage.links.label")}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
            />

            <ActionButton
              variant={copied ? "neutral" : "info"}
              size="sm"
              icon={
                copied ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                )
              }
              label={
                copied
                  ? t("reservationPage.links.copied")
                  : t("reservationPage.links.copy")
              }
              onClick={copyLink}
            />

            <ActionButton
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" />}
              label={
                revokeMutation.isPending
                  ? t("reservationPage.links.revoking")
                  : t("reservationPage.links.revoke")
              }
              loading={revokeMutation.isPending}
              disabled={revokeMutation.isPending}
              onClick={() => revokeMutation.mutate(link.accessId)}
            />
          </div>
        </>
      )}
    </SectionCard>
  );
}