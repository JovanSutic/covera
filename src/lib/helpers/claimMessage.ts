import type { IncidentItem } from "@/api/generated/requests/types.gen";

import { evidenceLabelKey } from "./incidentEvidence";
import { formatCents } from "./claimMoney";
import { requiredPhotoTypes } from "./incidentEvidence";

/**
 * D25: the text block the host pastes into Airbnb's resolution-centre description
 * box. Pure, so the part that can actually be wrong — which items, in what order,
 * with which figures — is testable without a DOM or a clipboard.
 *
 * It is deliberately NOT translated. The host pastes this into an English-language
 * Airbnb form that Airbnb's own support reads; translating the item names into
 * Turkish would produce a claim nobody at Airbnb can process. The surrounding
 * labels ARE translated, because those are the host's own screen. That split is the
 * reason this function takes a `t` and uses it only for the fixed sentences.
 *
 * The per-item lines are assembled from the ASSET's own name and room, which are
 * free text the host wrote when they created the asset — not enum keys — so they go
 * in verbatim.
 */
export interface ClaimMessageLabels {
  /** `incidentPage.message.header`, with `{{ apartmentName }}`. */
  header: string;
  /** `incidentPage.message.intro`, with `{{ apartmentName }}` and `{{ dates }}`. */
  intro: string;
  /** `incidentPage.message.assetsIntro`. */
  assetsIntro: string;
  /** `incidentPage.message.ask`. */
  ask: string;
  /** `incidentPage.message.itemLine`, with `{{ index }}`, `{{ asset }}`, `{{ room }}`, `{{ type }}`, `{{ value }}`. */
  itemLine: string;
  /** `incidentPage.message.totalLine`, with `{{ amount }}`. */
  totalLine: string;
  /** `incidentPage.message.footer`. */
  footer: string;
  /** `incidentPage.itemType.damage` / `.theft`. */
  typeLabels: Record<IncidentItem["type"], string>;
  /** `incidentPage.message.missingEvidence`, with `{{ evidence }}`. */
  missingEvidence: string;
}

export interface BuildClaimMessageParams {
  guestName: string;
  apartmentName: string;
  items: readonly IncidentItem[];
  requestedCents: number;
  /** `Reservation.checkInDatetime`. */
  checkInDatetime: string;
  /** `Reservation.checkOutDatetime`. */
  checkOutDatetime: string;
  /** The active `i18n.language`, for `formatStayRange`. */
  locale: string;
  /** The caller's `t`, bound to the `host` namespace. */
  t: (key: string, options?: Record<string, unknown>) => string;
  labels: ClaimMessageLabels;
}

/**
 * The count of each required view an item already has, as the "what is attached"
 * clause. Reads `activePhotoCount`'s rule through `item.evidence` directly rather
 * than importing the counter, so an item with a soft-deleted photo is described the
 * same way the item row describes it.
 */
function attachedClause(
  item: IncidentItem,
  t: BuildClaimMessageParams["t"],
  labels: ClaimMessageLabels,
): string {
  const required = requiredPhotoTypes(item.type);

  const attached = required
    .map((type) =>
      item.evidence.some(
        (evidence) =>
          evidence.status === "active" &&
          evidence.deletedAt === null &&
          evidence.evidenceType === type,
      )
        ? t(evidenceLabelKey(type))
        : null,
    )
    .filter((label): label is string => label !== null);

  if (attached.length > 0) return attached.join(", ");

  // Option A amendment: `{{ evidence }}` names the views that are still owed, so the
  // claim line says WHICH view is missing instead of leaving the slot empty and
  // rendering "missing " with nothing after it.
  const missing = required.map((type) => t(evidenceLabelKey(type))).join(", ");

  return t(labels.missingEvidence, { evidence: missing });
}

/**
 * D15: the stay as one string. `locale` is a parameter rather than a module read so the
 * helper is testable and the message follows the UI language the host is reading — the
 * dates in the pasted text are the host's dates, not Airbnb's.
 *
 * An unparseable instant returns `""` rather than "Invalid Date", the same rule
 * `toEpoch` applies in `claimDeadline.ts`.
 */
export function formatStayRange(
  checkIn: string,
  checkOut: string,
  locale: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return "";
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function buildClaimMessage({
  guestName,
  apartmentName,
  items,
  requestedCents,
  checkInDatetime,
  checkOutDatetime,
  locale,
  t,
  labels,
}: BuildClaimMessageParams): string {
  const dates = formatStayRange(checkInDatetime, checkOutDatetime, locale);

  const lines: string[] = [t(labels.header, { guestName, apartmentName }), ""];

  lines.push(t(labels.intro, { apartmentName, dates }));
  lines.push("");
  lines.push(t(labels.assetsIntro));
  lines.push("");

  items.forEach((item, index) => {
    lines.push(
      t(labels.itemLine, {
        index: index + 1,
        asset: item.asset.name,
        // `roomLocations` lives in the `assets` namespace, not `host` — and this
        // file's `t` is bound to `host`, so an unqualified key would render the raw
        // key string. `ReservationPhotoGallery` carries exactly this prefix for
        // exactly this reason.
        room: t(`assets:roomLocations.${item.asset.roomLocation}`, {
          defaultValue: item.asset.roomLocation,
        }),
        type: t(labels.typeLabels[item.type]),
        value: formatCents(item.estimatedPlaceholderValueCents),
        attached: attachedClause(item, t, labels),
      }),
    );
  });

  lines.push("");
  lines.push(t(labels.totalLine, { amount: formatCents(requestedCents) }));
  lines.push("");
  lines.push(t(labels.ask));
  lines.push("");
  lines.push(t(labels.footer));

  return lines.join("\n");
}
