import { ArrowLeft } from "lucide-react";
import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { cn } from "@/lib/utils";

export default function DiscoveryWorldsHubPage() {
  const { back } = useAppNavigate();

  usePageBackHandler(() => {
    back("discovery-worlds-hub-back");
    return true;
  }, [back]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur md:px-6">
        <button
          type="button"
          onClick={() => back("discovery-worlds-hub-back")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Parent Hub
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Discovery Worlds
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Sound learning worlds</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Animal World is our reference experience. More worlds roll out on the same engine.
        </p>

        <ul className="mt-8 space-y-3">
          {DISCOVERY_WORLDS_REGISTRY.map((world) => (
            <li key={world.worldId}>
              <AppLink
                href={world.routePath}
                className={cn(
                  "flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]",
                )}
              >
                <span className="text-4xl">{world.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{world.title}</p>
                  <p className="text-sm text-muted-foreground">{world.subtitle}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase",
                    world.status === "live" && "bg-emerald-500/15 text-emerald-300",
                    world.status === "preview" && "bg-amber-500/15 text-amber-200",
                    world.status === "planned" && "bg-white/10 text-muted-foreground",
                  )}
                >
                  {world.status === "live" ? "Play" : world.status}
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
