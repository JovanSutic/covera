import React from "react";
import {
  ChevronRight,
  Camera,
  Home,
  Bed,
  Bath,
  Utensils,
  Tv,
} from "lucide-react";
import type { RoomFlowStep } from "./RoomFlowList";

interface RoomFlowItemProps {
  step: RoomFlowStep;
  onSelectRoom?: (step: RoomFlowStep) => void;
}

const getRoomIcon = (roomName: string) => {
  const lower = roomName.toLowerCase();
  if (lower.includes("bedroom") || lower.includes("bed")) return Bed;
  if (lower.includes("bath") || lower.includes("restroom")) return Bath;
  if (lower.includes("kitchen") || lower.includes("dining")) return Utensils;
  if (lower.includes("living") || lower.includes("lounge")) return Tv;
  return Home;
};

export const RoomFlowItem: React.FC<RoomFlowItemProps> = ({
  step,
  onSelectRoom,
}) => {
  const RoomIcon = getRoomIcon(step.room);

  return (
    <button
      type="button"
      onClick={() => onSelectRoom?.(step)}
      className="group w-full cursor-pointer flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/40 to-white dark:border-blue-900/30 dark:from-blue-950/20 dark:to-gray-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all duration-200 shadow-xs text-left"
    >
      {/* Left: Icon & Room Metadata */}
      <div className="flex items-center gap-3.5 min-w-0 pr-3">
        <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 transition-colors">
          <RoomIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {step.room}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Camera className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span>
              {step.proofNumber}{" "}
              {step.proofNumber === 1 ? "reference photo" : "reference photos"}
            </span>
          </span>
        </div>
      </div>

      {/* Right: Action Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-700 dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-300 transition-colors">
          View Room
        </span>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
};