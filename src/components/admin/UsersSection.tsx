/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  postUsersByIdInvite,
} from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { DataTable } from "@/components/DataTable";
import Drawer from "@/components/Drawer";
import CreateUserForm from "@/components/forms/CreateUserForm";
import type { User } from "@/api/generated/requests/types.gen";
import type { ColumnDef } from "@/types/component.types";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";

export default function UsersSection() {
  const { t, i18n } = useTranslation("general");
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersIsLoading } = useQuery({
    queryKey: [...QUERY_ACTIONS.USERS_GET_ALL],
    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getUsers(config);
      return response.data;
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      setInvitingUserId(userId);
      const config = await withAuth();

      const response = await postUsersByIdInvite({
        path: { id: userId },
        headers: config.headers,
      });

      if ("error" in response && response.error) {
        throw new Error(
          (response.error as any)?.message ||
            t("users.errors.sendInviteFailed"),
        );
      }

      if (!response.data) {
        throw new Error(t("users.errors.noDataReturned"));
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.USERS_GET_ALL],
      });
    },
    onSettled: () => {
      setInvitingUserId(null);
    },
  });

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        header: t("users.columns.name"),
        accessorKey: (row) => (
          <span className="font-medium text-gray-900">
            {row.firstName} {row.lastName}
          </span>
        ),
      },
      {
        header: t("users.columns.email"),
        accessorKey: "email",
        className: "text-gray-500",
      },
      {
        header: t("users.columns.role"),
        accessorKey: (row) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800 border border-gray-200">
            {row.role}
          </span>
        ),
      },
      {
        header: t("users.columns.status"),
        accessorKey: (row) => {
          const colors: Record<string, string> = {
            confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
            invited: "bg-amber-50 text-amber-700 border-amber-200",
            created: "bg-blue-50 text-blue-700 border-blue-200",
            disabled: "bg-rose-50 text-rose-700 border-rose-200",
          };

          const statusLabel =
            t(`users.status.${row.status}`, { defaultValue: row.status });

          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[row.status] || colors.created}`}
            >
              {statusLabel}
            </span>
          );
        },
      },
      {
        header: t("users.columns.joinedDate"),
        accessorKey: (row) => {
          return new Date(row.createdAt).toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        },
        className: "text-xs",
      },
      {
        header: t("users.columns.actions"),
        accessorKey: (row) => {
          const isInvitingThisUser = invitingUserId === row.id;
          const canSendInvite =
            row.status === "invited" || row.status === "created";

          if (!canSendInvite) {
            return <span className="text-xs text-gray-400">—</span>;
          }

          return (
            <button
              type="button"
              disabled={isInvitingThisUser}
              onClick={() => sendInviteMutation.mutate(row.id)}
              className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isInvitingThisUser
                ? t("users.actions.sending")
                : t("users.actions.sendInvite")}
            </button>
          );
        },
      },
    ],
    [t, i18n.language, invitingUserId, sendInviteMutation],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsUserDrawerOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors cursor-pointer"
        >
          {t("users.createUserButton")}
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        isLoading={usersIsLoading}
        emptyMessage={t("users.emptyMessage")}
      />

      <Drawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        title={t("users.createUserDrawerTitle")}
      >
        <CreateUserForm
          onSuccess={() => {
            setIsUserDrawerOpen(false);
          }}
          isOpen={isUserDrawerOpen}
        />
      </Drawer>
    </div>
  );
}