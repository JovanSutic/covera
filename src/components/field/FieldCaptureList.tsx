import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Check, Trash2 } from "lucide-react";

import { ActionButton } from "@/components/shared/ActionButton";
import type { FieldPhotoType } from "@/lib/api/fieldIncident";

export interface FieldCapture {
  evidenceType: FieldPhotoType;
  file: File;
  /** Built by `URL.createObjectURL` at capture time — `ShotStepPanel`'s rule, and the same one. */
  previewUrl: string;
}

/**
 * The label for each capturable view, as an i18n key — total over the generated union,
 * so a type the backend adds is a compile error here rather than a raw key on screen.
 *
 * These keys live in the `guest` namespace, NOT `incidentPage.evidence.*`. Phase 1's
 * `evidenceLabelKey` returns host-namespace keys for the HOST item row; this page renders
 * no host copy, and reusing that helper would put `host.json` strings on a public,
 * signed-out page (D28).
 */
const VIEW_LABEL_KEYS: Record<FieldPhotoType, string> = {
  damage_photo_wide: "fieldIncident.views.damagePhotoWide",
  damage_photo_closeup: "fieldIncident.views.damagePhotoCloseup",
  theft_empty_space_photo: "fieldIncident.views.theftEmptySpacePhoto",
};

interface FieldCaptureRowProps {
  evidenceType: FieldPhotoType;
  /** How many of this view the server says are ALREADY attached to the item. */
  attachedCount: number;
  captured?: FieldCapture | undefined;
  disabled: boolean;
  onCapture: (capture: FieldCapture) => void;
  onRemove: (evidenceType: FieldPhotoType) => void;
}

function FieldCaptureRow({
  evidenceType,
  attachedCount,
  captured,
  disabled,
  onCapture,
  onRemove,
}: FieldCaptureRowProps) {
  const { t } = useTranslation("guest");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onCapture({
      evidenceType,
      file,
      // The object URL is built once, at capture time, and handed up with the file —
      // nothing below re-derives it, so the preview cannot disagree with what will be
      // uploaded.
      previewUrl: URL.createObjectURL(file),
    });

    // Clear the input so choosing the SAME file again still fires `change` — which is
    // what makes "Replace" take a second photo rather than silently doing nothing.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <li className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {t(VIEW_LABEL_KEYS[evidenceType])}
        </span>

        {attachedCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("fieldIncident.views.alreadyProvided")}
          </span>
        )}
      </div>

      {captured ? (
        <div className="mt-3 flex items-center gap-3">
          <img
            src={captured.previewUrl}
            alt={t(VIEW_LABEL_KEYS[evidenceType])}
            className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
          />

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5 shrink-0" />
            {t("fieldIncident.views.captured")}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
              <Camera className="h-3.5 w-3.5 shrink-0" />
              {t("fieldIncident.views.retake")}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
              />
            </label>

            <ActionButton
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" />}
              label={t("fieldIncident.views.remove")}
              disabled={disabled}
              onClick={() => onRemove(evidenceType)}
            />
          </div>
        </div>
      ) : (
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
          <Camera className="h-4 w-4 shrink-0" />
          {t("fieldIncident.views.capture")}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </label>
      )}
    </li>
  );
}

interface FieldCaptureListProps {
  /** The narrowed required views (step 9.1's `requiredFieldViews`), in the server's order. */
  requiredTypes: readonly FieldPhotoType[];
  /** `FieldIngest.attachedEvidenceCounts` — how many of each view are already on the item. */
  attachedCounts: Record<string, number>;
  captures: readonly FieldCapture[];
  disabled?: boolean;
  onCapture: (capture: FieldCapture) => void;
  onRemove: (evidenceType: FieldPhotoType) => void;
}

/**
 * One row per view the server says this item needs. The list renders what it is given and
 * derives nothing: which types are required, and which are already partly covered, are
 * both the server's answers.
 */
export function FieldCaptureList({
  requiredTypes,
  attachedCounts,
  captures,
  disabled = false,
  onCapture,
  onRemove,
}: FieldCaptureListProps) {
  return (
    <ul className="space-y-3">
      {requiredTypes.map((evidenceType) => (
        <FieldCaptureRow
          key={evidenceType}
          evidenceType={evidenceType}
          attachedCount={attachedCounts[evidenceType] ?? 0}
          captured={captures.find((capture) => capture.evidenceType === evidenceType)}
          disabled={disabled}
          onCapture={onCapture}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
