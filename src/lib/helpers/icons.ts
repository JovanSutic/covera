import type { RoomLocation } from "@/types/component.types";
import {
  Home,
  DoorOpen,
  Tv,
  Utensils,
  Gamepad2,
  Briefcase,
  UtensilsCrossed,
  WashingMachine,
  Bed,
  Bath,
  ShowerHead,
  Sparkles,
  Dumbbell,
  Sun,
  Trees,
  Waves,
  Archive,
  Car,
  Flame,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export const ROOM_ICON_MAP: Record<RoomLocation, LucideIcon> = {
  ENTRANCE_HALLWAY: DoorOpen,
  STAIRCASE_CORRIDOR: HelpCircle,
  LIVING_ROOM: Tv,
  DINING_ROOM: UtensilsCrossed,
  GAME_ENTERTAINMENT_ROOM: Gamepad2,
  HOME_OFFICE_STUDY: Briefcase,
  KITCHEN: Utensils,
  PANTRY_LAUNDRY_ROOM: WashingMachine,
  BEDROOM_PRIMARY: Bed,
  BEDROOM_2: Bed,
  BEDROOM_3: Bed,
  BEDROOM_4: Bed,
  BEDROOM_5: Bed,
  BATHROOM_FULL_1: Bath,
  BATHROOM_FULL_2: Bath,
  BATHROOM_FULL_3: Bath,
  BATHROOM_HALF_POWDER: ShowerHead,
  SAUNA_SPA_ROOM: Sparkles,
  GYM_FITNESS_ROOM: Dumbbell,
  BALCONY_TERRACE: Sun,
  PATIO_DECK: Sun,
  GARDEN_YARD: Trees,
  SWIMMING_POOL_AREA: Waves,
  STORAGE_ROOM: Archive,
  GARAGE_PARKING: Car,
  UTILITY_BOILER_ROOM: Flame,
  OTHER: HelpCircle,
};

export const getRoomIcon = (location?: RoomLocation | string): LucideIcon => {
  if (!location) return Home;

  // 1. Exact match against typed enum key
  if (location in ROOM_ICON_MAP) {
    return ROOM_ICON_MAP[location as RoomLocation];
  }

  // 2. Fallback substring matching for custom human-readable room names
  const lower = location.toLowerCase();
  if (lower.includes("bed")) return Bed;
  if (lower.includes("bath") || lower.includes("wash") || lower.includes("toilet")) return Bath;
  if (lower.includes("kitchen") || lower.includes("cook")) return Utensils;
  if (lower.includes("dining")) return UtensilsCrossed;
  if (lower.includes("living") || lower.includes("lounge") || lower.includes("tv")) return Tv;
  if (lower.includes("garage") || lower.includes("parking")) return Car;
  if (lower.includes("gym") || lower.includes("fitness")) return Dumbbell;
  if (lower.includes("pool")) return Waves;
  if (lower.includes("office") || lower.includes("study")) return Briefcase;
  if (lower.includes("laundry") || lower.includes("pantry")) return WashingMachine;

  return Home;
};