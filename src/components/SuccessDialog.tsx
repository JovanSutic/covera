import Typography from "./Typography";

type SuccessDialogProps = {
  open: boolean;
};

export default function SuccessDialog({ open }: SuccessDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 text-center space-y-4">
        <Typography type="h3">You’re all set 🎉</Typography>

        <Typography type="body" className="text-gray-700">
          Thanks for taking a moment to check everything. Enjoy your stay!
        </Typography>

        <Typography type="body-sm" className="text-gray-500">
          If you notice anything during the check in, just let your host know and they can
          update this for you.
        </Typography>
      </div>
    </div>
  );
}
