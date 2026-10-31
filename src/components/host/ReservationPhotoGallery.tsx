import { useTranslation } from "react-i18next";
import type { ShotWithAssets } from "@/api/generated/requests/types.gen";
import { RoomPhotoItem } from "@/components/guest/RoomPhotoItem";
import Typography from "@/components/Typography";

/**
 * D11: the photos are rendered by the SAME component the guest sees
 * (`RoomPhotoItem`), grouped by room — in `mode="host"`, which drops the flag
 * affordance and the "verify these items" prompt. That is prep §4's ask: flagging an
 * issue is the guest's action, and the host's copy of this view is a record of what
 * the guest submitted, not a form they fill in.
 *
 * There is no `isFlagDisabled` here any more: the prop is about a control host mode
 * does not render, so passing it would be a claim with no reader.
 */
export function ReservationPhotoGallery({
  shots,
}: {
  shots: ShotWithAssets[];
}) {
  const { t } = useTranslation(["host", "assets"]);

  const roomGroups = new Map<string, ShotWithAssets[]>();
  for (const shot of shots) {
    const existing = roomGroups.get(shot.roomLocation) ?? [];
    existing.push(shot);
    roomGroups.set(shot.roomLocation, existing);
  }

  return (
    <div className="mt-4 space-y-6">
      {[...roomGroups.entries()].map(([roomLocation, roomShots]) => (
        <div key={roomLocation}>
          <Typography type="h4" className="mb-3">
            {t(`assets:roomLocations.${roomLocation}`, {
              defaultValue: roomLocation,
            })}
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomShots.map((shot) => (
              <RoomPhotoItem key={shot.id} shot={shot} mode="host" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
