import { useTranslation } from "react-i18next";
import { Building2, Mail, Calendar, MapPin } from "lucide-react";

import Typography from "@/components/Typography";
import { BackLink } from "@/components/shared/BackLink";
import { appPaths } from "@/lib/router";
import type { ApartmentWithLocation } from "@/api/generated/requests/types.gen";
import type { ReservationWithInspection } from "@/api/generated/requests/types.gen";

interface ReservationHeaderProps {
  reservation: ReservationWithInspection;
  /**
   * D15: looked up from `useApartmentsHost`, NOT fetched here. `ReservationWithInspection`
   * carries only `apartmentId`, and the `host` section route already prefetches the
   * apartment list on every navigation into the section — so this is a cache read.
   * `undefined` until it resolves, and also when the list has not loaded at all.
   */
  apartment?: ApartmentWithLocation;
}

function formatInstant(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return fallback;

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * The reservation page's header (prep §3). It carries what the guest's name alone
 * cannot: who the guest is, when they arrive, and — the reason it exists — WHICH
 * apartment this is, because the host shares this link and the guest opening it has
 * no other way to know.
 *
 * This is why the page has no separate Guest section (prep §3, D16): the name, the
 * email and the check-in are all here.
 */
export function ReservationHeader({
  reservation,
  apartment,
}: ReservationHeaderProps) {
  const { t } = useTranslation("host");

  return (
    <div className="rounded-xl bg-white p-4 dark:bg-gray-900/50">
      <div className="mb-3">
        {/* `AccessLink`, not `Link`, because `BackLink` uses it: it keeps the role
            guard and the 100 ms hover preload the apartment page's back link has.
            The destination comes from the reservation, not from the URL — the two
            are the same id, and this one is the authoritative copy. */}
        <BackLink
          to={appPaths.hostApartment}
          params={{ id: reservation.apartmentId }}
          label={t("reservationPage.backToApartment")}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Typography
            type="h2"
            className="font-semibold text-gray-900 dark:text-white"
          >
            {reservation.guestName}
          </Typography>

          <div className="mt-1.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <Typography
                type="body-sm"
                className="truncate text-gray-500 dark:text-gray-400"
              >
                {reservation.guestEmail || t("reservationPage.notAvailable")}
              </Typography>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <Typography
                type="body-sm"
                className="text-gray-500 dark:text-gray-400"
              >
                {formatInstant(
                  reservation.alternativeCheckInDatetime ||
                    reservation.checkInDatetime,
                  t("reservationPage.notAvailable"),
                )}
              </Typography>
            </div>
          </div>
        </div>

        {/* The apartment block. Rendered only when the lookup resolved: an
            "undefined" address would be worse than no address. */}
        {apartment && (
          <div className="flex items-center gap-3.5 sm:justify-end">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <Typography
                type="body-sm"
                className="font-medium text-gray-900 dark:text-white"
              >
                {apartment.name}
              </Typography>
              <div className="mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <Typography
                  type="body-sm"
                  className="truncate text-gray-500 dark:text-gray-400"
                >
                  {apartment.location
                    ? `${apartment.location.name}, ${apartment.address}`
                    : apartment.address}
                </Typography>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
