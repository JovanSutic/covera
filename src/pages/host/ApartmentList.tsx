import { useTranslation } from "react-i18next";
import ApartmentsSection from "@/components/host/ApartmentSection";
import Header from "@/components/Header";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";

export default function ApartmentListPage() {
  const { t } = useTranslation("general");

  return (
    <PageLayout size="lg">
      <Header />
      <PageTitle
        title={t("hostApartments.title")}
        subtitle={t("hostApartments.subtitle")}
      />
      <ApartmentsSection />
    </PageLayout>
  );
}