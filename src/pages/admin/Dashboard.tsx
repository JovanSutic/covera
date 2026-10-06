import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import Tabs from "@/components/Tabs";
import UsersSection from "@/components/admin/UsersSection";
import ApartmentsSection from "@/components/admin/ApartmentsSection";
import type { TabItem } from "@/types/component.types";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";

export default function AdminDashboard() {
  const { t } = useTranslation("general");

  const dashboardTabs: TabItem[] = [
    {
      id: "users",
      label: t("adminDashboard.tabs.users"),
      content: <UsersSection />,
    },
    {
      id: "apartments",
      label: t("adminDashboard.tabs.apartments"),
      content: <ApartmentsSection />,
    },
  ];

  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle
        title={t("adminDashboard.title")}
        subtitle={t("adminDashboard.subtitle")}
      />

      <Tabs tabs={dashboardTabs} defaultTabId="users" />
    </PageLayout>
  );
}