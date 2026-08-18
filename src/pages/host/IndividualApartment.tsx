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
import { RoomAssetsManager } from "@/components/host/RoomAssetsManager";
import { useMemo, useState } from "react";
import Drawer from "@/components/Drawer";
import Typography from "@/components/Typography";
import CreateAssetForm from "@/components/forms/CreateAssetForm";
import { toast } from "sonner";
import { ShotStudioModal } from "@/components/host/ShotStudioModal";
import type { SyncShotItem } from "@/api/generated/requests/types.gen";
import { addClientId } from "@/lib/helpers/uuid";
import { validateAssetShotCoverage } from "@/lib/validations/shots";
import { UnmatchedAssetsBanner } from "../../components/host/UnmatchedAssets";

export default function IndividualApartmentPage() {
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 mb-4">
        <Typography type="h3">Assets & Verification Shots</Typography>

        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsShotStudioOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Shot Studio
          </button>
          <button
            onClick={() => setIsUserDrawerOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer"
          >
            Add New Asset
          </button>
        </div>
      </div>

      <UnmatchedAssetsBanner
        unmatchedCount={coverageSummary?.uncoveredAssets?.length || 0}
        onNavigateToStudio={() => setIsShotStudioOpen(true)}
      />

      <RoomAssetsManager
        assets={assets}
        uncoveredAssetIds={uncoveredAssetIds}
        isLoading={assetsLoading || assetsFetching}
        onDeleteAsset={async (assetId) => {
          await deleteAsset(assetId);
        }}
      />

      <Drawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        title="Create New Asset"
      >
        <CreateAssetForm
          onSuccess={() => {
            setIsUserDrawerOpen(false);
          }}
          apartmentId={id}
          isOpen={isUserDrawerOpen}
        />
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
