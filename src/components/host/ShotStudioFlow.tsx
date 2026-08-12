import type { Asset, SyncShotItem } from "@/api/generated/requests/types.gen";
import Select from "@/components/formItems/Select";
import { ROOM_LOCATIONS, SHOT_TYPES } from "@/types/assets.types";
import type { SelectOption } from "@/types/component.types";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Input from "../formItems/Input";
import Textarea from "../formItems/Textarea";

export type LocalShotItem = SyncShotItem & {
  _clientId: string;
};

interface ShotStudioFlowProps {
  shots: LocalShotItem[];
  availableAssets: Asset[];
  onChange: (updatedShots: LocalShotItem[]) => void;
}

export function ShotStudioFlow({
  shots,
  availableAssets,
  onChange,
}: ShotStudioFlowProps) {
  const { t } = useTranslation("assets");

  // Selection tracked by client key instead of array index to prevent shifting bugs
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    shots.length > 0 ? shots[0]._clientId : null,
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [newShotForm, setNewShotForm] = useState<
    Omit<SyncShotItem, "assetIds">
  >({
    roomLocation: ROOM_LOCATIONS[0],
    shotType: SHOT_TYPES[0],
    title: "",
    instructions: "",
  });

  const typeOptions: SelectOption[] = useMemo(
    () =>
      SHOT_TYPES.map((type) => ({
        value: type,
        label: t(`photoProofs.${type}`, type),
      })),
    [t],
  );

  const roomOptions: SelectOption[] = useMemo(
    () =>
      ROOM_LOCATIONS.map((room) => ({
        value: room,
        label: t(`roomLocations.${room}`, room),
      })),
    [t],
  );

  const handleSelectShot = (clientId: string) => {
    setSelectedClientId(clientId);
    setIsCreatingNew(false);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setSelectedClientId(null);
    setNewShotForm({
      roomLocation: ROOM_LOCATIONS[0],
      shotType: SHOT_TYPES[0],
      title: "",
      instructions: "",
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShotForm.title.trim()) return;

    const createdShot: LocalShotItem = {
      _clientId: crypto.randomUUID(),
      ...newShotForm,
      assetIds: [],
    };

    const nextShots = [...shots, createdShot];
    onChange(nextShots);
    setIsCreatingNew(false);
    setSelectedClientId(createdShot._clientId);
  };

  const handleDeleteShot = (clientIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextShots = shots.filter((s) => s._clientId !== clientIdToDelete);
    onChange(nextShots);

    if (selectedClientId === clientIdToDelete) {
      setSelectedClientId(nextShots.length > 0 ? nextShots[0]._clientId : null);
    }
  };

  const handleToggleAsset = (assetId: string) => {
    if (!selectedClientId) return;

    const nextShots = shots.map((shot) => {
      if (shot._clientId !== selectedClientId) return shot;

      const hasAsset = shot.assetIds.includes(assetId);
      const updatedAssetIds = hasAsset
        ? shot.assetIds.filter((id) => id !== assetId)
        : [...shot.assetIds, assetId];

      return { ...shot, assetIds: updatedAssetIds };
    });

    onChange(nextShots);
  };

  const activeShot = useMemo(
    () => shots.find((s) => s._clientId === selectedClientId) ?? null,
    [shots, selectedClientId],
  );

  return (
    <div className="h-full flex flex-col md:flex-row min-h-0 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800 overflow-hidden">
      <div className="w-full md:w-5/12 p-4 flex flex-col gap-3 max-h-[45vh] md:max-h-none overflow-y-auto bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Shots List ({shots.length})
          </span>
          {!isCreatingNew && (
            <button
              onClick={handleStartCreate}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              + Add Shot
            </button>
          )}
        </div>

        {/* Create Shot Inline Form */}
        {isCreatingNew && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 border-2 border-blue-500/40 rounded-lg bg-blue-50/30 dark:bg-blue-950/20 flex flex-col gap-3"
          >
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Create New Shot
            </h4>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Title
              </label>
              <Input
                label="Shot Title"
                type="text"
                required
                placeholder="e.g. TV & Soundbar"
                value={newShotForm.title}
                onChange={(e) =>
                  setNewShotForm({ ...newShotForm, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Room"
                value={newShotForm.roomLocation}
                options={roomOptions}
                onChange={(e) =>
                  setNewShotForm({
                    ...newShotForm,
                    roomLocation: e.target.value as Asset["roomLocation"],
                  })
                }
              />

              <Select
                label="Type"
                value={newShotForm.shotType}
                options={typeOptions}
                onChange={(e) =>
                  setNewShotForm({
                    ...newShotForm,
                    shotType: e.target.value as Asset["photoProofRequirement"],
                  })
                }
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Instructions
              </label>
              <Textarea
                label="Instructions"
                rows={2}
                placeholder="Take shot of TV and soundbar together"
                value={newShotForm.instructions}
                onChange={(e) =>
                  setNewShotForm({
                    ...newShotForm,
                    instructions: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1 text-xs border rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded-md"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {/* Empty State when no shots exist */}
        {shots.length === 0 && !isCreatingNew && (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
              No shots defined yet
            </p>
            <p className="text-xs text-gray-500 mb-4 max-w-xs">
              Create verification shot items to map against your apartment
              assets.
            </p>
            <button
              onClick={handleStartCreate}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md font-medium"
            >
              + Create First Shot
            </button>
          </div>
        )}

        {/* Shots List */}
        {shots.map((shot) => {
          const isSelected =
            selectedClientId === shot._clientId && !isCreatingNew;
          return (
            <div
              key={shot._clientId}
              onClick={() => handleSelectShot(shot._clientId)}
              className={`p-3.5 rounded-lg border cursor-pointer transition text-left relative ${
                isSelected
                  ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-600"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {shot.roomLocation} • {shot.shotType}
                </span>
                <button
                  onClick={(e) => handleDeleteShot(shot._clientId, e)}
                  className="text-xs text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 px-1"
                >
                  ✕
                </button>
              </div>
              <h5 className="font-semibold text-xs text-gray-900 dark:text-gray-100 mb-1">
                {shot.title || "Untitled Shot"}
              </h5>
              {shot.instructions && (
                <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
                  {shot.instructions}
                </p>
              )}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                  {shot.assetIds.length} Assets Linked
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full md:w-7/12 p-4 flex flex-col max-h-[50vh] md:max-h-none overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {activeShot && !isCreatingNew ? (
          <>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Link Assets for "{activeShot.title}"
              </h4>
              <p className="text-xs text-gray-500">
                Select apartment assets that should be covered by this
                verification shot.
              </p>
            </div>

            {availableAssets.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 border border-dashed rounded-lg text-center text-xs text-gray-400">
                No registered assets available for this apartment yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableAssets.map((asset) => {
                  const isLinked = activeShot.assetIds.includes(asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleToggleAsset(asset.id)}
                      className={`relative p-3 rounded-lg border-2 cursor-pointer transition flex flex-col justify-between ${
                        isLinked
                          ? "border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-600/30"
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h6 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {asset.name}
                          </h6>
                          {isLinked && (
                            <span className="bg-blue-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mb-2">
                          {asset.category.replace(/_/g, " ")}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span>{asset.roomLocation.replace(/_/g, " ")}</span>
                        <span className="font-mono">
                          {asset.photoProofRequirement}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <p className="text-xs">
              {isCreatingNew
                ? "Finish adding the shot on the left to start linking assets."
                : "Select a shot on the left to view and link apartment assets."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
