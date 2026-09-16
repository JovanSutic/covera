/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import CustomSelect from "../formItems/Select";
import Textarea from "../formItems/Textarea";
import type { ShotWithAssets } from "@/api/generated/requests/types.gen";
import MultiSelect from "../formItems/MultiSelect";

const flagSchema = z.object({
  shotId: z.string().min(1, "Shot ID is required"),
  assetId: z.array(z.string()),
  reason: z.string().min(1, "Please select a reason for flagging"),
  details: z
    .string()
    .min(10, "Please provide at least 10 characters describing the issue"),
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
  shot: ShotWithAssets;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export function FlagContentForm({
  shot,
  onSubmitSuccess,
  onCancel,
}: FlagContentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FlagFormData>({
    resolver: zodResolver(flagSchema),
    mode: "onChange", // Evaluates validity on every change so `isValid` updates instantly
    defaultValues: {
      shotId: shot.id,
      assetId: [],
      reason: "",
      details: "",
    },
  });

  const assetOptions = [
    ...(shot.assets || []).map((asset) => ({
      value: asset.id,
      label: asset.name,
      subLabel: `Category: ${asset.category.replace(/_/g, " ")}`,
    })),
  ];

  const onSubmit = async (data: FlagFormData) => {
    try {
      console.log("Submitting flag payload:", data);
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      console.error("Failed to flag content", err);
    }
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

      <div className="space-y-4 pt-2">
        {/* Asset Selection */}
        {shot.assets && shot.assets.length > 0 && (
          <Controller
            name="assetId"
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
                error={errors.assetId?.message}
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
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="rounded-lg bg-black dark:bg-white dark:text-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </form>
  );
}