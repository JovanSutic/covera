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
  altCheckInTooLate: "reservationPage.validation.altCheckInTooLate",
  altCheckOutTooLate: "reservationPage.validation.altCheckOutTooLate",
} as const;

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

/** D14: how far past the booked time an alternative may move a stay. */
export const ALTERNATIVE_MAX_LATENESS_HOURS = 8;

/**
 * D14: the cap, as an epoch-ms instant. Returns `null` when the booked value is missing or
 * unparseable — an unknown baseline cannot produce a bound, and inventing one would either
 * block every alternative or permit every one.
 */
export function latestAlternativeTime(
  bookedDatetime: string | null | undefined,
): number | null {
  if (!bookedDatetime) return null;

  const booked = new Date(bookedDatetime).getTime();
  if (!Number.isFinite(booked)) return null;

  return booked + ALTERNATIVE_MAX_LATENESS_HOURS * 60 * 60 * 1000;
}

/**
 * The same bound as a `datetime-local` value for the input's `max` attribute (prep §8:
 * "the values in the date input should also permit this as well"). `null` when there is no
 * baseline, which the caller renders as "no `max`".
 */
export function latestAlternativeLocalValue(
  bookedDatetime: string | null | undefined,
): string | null {
  const latest = latestAlternativeTime(bookedDatetime);
  if (latest === null) return null;

  return toDatetimeLocalValue(new Date(latest).toISOString());
}

/**
 * D13: the schema is built per-reservation, because the 8h cap (D14) is measured from the
 * BOOKED times and those only exist once the reservation is loaded. A module-level const
 * could not see them.
 *
 * The cap is applied per field, before the pairing refine, so a too-late check-out is
 * reported against the field the host typed in rather than against the pair.
 */
export function createAlternativeDatesSchema({
  checkInDatetime,
  checkOutDatetime,
}: {
  checkInDatetime: string | null | undefined;
  checkOutDatetime: string | null | undefined;
}) {
  const optionalBoundedDatetime = (
    booked: string | null | undefined,
    futureKey: string,
    tooLateKey: string,
  ) =>
    z
      .string()
      .optional()
      .refine((value) => !value || isFutureDatetime(value), futureKey)
      .refine((value) => {
        if (!value) return true;

        const latest = latestAlternativeTime(booked);
        // No usable baseline: the future rule above is the only bound available.
        if (latest === null) return true;

        const parsed = new Date(value).getTime();
        // An unparseable date is the future rule's failure, not this one's.
        if (!Number.isFinite(parsed)) return true;

        return parsed <= latest;
      }, tooLateKey);

  return z
    .object({
      alternativeCheckInDatetime: optionalBoundedDatetime(
        checkInDatetime,
        ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckInFuture,
        ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckInTooLate,
      ),
      alternativeCheckOutDatetime: optionalBoundedDatetime(
        checkOutDatetime,
        ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckOutFuture,
        ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckOutTooLate,
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
}

export type AlternativeDatesSchema = ReturnType<
  typeof createAlternativeDatesSchema
>;

/** Unchanged name and shape: the form is still typed off the schema's inferred output. */
export type AlternativeDatesValues = z.infer<AlternativeDatesSchema>;

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
