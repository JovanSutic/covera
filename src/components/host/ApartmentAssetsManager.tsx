import { useMemo, useState } from "react";
import { Sofa, Package, ChevronDown } from "lucide-react";
import type { Asset } from "@/api/generated/requests/types.gen";
import { AssetItemCard } from "./AssetItemCard";
import Typography from "../Typography";
import { useTranslation } from "react-i18next";

interface ApartmentAssetsManagerProps {
  assets: Asset[];
  uncoveredAssetIds: string[];
  isLoading?: boolean;
  onDeleteAsset: (assetId: string) => Promise<void> | void;
  onOpenShotStudio: () => void;
  onOpenCreateAsset: () => void;
}

function RoomCard({
  roomName,
  assets,
  uncoveredSet,
  onDeleteAsset,
}: {
  roomName: string;
  assets: Asset[];
  uncoveredSet: Set<string>;
  onDeleteAsset: (assetId: string) => Promise<void> | void;
}) {
  const { t } = useTranslation("assets");
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden dark:bg-gray-900/40 dark:border-gray-800">
      <div className="flex items-center justify-between p-4 sm:px-6 bg-white border-b border-gray-200 dark:bg-gray-900/50 dark:border-gray-800">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50/80 text-indigo-600 border border-indigo-100/70 shrink-0 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50">
            <Sofa className="h-4 w-4" />
          </div>
          <div>
            <Typography type="h4" className="text-gray-900 font-semibold dark:text-white">
              {t(`roomLocations.${roomName}`, roomName)}
            </Typography>
            <Typography type="caption" className="text-gray-500 dark:text-gray-400 mt-0.5 block">
              {assets.length} {assets.length === 1 ? "asset" : "assets"}
            </Typography>
          </div>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors cursor-pointer"
          aria-label="Toggle room section"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-gray-900/20">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <AssetItemCard
                key={asset.id}
                asset={asset}
                isCovered={!uncoveredSet.has(asset.id)}
                onDeleteAsset={onDeleteAsset}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetsSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-gray-200 p-6 dark:bg-gray-900/40 dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded-sm bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-16 rounded-sm bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-24 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-24 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-24 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApartmentAssetsManager({
  assets = [],
  uncoveredAssetIds = [],
  isLoading,
  onDeleteAsset,
  onOpenShotStudio,
  onOpenCreateAsset,
}: ApartmentAssetsManagerProps) {
  const uncoveredSet = useMemo(
    () => new Set(uncoveredAssetIds),
    [uncoveredAssetIds],
  );

  const groupedAssets = useMemo(() => {
    const groups: Record<string, { roomName: string; items: Asset[] }> = {};

    for (const asset of assets) {
      const roomName = asset.roomLocation || "General / Unassigned";
      if (!groups[roomName]) {
        groups[roomName] = { roomName, items: [] };
      }
      groups[roomName].items.push(asset);
    }

    return Object.values(groups);
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Section Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography type="h3">Assets & Verification Shots</Typography>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage physical apartment assets and align required photo verification shots.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <button
            onClick={onOpenShotStudio}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Shot Studio
          </button>
          <button
            onClick={onOpenCreateAsset}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-xs hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            + Add New Asset
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && <AssetsSkeleton />}

      {/* Empty State */}
      {!isLoading && assets.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-900/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 mb-3">
            <Package className="h-6 w-6" />
          </div>
          <Typography type="h4" className="text-gray-700 dark:text-gray-300 mb-1">
            No assets registered
          </Typography>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            This apartment doesn't have any assets assigned yet. Click "+ Add New Asset" above to get started.
          </p>
        </div>
      )}

      {/* Grouped Assets List */}
      {!isLoading && assets.length > 0 && (
        <div className="flex flex-col gap-4">
          {groupedAssets.map((group) => (
            <RoomCard
              key={group.roomName}
              roomName={group.roomName}
              assets={group.items}
              uncoveredSet={uncoveredSet}
              onDeleteAsset={onDeleteAsset}
            />
          ))}
        </div>
      )}
    </div>
  );
}