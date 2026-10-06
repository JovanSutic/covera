import React from "react";
import { ChevronRight, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RoomFlowStep } from "./RoomFlowList";
import { getRoomIcon } from "@/lib/helpers/icons";
import type { InspectionFlag } from "@/api/generated/requests/types.gen";

interface RoomFlowItemProps {
  step: RoomFlowStep;
  onSelectRoom?: (step: RoomFlowStep) => void;
  flags?: InspectionFlag[];
}

export const RoomFlowItem: React.FC<RoomFlowItemProps> = ({
  step,
  onSelectRoom,
}) => {
  const { t } = useTranslation("guest");
  const RoomIcon = getRoomIcon(step.room);

  return (
    <button
      type="button"
      onClick={() => onSelectRoom?.(step)}
      className="group shadow-xs hover:shadow-md flex w-full cursor-pointer items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/40 to-white p-4 text-left transition-all duration-200 hover:border-blue-200 dark:border-blue-900/30 dark:from-blue-950/20 dark:to-gray-900 dark:hover:border-blue-800 sm:p-5"
    >
      {/* Left: Icon & Room Metadata */}
      <div className="flex min-w-0 items-center gap-3.5 pr-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/50 dark:text-blue-400 dark:group-hover:bg-blue-500">
          <RoomIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {step.room}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Camera className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span>
              {t("roomFlowItem.photo", { count: step.proofNumber })}
            </span>
          </span>
        </div>
      </div>

      {/* Right: Action Indicator */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-300">
          {t("roomFlowItem.viewRoom")}
        </span>
        <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
      </div>
    </button>
  );
};