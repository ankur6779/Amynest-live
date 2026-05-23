import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft, BookOpen, ClipboardCheck, GraduationCap, Loader2, Play, TrendingUp, UserPlus } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PhonicsLearning } from "@/components/phonics-learning";
import { getPhonicsLevel } from "@/lib/phonics-content";

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number | null;
};

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function PhonicsPage() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });

  const { data: children = [], isLoading } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey(),
      refetchOnWindowFocus: true,
    },
  });

  const childList = (children ?? []) as Child[];
  const eligibleChildren = childList.filter((child) => {
    const totalAgeMonths = child.age * 12 + (child.ageMonths ?? 0);
    return totalAgeMonths >= 12 && totalAgeMonths < 72;
  });
  const activeChild =
    childList.find((child) => child.id === selectedChildId) ??
    eligibleChildren[0] ??
    childList[0] ??
    null;

  const totalAgeMonths = activeChild
    ? activeChild.age * 12 + (activeChild.ageMonths ?? 0)
    : 0;
  const currentLevel = useMemo(() => getPhonicsLevel(totalAgeMonths), [totalAgeMonths]);
  const isEligible = !!currentLevel;

  useEffect(() => {
    if (!activeChild) return;
    setSelectedChildId(activeChild.id);
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(activeChild.id));
  }, [activeChild]);

  const goToTest = (type?: "daily" | "weekly") => {
    if (!activeChild) return;
    const params = new URLSearchParams({ childId: String(activeChild.id) });
    if (type) params.set("type", type);
    setLocation(`/phonics/test?${params.toString()}`);
  };

  useEffect(() => {
    if (!location.includes("/phonics/test")) return;
    window.setTimeout(() => scrollToSection("phonics-test"), 150);
  }, [location, search]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading phonics...
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </header>
        <main className="flex flex-1 items-center justify-center p-6 text-center">
          <Card className="max-w-md rounded-3xl border-border bg-card">
            <CardContent className="space-y-4 p-6">
              <UserPlus className="mx-auto h-10 w-10 text-primary" />
              <h1 className="font-quicksand text-2xl font-bold text-foreground">Add a child to start phonics</h1>
              <p className="text-sm text-muted-foreground">
                Phonics Learning is personalised by age, so create a child profile first.
              </p>
              <Link href="/children/new">
                <Button className="w-full rounded-2xl">Add Child</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-quicksand text-xl font-black leading-tight text-foreground">Phonics Learning</h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeChild.name} {currentLevel ? `- ${currentLevel.shortLabel}` : "- personalised by age"}
            </p>
          </div>
        </div>
      </header>

      <main className="scroll-safe min-h-0 flex-1 px-4 pt-4">
        <div className="mx-auto max-w-4xl space-y-4">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Focused screen</p>
                <h2 className="font-quicksand text-2xl font-black text-foreground">Learn sounds without distractions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Practice, test, and track phonics progress in a full-screen learning flow.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3" aria-label="Phonics overview">
            <Card className="rounded-2xl border-border bg-card">
              <CardContent className="p-4">
                <GraduationCap className="mb-2 h-5 w-5 text-primary" />
                <p className="text-xs font-bold uppercase text-muted-foreground">Current Level</p>
                <p className="mt-1 font-quicksand text-lg font-black text-foreground">
                  {currentLevel?.shortLabel ?? "Not available"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{currentLevel?.focus ?? "Phonics supports ages 1-6."}</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card">
              <CardContent className="p-4">
                <TrendingUp className="mb-2 h-5 w-5 text-primary" />
                <p className="text-xs font-bold uppercase text-muted-foreground">Progress</p>
                <p className="mt-1 font-quicksand text-lg font-black text-foreground">Tracker</p>
                <button
                  type="button"
                  onClick={() => scrollToSection("phonics-progress")}
                  className="mt-1 text-xs font-bold text-primary"
                >
                  View progress
                </button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card">
              <CardContent className="p-4">
                <ClipboardCheck className="mb-2 h-5 w-5 text-primary" />
                <p className="text-xs font-bold uppercase text-muted-foreground">Start Test</p>
                <p className="mt-1 font-quicksand text-lg font-black text-foreground">Daily or Weekly</p>
                <button
                  type="button"
                  onClick={() => goToTest()}
                  disabled={!isEligible}
                  className="mt-1 text-xs font-bold text-primary disabled:text-muted-foreground"
                >
                  Go to test
                </button>
              </CardContent>
            </Card>
          </section>

          {childList.length > 1 && (
            <section className="flex gap-2 overflow-x-auto pb-1" aria-label="Choose child">
              {childList.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                    activeChild.id === child.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </section>
          )}

          <PhonicsLearning
            childQuery={search}
            childId={activeChild.id}
            childName={activeChild.name}
            totalAgeMonths={totalAgeMonths}
            initialTestType={
              (() => {
                const t = new URLSearchParams(search).get("type");
                return t === "daily" || t === "weekly" ? t : undefined;
              })()
            }
          />
        </div>
      </main>

      <div className="bottom-controls z-50 border-t border-border bg-[#0B1220] px-4 pt-2 shadow-lg backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => scrollToSection("phonics-learning")}
            className="h-12 rounded-2xl gap-2 border-white/20 text-white hover:bg-white/10"
          >
            <Play className="h-4 w-4" />
            Continue
          </Button>
          <Button
            type="button"
            onClick={() => goToTest()}
            disabled={!isEligible}
            className="h-12 rounded-2xl gap-2 bg-orange-500 font-semibold text-white hover:bg-orange-600"
          >
            <ClipboardCheck className="h-4 w-4" />
            Start Test
          </Button>
        </div>
      </div>
    </div>
  );
}
