import ApartmentsSection from "@/components/host/ApartmentSection";
import Header from "@/components/Header";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";

export default function ApartmentListPage() {
  
  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle title="Apartments" subtitle="List of apartments you manage" />
      <ApartmentsSection />
    </PageLayout>
  );
}
