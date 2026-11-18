import { useTranslation } from "react-i18next";

import { AccessLink } from "@/components/router/AccessLink";
import { appPaths } from "@/lib/router";

/**
 * D19: ONE link, mounted by every state of the reservation's claim section and by the
 * claim page. The host needs the procedure before a claim exists — that is when the
 * immediate-response steps still change the outcome — so it is deliberately not
 * conditional on a claim or on its status.
 */
export function ClaimGuideLink() {
  const { t } = useTranslation("host");

  return (
    <p className="mt-3">
      <AccessLink
        to={appPaths.damageClaimGuide}
        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        {t("incidentPage.guide.link")}
      </AccessLink>
    </p>
  );
}