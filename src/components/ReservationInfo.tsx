import { parseDateTime } from "@/lib/utils";
import React from "react";
import Typography from "./Typography";

interface ReservationInfoProps {
  guestName: string;
  checkIn: string;
  checkOut: string;
  reservationId?: string;
  numberOfGuests?: number;
}

const ReservationInfo: React.FC<ReservationInfoProps> = ({
  guestName,
  checkIn,
  checkOut,
  reservationId,
  numberOfGuests,
}) => {
  const checkInDate = parseDateTime(checkIn);
  const checkOutDate = parseDateTime(checkOut);

  return (
    <div className="bg-white py-3 border-b border-gray-300 space-y-2">
      <div className="flex justify-between items-start">
        {reservationId && (
          <Typography type="caption" className="text-gray-500">
            Current reservation: {reservationId}
          </Typography>
        )}
      </div>

      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <Typography type="body" className="text-gray-900">
            {guestName}
          </Typography>

          {numberOfGuests && (
            <Typography type="body-sm" className="text-gray-600">
              {numberOfGuests} guest{numberOfGuests > 1 ? "s" : ""}
            </Typography>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1">
        <div className="flex flex-col">
          <Typography type="caption" className="text-gray-500">
            Check-in
          </Typography>

          <Typography type="body-sm" className="text-gray-800">
            {checkInDate.formattedDate}
          </Typography>

          <Typography type="caption" className="text-gray-500">
            {checkInDate.formattedTime}
          </Typography>
        </div>

        <div className="flex flex-col">
          <Typography type="caption" className="text-gray-500">
            Check-out
          </Typography>

          <Typography type="body-sm" className="text-gray-800">
            {checkOutDate.formattedDate}
          </Typography>

          <Typography type="caption" className="text-gray-500">
            {checkOutDate.formattedTime}
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default ReservationInfo;
