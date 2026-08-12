import React, { useEffect } from "react";
import type { ReactNode } from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-md h-auto max-h-[80vh]",
  md: "max-w-xl h-auto max-h-[85vh]",
  lg: "max-w-3xl h-[75vh]",
  xl: "max-w-6xl h-[85vh]",
  full: "max-w-[95vw] h-[92vh]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  bodyClassName = "",
}: ModalProps) {
  // Close on ESC keypress & prevent background scrolling when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full ${SIZE_CLASSES[size]} bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 transition-all`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
            <div>
              {typeof title === "string" ? (
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
