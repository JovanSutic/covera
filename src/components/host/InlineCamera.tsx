import React, { useRef } from "react";

interface InlineCameraProps {
  onCapture: (previewUrl: string, file: File) => void;
  onCancel: () => void;
}

export function InlineCamera({ onCapture, onCancel }: InlineCameraProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Fast, lightweight preview URL without Base64 encoding overhead
      const previewUrl = URL.createObjectURL(file);
      onCapture(previewUrl, file);
      
      // Reset input value so taking another photo triggers onChange reliably
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative w-full aspect-16/10 bg-gray-950 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
        📷
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-gray-100">
          Capture Verification Photo
        </h4>
        <p className="text-xs text-gray-400 max-w-xs">
          Take a full-resolution photo using your device camera to preserve EXIF timestamp and GPS proof for AirCover.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 rounded-lg bg-gray-900 border border-gray-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <label className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-2">
          <span>Open Camera</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}