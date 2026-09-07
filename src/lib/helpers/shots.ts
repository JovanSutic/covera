import type { DetailedInspection, ShotWithAssets } from "@/api/generated/requests/types.gen";
import type { RoomFlowStep } from "@/components/guest/RoomFlowList";

export function mapShotsToRoomFlowSteps(shots: DetailedInspection["shots"]): {
  steps: RoomFlowStep[];
  completedStepIds: string[];
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

    // A shot is considered completed if it has active uploaded images
    /* const hasActiveImages = shot.images.some(
      (img) => img.status === "active" && !img.deletedAt
    );
    if (hasActiveImages) {
      existing.completedShots += 1;
    } */

    roomGroups.set(key, existing);
  });

  const steps: RoomFlowStep[] = [];
  const completedStepIds: string[] = [];

  roomGroups.forEach((group) => {
    const stepId = group.roomLocation;

    steps.push({
      id: stepId,
      room: group.roomLocation,
      proofNumber: group.totalShots,
    });

    // Mark room step as complete if all required shots have uploaded images
    if (group.totalShots > 0 && group.completedShots === group.totalShots) {
      completedStepIds.push(stepId);
    }
  });

  return { steps, completedStepIds };
}