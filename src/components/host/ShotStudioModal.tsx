import { useState, useEffect } from "react";
import { Modal } from "../Modal";
import { ShotStudioFlow } from "./ShotStudioFlow";
import type { SyncShotItem, Asset } from "@/api/generated/requests/types.gen";
import {
  addClientId,
  removeClientId,
  type WithClientId,
} from "@/lib/helpers/uuid";

interface ShotStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShots: SyncShotItem[];
  availableAssets: Asset[];
  onSave: (shots: SyncShotItem[]) => Promise<void>;
}

export function ShotStudioModal({
  isOpen,
  onClose,
  initialShots,
  availableAssets,
  onSave,
}: ShotStudioModalProps) {
  const [shots, setShots] = useState<WithClientId<SyncShotItem>[]>(() =>
    addClientId(initialShots),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShots(addClientId(initialShots));
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialShots]);

  const handleShotsChange = (updated: WithClientId<SyncShotItem>[]) => {
    setShots(updated);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = removeClientId(shots);
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <span>Apartment Shot Studio</span>
          {hasUnsavedChanges && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
              Unsaved changes
            </span>
          )}
        </div>
      }
      subtitle={
        <span className="hidden sm:inline">
          Define verification shot requirements and map uploaded media assets.
        </span>
      }
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <ShotStudioFlow
        shots={shots}
        availableAssets={availableAssets}
        onChange={handleShotsChange}
      />
    </Modal>
  );
}
