import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReservationIncidentSection } from "./ReservationIncidentSection";
import { formatCents } from "@/lib/helpers/claimMoney";
import type { IncidentItem, IncidentWithItems } from "@/api/generated/requests/types.gen";

const { useIncidents } = vi.hoisted(() => ({ useIncidents: vi.fn() }));

// The spread is mandatory: `registry.ts` dereferences `incidentsResource` at load.
vi.mock("@/lib/api/queries/incidents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/incidents")>()),
  useIncidents,
}));

const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";
const RESERVATION_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_RESERVATION_ID = "99999999-9999-9999-9999-999999999999";
const NOW = Date.parse("2026-11-08T12:00:00.000Z");

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
    asset: { id: "asset-1", name: "Bedroom Curtains" } as IncidentItem["asset"],
    evidence: [],
    ...overrides,
  };
}

function incident(overrides: Partial<IncidentWithItems> = {}): IncidentWithItems {
  return {
    id: "incident-1",
    reservationId: RESERVATION_ID,
    status: "draft",
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

function listOf(incidents: IncidentWithItems[]) {
  return {
    data: {
      data: incidents,
      pagination: { page: 1, limit: 100, totalItems: incidents.length, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
  };
}

function renderSection() {
  const onOpenClaim = vi.fn();

  const result = render(
    <ReservationIncidentSection
      apartmentId={APARTMENT_ID}
      reservationId={RESERVATION_ID}
      now={NOW}
      onOpenClaim={onOpenClaim}
    />,
  );

  return { ...result, onOpenClaim };
}

beforeEach(() => {
  useIncidents.mockReset();
  useIncidents.mockReturnValue(listOf([]));
});

describe("the read", () => {
  it("asks for the APARTMENT's claims, because that is the only filter the API has", () => {
    renderSection();

    expect(useIncidents).toHaveBeenCalledWith({ apartmentId: APARTMENT_ID });
  });

  it("ignores a claim belonging to another reservation", () => {
    // D11: there is no incident-by-reservation endpoint, so the match happens here.
    // A claim for a different stay must not be reported as this one's.
    useIncidents.mockReturnValue(
      listOf([incident({ reservationId: OTHER_RESERVATION_ID })]),
    );

    renderSection();

    expect(screen.getByText("reservationPage.incident.emptyTitle")).toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.openClaim")).not.toBeInTheDocument();
  });
});

describe("the four states", () => {
  it("renders the loading branch before the list has an answer", () => {
    useIncidents.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    renderSection();

    expect(screen.getByText("reservationPage.incident.loading")).toBeInTheDocument();
  });

  it("renders an error branch with no create control", () => {
    // "No claim" is not a safe conclusion from a failed read: the host may have one,
    // and the create call would answer INCIDENT_ALREADY_EXISTS.
    useIncidents.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    renderSection();

    expect(screen.getByText("reservationPage.incident.error")).toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.startClaim")).not.toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.openClaim")).not.toBeInTheDocument();
  });

  it("renders the explanatory empty state when the apartment has no claim for this stay", () => {
    renderSection();

    expect(screen.getByText("reservationPage.incident.emptyTitle")).toBeInTheDocument();
    expect(screen.getByText("reservationPage.incident.emptyBody")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "reservationPage.incident.startClaim" }),
    ).toBeInTheDocument();
  });

  it("reports the status, the item count and the total once a claim exists", () => {
    useIncidents.mockReturnValue(
      listOf([
        incident({ items: [item({ estimatedPlaceholderValueCents: 5000 }), item({ estimatedPlaceholderValueCents: 2500 })] }),
      ]),
    );

    const { container } = renderSection();

    // t() returns the key, so the chip is asserted by its key, and the figures are
    // asserted against `formatCents` itself rather than against a locale-dependent
    // literal ("€75.00" is not stable across ICU versions or locales).
    expect(screen.getByText("incidentPage.status.draft")).toBeInTheDocument();
    expect(container.textContent).toContain("reservationPage.incident.itemCount");
    expect(container.textContent).toContain("reservationPage.incident.total");
    expect(container.textContent).toContain(formatCents(7500));
    expect(
      screen.getByRole("button", { name: "reservationPage.incident.openClaim" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.startClaim")).not.toBeInTheDocument();
  });
});

describe("the guest-response clock", () => {
  it("is absent while the claim is unfiled", () => {
    renderSection();

    expect(screen.queryByText("reservationPage.incident.awaitingGuest")).not.toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.guestOverdue")).not.toBeInTheDocument();
  });

  it("counts down once the claim is filed", () => {
    useIncidents.mockReturnValue(
      listOf([
        incident({
          status: "submitted_to_guest",
          resolutionCenterSubmittedAt: "2026-11-08T11:00:00.000Z",
          guestResponseDeadlineAt: "2026-11-09T11:00:00.000Z",
        }),
      ]),
    );

    renderSection();

    // Which KEY was chosen is the branch that can be wrong; the arithmetic inside
    // `countdownParts` is phase 1's, and it is tested there.
    expect(screen.getByText("reservationPage.incident.awaitingGuest")).toBeInTheDocument();
    expect(screen.getByText("incidentPage.status.submittedToGuest")).toBeInTheDocument();
  });

  it("switches to the AirCover deadline once the guest window has closed", () => {
    useIncidents.mockReturnValue(
      listOf([
        incident({
          status: "submitted_to_guest",
          resolutionCenterSubmittedAt: "2026-11-01T11:00:00.000Z",
          guestResponseDeadlineAt: "2026-11-02T11:00:00.000Z",
        }),
      ]),
    );

    renderSection();

    expect(screen.getByText("reservationPage.incident.guestOverdue")).toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.awaitingGuest")).not.toBeInTheDocument();
  });

  it("says so when both windows have closed", () => {
    useIncidents.mockReturnValue(
      listOf([
        incident({
          status: "submitted_to_guest",
          resolutionCenterSubmittedAt: "2026-10-01T11:00:00.000Z",
          guestResponseDeadlineAt: "2026-10-02T11:00:00.000Z",
          aircoverEscalationDeadlineAt: "2026-11-01T11:00:00.000Z",
        }),
      ]),
    );

    renderSection();

    expect(screen.getByText("reservationPage.incident.aircoverOverdue")).toBeInTheDocument();
    expect(screen.queryByText("reservationPage.incident.guestOverdue")).not.toBeInTheDocument();
  });
});

describe("the claim page control", () => {
  it("calls the page's navigation callback once, from the empty state", async () => {
    const { onOpenClaim } = renderSection();

    await userEvent.click(
      screen.getByRole("button", { name: "reservationPage.incident.startClaim" }),
    );

    expect(onOpenClaim).toHaveBeenCalledTimes(1);
  });

  it("calls it from the populated state too", async () => {
    useIncidents.mockReturnValue(listOf([incident()]));

    const { onOpenClaim } = renderSection();

    await userEvent.click(
      screen.getByRole("button", { name: "reservationPage.incident.openClaim" }),
    );

    expect(onOpenClaim).toHaveBeenCalledTimes(1);
  });
});
