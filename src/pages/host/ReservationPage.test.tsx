import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ReservationPage from "./ReservationPage";
import { AccessProvider, SessionProvider } from "@/lib/router/AppContext";
import { createSessionStore } from "@/lib/router/session";
import type { AccessLayer } from "@/lib/router/access";
import type { Inspection, ReservationWithInspection } from "@/api/generated/requests/types.gen";

const { useReservation, useInspection, useApartmentsHost } = vi.hoisted(() => ({
  useReservation: vi.fn(),
  useInspection: vi.fn(),
  useApartmentsHost: vi.fn(),
}));

// The three reads the page and its children make, mocked at the module boundary so
// no request is attempted and no cache is involved.
//
// `importOriginal` is not optional here. `registry.ts` builds `QUERY_RESOURCES` by
// dereferencing each module's `xResource` export at load, and `defineRoutes` imports
// it — so a wholesale replacement (a bare `() => ({ useReservation })`) erases
// `reservationResource` and collection dies before any test runs. Spreading the real
// module keeps every non-hook export intact and overrides only the hooks.
vi.mock("@/lib/api/queries/reservation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/reservation")>()),
  useReservation,
}));
vi.mock("@/lib/api/queries/inspection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/inspection")>()),
  useInspection,
}));
vi.mock("@/lib/api/queries/apartment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/apartment")>()),
  useApartmentsHost,
}));

const RESERVATION_ID = "11111111-1111-1111-1111-111111111111";
const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";
const INSPECTION_ID = "33333333-3333-3333-3333-333333333333";

/** Far future, so the proof window is `TOO_EARLY` — deterministic, never `EXPIRED`. */
const CHECK_IN = "2099-06-01T14:00:00.000Z";
const CHECK_OUT = "2099-06-05T10:00:00.000Z";

function reservation(overrides: Partial<ReservationWithInspection> = {}): ReservationWithInspection {
  return {
    id: RESERVATION_ID,
    apartmentId: APARTMENT_ID,
    platformReservationId: "AIR-1",
    guestName: "Ada Lovelace",
    guestEmail: "ada@example.com",
    checkInDatetime: CHECK_IN,
    checkOutDatetime: CHECK_OUT,
    alternativeCheckInDatetime: null,
    alternativeCheckOutDatetime: null,
    hasPhotoProof: false,
    status: "PENDING_PROOF",
    proofWindowHours: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    inspection: { id: INSPECTION_ID, reservationId: RESERVATION_ID, createdAt: "2026-01-02T00:00:00.000Z" } as Inspection,
    ...overrides,
  };
}

/** A shot carrying `count` active images. The summary counts ACTIVE, NOT DELETED images. */
function shots(count: number) {
  return [
    {
      id: "shot-1",
      roomLocation: "ENTRANCE_HALLWAY",
      title: "Hallway",
      shotType: "SWEEP_ONLY",
      assets: [],
      images: Array.from({ length: count }, (_, index) => ({
        id: `image-${index}`,
        storageKey: `key-${index}`,
        status: "active",
        deletedAt: null,
        uploadedAt: `2026-01-0${index + 1}T10:00:00.000Z`,
      })),
    },
  ];
}

/**
 * A hand-built `AccessLayer` rather than `createAccess()`. `AccessLink` reads
 * `canOpenPath` synchronously during render, so the simplest honest stub is one
 * that says "this viewer may open it" — and it keeps this test focused on the page
 * rather than on the router's own coverage, which `router.behaviour.test.ts` owns.
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
            initialEntries={[`/host/apartments/${APARTMENT_ID}/reservations/${RESERVATION_ID}`]}
          >
            {/* The matching `Route` is not decoration: `useRouteParams` reads
                `useParams()`, and `useParams()` returns `{}` for anything rendered
                outside a matched route — even under a `MemoryRouter` whose URL
                carries the ids. Without this the page throws
                "found invalid or missing params: {}" before the first assertion.
                The route is declared here rather than by importing `hostRoutes`,
                which would run the real loaders and fetch. */}
            <Routes>
              <Route
                path="/host/apartments/:id/reservations/:reservationId"
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
  // `t()` returns the key (test-setup.ts), so every assertion below is on a key.
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

  useInspection.mockReturnValue({ data: undefined, isLoading: false, isError: false });
});

describe("ReservationPage", () => {
  it("renders the header with the guest and the apartment the shared link must identify", () => {
    useReservation.mockReturnValue({ data: reservation(), isLoading: false, isError: false });

    render(<ReservationPage />, { wrapper: Wrapper });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    // The apartment is the reason the header exists: a guest opening the link has
    // no other way to know which one this is.
    expect(screen.getByText("Sunset Loft")).toBeInTheDocument();
    expect(screen.getByText("Lisbon, 12 Palm Way")).toBeInTheDocument();
  });

  it("renders the three sections, in the order the prep asks for", () => {
    useReservation.mockReturnValue({ data: reservation(), isLoading: false, isError: false });

    render(<ReservationPage />, { wrapper: Wrapper });

    const titles = [
      screen.getByText("reservationPage.proof.title"),
      screen.getByText("reservationPage.time.title"),
      screen.getByText("reservationPage.other.title"),
    ];

    // Document order, not just presence — "proof, then the time and last other" is
    // a layout requirement, and a presence check cannot see it.
    for (const title of titles) expect(title).toBeInTheDocument();

    expect(
      titles[0].compareDocumentPosition(titles[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      titles[1].compareDocumentPosition(titles[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders both proof controls even with no photos, with the photo control disabled", () => {
    useReservation.mockReturnValue({ data: reservation(), isLoading: false, isError: false });
    useInspection.mockReturnValue({ data: { shots: [] }, isLoading: false, isError: false });

    render(<ReservationPage />, { wrapper: Wrapper });

    // The control is PRESENT and DISABLED — never absent. Prep §4's whole point is
    // that the section holds still.
    expect(
      screen.getByRole("button", { name: "reservationPage.proof.takeProofs" }),
    ).toBeInTheDocument();

    const viewProofs = screen.getByRole("button", {
      name: "reservationPage.proof.viewProofs",
    });

    expect(viewProofs).toBeInTheDocument();
    expect(viewProofs).toBeDisabled();
    expect(screen.getByText("reservationPage.proof.lastCapturedNever")).toBeInTheDocument();
  });

  it("enables the photo control once there are active photos, and reports the count", () => {
    useReservation.mockReturnValue({ data: reservation(), isLoading: false, isError: false });
    useInspection.mockReturnValue({ data: { shots: shots(2) }, isLoading: false, isError: false });

    render(<ReservationPage />, { wrapper: Wrapper });

    expect(
      screen.getByRole("button", { name: "reservationPage.proof.viewProofs" }),
    ).not.toBeDisabled();

    // `photoCount` interpolates `{{count}}`, and `t()` is stubbed to return the raw
    // key — so the key coming back with its interpolation intact is the assertion.
    expect(screen.getByText(/reservationPage\.proof\.photoCount/)).toBeInTheDocument();
  });

  it("renders the page's own not-found branch for an unknown reservation", () => {
    useReservation.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<ReservationPage />, { wrapper: Wrapper });

    expect(screen.getByText("reservationPage.notFound.title")).toBeInTheDocument();
  });
});
