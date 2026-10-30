/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  deleteAssetsById,
  putApartmentShotsApartmentByApartmentId,
} from "@/api/generated/requests/sdk.gen";
import type { SyncShotItem } from "@/api/generated/requests/types.gen";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import Drawer from "@/components/Drawer";
import { ApartmentOverviewHeader } from "@/components/host/ApartmentHeader";
import { ApartmentAssetsManager } from "@/components/host/ApartmentAssetsManager";
import { ReservationsTable } from "@/components/host/ReservationsTable";
import { ShotStudioModal } from "@/components/host/ShotStudioModal";
import CreateAssetForm from "@/components/forms/CreateAssetForm";
import CreateReservationForm from "@/components/forms/CreateReservationForm";
import { UnmatchedAssetsBanner } from "../../components/host/UnmatchedAssets";

import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useApartment } from "@/lib/api/queries/apartment";
import { useAssets } from "@/lib/api/queries/assets";
import { shotsQueryKey, useShots } from "@/lib/api/queries/shots";
import {
  RESERVATIONS_DEFAULT_LIMIT,
  RESERVATIONS_DEFAULT_PAGE,
  useReservations,
} from "@/lib/api/queries/reservations";
import { appPaths, buildPath, useRouteParams } from "@/lib/router";
import { validateAssetShotCoverage } from "@/lib/validations/shots";
import { addClientId } from "@/lib/helpers/uuid";
import type { ReservationRow } from "@/types/component.types";

export default function IndividualApartmentPage() {
  const { t } = useTranslation("general");

  const [activeTab, setActiveTab] = useState<"reservations" | "assets">(
    "reservations"
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShotStudioOpen, setIsShotStudioOpen] = useState(false);

  const { id } = useRouteParams(appPaths.hostApartment) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- QUERIES ---

  const {
    data: apartment,
    isLoading: apartmentLoading,
    isFetching: apartmentFetching,
  } = useApartment(id);

  const {
    data: assets = [],
    isLoading: assetsLoading,
    isFetching: assetsFetching,
  } = useAssets(id);

  const {
    data: shots = [],
    isLoading: shotsLoading,
    isFetching: shotsFetching,
  } = useShots(id);

  // The reservations manager owns its own paging state, but the page needs the
  // default page's data for the unmatched-assets banner — the same key the route
  // prefetches (D8), so this is a cache read, not a second request.
  useReservations({
    apartmentId: id,
    page: RESERVATIONS_DEFAULT_PAGE,
    limit: RESERVATIONS_DEFAULT_LIMIT,
  });

  // --- MUTATIONS ---

  const { mutate: deleteAsset } = useMutation({
    mutationFn: async (assetId: string) => {
      const config = await withAuth();
      const response = await deleteAssetsById({
        ...config,
        path: { id: assetId },
      });
      return response.data;
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, id],
        });
      }
      toast.success(t("apartmentPage.toast.deleteAssetSuccess"));
    },
    onError: (error: any) => {
      console.error("Failed to delete asset:", error);
      toast.error(
        error?.error?.message || t("apartmentPage.errors.deleteAssetFailed")
      );
    },
  });

  const saveShotsMutation = useMutation({
    mutationFn: async (updatedShots: SyncShotItem[]) => {
      if (!id) throw new Error(t("apartmentPage.errors.apartmentIdRequired"));
      const config = await withAuth();
      const response = await putApartmentShotsApartmentByApartmentId({
        ...config,
        path: { apartmentId: id },
        body: { shots: updatedShots },
      });
      return response.data;
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: shotsQueryKey(id) });
      }
      toast.success(t("apartmentPage.toast.saveShotsSuccess"));
      setIsShotStudioOpen(false);
    },
    onError: (error: any) => {
      console.error("Failed to save shots:", error);
      toast.error(
        error?.error?.message || t("apartmentPage.errors.saveShotsFailed")
      );
    },
  });

  // --- COMPUTED VALUES ---

  const coverageSummary = useMemo(
    () => validateAssetShotCoverage(assets, shots),
    [assets, shots]
  );

  const uncoveredAssetIds = useMemo(
    () => coverageSummary.uncoveredAssets.map((issue) => issue.asset.id),
    [coverageSummary]
  );

  const unmatchedCount = coverageSummary?.uncoveredAssets?.length || 0;

  const isDataLoading =
    assetsLoading || assetsFetching || shotsLoading || shotsFetching;

  const preparedShots = useMemo(() => addClientId(shots), [shots]);

  // --- HANDLERS ---

  const handleTakeProofs = (reservation: ReservationRow) => {
    navigate(
      buildPath(appPaths.inspectionGuide, {
        apartmentId: id,
        reservationId: reservation.id,
      }),
    );
  };

  const handleFormSuccess = () => {
    setIsDrawerOpen(false);
    if (!id) return;

    if (activeTab === "reservations") {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, id],
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, id],
      });
    }
  };

  if (!apartmentLoading && !apartmentFetching && !apartment) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("apartmentPage.errors.notFoundTitle")}
          subtitle={t("apartmentPage.errors.notFoundSubtitle")}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout size="lg">
      <ApartmentOverviewHeader
        apartment={apartment}
        isLoading={apartmentLoading || apartmentFetching}
      />

      {/* Primary Workspace Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mt-6 mb-6">
        <nav
          className="-mb-px flex space-x-8"
          aria-label={t("apartmentPage.tabs.ariaLabel")}
        >
          <button
            type="button"
            onClick={() => setActiveTab("reservations")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "reservations"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t("apartmentPage.tabs.reservations")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assets")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "assets"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <span>{t("apartmentPage.tabs.assets")}</span>
            {!isDataLoading && unmatchedCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                {unmatchedCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Unmatched Assets Banner */}
      {!isDataLoading && unmatchedCount > 0 && (
        <UnmatchedAssetsBanner
          unmatchedCount={unmatchedCount}
          onNavigateToStudio={() => {
            setActiveTab("assets");
            setIsShotStudioOpen(true);
          }}
        />
      )}

      {/* Tab Views */}
      {activeTab === "reservations" ? (
        <ReservationsTable
          apartmentId={id}
          onOpenCreateReservation={() => setIsDrawerOpen(true)}
          onTakeProofs={handleTakeProofs}
        />
      ) : (
        <ApartmentAssetsManager
          assets={assets}
          uncoveredAssetIds={uncoveredAssetIds}
          isLoading={assetsLoading || assetsFetching}
          onDeleteAsset={(assetId) => deleteAsset(assetId)}
          onOpenShotStudio={() => setIsShotStudioOpen(true)}
          onOpenCreateAsset={() => setIsDrawerOpen(true)}
        />
      )}

      {/* Drawer Component for Asset / Reservation Creation */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          activeTab === "reservations"
            ? t("apartmentPage.drawer.createReservation")
            : t("apartmentPage.drawer.createAsset")
        }
      >
        {activeTab === "reservations" ? (
          <CreateReservationForm
            apartmentId={id}
            isOpen={isDrawerOpen}
            onSuccess={handleFormSuccess}
          />
        ) : (
          <CreateAssetForm
            apartmentId={id}
            isOpen={isDrawerOpen}
            onSuccess={handleFormSuccess}
          />
        )}
      </Drawer>

      {/* Studio Modal Component */}
      {isShotStudioOpen && (
        <ShotStudioModal
          isOpen={isShotStudioOpen}
          onClose={() => setIsShotStudioOpen(false)}
          initialShots={preparedShots}
          availableAssets={assets}
          onSave={async (updatedShots) => {
            await saveShotsMutation.mutateAsync(updatedShots);
          }}
        />
      )}

    </PageLayout>
  );
}