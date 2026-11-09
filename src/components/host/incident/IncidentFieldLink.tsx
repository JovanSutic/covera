/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/shared/ActionButton";
import { reissueItemToken } from "@/lib/api/incidentClaims";
import { incidentQueryKey } from "@/lib/api/queries/incident";
import { canReissueItemLink, isItemLinkLive } from "@/lib/helpers/claimStatus";
import { appPaths, buildPath } from "@/lib/router";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

interface IncidentFieldLinkProps {
  incidentId: string;
  /**
   * `IncidentItem`, NOT `IncidentItemWithToken`. The token is a separate prop because
   * item objects read back from the API do not have one (D50) — typing this as the
   * `…WithToken` variant would invite the page to cast its way past exactly the fact
   * this component exists to handle.
   */
  item: IncidentItem;
  /** D50: `null` for every item read back from the API — the detail response has no token. */
  token: string | null;
  /** The page's clock, read once per page (D46). */
  now: number;
  onTokenIssued: (token: string) => void;
}

/**
 * The cleaner's link for ONE item.
 *
 * D50 is the whole shape of this component: `cleanerToken` is returned by the item
 * create and by reissue, and by nothing else. `GET /incidents/{id}` answers with
 * `IncidentItem`, which has no token field at all. So `token === null` is the NORMAL
 * state on a page load, not an error — and this component's job in that state is to
 * say what the link's status is and offer the reissue path, not to render a copy
 * button for a value it does not have.
 *
 * D17: reissue is offered only for an item whose link lapsed while still collectable
 * (`canReissueItemLink`). Every other case — already collected, never generated — gets
 * copy that describes the state instead of a control the API would refuse.
 */
export function IncidentFieldLink({
  incidentId,
  item,
  token,
  now,
  onTokenIssued,
}: IncidentFieldLinkProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const link = token ? buildPath(appPaths.fieldIncident, { token }) : null;
  const isLive = token !== null && isItemLinkLive(item, now);
  const canReissue = canReissueItemLink(item, now);

  const reissueMutation = useMutation({
    mutationFn: () => reissueItemToken(incidentId, item.id),
    onSuccess: (reissued) => {
      if (reissued?.cleanerToken) onTokenIssued(reissued.cleanerToken);

      queryClient.invalidateQueries({ queryKey: incidentQueryKey(incidentId) });
      toast.success(t("incidentPage.fieldLink.toasts.reissued"));
    },
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("incidentPage.fieldLink.toasts.reissueError"),
      );
    },
  });

  // The tick is a courtesy: it clears the "Copied" label without the host having to
  // look at it. Not a timer in the data path — nothing here refetches.
  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 2_000);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t("incidentPage.fieldLink.toasts.copied"));
    } catch {
      toast.error(t("incidentPage.fieldLink.toasts.copyError"));
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        {isLive
          ? t("incidentPage.fieldLink.live")
          : token
            ? t("incidentPage.fieldLink.usedOrExpired")
            : t("incidentPage.fieldLink.notInThisSession")}
      </span>

      {link && (
        <>
          <input
            readOnly
            value={link}
            aria-label={t("incidentPage.fieldLink.label")}
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
                ? t("incidentPage.fieldLink.copied")
                : t("incidentPage.fieldLink.copy")
            }
            onClick={copyLink}
          />
        </>
      )}

      {canReissue && (
        <ActionButton
          variant="neutral"
          size="sm"
          label={t("incidentPage.fieldLink.reissue")}
          loading={reissueMutation.isPending}
          onClick={() => reissueMutation.mutate()}
        />
      )}
    </div>
  );
}
