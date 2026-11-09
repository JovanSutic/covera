import type { Incident, IncidentItem } from "@/api/generated/requests/types.gen";

/**
 * D31: money formatting, defined once. Every value this feature shows arrives as an
 * INTEGER number of cents — `placeholderTotalAmountCents`,
 * `finalPayoutRequestedCents`, `estimatedPlaceholderValueCents`,
 * `approximateValueCents`. Nothing in the repo formats cents today (`ApartmentHeader`
 * prints the bare currency code), so this is the first and only place it happens, and
 * the figures module, the item rows and the copy block all read it.
 *
 * `EUR` is the default because every existing apartment in this app is priced in EUR
 * (`ApartmentHeader` renders `apartment.currency` beside a euro-formatted total).
 */
export const DEFAULT_CURRENCY = "EUR";

export function formatCents(cents: number, currency: string = DEFAULT_CURRENCY): string {
  if (!Number.isFinite(cents)) return "";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export interface ClaimTotals {
  /** What the items' provisional valuations add up to, in cents. */
  itemsSubtotalCents: number;
  /** What the host is asking for: the filed figure, or the subtotal while unfiled. */
  requestedCents: number;
  /** True once the host has set an explicit figure, so the copy stops saying "provisional". */
  hasFinalFigure: boolean;
}

/**
 * The aggregate the blueprint's "Aggregate Figures Module" asks for. `Incident`
 * already carries `placeholderTotalAmountCents` from the backend — but it is the
 * value at the last write, so it is NOT recomputed here and NOT trusted as the
 * subtotal: an item added a second ago is in `items` before it is in that column.
 * The sum is taken from the items the caller is looking at, and the header's figure
 * is only used once it is authoritative (`finalPayoutRequestedCents`).
 */
export function claimTotals(
  incident: Pick<Incident, "finalPayoutRequestedCents">,
  items: readonly Pick<IncidentItem, "estimatedPlaceholderValueCents">[],
): ClaimTotals {
  const itemsSubtotalCents = items.reduce(
    (total, item) => total + (item.estimatedPlaceholderValueCents || 0),
    0,
  );

  const hasFinalFigure = incident.finalPayoutRequestedCents > 0;

  return {
    itemsSubtotalCents,
    requestedCents: hasFinalFigure
      ? incident.finalPayoutRequestedCents
      : itemsSubtotalCents,
    hasFinalFigure,
  };
}

/**
 * "12.34" or "12,34" → 1234 cents. `null` when the input is not a usable amount.
 *
 * Accepts a comma as the decimal separator because `de`, `tr` and `sr-Latn` users
 * will type one, and the alternative — a number input that silently discards it —
 * is a bug the host cannot see. Empty input is `null`, not `0`: "I have not said
 * yet" and "it is worth nothing" are different answers, and only one of them should
 * reach the API.
 */
export function parseCentsFromInput(value: string): number | null {
  const normalised = value.trim().replace(",", ".");

  if (normalised === "") return null;

  const parsed = Number(normalised);

  if (!Number.isFinite(parsed) || parsed < 0) return null;

  // Rounding on `parsed * 100` is wrong for a value that is not exactly
  // representable in binary64: `Number("1.005") * 100` is 100.49999999999999, so
  // `Math.round` gives 100 and silently loses the half-cent the host typed.
  // Shifting the DECIMAL string two places instead ("1.005" → "1.005e2" → 100.5)
  // performs the arithmetic on the value the host actually entered. A string that
  // is not a plain decimal ("1e2", hex) has no decimal shift and falls back to the
  // float path, which is the only reading it has anyway.
  const shifted = Number(`${normalised}e2`);

  return Math.round(Number.isFinite(shifted) ? shifted : parsed * 100);
}
