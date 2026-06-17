import { useEffect, useMemo } from "react";
import { useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { PhonicsTest } from "@/components/phonics-test";
import { LockedBlock } from "@/components/locked-block";
import { useHubModuleGate } from "@/hooks/use-hub-module-gate";
import { warmPhonicsRouteOnOpen } from "@/lib/app-audio-prefetch";
import { ensurePhonicsManifestLoaded } from "@/lib/phonics-manifest-validation";
import { cn } from "@/lib/utils";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

/**
 * Full-screen phonics test play route (/phonics/test/play).
 * Reads child + test type from query string; session state lives in PhonicsTest.
 */
export default function PhonicsTestPlayPage() {
  const { back } = useAppNavigate();
  const search = useSearch();
  const { locked, onEngage } = useHubModuleGate("hub_phonics");

  const { data: children = [] } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });

  const { childId, testType, childName, totalAgeMonths } = useMemo(() => {
    const params = new URLSearchParams(search);
    const fromUrl = Number(params.get("childId"));
    const saved = Number(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY));
    const id =
      Number.isFinite(fromUrl) && fromUrl > 0
        ? fromUrl
        : Number.isFinite(saved) && saved > 0
          ? saved
          : null;
    const type = params.get("type");
    const child = (children as Array<{ id: number; name: string; age: number; ageMonths?: number | null }>).find(
      (c) => c.id === id,
    );
    const months = child ? child.age * 12 + (child.ageMonths ?? 0) : 48;
    return {
      childId: id,
      testType:
        type === "daily" || type === "weekly"
          ? (type as "daily" | "weekly")
          : undefined,
      childName: child?.name ?? "",
      totalAgeMonths: months,
    };
  }, [search, children]);

  useEffect(() => {
    if (!childId) return;
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(childId));
  }, [childId]);

  useEffect(() => {
    if (locked) return;
    void ensurePhonicsManifestLoaded()
      .then(() => {
        warmPhonicsRouteOnOpen();
      })
      .catch(() => undefined);
  }, [locked]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goBack = () => {
    back("phonics-test-play-back");
  };

  if (!childId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">Choose a child on the Phonics screen first.</p>
        <AppLink href="/phonics" source="phonics-test-play-missing-child">
          <span className="text-sm font-bold text-primary">Back to Phonics</span>
        </AppLink>
      </div>
    );
  }

  const testSubtitle =
    testType === "weekly" ? "Weekly — 20 questions" : "Daily — 5 questions";

  return (
    <div
      className={cn(
        "flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden",
        "bg-[#0B1220] text-white",
      )}
    >
      <header className="shrink-0 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-quicksand text-xl font-semibold leading-tight text-white">
              Phonics Test
            </h1>
            <p className="text-sm text-white/60">{testSubtitle}</p>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[calc(var(--app-bottom-clearance)+0.5rem)]">
        <LockedBlock locked={locked} rounded="rounded-2xl">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onPointerDownCapture={() => onEngage()}
            onKeyDownCapture={(e) => {
              if (e.key === "Enter" || e.key === " ") onEngage();
            }}
          >
            <PhonicsTest
              childId={childId}
              childName={childName}
              totalAgeMonths={totalAgeMonths}
              initialTestType={testType}
              playOnly
            />
          </div>
        </LockedBlock>
      </main>
    </div>
  );
}
