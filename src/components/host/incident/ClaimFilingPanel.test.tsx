/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ClaimFilingPanel } from "./ClaimFilingPanel";
import { formatCents } from "@/lib/helpers/claimMoney";
import type {
  IncidentItem,
  IncidentWithItems,
} from "@/api/generated/requests/types.gen";

const { setIncidentPayout, confirmAirbnbFiling, writeText } = vi.hoisted(() => ({
  setIncidentPayout: vi.fn(),
  confirmAirbnbFiling: vi.fn(),
  writeText: vi.fn(),
}));

// The spread is mandatory: the page, the item list and the evidence panel all import
// this module, and a wholesale replacement would hand them a DIFFERENT module.
vi.mock("@/lib/api/incidentClaims", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/incidentClaims")>()),
  setIncidentPayout,
  confirmAirbnbFiling,
}));

beforeEach(() => {
  setIncidentPayout.mockReset();
  confirmAirbnbFiling.mockReset();
  writeText.mockReset();
  setIncidentPayout.mockResolvedValue({ id: "incident-1" });
  confirmAirbnbFiling.mockResolvedValue({ id: "incident-1" });
  writeText.mockResolvedValue(undefined);

  // jsdom implements no clipboard at all, so it is defined rather than spied on.
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";
const NOW = Date.parse("2026-11-08T12:00:00.000Z");

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "item-1",
    incidentId: "incident-1",
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
    ...overrides,
  };
}

function incident(overrides: Partial<IncidentWithItems> = {}): IncidentWithItems {
  return {
    id: "incident-1",
    reservationId: "11111111-1111-1111-1111-111111111111",
    status: "ready_to_file",
    isEmergencyMode: false,
    placeholderTotalAmountCents: 5000,
    finalPayoutRequestedCents: 0,
    resolutionCenterSubmittedAt: null,
    guestResponseDeadlineAt: null,
    aircoverEscalationDeadlineAt: "2026-12-08T12:00:00.000Z",
    createdAt: "2026-11-08T10:00:00.000Z",
    updatedAt: "2026-11-08T10:00:00.000Z",
    items: [item()],
    ...overrides,
  };
}

function renderPanel(subject: IncidentWithItems, now: number = NOW) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ClaimFilingPanel
        incident={subject}
        apartmentId={APARTMENT_ID}
        guestName="Ada Lovelace"
        apartmentName="Villa Aurora"
        now={now}
      />
    </QueryClientProvider>,
  );
}

describe("the figures", () => {
  it("reports the items subtotal through formatCents", () => {
    const { container } = renderPanel(
      incident({
        items: [
          item({ estimatedPlaceholderValueCents: 5000 }),
          item({ id: "item-2", assetId: "asset-2", estimatedPlaceholderValueCents: 2500 }),
        ],
      }),
    );

    // A literal "€75.00" is not stable across ICU versions or locales, so the figure
    // is asserted against the formatter itself.
    expect(container.textContent).toContain(formatCents(7500));
  });

  it("stops calling the total provisional once a final figure is set", () => {
    renderPanel(incident({ finalPayoutRequestedCents: 9000 }));

    expect(
      screen.getByText("incidentPage.filing.figures.final"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("incidentPage.filing.figures.provisional"),
    ).not.toBeInTheDocument();
  });

  it("saves the typed figure as cents, and refuses an unusable one", async () => {
    renderPanel(incident());

    const field = screen.getByLabelText("incidentPage.filing.figures.valueHint");

    await userEvent.clear(field);
    await userEvent.type(field, "120,50");
    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.filing.figures.save" }),
    );

    await waitFor(() => {
      expect(setIncidentPayout).toHaveBeenCalledWith("incident-1", 12050);
    });

    // `parseCentsFromInput("abc")` is `null`, so the save is withheld rather than
    // sending 0 for a figure the host never stated (phase 2's rule).
    await userEvent.clear(field);
    await userEvent.type(field, "abc");

    expect(
      screen.getByRole("button", { name: "incidentPage.filing.figures.save" }),
    ).toBeDisabled();
  });
});

describe("the copy block", () => {
  it("copies exactly what the panel is showing, not a second rendering of it", async () => {
    const subject = incident({ finalPayoutRequestedCents: 9000 });
    const { container } = renderPanel(subject);

    const shown = (container.querySelector("textarea") as HTMLTextAreaElement).value;

    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.filing.message.copy" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    // The identity this asserts is "the copied text IS the displayed text". Under
    // `test-setup.ts`'s one-parameter `t` the interpolations never reach either string
    // — both hold the bare keys — so comparing them to each other is the assertion
    // that survives, and a panel that copied a differently-built string fails it.
    expect(writeText.mock.calls[0][0]).toBe(shown);

    // And that text is `buildClaimMessage`'s, built from the panel's own inputs:
    // the header and total-line keys it was handed through `MESSAGE_LABELS`, and one
    // item line per item. A panel that invented its own sentence fails this.
    expect(shown).toContain("incidentPage.message.header");
    expect(shown).toContain("incidentPage.message.itemLine");
    expect(shown).toContain("incidentPage.message.totalLine");
    expect(shown.split("\n").filter((line) => line.includes("incidentPage.message.itemLine")))
      .toHaveLength(subject.items.length);

    // The figure is NOT asserted inside `shown`, and that is the point of this line:
    // `buildClaimMessage` interpolates `formatCents(9000)` through its second `t`
    // argument, and the setup mock's `t` takes ONE parameter — so the interpolated
    // value never reaches the string in this environment. Asserting it on `shown`
    // would be asserting something the mock makes impossible. What IS real is the
    // panel's own figures section, which renders `formatCents` directly rather than
    // through `t`, so that is where the amount is pinned.
    expect(container.textContent).toContain(formatCents(9000));
  });

  it("reports a clipboard failure instead of throwing", async () => {
    writeText.mockRejectedValue(new Error("denied"));

    renderPanel(incident());

    await userEvent.click(
      screen.getByRole("button", { name: "incidentPage.filing.message.copy" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    // The panel is still on screen and usable — the copy path has no throw in it.
    expect(
      screen.getByRole("button", { name: "incidentPage.filing.message.copy" }),
    ).toBeInTheDocument();
  });

  it("puts the deep link behind one constant, opened safely", () => {
    renderPanel(incident());

    const link = screen.getByRole("link", {
      name: "incidentPage.filing.openResolutionCenter",
    });

    expect(link).toHaveAttribute("href", "https://www.airbnb.com/resolutions");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});

describe("the filing control", () => {
  it("is withheld below ready_to_file, because the API would refuse the write", () => {
    renderPanel(incident({ status: "draft" }));

    expect(
      screen.getByRole("button", { name: "incidentPage.filing.confirm" }),
    ).toBeDisabled();
    expect(
      screen.getByText("incidentPage.filing.notReadyHint"),
    ).toBeInTheDocument();
  });

  it("files once when the claim is ready", async () => {
    renderPanel(incident({ status: "ready_to_file" }));

    const confirm = screen.getByRole("button", {
      name: "incidentPage.filing.confirm",
    });

    expect(confirm).not.toBeDisabled();

    await userEvent.click(confirm);

    await waitFor(() => {
      expect(confirmAirbnbFiling).toHaveBeenCalledTimes(1);
    });

    expect(confirmAirbnbFiling).toHaveBeenCalledWith("incident-1");
  });
});

describe("the guest-response clock", () => {
  it("is absent while the claim is unfiled", () => {
    renderPanel(incident({ guestResponseDeadlineAt: null }));

    expect(
      screen.queryByText("incidentPage.filing.countdown.title"),
    ).not.toBeInTheDocument();
  });

  it("counts the hours and minutes left from the INJECTED clock", () => {
    const { container } = renderPanel(
      incident({
        status: "submitted_to_guest",
        guestResponseDeadlineAt: "2026-11-09T11:30:00.000Z",
      }),
    );

    // 23h 30m from NOW. `t` returns the key and drops the interpolations, so the
    // numbers are asserted through `container.textContent`, which still holds them.
    expect(
      screen.getByText("incidentPage.filing.countdown.guest"),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("incidentPage.filing.countdown.guest");
  });

  it("reports both windows as closed rather than counting up", () => {
    renderPanel(
      incident({
        status: "submitted_to_guest",
        guestResponseDeadlineAt: "2026-11-08T11:00:00.000Z",
        aircoverEscalationDeadlineAt: "2026-11-01T12:00:00.000Z",
      }),
    );

    expect(
      screen.getByText("incidentPage.filing.countdown.guestOverdue"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("incidentPage.filing.countdown.aircoverOverdue"),
    ).toBeInTheDocument();
  });
});

describe("the emergency banner", () => {
  it("renders only when the claim is in emergency mode", () => {
    const { unmount } = renderPanel(incident({ isEmergencyMode: true }));

    expect(
      screen.getByText("incidentPage.filing.emergency.title"),
    ).toBeInTheDocument();
    // D18: a pulse, never a flash — a large flashing region is a photosensitivity and
    // vestibular hazard (WCAG 2.2.2), and the blueprint asks for one.
    expect(document.querySelector(".animate-pulse")).not.toBeNull();

    unmount();

    renderPanel(incident({ isEmergencyMode: false }));

    expect(
      screen.queryByText("incidentPage.filing.emergency.title"),
    ).not.toBeInTheDocument();
  });
});
