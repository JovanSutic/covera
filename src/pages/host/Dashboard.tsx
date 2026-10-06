import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import ApartmentsSection from "@/components/host/ApartmentSection";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import type { TabItem } from "@/components/Tabs";
import Tabs from "@/components/Tabs";

export default function DashboardPage() {
  const { t } = useTranslation("general");

  const dashboardTabs: TabItem[] = [
    {
      id: "apartments",
      label: t("hostDashboard.tabs.apartments"),
      content: <ApartmentsSection />,
    },
  ];

  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle
        title={t("hostDashboard.title")}
        subtitle={t("hostDashboard.subtitle")}
      />
      <Tabs tabs={dashboardTabs} defaultTabId="apartments" />
    </PageLayout>
  );
}