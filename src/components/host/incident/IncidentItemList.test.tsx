import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { IncidentItemList } from "./IncidentItemList";
import type {
  IncidentEvidence,
  IncidentItem,
} from "@/api/generated/requests/types.gen";

function evidence(
  evidenceType: IncidentEvidence["evidenceType"],
  overrides: Partial<IncidentEvidence> = {},
): IncidentEvidence {
  return {
    id: `e-${evidenceType}`,
    incidentItemId: "item-1",
    evidenceType,
    storageKey: "key-1",
    exifCapturedAt: null,
    exifLatitude: null,
    exifLongitude: null,
    status: "active",
    deletedAt: null,
    createdAt: "2026-11-08T12:00:00.000Z",
    kind: evidenceType.includes("photo") ? "photo" : "document",
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
    estimatedPlaceholderValueCents: 5000,
    descriptionByCleaner: null,
    createdAt: "2026-11-08T10:00:00.000Z",
    updatedAt: "2026-11-08T10:00:00.000Z",
    asset: {
      id: "asset-1",
      name: "Bedroom Curtains",
      roomLocation: "BEDROOM_PRIMARY",
    } as IncidentItem["asset"],
    evidence: [],
    ...overrides,
  };
}

describe("IncidentItemList", () => {
  it("says so when the claim has no items yet", () => {
    render(<IncidentItemList items={[]} />);

    expect(screen.getByText("incidentPage.items.empty")).toBeInTheDocument();
  });

  it("renders the asset's name", () => {
    render(<IncidentItemList items={[item()]} />);

    expect(screen.getByText("Bedroom Curtains")).toBeInTheDocument();
  });

  it("names the room through the assets namespace, which is where roomLocations lives", () => {
    render(<IncidentItemList items={[item()]} />);

    // Not `incidentPage.*`: the component's `t` is bound to `host` and the key is in
    // `assets.json`, so the prefix is the thing under test.
    expect(
      screen.getByText(/assets:roomLocations\.BEDROOM_PRIMARY/),
    ).toBeInTheDocument();
  });

  it("asks a damage item for BOTH damage views", () => {
    render(<IncidentItemList items={[item({ type: "damage" })]} />);

    expect(
      screen.getByText("incidentPage.evidence.damagePhotoWide"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("incidentPage.evidence.damagePhotoCloseup"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.evidence.theftEmptySpacePhoto"),
    ).not.toBeInTheDocument();
  });

  it("asks a theft item for the empty-space photo and NOT for damage views", () => {
    render(<IncidentItemList items={[item({ type: "theft" })]} />);

    expect(
      screen.getByText("incidentPage.evidence.theftEmptySpacePhoto"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.evidence.damagePhotoWide"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.evidence.damagePhotoCloseup"),
    ).not.toBeInTheDocument();
  });

  it("reports the views missing on an item with no evidence", () => {
    render(<IncidentItemList items={[item({ type: "damage" })]} />);

    expect(screen.getByText("incidentPage.items.viewsMissing")).toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.items.viewsComplete"),
    ).not.toBeInTheDocument();
  });

  it("reports complete once each required view has an active photo", () => {
    render(
      <IncidentItemList
        items={[
          item({
            type: "damage",
            evidence: [
              evidence("damage_photo_wide"),
              evidence("damage_photo_closeup"),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("incidentPage.items.viewsComplete")).toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.items.viewsMissing"),
    ).not.toBeInTheDocument();
  });

  it("does not count a soft-deleted photo as a collected view", () => {
    // The same rule phase 1's `activeEvidence` enforces, observed through the row: a
    // host who deleted a bad photo must not see the view as done.
    render(
      <IncidentItemList
        items={[
          item({
            type: "theft",
            evidence: [
              evidence("theft_empty_space_photo", {
                status: "soft_deleted",
                deletedAt: "2026-11-08T13:00:00.000Z",
              }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("incidentPage.items.viewsMissing")).toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.items.viewsComplete"),
    ).not.toBeInTheDocument();
  });

  it("renders the item's status through phase 1's vocabulary, as a key", () => {
    render(<IncidentItemList items={[item({ status: "photos_collected" })]} />);

    // Asserted by the key `itemStatusCopy` returns, not by an English string this test
    // would then own.
    expect(
      screen.getByText("incidentPage.itemStatus.photosCollected"),
    ).toBeInTheDocument();
  });

  it("renders the item's type as a key too", () => {
    render(<IncidentItemList items={[item({ type: "theft" })]} />);

    // A regex, because the type shares its <p> with the room and the value.
    expect(screen.getByText(/incidentPage\.itemType\.theft/)).toBeInTheDocument();
  });

  it("renders every item in a multi-item claim", () => {
    render(
      <IncidentItemList
        items={[
          item({ id: "i1", asset: { name: "TV" } as IncidentItem["asset"] }),
          item({ id: "i2", asset: { name: "Sofa" } as IncidentItem["asset"] }),
          item({ id: "i3", asset: { name: "Lamp" } as IncidentItem["asset"] }),
        ]}
      />,
    );

    expect(screen.getByText("TV")).toBeInTheDocument();
    expect(screen.getByText("Sofa")).toBeInTheDocument();
    expect(screen.getByText("Lamp")).toBeInTheDocument();
  });
});