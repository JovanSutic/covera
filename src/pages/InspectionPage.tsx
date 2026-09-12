import { useMemo, useState } from "react";
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
import type {
  ApartmentShot,
  DetailedInspection,
  ShotWithAssets,
} from "@/api/generated/requests/types.gen";
import { mapShotsToRoomFlowSteps } from "@/lib/helpers/shots";
import { InspectionIntroduction } from "@/components/guest/InspectionIntroduction";
import { useParams } from "react-router";

type InspectionStep = "intro" | "rooms" | "details";

function InspectionPage() {
  const { id } = useParams<{ id: string }>();

  // Single step state manager to handle view flow: 'intro' -> 'rooms' -> 'details'
  const [currentStep, setCurrentStep] = useState<InspectionStep>("intro");

  // Selected room location for details view
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
    return ((inspection as DetailedInspection)?.shots ||
      []) as ShotWithAssets[];
  }, [inspection]);

  // Derive rooms steps and completion status from shots data
  const flowData = useMemo(() => {
    if (!rawShots.length) return { steps: [] };
    return mapShotsToRoomFlowSteps(rawShots);
  }, [rawShots]);

  // Extract ordered list of unique room keys for bottom pagination
  const allRoomLocations = useMemo(() => {
    return flowData.steps.map(
      (step) => step.id as ApartmentShot["roomLocation"],
    );
  }, [flowData.steps]);

  // Filter shots belonging to currently selected room
  const currentRoomShots = useMemo(() => {
    if (!selectedRoomLocation) return [];
    return rawShots.filter(
      (shot) => shot.roomLocation === selectedRoomLocation,
    );
  }, [rawShots, selectedRoomLocation]);

  const handleStartHandover = () => {
    setCurrentStep("rooms");
  };

  const handleSelectRoom = (step: RoomFlowStep) => {
    setSelectedRoomLocation(step.id as ApartmentShot["roomLocation"]);
    setCurrentStep("details");
  };

  const handleBackToRooms = () => {
    setSelectedRoomLocation(null);
    setCurrentStep("rooms");
  };

  const handleFlagShot = (shotId: string) => {
    console.log("Flagged shot:", shotId);
  };

  if (!isLoading && (isError || !inspection)) {
    return (
      <PageLayout size="lg">
        <Header />
        <PageTitle
          title="Handover Not Found"
          subtitle="Unable to load the requested property details."
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
    <PageLayout size="sm">
      <Header />

      {/* Step 1: Introductory Card View */}
      {currentStep === "intro" && (
        <InspectionIntroduction
          apartmentName={"name"}
          onStartWalkthrough={handleStartHandover}
          isLoading={isLoading}
        />
      )}

      {/* Step 2: Room Flow List Overview */}
      {currentStep === "rooms" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mt-3">
            <RoomFlowList
              steps={flowData.steps}
              onSelectRoom={handleSelectRoom}
            />
          </div>
        </div>
      )}

      {/* Step 3: Detailed Room Photo View */}
      {currentStep === "details" && selectedRoomLocation && (
        <RoomDetails
          roomLocation={selectedRoomLocation}
          shots={currentRoomShots}
          allRooms={allRoomLocations}
          onBackToList={handleBackToRooms}
          onSelectRoom={(location) => setSelectedRoomLocation(location)}
          onFlagShot={handleFlagShot}
        />
      )}
    </PageLayout>
  );
}

export default InspectionPage;
