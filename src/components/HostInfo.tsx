import React from "react";
import Typography from "./Typography";

interface HostInfoTextProps {
  apartmentName: string;
  propertyTypeLocation: string;
  guestsBedroomsBedsBaths: string;
  hostName: string;
}

const HostInfoText: React.FC<HostInfoTextProps> = ({
  apartmentName,
  propertyTypeLocation,
  guestsBedroomsBedsBaths,
  hostName,
}) => {
  return (
    <div className="flex flex-col space-y-1">
      <Typography type="h3" className="text-gray-900">
        {apartmentName}
      </Typography>

      <Typography type="body" className="text-gray-700">
        {propertyTypeLocation}
      </Typography>

      <Typography type="body-sm" className="text-gray-500">
        {guestsBedroomsBedsBaths}
      </Typography>

      <Typography type="body-sm" className="text-gray-500">
        Hosted by {hostName}
      </Typography>
    </div>
  );
};

export default HostInfoText;
