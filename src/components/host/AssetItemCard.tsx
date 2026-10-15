import { useState } from "react";
import { Check, Trash2, Tag, MapPin, Camera, FileText, AlertCircle } from "lucide-react";
import type {
  Asset,
  ApartmentWithLocation,
} from "@/api/generated/requests/types.gen";
import { useTranslation } from "react-i18next";
import Typography from "../Typography";
import { Card } from "../shared/Card";

function formatCentsToDecimal(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function DescriptionTooltip({ content }: { content: string }) {
  const { t } = useTranslation("assets");

  return (
    <div className="relative group/tooltip inline-block">
      <button
        type="button"
        aria-label={t("assetCard.tooltips.viewDescription")}
        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-lg dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
      >
        <FileText className="h-4 w-4" />
      </button>

      <div className="absolute right-0 top-full mt-1.5 z-30 hidden group-hover/tooltip:block group-focus-within/tooltip:block w-64 max-w-xs animate-in fade-in zoom-in-95 duration-150">
        <div className="relative rounded-xl bg-gray-900 p-3 text-xs text-gray-100 shadow-xl border border-gray-800 dark:bg-gray-950 dark:border-gray-700">
          <div className="absolute -top-1 right-2.5 h-2 w-2 rotate-45 bg-gray-900 border-l border-t border-gray-800 dark:bg-gray-950 dark:border-gray-700" />
          <p className="relative z-10 leading-relaxed whitespace-normal break-words font-normal text-gray-200">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AssetItemCard({
  asset,
  isCovered = true,
  onDeleteAsset,
  currency = "EUR",
}: {
  asset: Asset;
  isCovered?: boolean;
  currency?: ApartmentWithLocation["currency"];
  onDeleteAsset: (assetId: string) => Promise<void> | void;
}) {
  const { t } = useTranslation("assets");
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
    <Card
      variant={!isCovered ? "amber" : "white"}
      padding="sm"
      radius="xl"
      hoverable={isCovered}
      className="group relative flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 dark:text-white">
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
                  className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  title={t("assetCard.actions.confirmDeleteTitle")}
                >
                  {isDeleting ? "..." : <Check className="h-3 w-3" />}
                  <span>{t("assetCard.actions.delete")}</span>
                </button>
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  {t("assetCard.actions.cancel")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title={t("assetCard.actions.deleteAssetTitle")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {asset.category && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100/80 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200/50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/50">
              <Tag className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              {t(`categories.${asset.category}`, asset.category)}
            </span>
          )}

          {asset.roomLocation && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100/80 px-2 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200/50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/50">
              <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              {t(`roomLocations.${asset.roomLocation}`, asset.roomLocation)}
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50/80 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50">
            <Camera className="h-3 w-3 text-blue-500 dark:text-blue-400" />
            {t(`photoProofs.${asset.photoProofRequirement}`)}
          </span>

          {!isCovered && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60">
              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              {t("assetCard.labels.missingShot")}
            </span>
          )}
        </div>
      </div>

      {formattedAmount && (
        <div className="mt-3.5 border-t border-gray-100/80 pt-2.5 dark:border-gray-800">
          <Typography type="caption" className="text-gray-400 block text-[11px] font-medium dark:text-gray-500">
            {t("assetCard.labels.approxValue")}
          </Typography>
          <Typography type="body-sm" className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 text-sm">
            {formattedAmount} {currency}
          </Typography>
        </div>
      )}
    </Card>
  );
}