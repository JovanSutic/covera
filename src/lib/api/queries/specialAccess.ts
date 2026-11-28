import { useQuery } from "@tanstack/react-query";

import { listSpecialAccess } from "@/lib/api/specialAccess";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { PREFETCH_STALE_TIME_MS } from "./shared";

/**
 * D6/D7: the host's grants for one reservation. Bearer-authorized — a guest has no business
 * enumerating links, and the backend requires a session for this read.
 *
 * The key carries the reservationId, so two reservations' lists cannot collide. There is no
 * `accessId` in the key: this read is never made with a link.
 */
export function specialAccessListQueryKey(reservationId: string) {
  return [...QUERY_ACTIONS.SPECIAL_ACCESS_LIST, reservationId] as const;
}

export function useSpecialAccessList(reservationId: string | undefined) {
  return useQuery({
    queryKey: specialAccessListQueryKey(reservationId ?? ""),
    queryFn: ({ signal }) => {
      if (!reservationId) throw new Error("reservationIdRequired");
      return listSpecialAccess(reservationId, signal);
    },
    enabled: Boolean(reservationId),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}
