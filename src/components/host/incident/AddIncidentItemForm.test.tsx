import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AddIncidentItemForm } from "./AddIncidentItemForm";
import type { Asset } from "@/api/generated/requests/types.gen";

const { useAssets, addIncidentItem } = vi.hoisted(() => ({
  useAssets: vi.fn(),
  addIncidentItem: vi.fn(),
}));

// The spread is not optional: `registry.ts` builds `QUERY_RESOURCES` by dereferencing
// each module's `xResource` export at load, so a wholesale replacement erases
// `assetsResource` and collection dies before any test runs.
vi.mock("@/lib/api/queries/assets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/assets")>()),
  useAssets,
}));
vi.mock("@/lib/api/incidentClaims", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/incidentClaims")>()),
  addIncidentItem,
}));

const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";
const INCIDENT_ID = "44444444-4444-4444-4444-444444444444";

const ASSET_LABEL = "incidentPage.addItem.asset";
const TYPE_LABEL = "incidentPage.addItem.type";
const SUBMIT_LABEL = "incidentPage.addItem.submit";

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    apartmentId: APARTMENT_ID,
    name: "Bedroom Curtains",
    roomLocation: "BEDROOM_PRIMARY",
    isActive: true,
    ...overrides,
  } as Asset;
}

function renderForm(claimedAssetIds: string[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AddIncidentItemForm
        apartmentId={APARTMENT_ID}
        incidentId={INCIDENT_ID}
        claimedAssetIds={claimedAssetIds}
      />
    </QueryClientProvider>,
  );
}

/** Opens a picker by its label and clicks one of its options. */
async function pick(label: string, option: RegExp) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => {
  useAssets.mockReset();
  addIncidentItem.mockReset();
  addIncidentItem.mockResolvedValue({ id: "item-new" });
  useAssets.mockReturnValue({
    data: [asset({ id: "a1", name: "TV" }), asset({ id: "a2", name: "Sofa" })],
    isLoading: false,
  });
});

describe("the asset picker", () => {
  it("offers the apartment's assets", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("combobox", { name: ASSET_LABEL }));

    expect(await screen.findByRole("option", { name: /TV/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Sofa/ })).toBeInTheDocument();
  });

  it("EXCLUDES the assets already on the claim (D27)", async () => {
    // The backend refuses a duplicate with INCIDENT_ITEM_EXISTS. Offering it here
    // would be offering an action the API rejects.
    renderForm(["a2"]);

    await userEvent.click(screen.getByRole("combobox", { name: ASSET_LABEL }));

    expect(await screen.findByRole("option", { name: /TV/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Sofa/ })).not.toBeInTheDocument();
  });

  it("offers nothing once every asset is claimed, and says why", () => {
    renderForm(["a1", "a2"]);

    expect(screen.getByText("incidentPage.addItem.allClaimed")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: ASSET_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("excludes an asset the apartment has deactivated", async () => {
    useAssets.mockReturnValue({
      data: [
        asset({ id: "a1", name: "TV" }),
        asset({ id: "a3", name: "Retired Lamp", isActive: false }),
      ],
      isLoading: false,
    });

    renderForm();

    await userEvent.click(screen.getByRole("combobox", { name: ASSET_LABEL }));

    expect(await screen.findByRole("option", { name: /TV/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Retired Lamp/ }),
    ).not.toBeInTheDocument();
  });
});

describe("the submission", () => {
  it("keeps the submit disabled, and sends nothing, until an asset is chosen", async () => {
    renderForm();

    const submit = screen.getByRole("button", { name: SUBMIT_LABEL });

    expect(submit).toBeDisabled();

    await userEvent.click(submit);

    expect(addIncidentItem).not.toHaveBeenCalled();
  });

  it("enables the submit as soon as an asset is chosen (D49)", async () => {
    // The type defaults to `damage`, so the asset selection is the only thing standing
    // between an untouched form and a sendable one. Without `mode: "onChange"` this
    // never becomes enabled, because the disabled button blocks the submit that would
    // otherwise recompute `isValid`.
    renderForm();

    await pick(ASSET_LABEL, /TV/);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
    });
  });

  it("sends ONE call, with the incident id, the asset and the default type (D48)", async () => {
    renderForm();

    await pick(ASSET_LABEL, /TV/);
    await userEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }));

    await waitFor(() => {
      expect(addIncidentItem).toHaveBeenCalledTimes(1);
    });

    expect(addIncidentItem).toHaveBeenCalledWith(
      INCIDENT_ID,
      expect.objectContaining({ assetId: "a1", type: "damage" }),
    );
  });

  it("sends the chosen type instead of the default", async () => {
    renderForm();

    await pick(ASSET_LABEL, /TV/);
    await pick(TYPE_LABEL, /incidentPage\.itemType\.theft/);
    await userEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }));

    await waitFor(() => {
      expect(addIncidentItem).toHaveBeenCalledWith(
        INCIDENT_ID,
        expect.objectContaining({ assetId: "a1", type: "theft" }),
      );
    });
  });

  it("sends the placeholder value in cents when the host gives one", async () => {
    renderForm();

    await pick(ASSET_LABEL, /TV/);
    await userEvent.type(
      screen.getByRole("textbox", { name: /incidentPage\.addItem\.value/ }),
      "12,34",
    );
    await userEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }));

    await waitFor(() => {
      expect(addIncidentItem).toHaveBeenCalledWith(
        INCIDENT_ID,
        expect.objectContaining({ estimatedPlaceholderValueCents: 1234 }),
      );
    });
  });

  it("OMITS the value rather than sending zero when it is left empty", async () => {
    // "I have not priced it yet" and "it is worth nothing" are different answers;
    // phase 2's `parseCentsFromInput` returns null for the first, and this asserts the
    // null never reaches the API as a 0.
    renderForm();

    await pick(ASSET_LABEL, /TV/);
    await userEvent.click(screen.getByRole("button", { name: SUBMIT_LABEL }));

    await waitFor(() => {
      expect(addIncidentItem).toHaveBeenCalledTimes(1);
    });

    expect(addIncidentItem.mock.calls[0][1]).not.toHaveProperty(
      "estimatedPlaceholderValueCents",
    );
  });
});