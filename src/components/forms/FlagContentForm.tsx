/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import { toast } from "sonner";
import CustomSelect from "../formItems/Select";
import Textarea from "../formItems/Textarea";
import MultiSelect from "../formItems/MultiSelect";
import type { ShotWithAssets, InspectionFlag } from "@/api/generated/requests/types.gen";
import { postInspectionsByIdFlags } from "@/api/generated/requests/services.gen";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";

type FlagReason = InspectionFlag["reason"];
const FLAG_REASONS: [FlagReason, ...FlagReason[]] = [
  "missing_asset",
  "damaged",
  "poor_photo",
  "wrong_room",
  "other",
];

type FlagStatus = InspectionFlag["status"];
const FLAG_STATUSES: [FlagStatus, ...FlagStatus[]] = [
  "pending",
  "under_review",
  "resolved",
  "dismissed",
];

const flagSchema = z.object({
  shotId: z.string().min(1, "Shot ID is required"),
  assetIds: z.array(z.string()),

  reason: z.enum(FLAG_REASONS, {
    message: "Please select a valid reason for flagging",
  }),

  details: z
    .string()
    .min(10, "Please provide at least 10 characters describing the issue"),

  status: z
    .enum(FLAG_STATUSES, {
      message: "Invalid status value",
    }),
});

export type FlagFormData = z.infer<typeof flagSchema>;

const REASON_OPTIONS = [
  {
    value: "missing_asset",
    label: "Missing asset/item",
    subLabel: "An asset listed is not visible in the photo",
  },
  {
    value: "damaged",
    label: "Damaged or poor condition",
    subLabel: "Item or area appears damaged or broken",
  },
  {
    value: "poor_photo",
    label: "Blurry or poor lighting",
    subLabel: "The photo quality makes verification difficult",
  },
  {
    value: "wrong_room",
    label: "Incorrect photo/room",
    subLabel: "Photo does not match this room or item",
  },
  {
    value: "other",
    label: "Other issue",
    subLabel: "Describe the situation below",
  },
];

interface FlagContentFormProps {
  inspectionId: string; // Passed from parent view/route context
  shot: ShotWithAssets;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export function FlagContentForm({
  inspectionId,
  shot,
  onSubmitSuccess,
  onCancel,
}: FlagContentFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isValid },
  } = useForm<FlagFormData>({
    resolver: zodResolver(flagSchema),
    mode: "onChange",
    defaultValues: {
      shotId: shot.id,
      assetIds: [],
      reason: undefined,
      details: "",
      status: "pending",
    },
  });

  const createFlagMutation = useMutation({
    mutationFn: async (formData: FlagFormData) => {
      return await postInspectionsByIdFlags({
        path: {
          id: inspectionId,
        },
        body: {
          shotId: formData.shotId,
          assetIds: formData.assetIds,
          reason: formData.reason,
          details: formData.details,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.INSPECTION_GET_BY_ID, inspectionId],
      });

      const count = variables.assetIds.length;
      const targetText = count > 0 ? `${count} asset(s)` : "This item";

      toast.info(`${targetText} flagged successfully`, {
        description:
          "You can now send the host an updated photo showing the new look or current condition.",
        duration: Infinity,
        dismissible: true,
        action: {
          label: "Got it",
          onClick: () => toast.dismiss(),
        },
      });

      if (onSubmitSuccess) onSubmitSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to flag content", error);
      setError("root", {
        type: "server",
        message:
          error?.response?.data?.message ||
          "Failed to submit report. Please try again.",
      });
    },
  });

  const assetOptions = (shot.assets || []).map((asset) => ({
    value: asset.id,
    label: asset.name,
    subLabel: `Category: ${asset.category.replace(/_/g, " ")}`,
  }));

  const onSubmit = (data: FlagFormData) => {
    createFlagMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
      <input type="hidden" {...register("shotId")} />

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Report an Issue
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Flagging:{" "}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {shot.title}
          </span>
        </p>
      </div>

      {errors.root && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-4 pt-2">
        {/* Asset Selection */}
        {shot.assets && shot.assets.length > 0 && (
          <Controller
            name="assetIds"
            control={control}
            render={({ field }) => (
              <MultiSelect
                {...field}
                label="Select specific item (optional)"
                options={assetOptions}
                onChange={(val: any) => {
                  const newValue =
                    val?.target?.value !== undefined ? val.target.value : val;
                  field.onChange(newValue);
                }}
                error={errors.assetIds?.message}
              />
            )}
          />
        )}

        {/* Reason Selection */}
        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <CustomSelect
              {...field}
              label="Reason for report"
              options={REASON_OPTIONS}
              onChange={(val: any) => {
                const newValue =
                  val?.target?.value !== undefined ? val.target.value : val;
                field.onChange(newValue);
              }}
              error={errors.reason?.message}
            />
          )}
        />

        {/* Text Area */}
        <Textarea
          label="Additional details"
          rows={4}
          placeholder="Please describe what is broken, missing, or incorrect..."
          error={errors.details?.message}
          {...register("details")}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={createFlagMutation.isPending}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || createFlagMutation.isPending}
          className="rounded-lg bg-black dark:bg-white dark:text-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {createFlagMutation.isPending ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </form>
  );
}