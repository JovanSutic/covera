import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import FieldIncidentPage from "./FieldIncidentPage";
import type { FieldIngest } from "@/api/generated/requests/types.gen";

const { useFieldIngest, submitFieldPhotos } = vi.hoisted(() => ({
  useFieldIngest: vi.fn(),
  submitFieldPhotos: vi.fn(),
}));

// Both spreads are mandatory. `registry.ts` dereferences each query module's `xResource`
// export at load and `defineRoutes` imports it, so a wholesale replacement erases the
// resource and the route tree dies before any test runs; and `fieldIncident.ts` is the
// module the page imports its two functions from, so a factory that did not spread would
// hand the page a different module.
vi.mock("@/lib/api/queries/fieldIngest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/queries/fieldIngest")>()),
  useFieldIngest,
}));
vi.mock("@/lib/api/fieldIncident", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/fieldIncident")>()),
  submitFieldPhotos,
}));

const TOKEN = "0123456789abcdef0123456789abcdef";

function ingest(overrides: Partial<FieldIngest> = {}): FieldIngest {
  return {
    incidentType: "damage",
    itemStatus: "link_generated",
    asset: {
      id: "asset-1",
      name: "Bedroom Curtains",
      roomLocation: "BEDROOM_PRIMARY",
      description: null,
    },
    apartmentName: "Villa Aurora",
    baselinePhotos: [],
    // The SERVER's answer, and the only source for "what must be shot" (D21).
    requiredEvidenceTypes: ["damage_photo_wide", "damage_photo_closeup"],
    attachedEvidenceCounts: {},
    tokenExpiresAt: "2026-11-08T20:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/field/incident/${TOKEN}`]}>
        {/* The matching Route is not decoration: `useRouteParams` reads `useParams()`,
            and that is `{}` for anything rendered outside a matched route. The route is
            declared here rather than by importing `outsideRoutes`, which would run the
            real loaders. */}
        <Routes>
          <Route path="/field/incident/:token" element={<FieldIncidentPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useFieldIngest.mockReset();
  submitFieldPhotos.mockReset();
  submitFieldPhotos.mockResolvedValue({
    success: true,
    itemStatus: "photos_collected",
    evidenceCount: 2,
  });
  useFieldIngest.mockReturnValue({ data: ingest(), isLoading: false, isError: false });

  // jsdom implements no `URL.createObjectURL`, and the capture path calls it.
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:field-preview") });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Drives a real hidden input, exactly as `ShotStepPanel.camera.test.tsx` does. `index` is
 * the position in the document's input list, which is the row order the server sent.
 *
 * The dispatch is wrapped in `act` — the one place this differs from that precedent. There,
 * the handler's only effect is a call to a mocked `onCapture`; here it sets the page's
 * capture state, and a raw dispatch settles that update outside React and warns.
 */
async function shoot(index: number) {
  const inputs = document.querySelectorAll('input[type="file"]');
  const input = inputs[index] as HTMLInputElement;
  const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });

  Object.defineProperty(input, "files", { value: [file], configurable: true });
  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await waitFor(() => {
    expect(input).toBeDefined();
  });
}

describe("loading and the unusable link", () => {
  it("says it is opening the link", () => {
    useFieldIngest.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    renderPage();

    expect(screen.getByText("fieldIncident.loading")).toBeInTheDocument();
  });

  it("shows ONE screen for a rejected token, and no capture form", () => {
    // Unknown, expired and already-used all arrive here as the same `404`
    // `FIELD_TOKEN_INVALID` (D23), so there is one branch and this is it.
    useFieldIngest.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    renderPage();

    expect(screen.getByText("fieldIncident.unusable.title")).toBeInTheDocument();
    expect(screen.getByText("fieldIncident.unusable.body")).toBeInTheDocument();
    expect(screen.queryByText("fieldIncident.views.title")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

describe("the views the server asked for", () => {
  it("renders one capture control per required type, and none for a type it omits", () => {
    useFieldIngest.mockReturnValue({
      data: ingest({ requiredEvidenceTypes: ["damage_photo_wide", "damage_photo_closeup"] }),
      isLoading: false,
      isError: false,
    });

    renderPage();

    // Two required types → two controls. `t` returns its key, so an assertion on the
    // label would be identical for both rows; the COUNT is what distinguishes them.
    expect(screen.getAllByText("fieldIncident.views.capture")).toHaveLength(2);
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(2);
  });

  it("draws its list from the server, so a theft item gets the theft view", () => {
    useFieldIngest.mockReturnValue({
      data: ingest({
        incidentType: "theft",
        requiredEvidenceTypes: ["theft_empty_space_photo"],
      }),
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getAllByText("fieldIncident.views.capture")).toHaveLength(1);
    // `requiredPhotoTypes` (phase 1) is keyed off `IncidentItem["type"]` and would have
    // produced the SAME answer for both items — which is exactly why this page reads the
    // server's list instead (D21).
  });

  it("ignores a required type this portal cannot produce, rather than locking the form", () => {
    // `requiredEvidenceTypes` is `Array<string>`. A document type — or anything else the
    // backend might add — must not become an unshootable row that keeps the submit
    // disabled forever.
    useFieldIngest.mockReturnValue({
      data: ingest({
        requiredEvidenceTypes: [
          "damage_photo_wide",
          "original_purchase_receipt",
          "something_new",
        ],
      }),
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getAllByText("fieldIncident.views.capture")).toHaveLength(1);
  });

  it("reports a view the server says is already partly covered", () => {
    useFieldIngest.mockReturnValue({
      data: ingest({
        requiredEvidenceTypes: ["damage_photo_wide"],
        attachedEvidenceCounts: { damage_photo_wide: 1 },
      }),
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(
      screen.getByText("fieldIncident.views.alreadyProvided"),
    ).toBeInTheDocument();
  });
});

describe("the framing reference", () => {
  it("renders the signed baseline URL exactly as the server sent it", () => {
    useFieldIngest.mockReturnValue({
      data: ingest({
        baselinePhotos: [
          { storageKey: "baseline/one.jpg", downloadUrl: "https://r2.example/signed?x=1" },
        ],
      }),
      isLoading: false,
      isError: false,
    });

    renderPage();

    const image = screen.getByAltText("fieldIncident.baseline.alt");

    // AS-IS. Prefixing this with `VITE_R2_IMAGE_URL` — the host panel's pattern for a
    // bare `storageKey` — would produce a URL that 404s and looks like a lost photo.
    expect(image).toHaveAttribute("src", "https://r2.example/signed?x=1");
  });

  it("says there is nothing to compare against when the backend sent no baseline", () => {
    renderPage();

    expect(
      screen.queryByAltText("fieldIncident.baseline.alt"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("fieldIncident.baseline.none")).toBeInTheDocument();
  });
});

describe("capturing", () => {
  it("will not send until every required view has been shot", async () => {
    renderPage();

    const submit = screen.getByRole("button", { name: "fieldIncident.submit" });

    expect(submit).toBeDisabled();
    expect(screen.getByText("fieldIncident.views.missing")).toBeInTheDocument();

    await shoot(0);

    // One of two — still withheld.
    expect(
      screen.getByRole("button", { name: "fieldIncident.submit" }),
    ).toBeDisabled();

    await shoot(1);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "fieldIncident.submit" }),
      ).not.toBeDisabled();
    });
  });

  it("replaces a view rather than queueing a second shot of it", async () => {
    useFieldIngest.mockReturnValue({
      data: ingest({ requiredEvidenceTypes: ["damage_photo_wide"] }),
      isLoading: false,
      isError: false,
    });

    renderPage();

    await shoot(0);

    expect(screen.getByText("fieldIncident.views.captured")).toBeInTheDocument();

    await shoot(0);

    // One row, one slot: "Replace" does not mean "upload twice".
    expect(screen.getAllByText("fieldIncident.views.captured")).toHaveLength(1);
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1);
  });

  it("sends once, with each view and its file, and shows the safe-to-leave screen", async () => {
    renderPage();

    await shoot(0);
    await shoot(1);

    await userEvent.click(
      screen.getByRole("button", { name: "fieldIncident.submit" }),
    );

    await waitFor(() => {
      expect(submitFieldPhotos).toHaveBeenCalledTimes(1);
    });

    const [token, uploads] = submitFieldPhotos.mock.calls[0] as [
      string,
      Array<{ evidenceType: string; file: File }>,
    ];

    expect(token).toBe(TOKEN);
    expect(uploads.map((upload) => upload.evidenceType).sort()).toEqual([
      "damage_photo_closeup",
      "damage_photo_wide",
    ]);
    expect(uploads[0].file).toBeInstanceOf(File);

    // D22: the done screen. The token is spent by the submit, so anything that navigated
    // or re-read would show the cleaner the unusable-link screen at the worst moment.
    expect(screen.getByText("fieldIncident.done.title")).toBeInTheDocument();
    expect(screen.getByText("fieldIncident.done.body")).toBeInTheDocument();
    // No way onward, and nothing asking them to do it again.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "fieldIncident.submit" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the cleaner on their photos when the server refuses the submit", async () => {
    submitFieldPhotos.mockRejectedValue({ error: { message: "EVIDENCE_TYPE_MISMATCH" } });

    renderPage();

    await shoot(0);
    await shoot(1);

    await userEvent.click(
      screen.getByRole("button", { name: "fieldIncident.submit" }),
    );

    await waitFor(() => {
      expect(submitFieldPhotos).toHaveBeenCalledTimes(1);
      // The label flips back from `submitting` only once the rejection has been handled,
      // so waiting on it is what flushes the mutation's state update inside `act` —
      // asserting the call count alone leaves the re-render unsettled and React reports
      // an `act(...)` warning that has nothing to do with what this test checks.
      expect(
        screen.queryByText("fieldIncident.submitting"),
      ).not.toBeInTheDocument();
    });

    // Still the capture screen, with the work intact — a failed send must not cost them
    // the four photos they just walked the apartment for.
    expect(screen.queryByText("fieldIncident.done.title")).not.toBeInTheDocument();
    expect(screen.getAllByText("fieldIncident.views.captured")).toHaveLength(2);
  });
});

describe("the anonymous contract", () => {
  it("passes the token straight through, with no auth layer in between", async () => {
    renderPage();

    await shoot(0);
    await shoot(1);

    await userEvent.click(
      screen.getByRole("button", { name: "fieldIncident.submit" }),
    );

    await waitFor(() => {
      expect(submitFieldPhotos).toHaveBeenCalledTimes(1);
      // Waiting on the settled screen, not just the call: the mutation's `onSuccess`
      // state update has to land inside `act`, or React reports it.
      expect(screen.getByText("fieldIncident.done.title")).toBeInTheDocument();
    });

    // The whole call shape is `(token, uploads)`. There is no config object, no client
    // and no session anywhere in the signature — which is what invariant 10 means in
    // practice: this page has nothing to authenticate WITH.
    expect(submitFieldPhotos.mock.calls[0]).toHaveLength(2);
  });
});
