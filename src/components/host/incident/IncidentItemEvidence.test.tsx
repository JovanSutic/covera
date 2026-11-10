import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { IncidentItemEvidence } from "./IncidentItemEvidence";
import { requiredPhotoTypes } from "@/lib/helpers/incidentEvidence";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

const { uploadIncidentEvidence, removeIncidentEvidence } = vi.hoisted(() => ({
  uploadIncidentEvidence: vi.fn(),
  removeIncidentEvidence: vi.fn(),
}));

// The spread is deliberate: `incidentClaims.ts` is a module the page and the form also
// import, and a wholesale replacement would make this mock a DIFFERENT module from the
// one they get — a divergence that shows up as a puzzling failure in a later phase
// rather than here. `registry.ts`'s `xResource` dereference is the same hazard in the
// query modules; phase 3's test carries that comment.
vi.mock("@/lib/api/incidentClaims", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/incidentClaims")>()),
  uploadIncidentEvidence,
  removeIncidentEvidence,
}));

/**
 * jsdom implements no `URL.createObjectURL` — the gap the injection seam exists for.
 * Nothing here calls it, but the component's preview path builds image URLs and the
 * stub keeps a stray call from throwing.
 */
beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:preview"),
  });
  uploadIncidentEvidence.mockReset();
  removeIncidentEvidence.mockReset();
  uploadIncidentEvidence.mockResolvedValue({ success: true });
  removeIncidentEvidence.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const INCIDENT_ID = "44444444-4444-4444-4444-444444444444";

const ASSET = {
  id: "asset-1",
  name: "Bedroom Curtains",
  roomLocation: "BEDROOM_PRIMARY",
} as IncidentItem["asset"];

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "item-1",
    incidentId: INCIDENT_ID,
    assetId: "asset-1",
    type: "damage",
    status: "link_generated",
    tokenExpiresAt: "2026-11-08T20:00:00.000Z",
    estimatedPlaceholderValueCents: 5000,
    descriptionByCleaner: null,
    createdAt: "2026-11-08T10:00:00.000Z",
    updatedAt: "2026-11-08T10:00:00.000Z",
    asset: ASSET,
    evidence: [],
    ...overrides,
  };
}

function photo(
  evidenceType: IncidentItem["evidence"][number]["evidenceType"],
  overrides: Partial<IncidentItem["evidence"][number]> = {},
): IncidentItem["evidence"][number] {
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
    createdAt: "2026-11-08T11:00:00.000Z",
    kind: "photo",
    ...overrides,
  };
}

function renderPanel(
  subject: IncidentItem,
  renderCapture?: Parameters<typeof IncidentItemEvidence>[0]["renderCapture"],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IncidentItemEvidence
        incidentId={INCIDENT_ID}
        item={subject}
        {...(renderCapture === undefined ? {} : { renderCapture })}
      />
    </QueryClientProvider>,
  );
}

describe("what the panel asks for", () => {
  it("offers both damage views for a damage item", () => {
    renderPanel(item({ type: "damage" }));

    // The COUNT is the assertion, not the button's text. The label is
    // `t("incidentPage.evidence.captureFor", { view: t(evidenceLabelKey(type)) })`, and
    // `test-setup.ts`'s `t: (key) => key` takes one parameter — so under the mock BOTH
    // buttons read exactly "incidentPage.evidence.captureFor" and the view's own name
    // never reaches the DOM. A `getByText(/damagePhotoWide/)` here would fail against
    // correct code. Two buttons for a damage item, one for a theft item, is the
    // requirement this can actually see, and it is the requirement that matters.
    expect(screen.getAllByRole("button", { name: "incidentPage.evidence.captureFor" })).toHaveLength(2);
  });

  it("offers exactly one view for a theft item", () => {
    renderPanel(item({ type: "theft" }));

    expect(screen.getAllByRole("button", { name: "incidentPage.evidence.captureFor" })).toHaveLength(1);
  });

  it("changes the label to a retake once a view has an active photo", () => {
    renderPanel(
      item({
        type: "theft",
        evidence: [photo("theft_empty_space_photo")],
      }),
    );

    expect(
      screen.getAllByRole("button", { name: "incidentPage.evidence.retakeFor" }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "incidentPage.evidence.captureFor" }),
    ).not.toBeInTheDocument();
  });

  it("does not treat a soft-deleted photo as collected", () => {
    renderPanel(
      item({
        type: "theft",
        evidence: [
          photo("theft_empty_space_photo", {
            status: "soft_deleted",
            deletedAt: "2026-11-08T12:00:00.000Z",
          }),
        ],
      }),
    );

    expect(
      screen.getByRole("button", { name: "incidentPage.evidence.captureFor" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "incidentPage.evidence.retakeFor" }),
    ).not.toBeInTheDocument();
  });

  it("asks a damage item for one view per required photo type, not for the theft view", () => {
    // The type→view mapping itself is phase 1's (`requiredPhotoTypes`), covered in
    // `incidentEvidence.test.ts`. What this pins is that the panel renders THAT list
    // rather than a hardcoded pair, which the button count alone cannot prove: a panel
    // that always rendered two buttons would pass the damage case.
    renderPanel(item({ type: "theft" }));

    expect(screen.getAllByRole("button", { name: /captureFor|retakeFor/ })).toHaveLength(
      requiredPhotoTypes("theft").length,
    );
    expect(requiredPhotoTypes("theft")).toEqual(["theft_empty_space_photo"]);
  });
});

describe("the captured photos", () => {
  it("shows an active photo, built from the R2 origin", () => {
    renderPanel(item({ evidence: [photo("damage_photo_wide")] }));

    const image = screen.getByRole("img", {
      name: "incidentPage.evidence.damagePhotoWide",
    });

    expect(image).toHaveAttribute(
      "src",
      `${import.meta.env.VITE_R2_IMAGE_URL}/key-1`,
    );
  });

  it("hides a soft-deleted photo from the strip", () => {
    renderPanel(
      item({
        evidence: [
          photo("damage_photo_wide", {
            status: "soft_deleted",
            deletedAt: "2026-11-08T12:00:00.000Z",
          }),
        ],
      }),
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("removes a photo through the delete write", async () => {
    renderPanel(item({ evidence: [photo("damage_photo_wide")] }));

    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.evidence.remove" }),
    );

    await waitFor(() => {
      expect(removeIncidentEvidence).toHaveBeenCalledWith(
        INCIDENT_ID,
        "item-1",
        "e-damage_photo_wide",
      );
    });
  });
});

describe("the capture seam", () => {
  it("uploads through the injected control rather than the file input", async () => {
    // D20: the seam exists so a test can drive the real handler without jsdom's
    // missing camera. The injected control here stands in for `ShotStepPanel`'s.
    const renderCapture = vi.fn(
      (evidenceType: string, onCapture: (file: File) => void) => (
        <button
          type="button"
          onClick={() =>
            onCapture(new File(["bytes"], "shot.jpg", { type: "image/jpeg" }))
          }
        >
          capture-{evidenceType}
        </button>
      ),
    );

    renderPanel(item({ type: "theft" }), renderCapture);

    await userEvent.click(screen.getByRole("button", { name: "capture-theft_empty_space_photo" }));

    await waitFor(() => {
      expect(uploadIncidentEvidence).toHaveBeenCalledTimes(1);
    });

    const [, itemId, uploads] = uploadIncidentEvidence.mock.calls[0];

    expect(itemId).toBe("item-1");
    expect(uploads[0].evidenceType).toBe("theft_empty_space_photo");
    expect(uploads[0].file).toBeInstanceOf(File);
  });

  it("offers the native file input when no capture control is injected", () => {
    renderPanel(item({ type: "damage" }));

    // No camera in jsdom, but the trigger must exist in the real DOM — that is the
    // whole point of reusing `ShotStepPanel`'s `capture="environment"` pattern.
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });
});
