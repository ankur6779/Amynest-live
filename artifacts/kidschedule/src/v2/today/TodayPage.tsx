/**
 * Today shell (Sprint 2 · S2-T01) — layout only.
 * No Mission Engine, Speech, analytics, or premium.
 */

import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { getGuestSession } from "@/v2/guest";
import { isTodayV2Enabled } from "@/v2/entry/v2-shell-flags";

export default function TodayPage() {
  if (!isTodayV2Enabled()) {
    return <Redirect to="/dashboard" />;
  }

  const guestName = getGuestSession()?.name?.trim();
  const greetingWho = guestName || "there";

  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6"
      data-testid="v2-today-shell"
      aria-labelledby="today-heading"
    >
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Today</p>
        <h1
          id="today-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Hello, {greetingWho}
        </h1>
        <p className="text-sm text-muted-foreground">
          Amy&apos;s note and today&apos;s mission will live here.
        </p>
      </header>

      <section
        aria-label="Mission placeholder"
        className="rounded-2xl border border-border bg-card p-5"
        data-testid="v2-today-mission-placeholder"
      >
        <h2 className="text-base font-semibold text-foreground">Mission</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder — Mission Engine arrives in a later sprint. Nothing to complete yet.
        </p>
      </section>

      <section aria-label="Ask Amy entry" className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">Ask Amy</h2>
        <p className="text-sm text-muted-foreground">
          Soft entry into Ask Amy — no AI changes in this sprint.
        </p>
        <Button asChild className="w-full rounded-xl" size="lg">
          <Link href="/ask-amy" data-testid="v2-today-ask-amy-entry">
            Open Ask Amy
          </Link>
        </Button>
      </section>
    </main>
  );
}
