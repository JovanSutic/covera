import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getInspectionsById } from "@/api/generated/requests/services.gen";
import Header from "@/components/Header";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import {
  RoomFlowList,
  type RoomFlowStep,
} from "@/components/guest/RoomFlowList";
import { RoomDetails } from "@/components/guest/RoomDetails";
import type { ApartmentShot, DetailedInspection, ShotWithAssets } from "@/api/generated/requests/types.gen";
import { mapShotsToRoomFlowSteps } from "@/lib/helpers/shots";

function InspectionPage() {
  const { id } = useParams<{ id: string }>();

  // State to control active view: null = list overview, string = room detail view
  const [selectedRoomLocation, setSelectedRoomLocation] = useState<
    ApartmentShot["roomLocation"] | null
  >(null);

  const {
    data: inspection,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_ACTIONS.INSPECTION_GET_BY_ID, id],
    queryFn: async () => {
      if (!id) throw new Error("Inspection ID is required");

      const response = await getInspectionsById({
        path: { id },
        query: { detailed: true },
      });

      if (!response.data) {
        throw new Error("Inspection not found");
      }

      return response.data;
    },
    enabled: Boolean(id),
  });

  // Extract raw shots array typed with embedded images/assets
  const rawShots = useMemo(() => {
    return ((inspection as DetailedInspection)?.shots || []) as ShotWithAssets[];
  }, [inspection]);

  // Derive rooms steps and completion status from shots data
  const flowData = useMemo(() => {
    if (!rawShots.length) return { steps: [], completedStepIds: [] };
    return mapShotsToRoomFlowSteps(rawShots);
  }, [rawShots]);

  // Extract ordered list of unique room keys for bottom pagination
  const allRoomLocations = useMemo(() => {
    return flowData.steps.map((step) => step.id as ApartmentShot["roomLocation"]);
  }, [flowData.steps]);

  // Filter shots belonging to currently selected room
  const currentRoomShots = useMemo(() => {
    if (!selectedRoomLocation) return [];
    return rawShots.filter((shot) => shot.roomLocation === selectedRoomLocation);
  }, [rawShots, selectedRoomLocation]);

  const handleSelectRoom = (step: RoomFlowStep) => {
    setSelectedRoomLocation(step.id as ApartmentShot["roomLocation"]);
  };

  const handleFlagShot = (shotId: string) => {
    // Flag handler stub for moderation or review flow
    console.log("Flagged shot:", shotId);
  };

  if (isLoading) {
    return (
      <PageLayout size="lg">
        <Header />
        <PageTitle
          title="Guest Inspection"
          subtitle="Loading property assets and reference photos..."
        />
        <div className="flex items-center justify-center py-20 text-gray-500">
          <span className="animate-pulse">Loading inspection data...</span>
        </div>
      </PageLayout>
    );
  }

  if (isError || !inspection) {
    return (
      <PageLayout size="lg">
        <Header />
        <PageTitle
          title="Inspection Not Found"
          subtitle="Unable to load the requested property inspection."
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error?.message ||
              "An error occurred while fetching the inspection."}
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout size="lg">
      <Header />

      {!selectedRoomLocation ? (
        /* View 1: Room Flow List Overview */
        <>
          <PageTitle
            title="Guest Inspection"
            subtitle="Select a room below to view required photos and covered assets."
          />

          <div className="mt-3">
            <RoomFlowList
              steps={flowData.steps}
              completedStepIds={flowData.completedStepIds}
              onSelectRoom={handleSelectRoom}
            />
          </div>
        </>
      ) : (
        /* View 2: Detailed Room Photo View */
        <RoomDetails
          roomLocation={selectedRoomLocation}
          shots={currentRoomShots}
          allRooms={allRoomLocations}
          onBackToList={() => setSelectedRoomLocation(null)}
          onSelectRoom={(location) => setSelectedRoomLocation(location)}
          onFlagShot={handleFlagShot}
        />
      )}
    </PageLayout>
  );
}

export default InspectionPage;