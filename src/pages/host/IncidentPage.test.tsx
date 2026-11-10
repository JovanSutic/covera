import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import IncidentPage from "./IncidentPage";
import { AccessProvider, SessionProvider } from "@/lib/router/AppContext";
import { createSessionStore } from "@/lib/router/session";
import type { AccessLayer } from "@/lib/router/access";
import type {
  IncidentWithItems,
  ReservationWithInspection,
} from "@/api/generated/requests/types.gen";

const { useReservation, useApartmentsHost, useIncidents, useIncident } = vi.hoisted(() => ({
  useReservation: vi.fn(),
  useApartmentsHost: vi.fn(),
  useIncidents: vi.fn(),
  useIncident: vi.fn(),
}));

// `importOriginal` is not optional: `registry.ts` dereferences each module's
// `xResource` export at load and `defineRoutes` imports it, so replacing a module
// wholesale erases `reservationResource` / `incidentsResource` and the tree dies
// before any test runs. Spreading keeps every non-hook export intact.
vi.mock("@/lib/api/queries/reservation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/reservation")>()),
  useReservation,
}));
vi.mock("@/lib/api/queries/apartment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/apartment")>()),
  useApartmentsHost,
}));
vi.mock("@/lib/api/queries/incidents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/incidents")>()),
  useIncidents,
}));
vi.mock("@/lib/api/queries/incident", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/incident")>()),
  useIncident,
}));

const RESERVATION_ID = "11111111-1111-1111-1111-111111111111";
const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";
const INCIDENT_ID = "44444444-4444-4444-4444-444444444444";

function reservation(
  overrides: Partial<ReservationWithInspection> = {},
): ReservationWithInspection {
  return {
    id: RESERVATION_ID,
    apartmentId: APARTMENT_ID,
    platformReservationId: "AIR-1",
    guestName: "Ada Lovelace",
    guestEmail: "ada@example.com",
    checkInDatetime: "2099-06-01T14:00:00.000Z",
    checkOutDatetime: "2099-06-05T10:00:00.000Z",
    alternativeCheckInDatetime: null,
    alternativeCheckOutDatetime: null,
    hasPhotoProof: false,
    status: "PENDING_PROOF",
    proofWindowHours: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    inspection: undefined,
    ...overrides,
  };
}

function incident(overrides: Partial<IncidentWithItems> = {}): IncidentWithItems {
  return {
    id: INCIDENT_ID,
    reservationId: RESERVATION_ID,
    status: "draft",
    isEmergencyMode: false,
    placeholderTotalAmountCents: 0,
    finalPayoutRequestedCents: 0,
    resolutionCenterSubmittedAt: null,
    guestResponseDeadlineAt: null,
    aircoverEscalationDeadlineAt: "2099-12-08T12:00:00.000Z",
    createdAt: "2026-11-08T10:00:00.000Z",
    updatedAt: "2026-11-08T10:00:00.000Z",
    items: [],
    ...overrides,
  };
}

/**
 * A hand-built `AccessLayer` rather than `createAccess()`: `AccessLink` reads
 * `canOpenPath` synchronously during render, and `router.behaviour.test.ts` owns the
 * real coverage. This keeps the test on the page.
 */
function allowAllAccess(): AccessLayer {
  return {
    isAllowed: () => true,
    canOpenPath: () => true,
    getResults: () => ({ public: true, isAnonymous: false, canUseApp: true, canOpenAdmin: false, canOpenHost: true }),
    getSources: () => ({ isAuthenticated: true, role: "host", isAdmin: false, isHost: true, userId: "u1" }),
    subscribe: () => () => {},
    syncFromState: () => false,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const session = createSessionStore({ readUser: async () => null });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <AccessProvider access={allowAllAccess()}>
          <MemoryRouter
            initialEntries={[
              `/host/apartments/${APARTMENT_ID}/reservations/${RESERVATION_ID}/incident`,
            ]}
          >
            {/* The matching `Route` is not decoration: `useRouteParams` reads
                `useParams()`, which returns `{}` outside a matched route — even
                under a MemoryRouter whose URL carries the ids. Declared here rather
                than importing `hostRoutes`, which would run the real loaders. */}
            <Routes>
              <Route
                path="/host/apartments/:id/reservations/:reservationId/incident"
                element={children}
              />
            </Routes>
          </MemoryRouter>
        </AccessProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useApartmentsHost.mockReturnValue({
    data: [
      {
        id: APARTMENT_ID,
        owner: "u1",
        name: "Sunset Loft",
        address: "12 Palm Way",
        location: { id: "l1", name: "Lisbon", country: "PT", type: "city", createdAt: "2026-01-01T00:00:00.000Z" },
        currency: "EUR",
        externalId: "EXT-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    isLoading: false,
  });

  useIncidents.mockReturnValue({
    data: { data: [], pagination: { page: 1, limit: 100, totalItems: 0, totalPages: 0 } },
    isLoading: false,
    isError: false,
  });

  useIncident.mockReturnValue({ data: undefined, isLoading: false, isError: false });

  useReservation.mockReturnValue({ data: reservation(), isLoading: false, isError: false });
});

describe("IncidentPage", () => {
  it("renders the page at all", () => {
    // The regression. `apartmentName` is computed by `useApartmentsHost()` +
    // `apartments?.find((entry) => entry.id === reservation?.apartmentId)`, and the
    // read of `reservation` sits inside an arrow function. That is a DEFERRED
    // reference, so `tsc` sees no error and the gate stays green even when the
    // `useReservation` declaration is placed *below* it — but the arrow runs during
    // render, hits the const's temporal dead zone, and throws
    // "Cannot access 'reservation' before initialization", blanking the route
    // through the error boundary.
    //
    // This test is the only thing in the suite that walks that statement. It fails
    // loudly if the declaration order is ever swapped back.
    render(<IncidentPage />, { wrapper: Wrapper });

    expect(screen.getByText("incidentPage.title")).toBeInTheDocument();
  });

  it("renders the filing panel when the reservation has a claim", () => {
    useIncidents.mockReturnValue({
      data: {
        data: [incident()],
        pagination: { page: 1, limit: 100, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    });
    useIncident.mockReturnValue({ data: incident(), isLoading: false, isError: false });

    render(<IncidentPage />, { wrapper: Wrapper });

    // This walks the whole `claim &&` branch, so `apartmentName` is computed from a
    // real `reservation` and passed down to the panel. Note the limit on what this
    // proves: the global `t` mock returns keys without interpolating, so the RESOLVED
    // name ("Sunset Loft", or "" on a lookup miss) is not observable in the composed
    // message's textarea. The regression guard is the "renders the page at all" test
    // above; this one covers the branch that exists only when a claim is found.
    expect(screen.getByText("incidentPage.filing.message.title")).toBeInTheDocument();
    expect(screen.getByLabelText("incidentPage.filing.message.title")).toBeInTheDocument();
  });

  it("renders its not-found branch for an unknown reservation", () => {
    useReservation.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<IncidentPage />, { wrapper: Wrapper });

    expect(screen.getByText("incidentPage.notFound.title")).toBeInTheDocument();
  });

  it("offers CREATE, not a choice, when the reservation has no claim", () => {
    render(<IncidentPage />, { wrapper: Wrapper });

    expect(screen.getByText("incidentPage.empty.title")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "incidentPage.empty.create" }),
    ).toBeInTheDocument();
  });
});
