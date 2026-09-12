import type { DetailedInspection, ShotWithAssets } from "@/api/generated/requests/types.gen";
import type { RoomFlowStep } from "@/components/guest/RoomFlowList";

export function mapShotsToRoomFlowSteps(shots: DetailedInspection["shots"]): {
  steps: RoomFlowStep[];
} {
  const roomGroups = new Map<
    string,
    {
      roomLocation: string;
      totalShots: number;
      completedShots: number;
      shots: ShotWithAssets[];
    }
  >();

  // Group shots by room location
  shots.forEach((shot) => {
    const key = shot.roomLocation;
    const existing = roomGroups.get(key) || {
      roomLocation: key,
      totalShots: 0,
      completedShots: 0,
      shots: [],
    };

    existing.totalShots += 1;
    existing.shots.push(shot);

    roomGroups.set(key, existing);
  });

  const steps: RoomFlowStep[] = [];

  roomGroups.forEach((group) => {
    const stepId = group.roomLocation;

    steps.push({
      id: stepId,
      room: group.roomLocation,
      proofNumber: group.totalShots,
    });

  });

  return { steps };
}