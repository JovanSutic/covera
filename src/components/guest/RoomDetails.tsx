import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApartmentShot, ShotWithAssets } from "@/api/generated/requests/types.gen";
import { RoomPhotoItem } from "./RoomPhotoItem";
import CustomSelect, { type RichOption } from "../formItems/Select"; // Adjust path if needed

interface RoomDetailViewProps {
  roomLocation: ApartmentShot["roomLocation"];
  shots: ShotWithAssets[];
  allRooms: ApartmentShot["roomLocation"][];
  onBackToList: () => void;
  onSelectRoom: (location: ApartmentShot["roomLocation"]) => void;
  onFlagShot?: (shotId: string) => void;
}

export function RoomDetails({
  roomLocation,
  shots,
  allRooms,
  onBackToList,
  onSelectRoom,
  onFlagShot,
}: RoomDetailViewProps) {
  const roomName = roomLocation;

  // Group shots into Wide Sweeps and Close-ups
  const sweepShots = shots.filter((s) => s.shotType === "SWEEP_ONLY");
  const closeupShots = shots.filter((s) => s.shotType !== "SWEEP_ONLY");

  // Navigation indexes for bottom toolbar
  const currentIndex = allRooms.indexOf(roomLocation);
  const prevRoom = currentIndex > 0 ? allRooms[currentIndex - 1] : null;
  const nextRoom = currentIndex < allRooms.length - 1 ? allRooms[currentIndex + 1] : null;

  // Transform rooms array to RichOption format for CustomSelect
  const roomOptions: RichOption[] = allRooms.map((loc) => ({
    value: loc,
    label: loc,
  }));

  return (
    <div className="pb-24">
      {/* 1. Sticky Navigation Bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95 sm:mx-0 sm:rounded-xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> All Rooms
          </button>

          {/* Custom Dropdown Room Selector */}
          <CustomSelect
            options={roomOptions}
            value={roomLocation}
            onChange={(e) =>
              onSelectRoom(e.target.value as ApartmentShot["roomLocation"])
            }
            containerClassName="w-auto min-w-[160px]"
            className="py-1.5 min-h-[36px] text-xs font-semibold"
          />
        </div>
      </div>

      {/* 2. Shots List */}
      <div className="space-y-6">
        {/* Wide Sweeps Section */}
        {sweepShots.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Wide Sweeps ({sweepShots.length})
            </h2>
            <div className="space-y-4">
              {sweepShots.map((shot) => (
                <RoomPhotoItem key={shot.id} shot={shot} onFlagShot={onFlagShot} />
              ))}
            </div>
          </section>
        )}

        {/* Close-ups Section */}
        {closeupShots.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Close-ups & Specific Assets ({closeupShots.length})
            </h2>
            <div className="space-y-4">
              {closeupShots.map((shot) => (
                <RoomPhotoItem key={shot.id} shot={shot} onFlagShot={onFlagShot} />
              ))}
            </div>
          </section>
        )}

        {shots.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No photo requirements registered for {roomName}.
            </p>
          </div>
        )}
      </div>

      {/* 3. Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            type="button"
            disabled={!prevRoom}
            onClick={() => prevRoom && onSelectRoom(prevRoom)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-900"
          >
            <ChevronLeft className="h-4 w-4" /> Previous Room
          </button>

          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {currentIndex + 1} of {allRooms.length}
          </span>

          <button
            type="button"
            disabled={!nextRoom}
            onClick={() => nextRoom && onSelectRoom(nextRoom)}
            className="inline-flex items-center gap-1 rounded-lg bg-black px-3.5 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Next Room <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}