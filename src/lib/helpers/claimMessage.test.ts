import { describe, expect, it, vi } from "vitest";

import { buildClaimMessage } from "./claimMessage";
import type { ClaimMessageLabels } from "./claimMessage";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

/**
 * A `t` that returns the key plus its interpolations, so the test can assert WHICH
 * keys were asked for as well as what the result contains. `test-setup.ts` mocks
 * react-i18next so `t(key) => key`; this stub does the same but keeps the values,
 * which is what makes the item lines checkable.
 */
function stubT() {
  return vi.fn((key: string, options?: Record<string, unknown>) => {
    if (!options) return key;

    return Object.entries(options).reduce(
      (text, [name, value]) => text.replace(`{{ ${name} }}`, String(value)),
      key,
    );
  });
}

const LABELS: ClaimMessageLabels = {
  header: "Claim {{ guestName }} {{ apartmentName }}",
  itemLine: "{{ index }}. {{ asset }} ({{ room }}) — {{ type }} — {{ value }} — {{ attached }}",
  totalLine: "Total {{ amount }}",
  footer: "footer",
  typeLabels: { damage: "incidentPage.itemType.damage", theft: "incidentPage.itemType.theft" },
  missingEvidence: "missing {{ evidence }}",
};

let sequence = 0;

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  sequence += 1;

  return {
    id: `item-${sequence}`,
    incidentId: "incident-1",
    assetId: `asset-${sequence}`,
    type: "damage",
    status: "link_generated",
    tokenExpiresAt: "2026-11-08T20:00:00.000Z",
    estimatedPlaceholderValueCents: 5000,
    descriptionByCleaner: null,
    createdAt: "2026-11-08T12:00:00.000Z",
    updatedAt: "2026-11-08T12:00:00.000Z",
    asset: {
      id: `asset-${sequence}`,
      name: "Bedroom Curtains",
      roomLocation: "BEDROOM_PRIMARY",
    } as IncidentItem["asset"],
    evidence: [],
    ...overrides,
  };
}

describe("buildClaimMessage", () => {
  it("names the guest and the apartment", () => {
    const message = buildClaimMessage({
      guestName: "Ada Lovelace",
      apartmentName: "Villa Aurora",
      items: [],
      requestedCents: 0,
      t: stubT(),
      labels: LABELS,
    });

    expect(message).toContain("Ada Lovelace");
    expect(message).toContain("Villa Aurora");
  });

  it("lists every item exactly once, numbered in order", () => {
    const message = buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items: [
        item({ asset: { name: "TV" } as IncidentItem["asset"] }),
        item({ asset: { name: "Sofa" } as IncidentItem["asset"] }),
      ],
      requestedCents: 10000,
      t: stubT(),
      labels: LABELS,
    });

    expect(message.match(/1\. TV/g)).toHaveLength(1);
    expect(message.match(/2\. Sofa/g)).toHaveLength(1);
  });

  it("carries the item's value and the requested total", () => {
    const message = buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items: [item({ estimatedPlaceholderValueCents: 12345 })],
      requestedCents: 99999,
      t: stubT(),
      labels: LABELS,
    });

    expect(message).toContain("123");
    expect(message).toContain("999");
  });

  it("says which views are attached for a damage item", () => {
    const message = buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items: [
        item({
          type: "damage",
          evidence: [
            {
              id: "e1",
              incidentItemId: "item-1",
              evidenceType: "damage_photo_wide",
              storageKey: "k1",
              exifCapturedAt: null,
              exifLatitude: null,
              exifLongitude: null,
              status: "active",
              deletedAt: null,
              createdAt: "2026-11-08T12:00:00.000Z",
              kind: "photo",
            },
          ],
        }),
      ],
      requestedCents: 5000,
      t: stubT(),
      labels: LABELS,
    });

    expect(message).toContain("incidentPage.evidence.damagePhotoWide");
    expect(message).not.toContain("incidentPage.evidence.damagePhotoCloseup");
  });

  it("does not count a soft-deleted photo as attached", () => {
    const message = buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items: [
        item({
          evidence: [
            {
              id: "e1",
              incidentItemId: "item-1",
              evidenceType: "damage_photo_wide",
              storageKey: "k1",
              exifCapturedAt: null,
              exifLatitude: null,
              exifLongitude: null,
              status: "soft_deleted",
              deletedAt: "2026-11-08T13:00:00.000Z",
              createdAt: "2026-11-08T12:00:00.000Z",
              kind: "photo",
            },
          ],
        }),
      ],
      requestedCents: 0,
      t: stubT(),
      labels: LABELS,
    });

    // A soft-deleted photo is not attached, so the type is reported as still owed.
    // The assertion is on the missing clause rather than "the key appears nowhere":
    // Option A makes an unattached required type appear there by design, and only the
    // clause proves it was not counted as collected.
    expect(message).toContain("missing incidentPage.evidence.damagePhotoWide");
    expect(message).toContain("missing");
  });

  it("marks a theft item's missing view as the empty-space photo, not a damage photo", () => {
    const t = stubT();

    buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items: [item({ type: "theft" })],
      requestedCents: 0,
      t,
      labels: LABELS,
    });

    const asked = t.mock.calls.map(([key]) => key);

    expect(asked).toContain("incidentPage.evidence.theftEmptySpacePhoto");
    expect(asked).not.toContain("incidentPage.evidence.damagePhotoWide");
  });

  it("produces a five-item message with one line per item", () => {
    const items = Array.from({ length: 5 }, (_, index) =>
      item({ asset: { name: `Asset ${index + 1}` } as IncidentItem["asset"] }),
    );

    const message = buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items,
      requestedCents: 25000,
      t: stubT(),
      labels: LABELS,
    });

    for (let index = 1; index <= 5; index += 1) {
      expect(message).toContain(`${index}. Asset ${index}`);
    }
  });

  it("returns a usable string on a claim with no items", () => {
    const message = buildClaimMessage({
      guestName: "Ada",
      apartmentName: "Villa",
      items: [],
      requestedCents: 0,
      t: stubT(),
      labels: LABELS,
    });

    expect(typeof message).toBe("string");
    expect(message.trim().length).toBeGreaterThan(0);
    expect(message).not.toContain("undefined");
  });
});
