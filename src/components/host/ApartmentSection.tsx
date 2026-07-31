import { withAuth } from "@/lib/api/api";
import { getApartmentsHostMe } from "@/api/generated/requests/sdk.gen";
import { useQuery } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import type { ApartmentWithLocation } from "@/api/generated/requests/types.gen";
import type { ColumnDef } from "@/types/component.types";
import { DataTable } from "../DataTable";

export default function ApartmentsSection() {
  const { data: apartments, isLoading: apartmentsIsLoading } = useQuery({
    queryKey: [...QUERY_ACTIONS.APARTMENTS_GET_HOST],
    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getApartmentsHostMe(config);
      return response.data;
    },
  });

  const columns: ColumnDef<ApartmentWithLocation>[] = [
    {
      header: "Apartment Name",
      accessorKey: "name",
      className: "font-medium text-gray-900",
    },
    {
      header: "Address",
      accessorKey: "address",
      className: "text-gray-500",
    },
    {
      header: "Location",
      accessorKey: (row) => (
        <span className="text-xs font-mono text-gray-500">
          {row.location?.name || "—"}
        </span>
      ),
      className: "text-gray-700 font-medium",
    },
    {
      header: "External ID",
      accessorKey: (row) => (
        <span className="text-xs font-mono text-gray-500">
          {row.externalId || "—"}
        </span>
      ),
    },
    {
      header: "Created Date",
      accessorKey: (row) => {
        return new Date(row.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
      className: "text-xs",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"></div>

      <DataTable
        data={apartments}
        columns={columns}
        isLoading={apartmentsIsLoading}
        emptyMessage="No apartments found in the system database."
      />
    </div>
  );
}
