import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartyPopper, Sparkles, ArrowRight } from "lucide-react";
import { SubItemGate } from "@/components/sub-item-gate";

/**
 * Hub card shown inside Parenting Hub. The full Event Prep experience
 * (fancy-dress / DIY guide / speech generator) lives at /event-prep.
 */
export function EventPrepCard() {
  return (
    <Card className="rounded-2xl overflow-hidden border-pink-200/60 dark:border-pink-400/20 bg-gradient-to-br from-pink-50 via-white to-orange-50 dark:from-pink-950/40 dark:via-zinc-900 dark:to-orange-950/40 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-pink-500/15 text-pink-600 dark:text-pink-300 flex items-center justify-center shrink-0">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-quicksand text-lg font-bold text-foreground">
                🎉 Event Prep (School Ready)
              </h3>
              <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-700 dark:text-pink-300 inline-flex items-center gap-0.5">
                <Sparkles className="h-3 w-3" />
                New
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Last-minute fancy dress, DIY costume guides, ready speeches and
              audio read-aloud — all in one place.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge label="🇮🇳 Independence Day" />
              <Badge label="🎖️ Republic Day" />
              <Badge label="🕊️ Gandhi Jayanti" />
              <Badge label="⏱ Last-Minute" />
            </div>
            <SubItemGate sectionId="hub_event_prep" subItemId="open_event_prep">
              <Button asChild className="mt-4 rounded-full bg-pink-600 hover:bg-pink-700 text-white">
                <Link href="/event-prep">
                  Open Event Prep
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SubItemGate>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/10 border border-pink-200/60 dark:border-pink-400/20 text-foreground/80">
      {label}
    </span>
  );
}
