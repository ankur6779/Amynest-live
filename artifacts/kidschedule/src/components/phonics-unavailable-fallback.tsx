import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLink } from "@/components/app-link";
import { getPhonicsManifestValidation } from "@/lib/phonics-manifest-validation";

type PhonicsUnavailableFallbackProps = {
  childName?: string;
  compact?: boolean;
};

/** Shown when the phonics audio library failed boot validation — never crashes. */
export function PhonicsUnavailableFallback({
  childName,
  compact = false,
}: PhonicsUnavailableFallbackProps) {
  const validation = getPhonicsManifestValidation();

  if (compact) {
    return (
      <div
        className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        data-testid="phonics-unavailable-fallback"
      >
        Phonics sounds are updating — check back soon.
      </div>
    );
  }

  return (
    <Card
      className="rounded-3xl border-border bg-card"
      data-testid="phonics-unavailable-fallback"
    >
      <CardContent className="space-y-4 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="font-quicksand text-xl font-bold text-foreground">
            Phonics is getting ready
          </h2>
          <p className="text-sm text-muted-foreground">
            {childName
              ? `Reading sounds for ${childName} will be back shortly.`
              : "Reading sounds will be back shortly."}{" "}
            Other learning activities still work normally.
          </p>
          {import.meta.env.DEV && validation.errors.length > 0 ? (
            <p className="text-xs text-muted-foreground/80">
              Dev: {validation.errors.join(", ")}
            </p>
          ) : null}
        </div>
        <AppLink href="/parenting-hub" source="phonics-unavailable">
          <Button variant="outline" className="rounded-2xl">
            Back to Learning Hub
          </Button>
        </AppLink>
      </CardContent>
    </Card>
  );
}
