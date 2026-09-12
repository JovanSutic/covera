import { HelpCircle, Info } from "lucide-react";
import { useState } from "react";

function InstructionsShort() {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <>
      {showGuide && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-gray-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-gray-300">
          <div className="flex items-center gap-2 font-medium text-blue-900 dark:text-blue-300 mb-2">
            <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>How it works in 3 easy steps:</span>
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <li>
              Tap any room below as you walk into it to view the host's
              reference photos.
            </li>
            <li>
              Take a quick look around to make sure everything matches the space
              and looks ready to enjoy.
            </li>
            <li>
              If you spot prior damage or missing items, flag that photo and
              inform the host.
            </li>
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowGuide((prev) => !prev)}
        className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        <span>{showGuide ? "Hide detailed steps" : "How does this work?"}</span>
      </button>
    </>
  );
}

export default InstructionsShort;
