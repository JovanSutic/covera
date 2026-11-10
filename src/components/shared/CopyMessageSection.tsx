import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { ActionButton } from "@/components/shared/ActionButton";
import { SectionCard } from "@/components/shared/SectionCard";

interface CopyMessageSectionProps {
  /** Already-translated section title. */
  title: string;
  /** The text to show and copy. */
  message: string;
  /** Already-translated copy control label. */
  copyLabel: string;
  /** Already-translated toast copy, on success. */
  copySuccess: string;
  /** Already-translated toast copy, on failure. */
  copyError: string;
  /** Optional guidance, rendered below the text and above the copy control. */
  hint?: string;
  /** Textarea rows. Defaults to 10. */
  rows?: number;
  /** Optional secondary action rendered beside the copy control. */
  action?: ReactNode;
}

/**
 * The "message + copy" pattern, shared by the incident page's Request text and the
 * reservation page's guest message.
 *
 * It takes an ALREADY-BUILT message and ALREADY-TRANSLATED strings: the incident's
 * text is assembled from the claim's items, the guest's from the inspection link's
 * template, so the section itself has nothing to translate or compute. It owns only
 * the clipboard write and its toast.
 */
export function CopyMessageSection({
  title,
  message,
  copyLabel,
  copySuccess,
  copyError,
  hint,
  rows = 10,
  action,
}: CopyMessageSectionProps) {
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(copySuccess);
    } catch {
      toast.error(copyError);
    }
  };

  return (
    <SectionCard title={title}>
      <textarea
        readOnly
        rows={rows}
        value={message}
        aria-label={title}
        className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
      />

      {hint && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton
          variant="info"
          size="md"
          icon={<Copy className="h-4 w-4 shrink-0" />}
          label={copyLabel}
          onClick={copyMessage}
        />
        {action}
      </div>
    </SectionCard>
  );
}
