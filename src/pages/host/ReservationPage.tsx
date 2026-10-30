import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";

export default function ReservationPage() {
  const { t } = useTranslation("host");

  return (
    <PageLayout size="lg">
      <PageTitle title={t("reservationPage.title")} />
    </PageLayout>
  );
}
