import type { IncidentItem } from "@/api/generated/requests/types.gen";

/**
 * D21: the evidence vocabulary. `PHOTO_EVIDENCE_FOR_TYPE` MIRRORS the backend's
 * constant of the same name in `covera-hono/src/modules/incidents/`:
 *
 *   damage: ["damage_photo_wide", "damage_photo_closeup"]
 *   theft:  ["theft_empty_space_photo"]
 *
 * It has to be duplicated: `getIncidentsById` returns `IncidentItem`, which carries
 * no `requiredEvidenceTypes` field — only the FIELD payload does. If that backend
 * constant changes, this one must change with it. `incidentEvidence.test.ts` names
 * it in the test that pins these values, so the dependency is visible.
 */
export type EvidenceType = IncidentItem["evidence"][number]["evidenceType"];

const PHOTO_EVIDENCE_FOR_TYPE: Record<IncidentItem["type"], readonly EvidenceType[]> = {
  damage: ["damage_photo_wide", "damage_photo_closeup"],
  theft: ["theft_empty_space_photo"],
};

/** The four document types. The field portal never submits these (out of scope). */
export const DOCUMENT_EVIDENCE_TYPES: readonly EvidenceType[] = [
  "original_purchase_receipt",
  "replacement_retail_quote",
  "handyman_invoice",
  "police_report",
];

/** What the host must be guided to shoot for an item of this type, in order. */
export function requiredPhotoTypes(type: IncidentItem["type"]): readonly EvidenceType[] {
  return PHOTO_EVIDENCE_FOR_TYPE[type];
}

export function isPhotoEvidence(type: EvidenceType): boolean {
  return !DOCUMENT_EVIDENCE_TYPES.includes(type);
}

/**
 * The label for every one of the seven types, as an i18n key. Total on purpose: a
 * `Record` over the union means a type the backend adds is a compile error here
 * rather than a raw key on screen.
 */
const EVIDENCE_LABEL_KEYS: Record<EvidenceType, string> = {
  damage_photo_wide: "incidentPage.evidence.damagePhotoWide",
  damage_photo_closeup: "incidentPage.evidence.damagePhotoCloseup",
  theft_empty_space_photo: "incidentPage.evidence.theftEmptySpacePhoto",
  original_purchase_receipt: "incidentPage.evidence.originalPurchaseReceipt",
  replacement_retail_quote: "incidentPage.evidence.replacementRetailQuote",
  handyman_invoice: "incidentPage.evidence.handymanInvoice",
  police_report: "incidentPage.evidence.policeReport",
};

export function evidenceLabelKey(type: EvidenceType): string {
  return EVIDENCE_LABEL_KEYS[type];
}

/**
 * Evidence that still counts. A `soft_deleted` row is the app's delete-with-history
 * convention (`RoomPhotoItem` reads `status === "active" && !deletedAt` the same
 * way, for the same reason) — it must not be counted as collected, or a host who
 * deleted a bad photo would see the item reported as complete.
 */
export function activeEvidence(item: IncidentItem): IncidentItem["evidence"] {
  return item.evidence.filter(
    (evidence) => evidence.status === "active" && evidence.deletedAt === null,
  );
}

/** How many ACTIVE photos of this exact type the item already carries. */
export function activePhotoCount(item: IncidentItem, type: EvidenceType): number {
  return activeEvidence(item).filter(
    (evidence) => evidence.kind === "photo" && evidence.evidenceType === type,
  ).length;
}

/**
 * What is still missing, as data — the list of required types with none collected.
 * The host's checklist and the "is this item done" answer both read this rather
 * than counting themselves.
 */
export function missingPhotoTypes(item: IncidentItem): EvidenceType[] {
  return requiredPhotoTypes(item.type).filter(
    (type) => activePhotoCount(item, type) === 0,
  );
}

/** True when every required photo type has at least one active photo. */
export function hasAllRequiredPhotos(item: IncidentItem): boolean {
  return missingPhotoTypes(item).length === 0;
}
