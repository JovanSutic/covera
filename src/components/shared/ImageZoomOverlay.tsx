import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageZoomOverlayProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * The fullscreen photo viewer, lifted verbatim out of `ExpandableImage` so the incident
 * thumbnails and the guide images open the same overlay (D5). It owns no open state: the
 * caller decides when it is mounted, because each surface triggers it differently — a
 * boolean there, the photo's own key here.
 */
export function ImageZoomOverlay({ src, alt, onClose }: ImageZoomOverlayProps) {
  const { t } = useTranslation("general");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label={t("common.closeZoom")}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}