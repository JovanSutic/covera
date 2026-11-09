import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { IncidentFieldLink } from "./IncidentFieldLink";
import { buildPath, appPaths } from "@/lib/router";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

const { reissueItemTokenMock, writeText, onTokenIssued } = vi.hoisted(() => ({
  reissueItemTokenMock: vi.fn(),
  writeText: vi.fn(),
  onTokenIssued: vi.fn(),
}));

// The spread is mandatory, for the reason phase 7's other test file gives: the page and
// two other components import `incidentClaims.ts`, and a wholesale replacement would
// hand them a DIFFERENT module.
//
// `reissueItemToken` is deliberately NOT imported above. `vi.mock`'s factory replaces it,
// so a top-level binding for it would be an unused local — `noUnusedLocals` fails the
// gate on exactly that, which is how step 7.1 lost an `ActionButton` import.
vi.mock("@/lib/api/incidentClaims", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/incidentClaims")>()),
  reissueItemToken: reissueItemTokenMock,
}));

const NOW = Date.parse("2026-11-08T12:00:00.000Z");
const TOKEN = "0123456789abcdef0123456789abcdef";
const INCIDENT_ID = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  reissueItemTokenMock.mockReset();
  writeText.mockReset();
  onTokenIssued.mockReset();
  reissueItemTokenMock.mockResolvedValue({ id: "item-1", cleanerToken: "f".repeat(32) });
  writeText.mockResolvedValue(undefined);

  // jsdom has no `navigator.clipboard` property AT ALL, so it is defined rather than
  // spied on — `vi.spyOn` on an absent property throws. `configurable` so `afterEach`
  // can take it back off and the next file starts from the same clean state.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).clipboard;
});

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "item-1",
    incidentId: INCIDENT_ID,
    assetId: "asset-1",
    type: "damage",
    status: "link_generated",
    // One hour BEFORE NOW: the link lapsed, so `isItemLinkLive` is false and
    // `canReissueItemLink` is true. That is the D17 state, and pinning it is this
    // file's reason to exist.
    tokenExpiresAt: "2026-11-08T11:00:00.000Z",
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

function renderCard(subject: IncidentItem, token: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IncidentFieldLink
        incidentId={INCIDENT_ID}
        item={subject}
        token={token}
        now={NOW}
        onTokenIssued={onTokenIssued}
      />
    </QueryClientProvider>,
  );
}

describe("with no token in hand", () => {
  it("shows the link's state and offers nothing to copy", () => {
    // D50: this is the NORMAL state on a page load, not an error. `GET /incidents/{id}`
    // answers with `IncidentItem`, which has no token field at all.
    renderCard(item(), null);

    expect(
      screen.getByText("incidentPage.fieldLink.notInThisSession"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "incidentPage.fieldLink.copy" }),
    ).not.toBeInTheDocument();
  });

  it("still offers reissue once the lapsed link is the problem", () => {
    renderCard(item(), null);

    expect(
      screen.getByRole("button", { name: "incidentPage.fieldLink.reissue" }),
    ).toBeInTheDocument();
  });
});

describe("with a token in hand", () => {
  it("builds the link from the field route, not by concatenation", () => {
    renderCard(item({ tokenExpiresAt: "2026-11-08T13:00:00.000Z" }), TOKEN);

    // The assertion is against the router's own builder, so a component that
    // hand-wrote "/field/incident/…" would fail it.
    expect(screen.getByLabelText("incidentPage.fieldLink.label")).toHaveValue(
      buildPath(appPaths.fieldIncident, { token: TOKEN }),
    );
  });

  it("reports the link as live while the item is still collectable", () => {
    renderCard(item({ tokenExpiresAt: "2026-11-08T13:00:00.000Z" }), TOKEN);

    expect(screen.getByText("incidentPage.fieldLink.live")).toBeInTheDocument();
    // D17: nothing to reissue — the link works.
    expect(
      screen.queryByRole("button", { name: "incidentPage.fieldLink.reissue" }),
    ).not.toBeInTheDocument();
  });

  it("reports a token whose item has left link_generated as used or expired", () => {
    // The backend burns the token the moment status leaves `link_generated`, so a token
    // still sitting in this session's map is stale, not usable.
    renderCard(item({ status: "photos_collected" }), TOKEN);

    expect(
      screen.getByText("incidentPage.fieldLink.usedOrExpired"),
    ).toBeInTheDocument();
  });

  it("copies the link itself, and flips its own label", async () => {
    renderCard(item({ tokenExpiresAt: "2026-11-08T13:00:00.000Z" }), TOKEN);

    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.fieldLink.copy" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    expect(writeText).toHaveBeenCalledWith(
      buildPath(appPaths.fieldIncident, { token: TOKEN }),
    );
    // The control's own acknowledgement. The 2s reset is a courtesy, not a data path.
    expect(
      screen.getByRole("button", { name: "incidentPage.fieldLink.copied" }),
    ).toBeInTheDocument();
  });

  it("survives a clipboard that refuses", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    renderCard(item({ tokenExpiresAt: "2026-11-08T13:00:00.000Z" }), TOKEN);

    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.fieldLink.copy" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    // Still the un-copied label and still on screen: the `try/catch` is what keeps a
    // denied clipboard from taking the card down with it (the D25 precedent).
    expect(
      screen.getByRole("button", { name: "incidentPage.fieldLink.copy" }),
    ).toBeInTheDocument();
  });
});

describe("reissue", () => {
  it("hands the new token up, because nothing else can supply it later", async () => {
    renderCard(item(), TOKEN);

    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.fieldLink.reissue" }),
    );

    await waitFor(() => {
      expect(reissueItemTokenMock).toHaveBeenCalledWith(INCIDENT_ID, "item-1");
    });

    // D50: the response is the only place the new token exists. A component that kept
    // it to itself would leave the page showing a link it cannot copy.
    expect(onTokenIssued).toHaveBeenCalledWith("f".repeat(32));
  });

  it("does not offer itself for an item that is already complete", () => {
    // `reissueToken` matches only `status = 'link_generated'`, so a control here would
    // be an action the API cannot satisfy (D17).
    renderCard(
      item({ status: "complete", tokenExpiresAt: "2026-11-01T00:00:00.000Z" }),
      TOKEN,
    );

    expect(
      screen.queryByRole("button", { name: "incidentPage.fieldLink.reissue" }),
    ).not.toBeInTheDocument();
  });
});
