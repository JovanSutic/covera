/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteAssetsById,
  getApartmentsById,
  getAssetsApartmentByApartmentId,
} from "@/api/generated/requests/sdk.gen";
import Header from "@/components/Header";
import { ApartmentOverviewHeader } from "@/components/host/ApartmentHeader";
import PageLayout from "@/components/layout/PageLayout";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router";
import { RoomAssetsManager } from "@/components/host/RoomAssetsManager";
import { useState } from "react";
import Drawer from "@/components/Drawer";
import Typography from "@/components/Typography";
import CreateAssetForm from "@/components/forms/CreateAssetForm";
import { toast } from "sonner";

export default function IndividualApartmentPage() {
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
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
    data: assets,
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
      return response.data;
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
      <div className="flex items-center justify-between mt-8">
        <Typography type="h3">Assets</Typography>
        <button
          onClick={() => setIsUserDrawerOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer"
        >
          Add New Asset
        </button>
      </div>
      <RoomAssetsManager
        assets={assets}
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
    </PageLayout>
  );
}
