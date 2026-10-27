import { queryClient } from "@/lib/api/queryClient";
import { apartmentQueryKey, fetchApartment } from "@/lib/api/queries/apartment";
import { getApartmentsHostMe } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import type { SectionRoute } from "../defineRoutes";

export const hostRoutes: SectionRoute = {
  path: "host",
  requires: "canOpenHost",
  // R15: apartment data every host page needs, started once for the section.
  prefetch: () => {
    void queryClient.prefetchQuery({
      queryKey: [...QUERY_ACTIONS.APARTMENTS_GET_HOST],
      queryFn: async ({ signal }) => {
        const config = await withAuth({ signal });
        const response = await getApartmentsHostMe(config);
        return response.data;
      },
      staleTime: 30_000,
    });
  },
  children: [
    { index: true, loader: { to: "dashboard" } },
    {
      path: "dashboard",
      page: () => import("@/pages/host/Dashboard"),
      handle: { crumb: "hostDashboard.title" },
    },
    {
      path: "apartments",
      page: () => import("@/pages/host/ApartmentList"),
      handle: { crumb: "hostApartments.title" },
    },
    {
      path: "apartments/:id",
      params: { id: "uuid" },
      page: () => import("@/pages/host/IndividualApartment"),
      // R12: starts the page's main query; never awaited, so it cannot block.
      prefetch: ({ id }) => {
        void queryClient.prefetchQuery({
          queryKey: apartmentQueryKey(String(id)),
          queryFn: ({ signal }) => fetchApartment(String(id), signal),
          staleTime: 30_000,
        });
      },
      handle: { crumb: "apartmentPage.tabs.ariaLabel" },
    },
  ],
};
