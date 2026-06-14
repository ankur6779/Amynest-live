import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { useClerk } from "@/lib/firebase-auth-hooks";
import { useDeviceRegistration } from "@/contexts/device-registration-context";

type DeviceLimitDialogProps = {
  open: boolean;
  message?: string | null;
  onManageDevices: () => void;
  onCancel: () => void;
};

export function DeviceLimitDialog({
  open,
  message,
  onManageDevices,
  onCancel,
}: DeviceLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Device Limit Reached</DialogTitle>
          <DialogDescription className="text-center">
            {message ??
              "Your Premium plan supports up to 3 active devices. Remove an existing device to continue."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full rounded-2xl h-12 font-bold" onClick={onManageDevices}>
            Manage Devices
          </Button>
          <Button variant="outline" className="w-full rounded-2xl" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeviceLimitGate() {
  const { status, message } = useDeviceRegistration();
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();

  if (location.startsWith("/manage-devices")) {
    return null;
  }

  return (
    <DeviceLimitDialog
      open={status === "blocked"}
      message={message}
      onManageDevices={() => setLocation("/manage-devices")}
      onCancel={() => void signOut()}
    />
  );
}
