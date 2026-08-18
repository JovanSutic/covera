import type { Asset, SyncShotItem } from "@/api/generated/requests/types.gen";

export type AssetCoverageStatus =
  | 'UNLINKED'               
  | 'MISSING_SWEEP'           
  | 'MISSING_SPECIFIC_TYPE'   
  | 'COVERED';

export interface AssetCoverageIssue {
  asset: Asset;
  status: Exclude<AssetCoverageStatus, 'COVERED'>;
  missingTypes: SyncShotItem['shotType'][];
  linkedShotTypes: SyncShotItem['shotType'][];
}

export interface ValidationSummary {
  uncoveredAssets: AssetCoverageIssue[];
  totalAssets: number;
  coveredCount: number;
  uncoveredCount: number;
  isValid: boolean;
}


export function validateAssetShotCoverage(
  assets: Asset[],
  shots: SyncShotItem[]
): ValidationSummary {
  const activeAssets = assets.filter((asset) => asset.isActive);

  const assetToShotTypesMap = new Map<string, Set<SyncShotItem['shotType']>>();

  for (const shot of shots) {
    for (const assetId of shot.assetIds) {
      if (!assetToShotTypesMap.has(assetId)) {
        assetToShotTypesMap.set(assetId, new Set());
      }
      assetToShotTypesMap.get(assetId)!.add(shot.shotType);
    }
  }

  const uncoveredAssets: AssetCoverageIssue[] = [];

  for (const asset of activeAssets) {
    const linkedTypesSet = assetToShotTypesMap.get(asset.id) ?? new Set();
    const missingTypes: SyncShotItem['shotType'][] = [];

    // Rule 1: Every asset requires SWEEP_ONLY
    if (!linkedTypesSet.has('SWEEP_ONLY')) {
      missingTypes.push('SWEEP_ONLY');
    }

    // Rule 2: Non-sweep assets require their specific proof type as well
    if (
      asset.photoProofRequirement !== 'SWEEP_ONLY' &&
      !linkedTypesSet.has(asset.photoProofRequirement)
    ) {
      missingTypes.push(asset.photoProofRequirement);
    }

    // If any required shot type is missing, record the issue
    if (missingTypes.length > 0) {
      let status: Exclude<AssetCoverageStatus, 'COVERED'>;

      if (linkedTypesSet.size === 0) {
        status = 'UNLINKED';
      } else if (missingTypes.includes('SWEEP_ONLY')) {
        status = 'MISSING_SWEEP';
      } else {
        status = 'MISSING_SPECIFIC_TYPE';
      }

      uncoveredAssets.push({
        asset,
        status,
        missingTypes,
        linkedShotTypes: Array.from(linkedTypesSet),
      });
    }
  }

  const totalAssets = activeAssets.length;
  const uncoveredCount = uncoveredAssets.length;
  const coveredCount = totalAssets - uncoveredCount;

  return {
    uncoveredAssets,
    totalAssets,
    coveredCount,
    uncoveredCount,
    isValid: uncoveredCount === 0,
  };
}