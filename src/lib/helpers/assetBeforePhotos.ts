import type { ReservationPhotos } from "@/api/generated/requests/types.gen";

export interface BeforePhoto {
  id: string;
  storageKey: string;
}

/**
 * The photos that show `assetId` BEFORE this stay — D6.
 *
 * `GET /reservations/{id}/photos` returns `ShotWithAssets[]` outside the incident
 * module entirely: each shot carries the assets it covers and its own images, each
 * tagged `checkin_state` or `damage`. An asset can appear in more than one shot, so the
 * match is over EVERY shot whose `assets` include it, and the ids are deduped.
 *
 * `status === "active" && deletedAt === null` rather than either one alone: a
 * soft-deleted image has both fields disagreeing in some legacy rows, and this strip is
 * evidence the guest never deleted.
 */
export function assetBeforePhotos(
  photos: ReservationPhotos | undefined,
  assetId: string,
): BeforePhoto[] {
  if (!photos) return [];

  const seen = new Set<string>();
  const before: BeforePhoto[] = [];

  for (const shot of photos) {
    if (!shot.assets.some((asset) => asset.id === assetId)) continue;

    for (const image of shot.images) {
      if (image.type !== "checkin_state") continue;
      if (image.status !== "active" || image.deletedAt !== null) continue;
      if (seen.has(image.id)) continue;

      seen.add(image.id);
      before.push({ id: image.id, storageKey: image.storageKey });
    }
  }

  return before;
}
