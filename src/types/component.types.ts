import type { Inspection } from "@/api/generated/requests/types.gen";

export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}
export interface DataTableProps<T> {
  data: T[] | undefined;
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  pagination?: PaginationProps;
}
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  containerClassName?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ReservationRow {
  id: string;
  guestName: string;
  guestEmail?: string | null;
  checkInDatetime: string;
  checkOutDatetime: string;
  platformReservationId?: string | null;
  status: string;
  hasPhotoProof?: boolean;
  proofWindowHours?: number;
  alternativeCheckInDatetime?: string;
  inspection?: Inspection;
}

export type RoomLocation =
  | "ENTRANCE_HALLWAY"
  | "STAIRCASE_CORRIDOR"
  | "LIVING_ROOM"
  | "DINING_ROOM"
  | "GAME_ENTERTAINMENT_ROOM"
  | "HOME_OFFICE_STUDY"
  | "KITCHEN"
  | "PANTRY_LAUNDRY_ROOM"
  | "BEDROOM_PRIMARY"
  | "BEDROOM_2"
  | "BEDROOM_3"
  | "BEDROOM_4"
  | "BEDROOM_5"
  | "BATHROOM_FULL_1"
  | "BATHROOM_FULL_2"
  | "BATHROOM_FULL_3"
  | "BATHROOM_HALF_POWDER"
  | "SAUNA_SPA_ROOM"
  | "GYM_FITNESS_ROOM"
  | "BALCONY_TERRACE"
  | "PATIO_DECK"
  | "GARDEN_YARD"
  | "SWIMMING_POOL_AREA"
  | "STORAGE_ROOM"
  | "GARAGE_PARKING"
  | "UTILITY_BOILER_ROOM"
  | "OTHER";
