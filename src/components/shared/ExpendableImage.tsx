import { useState } from "react";
import { Eye, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExpandableImageProps {
  src: string;
  alt: string;
  emptyFallbackText?: string;
  className?: string;
}

export function ExpandableImage({
  src,
  alt,
  emptyFallbackText,
  className = "aspect-16/9 w-full",
}: ExpandableImageProps) {
  const { t } = useTranslation("general");
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackText = emptyFallbackText ?? t("common.noReferencePhoto");

  if (!src) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-xl border border-gray-200/80 bg-gray-100 p-4 text-center dark:border-gray-800 dark:bg-gray-800 ${className}`}
      >
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
          {fallbackText}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl border border-gray-200/80 bg-gray-100 dark:border-gray-800 dark:bg-gray-800 ${className}`}
      >
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-gray-200/80 dark:bg-gray-700/80 animate-pulse flex items-center justify-center">
            <span className="sr-only">{t("common.loadingImage")}</span>
          </div>
        )}

        {/* Image Container with Zoom Trigger */}
        <div
          className="group relative h-full w-full cursor-zoom-in"
          onClick={() => setIsZoomed(true)}
        >
          <img
            src={src}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Dynamic Touch / Hover Overlay */}
          {!isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] transition-opacity max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-md">
                <Eye className="h-3.5 w-3.5" /> {t("common.tapToZoom")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            aria-label={t("common.closeZoom")}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}