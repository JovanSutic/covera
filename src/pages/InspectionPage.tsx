import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  getInspectionsById,
  postInspectionsByIdPing,
} from "@/api/generated/requests/services.gen";
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
  InspectionFlag,
  ShotWithAssets,
} from "@/api/generated/requests/types.gen";
import { mapShotsToRoomFlowSteps } from "@/lib/helpers/shots";
import { InspectionIntroduction } from "@/components/guest/InspectionIntroduction";
import { Modal } from "@/components/Modal";
import { FlagContentForm } from "@/components/forms/FlagContentForm";
import { useTranslation } from "react-i18next";

type InspectionStep = "intro" | "rooms" | "details";

function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("assets");

  const [currentStep, setCurrentStep] = useState<InspectionStep>("intro");
  const [selectedRoomLocation, setSelectedRoomLocation] = useState<
    ApartmentShot["roomLocation"] | null
  >(null);
  const [flaggedShot, setFlaggedShot] = useState<ShotWithAssets | null>(null);

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

  // Ping mutation
  const { mutate: pingInspection } = useMutation({
    mutationFn: async (inspectionId: string) => {
      return await postInspectionsByIdPing({
        path: { id: inspectionId },
      });
    },
    onError: (err) => {
      console.error("Failed to send inspection ping:", err);
    },
  });

  // Check if current userAgent already exists in the inspection's JSON array
  useEffect(() => {
    if (!isLoading && inspection && id) {
      const currentUserAgent = navigator.userAgent;

      // Cast inspection to detailed type or access your pings/activity property
      const existingPings = (inspection as DetailedInspection & { pings?: Array<{ userAgent: string }> }).pings || [];

      const userAgentExists = existingPings.some(
        (ping) => ping.userAgent === currentUserAgent
      );

      if (!userAgentExists) {
        pingInspection(id);
      }
    }
  }, [isLoading, inspection, id, pingInspection]);

  const rawShots = useMemo(() => {
    return ((inspection as DetailedInspection)?.shots ||
      []) as ShotWithAssets[];
  }, [inspection]);

  const inspectionFlags = useMemo(() => {
    return ((inspection as DetailedInspection)?.flags ||
      []) as InspectionFlag[];
  }, [inspection]);

  const flowData = useMemo(() => {
    if (!rawShots.length) return { steps: [] };
    return mapShotsToRoomFlowSteps(rawShots, t);
  }, [rawShots, t]);

  const allRoomLocations = useMemo(() => {
    return flowData.steps.map(
      (step) => step.id as ApartmentShot["roomLocation"],
    );
  }, [flowData.steps]);

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

  const handleFlagShot = (shotOrId: ShotWithAssets | string) => {
    if (typeof shotOrId === "string") {
      const match = rawShots.find((s) => s.id === shotOrId) || null;
      setFlaggedShot(match);
    } else {
      setFlaggedShot(shotOrId);
    }
  };

  const handleCloseFlagModal = () => {
    setFlaggedShot(null);
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

      {currentStep === "intro" && (
        <InspectionIntroduction
          apartmentName={"name"}
          onStartWalkthrough={handleStartHandover}
          isLoading={isLoading}
        />
      )}

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

      {currentStep === "details" && selectedRoomLocation && (
        <RoomDetails
          roomLocation={selectedRoomLocation}
          shots={currentRoomShots}
          allRooms={allRoomLocations}
          onBackToList={handleBackToRooms}
          onSelectRoom={(location) => setSelectedRoomLocation(location)}
          onFlagShot={handleFlagShot}
          flags={inspectionFlags}
        />
      )}

      <Modal
        isOpen={Boolean(flaggedShot)}
        onClose={handleCloseFlagModal}
        title="Report an Issue"
        subtitle={flaggedShot ? `Flagging item: ${flaggedShot.title}` : ""}
        size="md"
        bodyClassName="p-6"
      >
        {flaggedShot && id && (
          <FlagContentForm
            shot={flaggedShot}
            onSubmitSuccess={handleCloseFlagModal}
            onCancel={handleCloseFlagModal}
            inspectionId={id}
          />
        )}
      </Modal>
    </PageLayout>
  );
}

export default InspectionPage;