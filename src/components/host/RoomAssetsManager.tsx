import { useMemo, useState } from "react";
import { Sofa, Package, ChevronDown } from "lucide-react";
import type { Asset } from "@/api/generated/requests/types.gen";
import { AssetItemCard } from "./AssetItemCard";
import Typography from "../Typography";
import { useTranslation } from "react-i18next";

interface RoomAssetsManagerProps {
  assets: Asset[];
  uncoveredAssetIds: string[];
  isLoading?: boolean;
  onDeleteAsset: (assetId: string) => Promise<void> | void;
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
    <div className="rounded-xl bg-white border border-gray-100 shadow-2xs overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:px-6 bg-white border-b border-gray-100">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50/80 text-indigo-600 border border-indigo-100/70 shrink-0">
            <Sofa className="h-4 w-4" />
          </div>
          <div>
            <Typography type="h4" className="text-gray-900 font-semibold">
              {t(`roomLocations.${roomName}`, roomName)}
            </Typography>
            <Typography type="caption" className="text-gray-500 mt-0.5 block">
              {assets.length} {assets.length === 1 ? "asset" : "assets"}
            </Typography>
          </div>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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
        <div className="p-4 sm:p-6 bg-gray-50/50">
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
    <div className="mt-4 flex flex-col gap-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl bg-white border border-gray-100 p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded-sm bg-gray-200" />
                <div className="h-3 w-16 rounded-sm bg-gray-200" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-24 rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoomAssetsManager({
  assets = [],
  uncoveredAssetIds = [],
  isLoading,
  onDeleteAsset,
}: RoomAssetsManagerProps) {
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

  if (isLoading) return <AssetsSkeleton />;

  if (assets.length === 0) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="mt-3 font-medium text-gray-900 text-sm">
          No assets registered
        </h3>
        <p className="mt-1 text-xs text-gray-500 max-w-xs">
          This apartment doesn't have any assets assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
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
  );
}
