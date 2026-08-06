
import PageLayout from "@/components/layout/PageLayout";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";

export default function DashboardPage() {
  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle title="Dashboard" subtitle="Admin Management Options" />
    </PageLayout>
  );
}
