import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ReservationActionsMenu } from "./ReservationActionsMenu";
import type { ReservationRow } from "@/types/component.types";

const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";

/** Far future, so every action is available and the menu is fully enabled. */
function row(): ReservationRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    guestName: "Ada Lovelace",
    guestEmail: "ada@example.com",
    checkInDatetime: "2099-06-01T14:00:00.000Z",
    checkOutDatetime: "2099-06-05T10:00:00.000Z",
    platformReservationId: "AIR-1",
    status: "COVERED",
    hasPhotoProof: true,
    proofWindowHours: 4,
  };
}

const columns = [
  { header: "Guest", accessorKey: (r: ReservationRow) => r.guestName },
  {
    header: "Actions",
    accessorKey: (r: ReservationRow) => (
      <ReservationActionsMenu reservation={r} apartmentId={APARTMENT_ID} />
    ),
  },
];

describe("ReservationActionsMenu inside a clickable row", () => {
  let onRowClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onRowClick = vi.fn();
  });

  function renderTable() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <DataTable data={[row()]} columns={columns} onRowClick={onRowClick} />
      </QueryClientProvider>,
    );
  }

  it("does not navigate the row when the trigger opens the menu", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(
      screen.getByRole("button", { name: "reservationActionsMenu.triggerTitle" }),
    );

    expect(screen.getByText("reservationActionsMenu.delete")).toBeInTheDocument();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not navigate the row when a row inside the PORTALLED menu is clicked", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(
      screen.getByRole("button", { name: "reservationActionsMenu.triggerTitle" }),
    );

    // The prep §1 regression: `PopoverContent` renders into `document.body`, so React
    // bubbles this click to the row's `onClick` even though the DOM path never touches
    // the cell. Without `data-row-click-stop` on the portal this navigates to the
    // reservation — which is the "redirected to the reservations/:id page" symptom.
    await user.click(screen.getByText("reservationActionsMenu.delete"));

    expect(onRowClick).not.toHaveBeenCalled();
    // ...and the click produced the confirmation step instead, in place.
    expect(
      screen.getByText("reservationActionsCell.confirm.deleteLabel"),
    ).toBeInTheDocument();
  });

  it("renders the copy row PRESENT and DISABLED when the reservation is not usable", async () => {
    const user = userEvent.setup();
    // A reservation with no inspection and no coverage: the copy action is unavailable.
    const unusable: ReservationRow = {
      ...row(),
      status: "PENDING_PROOF",
      hasPhotoProof: false,
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DataTable
          data={[unusable]}
          columns={columns}
          onRowClick={onRowClick}
        />
      </QueryClientProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "reservationActionsMenu.triggerTitle" }),
    );

    // Prep §7's rule: "no hide and show but make things enabled or disabled". The row
    // must still be THERE — a presence check is what this asserts, and it is the part
    // the rule table's own unit test cannot see.
    const copyRow = screen.getByText("reservationActionsMenu.copyGuestMessage");
    expect(copyRow).toBeInTheDocument();
    expect(copyRow.closest("button")).toBeDisabled();
  });
});
