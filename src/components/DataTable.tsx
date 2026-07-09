import type { DataTableProps } from "@/types/component.types";
import React from "react";

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center p-12 border border-gray-100 rounded-xl bg-gray-50/50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="text-xs font-medium text-gray-500">Loading records...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full text-center p-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-gray-200/80 rounded-xl shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr>
              {columns.map((column, idx) => (
                <th key={idx} className={`px-6 py-3.5 font-semibold ${column.className || ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50/70 transition-colors">
                {columns.map((column, colIdx) => {
                  const content =
                    typeof column.accessorKey === "function"
                      ? column.accessorKey(row)
                      : (row[column.accessorKey] as React.ReactNode);

                  return (
                    <td key={colIdx} className={`px-6 py-4 whitespace-nowrap align-middle ${column.className || ""}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}