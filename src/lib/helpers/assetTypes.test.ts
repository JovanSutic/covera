import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { AssetType } from "@/api/generated/requests/types.gen";
import { resolveAssetIdentity, toAssetTypeOptions } from "./assetTypes";

const t = ((key: string) => key) as unknown as TFunction<"assets">;

const ASSET_TYPES: AssetType[] = [
  {
    id: "type-1",
    code: "SAMSUNG_TV_55",
    category: "ELECTRONICS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "type-2",
    code: "LEATHER_SOFA_3S",
    category: "FURNITURE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("toAssetTypeOptions", () => {
  it("labels each option with the type code and subtitles it with the translated category", () => {
    expect(toAssetTypeOptions(ASSET_TYPES, t)).toEqual([
      {
        value: "type-1",
        label: "SAMSUNG_TV_55",
        subLabel: "categories.ELECTRONICS",
      },
      {
        value: "type-2",
        label: "LEATHER_SOFA_3S",
        subLabel: "categories.FURNITURE",
      },
    ]);
  });

  it("returns an empty list when the catalogue is empty", () => {
    expect(toAssetTypeOptions([], t)).toEqual([]);
  });
});

describe("resolveAssetIdentity", () => {
  it("derives the submitted name and category from the selected asset type", () => {
    expect(resolveAssetIdentity(ASSET_TYPES, "type-2")).toEqual({
      name: "LEATHER_SOFA_3S",
      category: "FURNITURE",
    });
  });

  it("returns null when the id matches no asset type", () => {
    expect(resolveAssetIdentity(ASSET_TYPES, "type-does-not-exist")).toBeNull();
  });
});
