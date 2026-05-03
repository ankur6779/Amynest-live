import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, ChevronRight, Clock, Target, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
const SHORT_DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function summariseSchoolDays(days: number[] | null | undefined): string | null {
  if (!Array.isArray(days)) return "Mon-Fri"; // legacy fallback
  if (days.length === 0) return null; // explicit no-school: hide chip
  const sorted = [...days].sort();
  // Compact common cases
  if (sorted.join(",") === "1,2,3,4,5") return "Mon-Fri";
  if (sorted.join(",") === "1,2,3,4,5,6") return "Mon-Sat";
  if (sorted.join(",") === "6,7") return "Weekends";
  return sorted.map(d => SHORT_DAYS[d] ?? "").filter(Boolean).join(", ");
}
export default function ChildrenList() {
  const {
    t
  } = useTranslation();
  const {
    data: children,
    isLoading
  } = useListChildren({
    query: {
      queryKey: getListChildrenQueryKey()
    }
  });
  return <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground">{t("pages.children.index.children")}</h1>
          <p className="text-muted-foreground mt-1">{t("pages.children.index.manage_profiles_and_goals")}</p>
        </div>
        <Button asChild className="rounded-full shadow-sm hover-elevate">
          <Link href="/children/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("pages.children.index.add_child")}
          </Link>
        </Button>
      </header>

      {isLoading ? <div className="grid gap-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div> : children && children.length > 0 ? <div className="grid gap-4">
          {children.map((child, index) => {
        const {
          t
        } = useTranslation();
        return <Link key={child.id} href={`/children/${child.id}`}>
              <Card className="rounded-2xl border-border/50 shadow-sm hover:border-primary/30 transition-all cursor-pointer group hover-elevate overflow-hidden" style={{
            animationDelay: `${index * 50}ms`
          }}>
                <CardContent className="p-0 flex items-stretch">
                  <div className="w-3 bg-primary group-hover:bg-primary/80 transition-colors" />
                  <div className="p-5 flex-1 flex items-center justify-between">
                    <div>
                      <h3 className="font-quicksand text-xl font-bold text-foreground group-hover:text-primary transition-colors">{child.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                          <span className="font-medium text-foreground">{child.age}</span> {t("pages.children.index.yrs")}
                        </span>
                        {(child as any).childClass && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium">
                            {(child as any).childClass}
                          </span>}
                        {(child as any).isSchoolGoing && <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {child.schoolStartTime} - {child.schoolEndTime}
                          </span>}
                        {(child as any).isSchoolGoing && (() => {
                      const summary = summariseSchoolDays((child as any).schoolDays);
                      return summary ? <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium">
                              <Calendar className="h-3 w-3" />
                              {summary}
                            </span> : null;
                    })()}
                        <span className="text-xs">
                          {(child as any).foodType === "non_veg" ? "🍗 Non-veg" : "🥦 Veg"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>;
      })}
        </div> : <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/20">
          <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="font-quicksand text-xl font-bold text-foreground mb-2">{t("pages.children.index.no_children_added")}</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            {t("pages.children.index.add_your_children_to_start_generating_personalized_routines_")}
          </p>
          <Button asChild size="lg" className="rounded-full shadow-sm hover-elevate">
            <Link href="/children/new">
              <Plus className="mr-2 h-5 w-5" />
              {t("pages.children.index.add_your_first_child")}
            </Link>
          </Button>
        </div>}
    </div>;
}