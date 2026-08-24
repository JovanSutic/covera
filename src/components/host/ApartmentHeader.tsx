import type { ApartmentWithLocation } from "@/api/generated/requests/types.gen";
import { Building2, MapPin, Calendar, Coins, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import Typography from "../Typography";

interface ApartmentOverviewHeaderProps {
  apartment?: ApartmentWithLocation;
  isLoading?: boolean;
}

export function ApartmentOverviewHeader({
  apartment,
  isLoading,
}: ApartmentOverviewHeaderProps) {
  if (isLoading) {
    return <ApartmentOverviewSkeleton />;
  }

  if (!apartment) return null;

  const formattedDate = new Date(apartment.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  return (
    <div className="rounded-xl bg-white p-4 dark:bg-gray-900/50">
      <div className="mb-3">
        <Link
          to="/host/apartments"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors group dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <Typography
            type="caption"
            className="font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
          >
            All Apartments
          </Typography>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:items-center sm:justify-start">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <Typography type="h2" className="text-gray-900 dark:text-white font-semibold">
                {apartment.name}
              </Typography>
              <div className="mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <Typography type="body-sm" className="text-gray-500 dark:text-gray-400">
                  {`${apartment.location.name}, ${apartment.address}`}
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:hidden self-start pt-1 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <Typography type="caption" className="font-medium text-gray-600 dark:text-gray-400">
              {formattedDate}
            </Typography>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {apartment.currency}
            </span>

            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 max-w-full truncate">
              ID: {apartment.externalId}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <Typography type="caption" className="text-gray-500 dark:text-gray-400">
              Created:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formattedDate}
              </span>
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApartmentOverviewSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-white p-4 dark:bg-gray-900/50 space-y-3">
      <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:items-center sm:justify-start">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-52 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-800 sm:hidden self-start mt-1" />
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <div className="h-6 w-14 rounded-md bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-20 rounded-md bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="hidden h-4 w-28 rounded sm:block bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}