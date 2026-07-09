import PageLayout from "@/components/layout/PageLayout";
import Tabs from "@/components/Tabs";
import UsersSection from "@/components/admin/UsersSection";
import ApartmentsSection from "@/components/admin/ApartmentsSection";
import type { TabItem } from "@/types/component.types";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";

export default function AdminDashboard() {
  const dashboardTabs: TabItem[] = [
    {
      id: "users",
      label: "Users",
      content: <UsersSection />,
    },
    {
      id: "apartments",
      label: "Apartments",
      content: <ApartmentsSection />,
    },
  ];

  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle title="Dashboard" subtitle="Admin Management Options" />

      <Tabs tabs={dashboardTabs} defaultTabId="users" />
    </PageLayout>
  );
}
