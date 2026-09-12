import React from "react";
import { RoomFlowItem } from "./RoomFlowItem";
import InstructionsShort from "./InstructionsShort";

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
  return (
    <div className="w-full space-y-4">
      {/* Header text and instructions inside RoomFlowList */}
      <div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Room Walkthrough
        </p>
         <p className="text-sm text-gray-500 dark:text-gray-300">
          Select any room below to review reference photos and confirm property setup.
        </p>
        <InstructionsShort />
      </div>

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