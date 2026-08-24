/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteAssetsById,
  getApartmentsById,
  getAssetsApartmentByApartmentId,
  getApartmentShotsApartmentByApartmentId,
  putApartmentShotsApartmentByApartmentId,
} from "@/api/generated/requests/sdk.gen";
import Header from "@/components/Header";
import { ApartmentOverviewHeader } from "@/components/host/ApartmentHeader";
import PageLayout from "@/components/layout/PageLayout";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router";
import { ApartmentAssetsManager } from "@/components/host/ApartmentAssetsManager";
import { ApartmentReservationsManager } from "@/components/host/ReservationsSection";
import { useMemo, useState } from "react";
import Drawer from "@/components/Drawer";
import CreateAssetForm from "@/components/forms/CreateAssetForm";
import { toast } from "sonner";
import { ShotStudioModal } from "@/components/host/ShotStudioModal";
import type { SyncShotItem } from "@/api/generated/requests/types.gen";
import { addClientId } from "@/lib/helpers/uuid";
import { validateAssetShotCoverage } from "@/lib/validations/shots";
import { UnmatchedAssetsBanner } from "../../components/host/UnmatchedAssets";
import CreateReservationForm from "@/components/forms/CreateReservationForm";

export default function IndividualApartmentPage() {
  const [activeTab, setActiveTab] = useState<"reservations" | "assets">(
    "reservations",
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShotStudioOpen, setIsShotStudioOpen] = useState(false);
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    data: apartment,
    isLoading: apartmentLoading,
    isFetching: apartmentFetching,
  } = useQuery({
    queryKey: [...QUERY_ACTIONS.APARTMENTS_GET_ID, id],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("Apartment ID is required");
      const config = await withAuth({ signal });
      const response = await getApartmentsById({
        ...config,
        path: { id },
      });
      return response.data;
    },
    enabled: !!id,
  });

  const {
    data: assets = [],
    isLoading: assetsLoading,
    isFetching: assetsFetching,
  } = useQuery({
    queryKey: [...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, id],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("Apartment ID is required");
      const config = await withAuth({ signal });
      const response = await getAssetsApartmentByApartmentId({
        ...config,
        path: { apartmentId: id },
      });
      return response.data || [];
    },
    enabled: !!id,
  });

  const { data: shots = [] } = useQuery({
    queryKey: ["APARTMENT_SHOTS_GET_BY_APARTMENT", id],
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("Apartment ID is required");
      const config = await withAuth({ signal });
      const response = await getApartmentShotsApartmentByApartmentId({
        ...config,
        path: { apartmentId: id },
      });
      return response.data || [];
    },
    enabled: !!id,
  });

  const { mutateAsync: deleteAsset } = useMutation({
    mutationFn: async (assetId: string) => {
      const config = await withAuth();
      const response = await deleteAssetsById({
        ...config,
        path: { id: assetId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, id],
      });
      toast.success("Asset deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Failed to delete asset:", error);
      toast.error(
        error?.error?.message || "An error occurred while deleting the asset.",
      );
    },
  });

  const { mutateAsync: saveShots } = useMutation({
    mutationFn: async (updatedShots: SyncShotItem[]) => {
      if (!id) throw new Error("Apartment ID required");
      const config = await withAuth();
      const response = await putApartmentShotsApartmentByApartmentId({
        ...config,
        path: { apartmentId: id },
        body: { shots: updatedShots },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["APARTMENT_SHOTS_GET_BY_APARTMENT", id],
      });
      toast.success("Shot requirements saved!");
      setIsShotStudioOpen(false);
    },
    onError: (error: any) => {
      console.error("Failed to save shots:", error);
      toast.error(
        error?.error?.message || "An error occurred while saving shots.",
      );
    },
  });

  const coverageSummary = useMemo(
    () => validateAssetShotCoverage(assets, shots),
    [assets, shots],
  );

  const uncoveredAssetIds = useMemo(
    () => coverageSummary.uncoveredAssets.map((issue) => issue.asset.id),
    [coverageSummary],
  );

  const unmatchedCount = coverageSummary?.uncoveredAssets?.length || 0;

  if (!id || (!apartment && !apartmentLoading)) {
    return <Navigate to="/apartments" />;
  }

  return (
    <PageLayout size="lg">
      <Header />
      <ApartmentOverviewHeader
        apartment={apartment}
        isLoading={apartmentLoading || apartmentFetching}
      />

      {/* Primary Workspace Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mt-6 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Apartment Sections">
          <button
            onClick={() => setActiveTab("reservations")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "reservations"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Reservations
          </button>

          <button
            onClick={() => setActiveTab("assets")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "assets"
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <span>Assets & Verification Shots</span>
            {unmatchedCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                {unmatchedCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      <UnmatchedAssetsBanner
        unmatchedCount={unmatchedCount}
        onNavigateToStudio={() => {
          setActiveTab("assets");
          setIsShotStudioOpen(true);
        }}
      />

      {/* Tab Views */}
      {activeTab === "reservations" ? (
        <ApartmentReservationsManager apartmentId={id} onOpenCreateReservation={() => setIsDrawerOpen(true)} />
      ) : (
        <ApartmentAssetsManager
          assets={assets}
          uncoveredAssetIds={uncoveredAssetIds}
          isLoading={assetsLoading || assetsFetching}
          onDeleteAsset={async (assetId) => {
            await deleteAsset(assetId);
          }}
          onOpenShotStudio={() => setIsShotStudioOpen(true)}
          onOpenCreateAsset={() => setIsDrawerOpen(true)}
        />
      )}

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          activeTab === "reservations"
            ? "Create New Reservation"
            : "Create New Asset"
        }
      >
        {activeTab === "reservations" ? (
          <CreateReservationForm
            apartmentId={id}
            isOpen={isDrawerOpen}
            onSuccess={() => setIsDrawerOpen(false)}
          />
        ) : (
          <CreateAssetForm
            apartmentId={id}
            isOpen={isDrawerOpen}
            onSuccess={() => setIsDrawerOpen(false)}
          />
        )}
      </Drawer>

      <ShotStudioModal
        isOpen={isShotStudioOpen}
        onClose={() => setIsShotStudioOpen(false)}
        initialShots={addClientId(shots)}
        availableAssets={assets}
        onSave={async (updatedShots) => {
          await saveShots(updatedShots);
        }}
      />
    </PageLayout>
  );
}
