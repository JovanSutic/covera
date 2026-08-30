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

export interface SelectOption { value: string; label: string };

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
}