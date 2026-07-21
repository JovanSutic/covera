import { useMemo, useState } from "react";
import Drawer from "../Drawer";
import CreateApartmentForm from "../forms/CreateApartmentForm";
import { withAuth } from "@/lib/api/api";
import {
  getLocations,
  getUsers,
  getApartments,
} from "@/api/generated/requests/sdk.gen";
import { useQuery } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import Button from "../formItems/Button";
import type { SelectOption } from "@/types/component.types";
import type { Apartment } from "@/api/generated/requests/types.gen";
import type { ColumnDef } from "@/types/component.types";
import { DataTable } from "../DataTable";

export default function ApartmentsSection() {
  const [isApartmentDrawerOpen, setIsApartmentDrawerOpen] = useState(false);

  const { data: apartments, isLoading: apartmentsIsLoading } = useQuery({
    queryKey: [...QUERY_ACTIONS.APARTMENTS_GET_ALL],
    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getApartments(config);
      return response.data;
    },
  });

  const { data: locations, isLoading: locationsIsLoading } = useQuery({
    queryKey: [...QUERY_ACTIONS.LOCATIONS_GET_ALL],
    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getLocations(config);
      return response.data;
    },
  });

  const { data: users, isLoading: usersIsLoading } = useQuery({
    queryKey: [...QUERY_ACTIONS.USERS_GET_ALL, { role: "host" }],

    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getUsers({
        ...config,
        query: {
          role: "host",
        },
      });

      return response.data;
    },
  });

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    (locations || []).forEach((loc) => map.set(loc.id, loc.name));
    return map;
  }, [locations]);

  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    (users || []).forEach((usr) =>
      map.set(usr.id, {
        name: `${usr.firstName} ${usr.lastName}`,
        email: usr.email,
      }),
    );
    return map;
  }, [users]);

  const locationOptions: SelectOption[] = useMemo(() => {
    return (locations || []).map((item) => ({
      value: item.id,
      label: item.name,
    }));
  }, [locations]);

  const userOptions: SelectOption[] = useMemo(() => {
    return (users || []).map((item) => ({
      value: item.id,
      label: `${item.firstName} ${item.lastName}`,
      subLabel: item.email,
    }));
  }, [users]);

  const columns: ColumnDef<Apartment>[] = [
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
      accessorKey: (row) => locationMap.get(row.location) || "—",
      className: "text-gray-700 font-medium",
    },
    {
      header: "Host / Owner",
      accessorKey: (row) => {
        const owner = userMap.get(row.owner);
        if (!owner) return <span className="text-gray-400">—</span>;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{owner.name}</span>
            <span className="text-xs text-gray-500">{owner.email}</span>
          </div>
        );
      },
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
      className: "text-gray-400 text-xs",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setIsApartmentDrawerOpen(true)}
          isLoading={locationsIsLoading || usersIsLoading}
          disabled={locationsIsLoading || usersIsLoading}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer"
        >
          Create Apartment
        </Button>
      </div>

      <DataTable
        data={apartments}
        columns={columns}
        isLoading={apartmentsIsLoading || locationsIsLoading || usersIsLoading}
        emptyMessage="No apartments found in the system database."
      />

      <Drawer
        isOpen={isApartmentDrawerOpen}
        onClose={() => setIsApartmentDrawerOpen(false)}
        title="Create New Apartment"
      >
        <CreateApartmentForm
          onSuccess={() => {
            setIsApartmentDrawerOpen(false);
          }}
          isOpen={isApartmentDrawerOpen}
          ownerOptions={userOptions}
          locationOptions={locationOptions}
        />
      </Drawer>
    </div>
  );
}
