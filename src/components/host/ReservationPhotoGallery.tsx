import { useTranslation } from "react-i18next";
import type { ShotWithAssets } from "@/api/generated/requests/types.gen";
import { RoomPhotoItem } from "@/components/guest/RoomPhotoItem";
import Typography from "@/components/Typography";

/**
 * D11: the photos are rendered by the SAME component the guest sees
 * (`RoomPhotoItem`), grouped by room, unmodified. Only the flag affordance
 * differs: `isFlagDisabled` is passed `true` because flagging an issue is the
 * guest's action, and the host's copy of this view is a record of what the guest
 * submitted.
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
              <RoomPhotoItem key={shot.id} shot={shot} isFlagDisabled />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
