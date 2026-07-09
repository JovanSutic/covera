import Header from "@/components/Header";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";

export default function DashboardPage() {
  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle title="Dashboard" subtitle="Host Management Options" />
    </PageLayout>
  );
}
