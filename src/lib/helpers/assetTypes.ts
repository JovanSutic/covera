import type { AssetType } from "@/api/generated/requests/types.gen";
import type { TFunction } from "i18next";
import type { SelectOption } from "@/types/component.types";

export interface ResolvedAssetIdentity {
  name: string;
  category: AssetType["category"];
}

export function toAssetTypeOptions(
  assetTypes: AssetType[],
  t: TFunction<"assets">
): SelectOption[] {
  return assetTypes.map((assetType) => ({
    value: assetType.id,
    label: assetType.code,
    subLabel: t(`categories.${assetType.category}`, assetType.category),
  }));
}

export function resolveAssetIdentity(
  assetTypes: AssetType[],
  assetTypeId: string
): ResolvedAssetIdentity | null {
  const match = assetTypes.find((assetType) => assetType.id === assetTypeId);

  if (!match) return null;

  return { name: match.code, category: match.category };
}
