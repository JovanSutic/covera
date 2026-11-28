/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ImageZoomOverlay } from "@/components/shared/ImageZoomOverlay";
import {
  removeIncidentEvidence,
  uploadIncidentEvidence,
} from "@/lib/api/incidentClaims";
import { incidentQueryKey } from "@/lib/api/queries/incident";
import type { BeforePhoto } from "@/lib/helpers/assetBeforePhotos";
import {
  activeEvidence,
  activePhotoCount,
  evidenceLabelKey,
  isPhotoEvidence,
  requiredPhotoTypes,
} from "@/lib/helpers/incidentEvidence";
import type { EvidenceType } from "@/lib/helpers/incidentEvidence";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

const R2_IMAGE_URL = import.meta.env.VITE_R2_IMAGE_URL;

interface IncidentItemEvidenceProps {
  incidentId: string;
  item: IncidentItem;
  /**
   * D7: the asset's before photos for this stay. Rendered above the damage strip, with
   * no delete control — these are evidence the guest never removed, so the host must not
   * be able to attach a delete action to them here.
   */
  beforePhotos?: readonly BeforePhoto[];
  /**
   * D19's seam, copied from `ShotStepPanel`: jsdom implements no `URL.createObjectURL`,
   * so the tests inject a fake control and drive the real handler instead of stubbing
   * the whole browser. `ShotStepPanel` imports its types the same explicit way.
   */
  renderCapture?: (
    evidenceType: EvidenceType,
    onCapture: (file: File) => void,
  ) => ReactNode;
  /**
   * D32 (feature/54): display-only. The claim page shows what an item has and offers no
   * capture or delete control — that work moved to `/incident/:incidentId/proofs`. The
   * mutations stay in this file because that page renders this same component.
   */
  readOnly?: boolean;
  /**
   * D3/D11 (feature/54): the guest's credential, present only when the proofs page was opened
   * through an access link. The upload mutation below passes it straight through, which switches
   * it from `withAuth()` to `publicApi()` — a guest holds no session, and `withAuth()` would
   * send `Bearer undefined` and turn a working anonymous capture into a 401 (invariant 11).
   *
   * Its PRESENCE also gates the per-photo remove control: the backend's evidence DELETE is the
   * one evidence route with no `?accessId=` path (verified 2026-11-28), so a guest cannot
   * authorize a removal and is not offered one.
   */
  accessId?: string;
}

/**
 * The evidence for ONE item: what it still needs, what it has, and the control to add
 * more.
 *
 * It reads phase 1's vocabulary rather than deriving its own rule (invariant 9):
 * `requiredPhotoTypes` says which views this item's type demands, `activePhotoCount`
 * says how many are already there, and `activeEvidence` filters out the soft-deleted
 * rows so a host who deleted a bad photo does not see it counted.
 *
 * Documents are NOT offered here. The four document types are real (`DOCUMENT_EVIDENCE_TYPES`)
 * and the backend accepts them, but the blueprint's host-side flow asks the host to
 * photograph the asset; attaching receipts and invoices is out of scope for this
 * feature and recorded as such.
 */
export function IncidentItemEvidence({
  incidentId,
  item,
  beforePhotos = [],
  renderCapture,
  readOnly = false,
  accessId,
}: IncidentItemEvidenceProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Which required view the native picker is currently collecting. A ref would lose
  // the render the label change needs, so it is state.
  const [pendingType, setPendingType] = useState<EvidenceType | null>(null);
  // The photo shown fullscreen, if any. `null` is closed — the same shape as
  // `ExpandableImage`'s boolean, held as the photo so the overlay cannot drift from the
  // thumbnail that opened it.
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({
      // Prefix match: this invalidates the guest's access-aware key too, which is
      // `[...incidentQueryKey(id), accessId]`. One invalidation covers both readers.
      queryKey: incidentQueryKey(incidentId),
    });
  };

  const uploadMutation = useMutation({
    mutationFn: (input: { evidenceType: EvidenceType; file: File }) =>
      uploadIncidentEvidence(incidentId, item.id, [input], accessId),
    onSuccess: () => {
      invalidate();
      toast.success(t("incidentPage.evidence.toasts.uploaded"));
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || t("incidentPage.evidence.toasts.uploadError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (evidenceId: string) =>
      removeIncidentEvidence(incidentId, item.id, evidenceId),
    onSuccess: () => {
      invalidate();
      toast.success(t("incidentPage.evidence.toasts.removed"));
    },
    onError: (error: any) => {
      toast.error(error?.error?.message || t("incidentPage.evidence.toasts.removeError"));
    },
  });

  const isBusy = uploadMutation.isPending || deleteMutation.isPending;
  const required = requiredPhotoTypes(item.type);
  // `isPhotoEvidence` rather than `evidence.kind === "photo"`: the kind/type
  // correspondence is phase 1's rule, and this is the second surface that would
  // otherwise restate it (invariant 9's principle, applied to evidence kind).
  const photos = activeEvidence(item).filter((evidence) =>
    isPhotoEvidence(evidence.evidenceType),
  );

  const startCapture = (evidenceType: EvidenceType) => {
    setPendingType(evidenceType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const evidenceType = pendingType;

    // Reset the input so choosing the SAME file twice fires `change` twice.
    event.target.value = "";
    setPendingType(null);

    if (!file || !evidenceType) return;

    uploadMutation.mutate({ evidenceType, file });
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
      {!readOnly &&
        (renderCapture ? (
          <fieldset disabled={isBusy} className="contents">
            {required.map((type) =>
              renderCapture(type, (file) =>
                uploadMutation.mutate({ evidenceType: type, file }),
              ),
            )}
          </fieldset>
        ) : (
          <div className="flex flex-wrap gap-2">
            {required.map((type) => (
              <button
                key={type}
                type="button"
                disabled={isBusy}
                onClick={() => startCapture(type)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {uploadMutation.isPending && pendingType === type ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {activePhotoCount(item, type) > 0
                  ? t("incidentPage.evidence.retakeFor", {
                      view: t(evidenceLabelKey(type)),
                    })
                  : t("incidentPage.evidence.captureFor", {
                      view: t(evidenceLabelKey(type)),
                    })}
              </button>
            ))}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ))}

      {beforePhotos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("incidentPage.evidence.before")}
          </p>

          <ul className="mt-1 flex flex-wrap gap-2">
            {beforePhotos.map((photo) => {
              const src = `${R2_IMAGE_URL}/${photo.storageKey}`;
              const alt = t("incidentPage.evidence.before");

              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setZoomed({ src, alt })}
                    aria-label={t("incidentPage.evidence.zoom")}
                    className="block cursor-zoom-in"
                  >
                    <img
                      src={src}
                      alt={alt}
                      className="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {photos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {photos.map((photo) => {
            const src = `${R2_IMAGE_URL}/${photo.storageKey}`;
            const alt = t(evidenceLabelKey(photo.evidenceType));

            return (
              <li key={photo.id} className="relative">
                <button
                  type="button"
                  onClick={() => setZoomed({ src, alt })}
                  aria-label={t("incidentPage.evidence.zoom")}
                  className="block cursor-zoom-in"
                >
                  <img
                    src={src}
                    alt={alt}
                    className="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                  />
                </button>

                {/* D3: `!accessId` as well as `!readOnly`. A guest captures and retakes but
                    cannot REMOVE — the evidence DELETE is the one evidence route the backend
                    does not token-enable, so the credential this page holds cannot authorize
                    it. Rendering the control would be rendering a guaranteed 401. */}
                {!readOnly && !accessId && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => deleteMutation.mutate(photo.id)}
                    aria-label={t("incidentPage.evidence.remove")}
                    className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:text-rose-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {zoomed && (
        <ImageZoomOverlay
          src={zoomed.src}
          alt={zoomed.alt}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
}
