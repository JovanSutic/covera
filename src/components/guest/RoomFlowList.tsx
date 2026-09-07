import React from "react";
import { Check, ChevronRight } from "lucide-react";

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
  completedStepIds = [],
  onSelectRoom,
}) => {
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6">
      <div className="relative">
        {/* Continuous background connector line */}
        <div
          className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700 -z-10"
          aria-hidden="true"
        />

        <div className="flex flex-col space-y-4">
          {steps.map((step, index) => {
            const isCompleted = completedStepIds.includes(step.id);

            return (
              <div key={step.id} className="relative flex items-center group">
                {/* Step Indicator Node */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-200 shadow-sm ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 border-2 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 stroke-[2.5]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Main Room Container */}
                <div
                  onClick={() => onSelectRoom?.(step)}
                  className={`ml-4 flex-1 flex items-center justify-between p-4 rounded-xl text-left border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xs ${
                    onSelectRoom ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600" : ""
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {step.room}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.proofNumber}{" "}
                      {step.proofNumber === 1
                        ? "photo required"
                        : "photos required"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Count Pill */}
                    <span
                      className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold ${
                        isCompleted
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {step.proofNumber}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};