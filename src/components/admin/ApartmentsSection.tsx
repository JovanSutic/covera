import { useState } from "react";

export default function ApartmentsSection() {
  const [isApartmentDrawerOpen, setIsApartmentDrawerOpen] = useState(false);
  console.log(isApartmentDrawerOpen);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsApartmentDrawerOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer"
        >
          Create Apartment
        </button>
      </div>

      <div className="w-full text-center p-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-sm text-gray-500">
        Apartments management data view interface coming soon.
      </div>
    </div>
  );
}