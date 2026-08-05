import { useState } from "react";
import {
  Check,
  Trash2,
  Tag,
  MapPin,
  Camera,
  FileText,
} from "lucide-react";
import type { Asset, ApartmentWithLocation } from "@/api/generated/requests/types.gen";
import Typography from "../Typography";

const photoProofLabels: Record<Asset["photoProofRequirement"], string> = {
  SWEEP_ONLY: "Sweep Only",
  CLOSEUP: "Close-up",
  FUNCTIONAL_ACTION: "Functional Action",
};

function formatCentsToDecimal(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function DescriptionTooltip({ content }: { content: string }) {
  return (
    <div className="relative group/tooltip inline-block">
      <button
        type="button"
        aria-label="View description"
        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
      >
        <FileText className="h-4 w-4" />
      </button>

      <div className="absolute right-0 top-full mt-1.5 z-30 hidden group-hover/tooltip:block group-focus-within/tooltip:block w-64 max-w-xs animate-in fade-in zoom-in-95 duration-150">
        <div className="relative rounded-lg bg-gray-900 p-2.5 text-xs text-gray-100 shadow-xl border border-gray-800">
          <div className="absolute -top-1 right-2.5 h-2 w-2 rotate-45 bg-gray-900 border-l border-t border-gray-800" />
          <p className="relative z-10 leading-relaxed whitespace-normal break-words font-normal">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AssetItemCard({
  asset,
  onDeleteAsset,
  currency = "EUR",
}: {
  asset: Asset;
  currency?: ApartmentWithLocation["currency"];
  onDeleteAsset: (assetId: string) => Promise<void> | void;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDeleteAsset(asset.id);
    } catch {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const formattedAmount =
    asset.approximateValueCents != null
      ? formatCentsToDecimal(asset.approximateValueCents)
      : null;

  return (
    <div className="group relative flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-2xs hover:border-gray-300 transition-all">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-gray-900 text-sm leading-snug line-clamp-1">
            {asset.name}
          </h4>

          <div className="flex items-center gap-0.5 shrink-0">
            {asset.description && (
              <DescriptionTooltip content={asset.description} />
            )}

            {isConfirmingDelete ? (
              <div className="flex items-center gap-1 animate-in fade-in duration-150">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                  title="Confirm deletion"
                >
                  {isDeleting ? "..." : <Check className="h-3 w-3" />}
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete asset"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {asset.category && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <Tag className="h-3 w-3 text-gray-400" />
              {asset.category}
            </span>
          )}

          {asset.roomLocation && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              <MapPin className="h-3 w-3 text-gray-400" />
              {asset.roomLocation}
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
            <Camera className="h-3 w-3 text-blue-500" />
            {photoProofLabels[asset.photoProofRequirement] ||
              asset.photoProofRequirement}
          </span>
        </div>
      </div>

      {formattedAmount && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <Typography
            type="caption"
            className="text-gray-400 block text-[11px]"
          >
            Approx. value
          </Typography>
          <Typography
            type="body-sm"
            className="font-semibold text-emerald-700 mt-0.5"
          >
            {formattedAmount} {currency}
          </Typography>
        </div>
      )}
    </div>
  );
}
