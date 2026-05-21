import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { PhonicsTest } from "@/components/phonics-test";

const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";

/**
 * Full-screen phonics test play route (/phonics/test/play).
 * Reads child + test type from query string; session state lives in PhonicsTest.
 */
export default function PhonicsTestPlayPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();

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
      testType: type === "daily" || type === "weekly" ? type : undefined,
      childName: child?.name ?? "",
      totalAgeMonths: months,
    };
  }, [search, children]);

  useEffect(() => {
    if (!childId) return;
    window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(childId));
  }, [childId]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/phonics");
  };

  if (!childId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">Choose a child on the Phonics screen first.</p>
        <Link href="/phonics">
          <span className="text-sm font-bold text-primary">Back to Phonics</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
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
            <h1 className="font-quicksand text-xl font-black text-foreground">Phonics Test</h1>
            <p className="text-xs text-muted-foreground">
              {testType === "weekly" ? "Weekly — 20 questions" : "Daily — 5 questions"}
            </p>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 px-4 pb-[100px] pt-4">
        <div className="mx-auto max-w-4xl">
          <PhonicsTest
            childId={childId}
            childName={childName}
            totalAgeMonths={totalAgeMonths}
            initialTestType={testType}
            playOnly
          />
        </div>
      </main>
    </div>
  );
}
