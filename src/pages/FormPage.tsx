import PageLayout from "@/components/PageLayout";
import Typography from "../components/Typography";
import Stack from "@/components/Stack";
import PhotoCard from "@/components/PhotoCard";
import PrimaryButton from "@/components/PrimaryButton";
import ReservationInfo from "@/components/ReservationInfo";
import HostInfoText from "@/components/HostInfo";
import { useSearchParams } from "react-router";
import { hostData, itemsList } from "@/lib/data";
import { useState } from "react";
import SuccessDialog from "@/components/SuccessDialog";

function FormPage() {
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const hostParam = searchParams.get("host");
  const guest = searchParams.get("guest");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const reservation = searchParams.get("reservation");
  const guestNo = searchParams.get("guestNo");
  const success = searchParams.get("success");

  const hostItem = hostData[hostParam ?? "1"];

  const reportedItemsString = Array.from(reportedItems).join(", ");

  const setSuccessParam = () => {
    const params = new URLSearchParams(searchParams);
    params.set("success", "true");
    setSearchParams(params);
  };

  return (
    <PageLayout>
      <SuccessDialog open={success === "true"} />
      <Stack gap={3}>
        <Typography type="h1" className="mb-3">
          Apartment check for
        </Typography>
        <HostInfoText
          apartmentName={hostItem.apartmentName}
          propertyTypeLocation={hostItem.propertyTypeLocation}
          guestsBedroomsBedsBaths={hostItem.guestsBedroomsBedsBaths}
          hostName={hostItem.hostName}
        />
        <ReservationInfo
          guestName={guest ?? ""}
          checkIn={checkIn ?? ""}
          checkOut={checkOut ?? ""}
          reservationId={reservation ?? ""}
          numberOfGuests={Number(guestNo || "1")}
        />
        <Typography type="h4" className="mt-6">
          This is a quick check before you settle in
        </Typography>
        <Typography type="body" className="mt-1 text-gray-700">
          Check takes less than a minute and it helps make sure you’re not
          responsible for anything that’s already damaged. The items below are
          shown as they were photographed. Everything is marked as OK by default
          — only report items if something looks different.
        </Typography>
      </Stack>

      <Stack gap={10} className="mt-10">
        {itemsList.map((item) => (
          <PhotoCard
            name={item.name}
            timestamp={item.timestamp}
            photoUrl={item.photoUrl}
            onAcceptChange={(val) =>
              setReportedItems((prev) => {
                const next = new Set(prev);

                if (!val) {
                  next.add(item.name);
                } else {
                  next.delete(item.name);
                }

                return next;
              })
            }
            location={item.location}
            key={item.name}
          />
        ))}
      </Stack>

      <Stack gap={8} className="mt-6">
        <div className="mt-8 p-4 rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
          <Typography type="body-sm" className="text-gray-700">
            {reportedItems.size === 0 ? (
              <>
                By confirming, you agree that everything looks good and you’ll
                take care of the items during your stay.
              </>
            ) : (
              <>
                By confirming, you agree that everything looks good and you’ll
                take care of the items during your stay, except for:{" "}
                <span className="font-medium text-gray-900">
                  {reportedItemsString}
                </span>
                .
              </>
            )}
          </Typography>
        </div>
        <PrimaryButton onClick={setSuccessParam}>
          {reportedItems.size === 0
            ? "Everything looks good"
            : "Confirm and continue"}
        </PrimaryButton>
      </Stack>
    </PageLayout>
  );
}

export default FormPage;
