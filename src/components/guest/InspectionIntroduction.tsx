import { Sparkles, ShieldCheck, Camera, ChevronRight } from "lucide-react";
import InstructionsShort from "./InstructionsShort";

interface InspectionIntroductionProps {
  apartmentName?: string;
  onStartWalkthrough: () => void;
  isLoading: boolean;
}

export function InspectionIntroduction({
  apartmentName,
  onStartWalkthrough,
  isLoading,
}: InspectionIntroductionProps) {
  return (
    <div className="mb-8 rounded-2xl mt-4 bg-gradient-to-b from-blue-50/60 to-white p-6 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-gray-900 sm:p-8">
      {/* Hero Welcome */}
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400 uppercase">
        <Sparkles className="h-4 w-4" />
        <span>Arrival Handover & Peace of Mind</span>
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        Welcome to {apartmentName || "your stay"}! Let’s get you settled.
      </h1>

      <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
        We want your stay to be completely worry-free. Before you unpack and
        relax, take 2 minutes to complete your arrival handover. Photos are
        grouped room-by-room so you can quickly review the space and verify
        everything meets your expectations.
      </p>

      {/* Dual Value Pitch */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800/50">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              For Your Peace of Mind
            </h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Establishes a fair, timestamped record so pre-existing wear or
              marks aren't on you.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800/50">
          <Camera className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Effortless Room Check
            </h4>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Browse host reference photos by room and flag photos only if you
              spot something off.
            </p>
          </div>
        </div>
      </div>

      {/* Deep-Dive Instructions Toggle */}
      <InstructionsShort />

      {/* Action CTA */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStartWalkthrough}
          disabled={isLoading}
          className="inline-flex disabled:opacity-40 disabled:cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 cursor-pointer shadow-sm"
        >
          <span>
            {isLoading
              ? "Loading arrival details..."
              : "Begin Arrival Handover"}
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
