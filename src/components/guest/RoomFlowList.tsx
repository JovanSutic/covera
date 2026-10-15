import React from "react";
import { useTranslation } from "react-i18next";
import { RoomFlowItem } from "./RoomFlowItem";
import { GradientContainer } from "../shared/GradientContainer";

export interface RoomFlowStep {
  id: string | number;
  room: string;
  proofNumber: number;
}

interface RoomFlowListProps {
  steps: RoomFlowStep[];
  completedStepIds?: (string | number)[];
  onSelectRoom?: (step: RoomFlowStep) => void;
}

export const RoomFlowList: React.FC<RoomFlowListProps> = ({
  steps,
  onSelectRoom,
}) => {
  const { t } = useTranslation("guest");

  return (
    <div className="w-full space-y-6">
      <GradientContainer
        badgeText={t("roomFlowList.badge")}
        title={t("roomFlowList.title")}
        subtitle={t("roomFlowList.subtitle")}
        description={t("roomFlowList.description")}
      />

      {/* Rooms List */}
      <div className="space-y-3">
        {steps.map((step) => (
          <RoomFlowItem
            key={step.id}
            step={step}
            onSelectRoom={onSelectRoom}
          />
        ))}
      </div>
    </div>
  );
};
