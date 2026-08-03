import Header from "@/components/Header";
import ApartmentsSection from "@/components/host/ApartmentSection";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import type { TabItem } from "@/components/Tabs";
import Tabs from "@/components/Tabs";

export default function DashboardPage() {
  const dashboardTabs: TabItem[] = [
      {
        id: "apartments",
        label: "Apartments",
        content: <ApartmentsSection />,
      },
    ];
  
  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle title="Dashboard" subtitle="Host Management Options" />
       <Tabs tabs={dashboardTabs} defaultTabId="apartments" />
    </PageLayout>
  );
}
