import { useMemo } from "react";
import { AccessLink } from "@/components/router/AccessLink";
import { appPaths } from "@/lib/router/paths";
import { useApartmentsHost } from "@/lib/api/queries/apartment";
import type { ApartmentWithLocation } from "@/api/generated/requests/types.gen";
import type { ColumnDef } from "@/types/component.types";
import { DataTable } from "../DataTable";
import { useTranslation } from "react-i18next";

export default function ApartmentsSection() {
  const { t, i18n } = useTranslation("assets");

  const { data: apartments, isLoading: apartmentsIsLoading } = useApartmentsHost();

  const columns: ColumnDef<ApartmentWithLocation>[] = useMemo(
    () => [
      {
        header: t("apartments.list.columns.name"),
        accessorKey: (row) => (
          <AccessLink
            to={appPaths.hostApartment}
            params={{ id: row.id }}
            className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors"
          >
            {row.name}
          </AccessLink>
        ),
      },
      {
        header: t("apartments.list.columns.address"),
        accessorKey: "address",
        className: "text-gray-500",
      },
      {
        header: t("apartments.list.columns.location"),
        accessorKey: (row) => (
          <span className="text-xs font-mono text-gray-500">
            {row.location?.name || "—"}
          </span>
        ),
        className: "text-gray-700 font-medium",
      },
      {
        header: t("apartments.list.columns.externalId"),
        accessorKey: (row) => (
          <span className="text-xs font-mono text-gray-500">
            {row.externalId || "—"}
          </span>
        ),
      },
      {
        header: t("apartments.list.columns.createdDate"),
        accessorKey: (row) => {
          return new Date(row.createdAt).toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        },
        className: "text-xs",
      },
    ],
    [t, i18n.language],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"></div>

      <DataTable
        data={apartments}
        columns={columns}
        isLoading={apartmentsIsLoading}
        emptyMessage={t("apartments.list.emptyMessage")}
      />
    </div>
  );
}