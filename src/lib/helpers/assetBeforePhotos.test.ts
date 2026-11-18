import { describe, expect, it } from "vitest";

import { assetBeforePhotos } from "./assetBeforePhotos";
import type { ReservationPhotos } from "@/api/generated/requests/types.gen";

const ASSET = {
  id: "asset-1",
  apartmentId: "apartment-1",
  name: "Bedroom Curtains",
} as ReservationPhotos[number]["assets"][number];

function image(
  id: string,
  overrides: Partial<ReservationPhotos[number]["images"][number]> = {},
): ReservationPhotos[number]["images"][number] {
  return {
    id,
    apartmentId: "apartment-1",
    shotId: "shot-1",
    reservationId: "reservation-1",
    type: "checkin_state",
    storageKey: `key-${id}`,
    uploadedAt: "2026-11-08T10:00:00.000Z",
    status: "active",
    deletedAt: null,
    ...overrides,
  };
}

function shot(
  id: string,
  assets: ReservationPhotos[number]["assets"],
  images: ReservationPhotos[number]["images"],
): ReservationPhotos[number] {
  return {
    id,
    apartmentId: "apartment-1",
    roomLocation: "LIVING_ROOM",
    shotType: "SWEEP_ONLY",
    title: "Living room",
    instructions: "",
    createdAt: "2026-11-08T09:00:00.000Z",
    updatedAt: "2026-11-08T09:00:00.000Z",
    assets,
    images,
  };
}

describe("assetBeforePhotos", () => {
  it("returns nothing when the photos are undefined", () => {
    expect(assetBeforePhotos(undefined, "asset-1")).toEqual([]);
  });

  it("returns nothing when there are no shots", () => {
    expect(assetBeforePhotos([], "asset-1")).toEqual([]);
  });

  it("returns a shot's checkin_state image for the asset it covers", () => {
    const photos = [shot("shot-1", [ASSET], [image("img-1")])];

    expect(assetBeforePhotos(photos, "asset-1")).toEqual([
      { id: "img-1", storageKey: "key-img-1" },
    ]);
  });

  it("excludes a damage image in the same shot", () => {
    const photos = [
      shot("shot-1", [ASSET], [
        image("img-1"),
        image("img-2", { type: "damage" }),
      ]),
    ];

    expect(assetBeforePhotos(photos, "asset-1")).toEqual([
      { id: "img-1", storageKey: "key-img-1" },
    ]);
  });

  it("excludes a soft-deleted image", () => {
    const photos = [
      shot("shot-1", [ASSET], [
        image("img-1", {
          status: "soft_deleted",
          deletedAt: "2026-11-08T12:00:00.000Z",
        }),
      ]),
    ];

    expect(assetBeforePhotos(photos, "asset-1")).toEqual([]);
  });

  it("merges the asset's images across shots, in shot order, and skips other shots", () => {
    const other = { ...ASSET, id: "asset-2" };
    const photos = [
      shot("shot-1", [ASSET], [image("img-1")]),
      shot("shot-2", [other], [image("img-ignored")]),
      shot("shot-3", [other, ASSET], [image("img-2")]),
    ];

    expect(assetBeforePhotos(photos, "asset-1")).toEqual([
      { id: "img-1", storageKey: "key-img-1" },
      { id: "img-2", storageKey: "key-img-2" },
    ]);
  });

  it("lists an image once when the same shot appears twice", () => {
    const repeated = shot("shot-1", [ASSET], [image("img-1"), image("img-2")]);

    expect(assetBeforePhotos([repeated, repeated], "asset-1")).toEqual([
      { id: "img-1", storageKey: "key-img-1" },
      { id: "img-2", storageKey: "key-img-2" },
    ]);
  });
});
