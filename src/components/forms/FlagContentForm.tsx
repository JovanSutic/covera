/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import CustomSelect from "../formItems/Select";
import Textarea from "../formItems/Textarea";
import MultiSelect from "../formItems/MultiSelect";
import type {
  ShotWithAssets,
  InspectionFlag,
} from "@/api/generated/requests/types.gen";
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
  shotId: z.string().min(1, "flagContentForm.validation.shotIdRequired"),
  assetIds: z.array(z.string()),

  reason: z.enum(FLAG_REASONS, {
    message: "flagContentForm.validation.reasonRequired",
  }),

  details: z
    .string()
    .min(10, "flagContentForm.validation.detailsMinLength"),

  status: z.enum(FLAG_STATUSES, {
    message: "flagContentForm.validation.invalidStatus",
  }),
});

export type FlagFormData = z.infer<typeof flagSchema>;

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
  const { t } = useTranslation("guest");
  const queryClient = useQueryClient();

  const reasonOptions = [
    {
      value: "missing_asset",
      label: t("flagContentForm.reasons.missing_asset.label"),
      subLabel: t("flagContentForm.reasons.missing_asset.subLabel"),
    },
    {
      value: "damaged",
      label: t("flagContentForm.reasons.damaged.label"),
      subLabel: t("flagContentForm.reasons.damaged.subLabel"),
    },
    {
      value: "poor_photo",
      label: t("flagContentForm.reasons.poor_photo.label"),
      subLabel: t("flagContentForm.reasons.poor_photo.subLabel"),
    },
    {
      value: "wrong_room",
      label: t("flagContentForm.reasons.wrong_room.label"),
      subLabel: t("flagContentForm.reasons.wrong_room.subLabel"),
    },
    {
      value: "other",
      label: t("flagContentForm.reasons.other.label"),
      subLabel: t("flagContentForm.reasons.other.subLabel"),
    },
  ];

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
      const res = await postInspectionsByIdFlags({
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

      if (res.error) {
        throw res.error;
      }

      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.INSPECTION_GET_BY_ID, inspectionId],
      });

      const count = variables.assetIds.length;
      const targetText =
        count > 0
          ? t("flagContentForm.toast.targetAssets", { count })
          : t("flagContentForm.toast.targetThisItem");

      toast.info(t("flagContentForm.toast.flaggedSuccess", { targetText }), {
        description: t("flagContentForm.toast.flaggedDescription"),
        duration: Infinity,
        dismissible: true,
        action: {
          label: t("flagContentForm.buttons.gotIt"),
          onClick: () => toast.dismiss(),
        },
      });

      if (onSubmitSuccess) onSubmitSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to flag content", error);

      const errorMessage =
        error?.error?.message ||
        t("flagContentForm.toast.failedDefaultMessage");

      toast.error(t("flagContentForm.toast.failedTitle"), {
        description: errorMessage,
      });

      setError("root", {
        type: "server",
        message: errorMessage,
      });
    },
  });

  const assetOptions = (shot.assets || []).map((asset) => ({
    value: asset.id,
    label: asset.name,
    subLabel: `${t("flagContentForm.labels.category")} ${asset.category.replace(/_/g, " ")}`,
  }));

  const onSubmit = (data: FlagFormData) => {
    createFlagMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
      <input type="hidden" {...register("shotId")} />

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("flagContentForm.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("flagContentForm.flaggingLabel")}{" "}
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
                label={t("flagContentForm.labels.selectItemOptional")}
                options={assetOptions}
                onChange={(val: any) => {
                  const newValue =
                    val?.target?.value !== undefined ? val.target.value : val;
                  field.onChange(newValue);
                }}
                error={
                  errors.assetIds?.message
                    ? t(errors.assetIds.message)
                    : undefined
                }
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
              label={t("flagContentForm.labels.reasonForReport")}
              options={reasonOptions}
              onChange={(val: any) => {
                const newValue =
                  val?.target?.value !== undefined ? val.target.value : val;
                field.onChange(newValue);
              }}
              error={
                errors.reason?.message
                  ? t(errors.reason.message)
                  : undefined
              }
            />
          )}
        />

        {/* Text Area */}
        <Textarea
          label={t("flagContentForm.labels.additionalDetails")}
          rows={4}
          placeholder={t("flagContentForm.placeholders.details")}
          error={
            errors.details?.message ? t(errors.details.message) : undefined
          }
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
            {t("flagContentForm.buttons.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || createFlagMutation.isPending}
          className="rounded-lg bg-black dark:bg-white dark:text-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {createFlagMutation.isPending
            ? t("flagContentForm.buttons.submitting")
            : t("flagContentForm.buttons.submit")}
        </button>
      </div>
    </form>
  );
}