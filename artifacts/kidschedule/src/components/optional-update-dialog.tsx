import { ExternalLink, X } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { Button } from "@/components/ui/button";

type OptionalUpdateDialogProps = {
  message: string;
  latestVersion: string;
  onUpdate: () => void;
  onLater: () => void;
};

export function OptionalUpdateDialog({
  message,
  latestVersion,
  onUpdate,
  onLater,
}: OptionalUpdateDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="optional-update-title"
    >
      <section className="w-full max-w-sm rounded-3xl border bg-background p-5 text-foreground shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <AmyIcon size={46} ring />
            <div>
              <h2 id="optional-update-title" className="text-lg font-black">
                Update available
              </h2>
              <p className="text-sm text-muted-foreground">Version {latestVersion}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground"
            aria-label="Later"
            onClick={onLater}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-5 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onLater}>
            Later
          </Button>
          <Button type="button" className="flex-1 rounded-xl" onClick={onUpdate}>
            Update
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </section>
    </div>
  );
}
