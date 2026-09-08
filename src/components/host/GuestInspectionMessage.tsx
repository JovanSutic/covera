import { Copy, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuestInspectionMessageProps {
  guestName: string;
  guestInspectionUrl: string;
  onClose?: () => void;
}

export function GuestInspectionMessage({
  guestName,
  guestInspectionUrl,
  onClose,
}: GuestInspectionMessageProps) {
  const [isCopying, setIsCopying] = useState(false);

  const guestMessage = `Hello ${guestName},\n\nPlease complete your check-in photo inspection using the following link prior to or upon arrival:\n${guestInspectionUrl}\n\nThank you!`;

  const handleCopyMessage = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(guestMessage);
      toast.success("Guest message copied to clipboard!");
      onClose?.();
    } catch {
      toast.error("Failed to copy message");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="w-80 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          Airbnb Guest Message
        </h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <textarea
        readOnly
        rows={4}
        value={guestMessage}
        className="w-full text-xs p-2 rounded-md bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 focus:outline-hidden resize-none"
      />
      <button
        type="button"
        onClick={handleCopyMessage}
        disabled={isCopying}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5" />
        Copy Message
      </button>
    </div>
  );
}