import Typography from "./Typography";
import Stack from "./Stack";
import { cn, parseDateTime } from "@/lib/utils";
import AcceptSwitch from "./AcceptSwitch";

type PhotoCardProps = {
  name: string;
  timestamp: string;
  location: string;
  photoUrl: string;
  accepted?: boolean;
  onAcceptChange?: (accepted: boolean) => void;
  className?: string;
};

export default function PhotoCard({
  name,
  timestamp,
  location,
  photoUrl,
  accepted = true,
  onAcceptChange,
  className,
}: PhotoCardProps) {
  const photoDate = parseDateTime(timestamp);
  return (
    <div className={cn("bg-white  rounded-xl overflow-hidden", className)}>
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 h-48 md:h-56 bg-gray-100 overflow-hidden rounded-xl">
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 py-3 px-4 md:px-6 flex flex-col justify-between">
          <div>
            <Typography type="h4" className="text-gray-900 mb-1">
              {name}
            </Typography>

            <Stack gap={1}>
              <Typography type="caption" className="text-gray-500">
                {location}
              </Typography>
              <Typography type="caption" className="text-gray-500">
                Captured on {photoDate.formattedDate}
              </Typography>
            </Stack>
          </div>

          <div className="mt-4 md:mt-6 flex justify-start">
            <AcceptSwitch accepted={accepted} onChange={onAcceptChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
