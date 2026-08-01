/**
 * For [Child] treasury shell (Sprint 2 · S2-T03) — containers only.
 * No Games / Discovery / Health / Birth Sky migration in this sprint.
 */

import { Redirect } from "wouter";
import { getGuestSession } from "@/v2/guest";
import { isForChildV2Enabled } from "@/v2/entry/v2-shell-flags";

const SECTIONS = [
  {
    id: "with-child-today",
    title: "With {name} today",
    body: "Speech / hero activities will pin here later. Placeholder only.",
  },
  {
    id: "play",
    title: "Play",
    body: "Progressive reveal placeholder — Games & Discovery stay in the treasury.",
  },
  {
    id: "learn",
    title: "Learn",
    body: "Progressive reveal placeholder — Learning modules unchanged.",
  },
  {
    id: "care",
    title: "Care",
    body: "Progressive reveal placeholder — Nutrition, Health, routines unchanged.",
  },
] as const;

export default function ForChildPage() {
  if (!isForChildV2Enabled()) {
    return <Redirect to="/parenting-hub" />;
  }

  const name = getGuestSession()?.name?.trim() || "your child";

  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6"
      data-testid="v2-for-child-shell"
      aria-labelledby="for-child-heading"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Treasury</p>
        <h1
          id="for-child-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          For {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Shell only — existing features stay reachable via deep links. Nothing deleted.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {SECTIONS.map((section) => {
          const title = section.title.replace("{name}", name);
          return (
            <section
              key={section.id}
              aria-label={title}
              data-testid={`v2-for-child-section-${section.id}`}
              className="rounded-2xl border border-dashed border-border bg-card/60 p-4"
            >
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{section.body}</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}
