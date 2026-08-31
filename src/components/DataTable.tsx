import type { DataTableProps } from "@/types/component.types";
import React from "react";

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = "No records found.",
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center p-12 border border-gray-100 rounded-xl bg-gray-50/50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
          <p className="text-xs font-medium text-gray-500">
            Loading records...
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full text-center p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;
  const startItem = pagination
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const endItem = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;

  return (
    <div className="w-full overflow-hidden border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-sm bg-white dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-3.5 font-semibold ${column.className || ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
              >
                {columns.map((column, colIdx) => {
                  const content =
                    typeof column.accessorKey === "function"
                      ? column.accessorKey(row)
                      : (row[column.accessorKey as keyof T] as React.ReactNode);

                  return (
                    <td
                      key={colIdx}
                      className={`px-6 py-4 whitespace-nowrap align-middle ${column.className || ""}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional Pagination Footer */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 border-t border-gray-200/80 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-xs text-gray-500">
          <div>
            Showing{" "}
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {startItem}
            </span>{" "}
            to{" "}
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {endItem}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {pagination.total}
            </span>{" "}
            results
          </div>

          <div className="flex items-center gap-2">
            {pagination.onLimitChange && (
              <select
                value={pagination.limit}
                onChange={(e) =>
                  pagination.onLimitChange?.(Number(e.target.value))
                }
                className="hidden sm:block px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="font-medium px-1">
              {pagination.page} of {totalPages || 1}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
