/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import Button from "@/components/formItems/Button";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import type { RichOption } from "@/components/formItems/Select";
import { addIncidentItem } from "@/lib/api/incidentClaims";
import { useAssets } from "@/lib/api/queries/assets";
import { incidentsQueryKey } from "@/lib/api/queries/incidents";
import { incidentQueryKey } from "@/lib/api/queries/incident";
import { parseCentsFromInput } from "@/lib/helpers/claimMoney";
import type { IncidentItemWithToken } from "@/api/generated/requests/types.gen";

/**
 * Validation messages are i18n KEYS, not sentences — the convention
 * `CreateAssetForm`'s schema already uses. The key is resolved by `t()` at the point
 * it is rendered, which is the only way a validation error can be translated.
 */
const addItemSchema = z.object({
  assetId: z.string().min(1, "incidentPage.addItem.validation.assetRequired"),
  type: z.enum(["damage", "theft"], {
    message: "incidentPage.addItem.validation.typeRequired",
  }),
  value: z.string().optional(),
});

type AddItemFormValues = z.infer<typeof addItemSchema>;

interface AddIncidentItemFormProps {
  apartmentId: string;
  incidentId: string;
  /** D27: the assets already on the claim. The picker offers everything BUT these. */
  claimedAssetIds: readonly string[];
  /**
   * D50: the created item, carrying its `cleanerToken` — which ONLY this response
   * and the reissue response have. Phase 7's page keeps the token in session state;
   * without this callback the freshly minted link would be unreachable until a
   * reissue, because `GET /incidents/{id}` does not return tokens.
   *
   * Optional, so phase 6's own tests render the form without wiring a parent.
   */
  onItemAdded?: (item: IncidentItemWithToken) => void;
}

const DEFAULT_FORM_VALUES: AddItemFormValues = {
  assetId: "",
  // Most claims are damage, and the host switching it is one click. The alternative —
  // an empty default — would leave the form permanently invalid, because a `Select`
  // with no matching option renders blank and the enum would reject "".
  type: "damage",
  value: "",
};

/**
 * The feature's only form (invariant 8).
 *
 * D27: the picker lists the apartment's assets MINUS those already on the claim. The
 * backend refuses a duplicate with `INCIDENT_ITEM_EXISTS`, and offering an action the
 * API will reject is the failure this filter prevents — the same principle as
 * `getReservationActionAvailability`.
 *
 * D48: ONE asset per submission. Adding five assets is five submissions, each with its
 * own type — which matters, because the same asset cannot be both damaged and stolen,
 * but two assets on one claim routinely differ.
 *
 * D49: `mode: "onChange"`. The submit is disabled while `!isValid` (the
 * `CreateAssetForm` pattern), and under react-hook-form's default `onSubmit` mode
 * `isValid` is not recomputed until a submit — which the disabled button makes
 * impossible. `onChange` is what makes `isValid` track the selection.
 */
export function AddIncidentItemForm({
  apartmentId,
  incidentId,
  claimedAssetIds,
  onItemAdded,
}: AddIncidentItemFormProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();

  // The route already declared this read (phase 4), so on a normal navigation it is a
  // cache hit and starts no request.
  const { data: assets = [], isLoading: areAssetsLoading } = useAssets(apartmentId);

  const claimed = useMemo(() => new Set(claimedAssetIds), [claimedAssetIds]);

  const availableOptions: RichOption[] = useMemo(
    () =>
      assets
        .filter((asset) => asset.isActive && !claimed.has(asset.id))
        .map((asset) => ({
          value: asset.id,
          label: asset.name,
          subLabel: t(`assets:roomLocations.${asset.roomLocation}`, {
            defaultValue: asset.roomLocation,
          }),
        })),
    [assets, claimed, t],
  );

  const typeOptions: RichOption[] = useMemo(
    () => [
      { value: "damage", label: t("incidentPage.itemType.damage") },
      { value: "theft", label: t("incidentPage.itemType.theft") },
    ],
    [t],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemSchema),
    mode: "onChange",
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: AddItemFormValues) => {
      const cents = parseCentsFromInput(values.value ?? "");

      return addIncidentItem(incidentId, {
        assetId: values.assetId,
        type: values.type,
        // Omitted rather than sent as 0 — "not priced yet" and "worth nothing" are
        // different answers (phase 2's `parseCentsFromInput`).
        ...(cents === null ? {} : { estimatedPlaceholderValueCents: cents }),
      });
    },
    onSuccess: (created) => {
      // Both keys the write changed (invariant 7): the detail the item rows read, and
      // the apartment's list the reservation section reads — its item count and total
      // are stale the moment this returns.
      queryClient.invalidateQueries({ queryKey: incidentQueryKey(incidentId) });
      queryClient.invalidateQueries({
        queryKey: incidentsQueryKey({ apartmentId }),
      });

      // D50: the only moment this item's field token is knowable until a reissue.
      if (created) onItemAdded?.(created);

      toast.success(t("incidentPage.toasts.itemAdded"));
      // The added asset is now in `claimedAssetIds`, so the picker no longer offers it.
      // Clearing the selection here is what stops the next submit from resending a
      // value the list no longer shows.
      reset(DEFAULT_FORM_VALUES);
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || t("incidentPage.toasts.itemAddError"));
    },
  });

  const noOptionsLeft = !areAssetsLoading && availableOptions.length === 0;

  return (
    <form
      onSubmit={handleSubmit((values) => mutate(values))}
      className="flex w-full flex-col gap-4"
    >
      {noOptionsLeft ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("incidentPage.addItem.allClaimed")}
        </p>
      ) : (
        <Controller
          name="assetId"
          control={control}
          render={({ field }) => (
            <Select
              label={t("incidentPage.addItem.asset")}
              options={availableOptions}
              disabled={areAssetsLoading}
              value={field.value}
              onChange={field.onChange}
              error={
                errors.assetId?.message ? t(errors.assetId.message) : undefined
              }
              ref={field.ref}
            />
          )}
        />
      )}

      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Select
            label={t("incidentPage.addItem.type")}
            options={typeOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.type?.message ? t(errors.type.message) : undefined}
            ref={field.ref}
          />
        )}
      />

      <Input
        label={t("incidentPage.addItem.value")}
        type="text"
        inputMode="decimal"
        placeholder={t("incidentPage.addItem.valueHint")}
        error={errors.value?.message ? t(errors.value.message) : undefined}
        {...register("value")}
      />

      <Button
        type="submit"
        className="w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid || noOptionsLeft}
        isLoading={isPending}
      >
        {isSubmitting || isPending
          ? t("incidentPage.addItem.submitting")
          : t("incidentPage.addItem.submit")}
      </Button>
    </form>
  );
}