import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { IncidentItemValueEditor } from "./IncidentItemValueEditor";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

const { setIncidentItemValue } = vi.hoisted(() => ({
  setIncidentItemValue: vi.fn(),
}));

// The spread is mandatory: the page and the filing panel both import this module, and a
// wholesale replacement would hand them a DIFFERENT module.
vi.mock("@/lib/api/incidentClaims", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/incidentClaims")>()),
  setIncidentItemValue,
}));

beforeEach(() => {
  setIncidentItemValue.mockReset();
  setIncidentItemValue.mockResolvedValue({ id: "item-1" });
});

const INCIDENT_ID = "incident-1";
const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "item-1",
    incidentId: INCIDENT_ID,
    assetId: "asset-1",
    type: "damage",
    status: "photos_collected",
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
    photoAllowance: { max: 4, required: 2, attached: 0, remaining: 4 },
    ...overrides,
  };
}

function renderEditor(items: IncidentItem[], editable = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IncidentItemValueEditor
        incidentId={INCIDENT_ID}
        apartmentId={APARTMENT_ID}
        items={items}
        editable={editable}
      />
    </QueryClientProvider>,
  );
}

describe("the per-asset rows", () => {
  it("renders one row per item", () => {
    renderEditor([
      item(),
      item({ id: "item-2", assetId: "asset-2" }),
    ]);

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("shows the stored figure as a decimal", () => {
    renderEditor([item({ estimatedPlaceholderValueCents: 5000 })]);

    expect(screen.getByRole("textbox")).toHaveValue("50.00");
  });
});

describe("the validation rule", () => {
  it("treats a stored zero as already invalid", () => {
    renderEditor([item({ estimatedPlaceholderValueCents: 0 })]);

    const field = screen.getByRole("textbox");

    expect(field).toHaveValue("0.00");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("incidentPage.filing.figures.invalid"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "incidentPage.filing.figures.save" }),
    ).toBeDisabled();
  });

  it("saves a valid amount as that row's cents", async () => {
    renderEditor([item()]);

    const field = screen.getByRole("textbox");

    await userEvent.clear(field);
    await userEvent.type(field, "120,50");
    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.filing.figures.save" }),
    );

    await waitFor(() => {
      expect(setIncidentItemValue).toHaveBeenCalledWith(
        INCIDENT_ID,
        "item-1",
        12050,
      );
    });
  });
});

describe("the read-only state", () => {
  it("disables the field and withholds the save once the claim is filed", () => {
    renderEditor([item({ estimatedPlaceholderValueCents: 5000 })], false);

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveValue("50.00");
    expect(
      screen.queryByRole("button", {
        name: "incidentPage.filing.figures.save",
      }),
    ).toBeNull();
  });
});
