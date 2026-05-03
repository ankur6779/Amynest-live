import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { ageBandForLifeSkills, ageBandLabel } from "@workspace/life-skills";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, ChevronLeft } from "lucide-react";
import { LifeSkillsZone } from "@/components/life-skills-zone";

export default function LifeSkillsPage() {
  const { i18n, t } = useTranslation();
  const lang =
    i18n.language === "hi" ? "hi" : i18n.language?.toLowerCase().includes("hing") ? "hinglish" : "en";
  const childrenQuery = useListChildren();
  const children = useMemo(
    () => (childrenQuery.data ?? []).filter((c) => c.age >= 2 && c.age < 16),
    [childrenQuery.data],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const effective = children.find((c) => c.id === selectedId) ?? children[0] ?? null;

  return (
    <div className="container mx-auto max-w-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/parenting-hub">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            {t("pages.life_skills_page.back")}
          </Button>
        </Link>
        <Compass className="h-5 w-5 text-emerald-600" />{/* audit-ok: brand emerald for life-skills marker, mirrors hub icon */}
        <h1 className="text-xl font-bold">{t("pages.life_skills_page.title")}</h1>
      </div>

      {childrenQuery.isLoading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{t("pages.life_skills_page.loading")}</CardContent>
        </Card>
      )}

      {!childrenQuery.isLoading && children.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("pages.life_skills_page.empty_message")}
            <div className="mt-3">
              <Link href="/children/new">
                <Button size="sm">{t("pages.life_skills_page.add_a_child")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                effective?.id === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-muted"
              }`}
            >
              {c.name} · {ageBandLabel(ageBandForLifeSkills(c.age), lang as "en" | "hi" | "hinglish")}
            </button>
          ))}
        </div>
      )}

      {effective && (
        <LifeSkillsZone
          child={{ id: effective.id, name: effective.name, age: effective.age }}
        />
      )}
    </div>
  );
}
