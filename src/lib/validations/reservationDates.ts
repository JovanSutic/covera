import { z } from "zod";

/**
 * D12: the rules for the two alternative date fields, extracted from
 * `CreateReservationForm`'s schema so the reservation page's inline editor and the
 * create form cannot disagree. The strings are i18n KEYS, resolved by the caller's
 * `t()` — the same convention `CreateReservationForm` already uses (its messages
 * are `"createReservationForm.validation.*"` literals).
 *
 * Keys live under `reservationPage.validation.*` because the reservation page is
 * the surface that renders them.
 */
export const ALTERNATIVE_DATE_MESSAGE_KEYS = {
  altCheckInFuture: "reservationPage.validation.altCheckInFuture",
  altCheckOutFuture: "reservationPage.validation.altCheckOutFuture",
  altCheckOutAfterAltCheckIn:
    "reservationPage.validation.altCheckOutAfterAltCheckIn",
  checkInFuture: "reservationPage.validation.checkInFuture",
} as const;

/**
 * Both fields are optional — clearing them is how a host removes an alternative —
 * but a non-empty one must be in the future.
 *
 * The date is compared as an instant, not as a string: `datetime-local` produces
 * `YYYY-MM-DDTHH:mm` with no zone, and `new Date(...)` reads that as local time,
 * which is what the input meant. `CreateReservationForm` compares the same way.
 */
const optionalFutureDatetime = (messageKey: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value || isFutureDatetime(value), messageKey);

export function isFutureDatetime(value: string, now = Date.now()): boolean {
  const parsed = new Date(value).getTime();
  // An unparseable date is NOT "future": it must fail, not pass silently.
  return Number.isFinite(parsed) && parsed > now;
}

export function isAfterDatetime(later: string, earlier: string): boolean {
  const laterMs = new Date(later).getTime();
  const earlierMs = new Date(earlier).getTime();

  if (!Number.isFinite(laterMs) || !Number.isFinite(earlierMs)) return false;

  return laterMs > earlierMs;
}

export const alternativeDatesSchema = z
  .object({
    alternativeCheckInDatetime: optionalFutureDatetime(
      ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckInFuture,
    ),
    alternativeCheckOutDatetime: optionalFutureDatetime(
      ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckOutFuture,
    ),
  })
  .refine(
    (data) => {
      // Only a COMPLETE pair can be ordered. One field alone is legal: a host may
      // record a new check-in now and the check-out later.
      if (
        !data.alternativeCheckInDatetime ||
        !data.alternativeCheckOutDatetime
      ) {
        return true;
      }

      return isAfterDatetime(
        data.alternativeCheckOutDatetime,
        data.alternativeCheckInDatetime,
      );
    },
    {
      message: ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckOutAfterAltCheckIn,
      path: ["alternativeCheckOutDatetime"],
    },
  );

export type AlternativeDatesValues = z.infer<typeof alternativeDatesSchema>;

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in LOCAL time, not an ISO instant. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";

  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** The inverse: a local `datetime-local` value back to the ISO instant the API takes. */
export function fromDatetimeLocalValue(value: string | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return date.toISOString();
}
