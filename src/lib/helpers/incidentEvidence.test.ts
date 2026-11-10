import { describe, expect, it } from "vitest";

import {
  DOCUMENT_EVIDENCE_TYPES,
  activeEvidence,
  activePhotoCount,
  evidenceLabelKey,
  hasAllRequiredPhotos,
  isPhotoEvidence,
  missingPhotoTypes,
  requiredPhotoTypes,
} from "./incidentEvidence";
import type { EvidenceType } from "./incidentEvidence";
import type { IncidentEvidence, IncidentItem } from "@/api/generated/requests/types.gen";

const ALL_TYPES: readonly EvidenceType[] = [
  "damage_photo_wide",
  "damage_photo_closeup",
  "theft_empty_space_photo",
  "original_purchase_receipt",
  "replacement_retail_quote",
  "handyman_invoice",
  "police_report",
];

let sequence = 0;

function evidence(overrides: Partial<IncidentEvidence> = {}): IncidentEvidence {
  sequence += 1;

  return {
    id: `evidence-${sequence}`,
    incidentItemId: "item-1",
    evidenceType: "damage_photo_wide",
    storageKey: `key-${sequence}`,
    exifCapturedAt: null,
    exifLatitude: null,
    exifLongitude: null,
    status: "active",
    deletedAt: null,
    createdAt: "2026-11-08T12:00:00.000Z",
    kind: "photo",
    ...overrides,
  };
}

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "item-1",
    incidentId: "incident-1",
    assetId: "asset-1",
    type: "damage",
    status: "link_generated",
    tokenExpiresAt: "2026-11-08T20:00:00.000Z",
    estimatedPlaceholderValueCents: 0,
    descriptionByCleaner: null,
    createdAt: "2026-11-08T12:00:00.000Z",
    updatedAt: "2026-11-08T12:00:00.000Z",
    asset: {} as IncidentItem["asset"],
    evidence: [],
    ...overrides,
  };
}

describe("requiredPhotoTypes", () => {
  it("mirrors the backend's PHOTO_EVIDENCE_FOR_TYPE", () => {
    // covera-hono/src/modules/incidents/: PHOTO_EVIDENCE_FOR_TYPE. If that constant
    // changes, this assertion and the helper change together — the response carries
    // no requiredEvidenceTypes field for the host path to read.
    expect(requiredPhotoTypes("damage")).toEqual([
      "damage_photo_wide",
      "damage_photo_closeup",
    ]);
    expect(requiredPhotoTypes("theft")).toEqual(["theft_empty_space_photo"]);
  });
});

describe("isPhotoEvidence", () => {
  it("splits the seven types into three photos and four documents", () => {
    expect(ALL_TYPES.filter(isPhotoEvidence)).toEqual([
      "damage_photo_wide",
      "damage_photo_closeup",
      "theft_empty_space_photo",
    ]);
    expect(ALL_TYPES.filter((type) => !isPhotoEvidence(type))).toEqual([
      ...DOCUMENT_EVIDENCE_TYPES,
    ]);
  });
});

describe("evidenceLabelKey", () => {
  it("has a label for every type the backend can return", () => {
    for (const type of ALL_TYPES) {
      expect(evidenceLabelKey(type), type).toMatch(/^incidentPage\.evidence\./);
    }
  });
});

describe("activeEvidence", () => {
  it("ignores soft-deleted rows", () => {
    const subject = item({
      evidence: [
        evidence(),
        evidence({ status: "soft_deleted", deletedAt: "2026-11-08T13:00:00.000Z" }),
      ],
    });

    expect(activeEvidence(subject)).toHaveLength(1);
  });

  it("ignores a row carrying a deletedAt even when its status still says active", () => {
    const subject = item({
      evidence: [evidence({ deletedAt: "2026-11-08T13:00:00.000Z" })],
    });

    expect(activeEvidence(subject)).toHaveLength(0);
  });
});

describe("activePhotoCount / missingPhotoTypes / hasAllRequiredPhotos", () => {
  it("counts only photos of the asked-for type", () => {
    const subject = item({
      evidence: [
        evidence({ evidenceType: "damage_photo_wide" }),
        evidence({ evidenceType: "damage_photo_wide" }),
        evidence({ evidenceType: "damage_photo_closeup" }),
      ],
    });

    expect(activePhotoCount(subject, "damage_photo_wide")).toBe(2);
    expect(activePhotoCount(subject, "damage_photo_closeup")).toBe(1);
  });

  it("does not count a document towards a photo requirement", () => {
    const subject = item({
      evidence: [
        evidence({
          evidenceType: "original_purchase_receipt",
          kind: "document",
        }),
      ],
    });

    expect(missingPhotoTypes(subject)).toEqual([
      "damage_photo_wide",
      "damage_photo_closeup",
    ]);
  });

  it("reports everything missing on an item with no evidence", () => {
    expect(missingPhotoTypes(item())).toEqual([
      "damage_photo_wide",
      "damage_photo_closeup",
    ]);
    expect(hasAllRequiredPhotos(item())).toBe(false);
  });

  it("is complete once each required type has one active photo", () => {
    const subject = item({
      evidence: [
        evidence({ evidenceType: "damage_photo_wide" }),
        evidence({ evidenceType: "damage_photo_closeup" }),
      ],
    });

    expect(missingPhotoTypes(subject)).toEqual([]);
    expect(hasAllRequiredPhotos(subject)).toBe(true);
  });

  it("asks a theft item for the empty-space photo and nothing else", () => {
    const subject = item({
      type: "theft",
      evidence: [evidence({ evidenceType: "damage_photo_wide" })],
    });

    // The damage photo is active but is not what a theft needs, so it is missing.
    expect(missingPhotoTypes(subject)).toEqual(["theft_empty_space_photo"]);
  });
});
