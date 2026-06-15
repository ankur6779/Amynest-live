import { useEffect } from "react";
import { Link } from "wouter";
import { Clock } from "lucide-react";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import { ALL_GUIDE_ARTICLES } from "@/lib/marketing/guides-content";
import { listFeedingPlanSlugs, listRoutineByAgeSlugs } from "@/lib/marketing/programmatic-pages";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
import { BreadcrumbNav, SeoImage } from "@/components/marketing/seo-components";
import { StoreDownloadRow } from "@/components/marketing/store-download-buttons";

const LOGO = "/amynest-logo-new.png";

export default function GuidesIndexPage() {
  useEffect(() => {
    applySeoMeta({
      path: "/guides",
      title: "Parenting Guides & Resources | AmyNest AI",
      description:
        "Practical parenting guides on baby sleep, toddler routines, speech development, picky eating, and school mornings — from the AmyNest team.",
      keywords:
        "parenting guides, baby sleep tips, toddler routine, speech development, picky eater help, school morning routine",
    });
    trackMarketingEvent("guide_index_view", { path: "/guides" });
  }, []);

  return (
    <div
      data-on-dark
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(168deg,#05040c 0%,#0e0b1f 35%,#16122e 65%,#0a0816 100%)" }}
    >
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link href="/">
          <span className="flex cursor-pointer items-center gap-2">
            <SeoImage src={LOGO} alt="AmyNest AI logo" width={36} height={36} className="h-9 w-9 rounded-xl" priority />
            <span className="font-quicksand text-lg font-black">AmyNest AI</span>
          </span>
        </Link>
        <Link href="/get-app" className="text-sm text-purple-300 hover:text-purple-200">
          Get the app →
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-12">
        <BreadcrumbNav
          items={[
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
          ]}
          className="mb-4"
        />
        <h1 className="mb-3 font-quicksand text-4xl font-black">Parenting Guides</h1>
        <p className="mb-10 text-lg text-white/70 max-w-2xl">
          Evidence-informed, practical articles for real parents — no fluff, no guilt trips. Each guide connects
          to features inside AmyNest when you are ready to put ideas into action.
        </p>

        <ul className="space-y-5">
          {ALL_GUIDE_ARTICLES.map((guide) => (
            <li key={guide.slug}>
              <Link href={`/guides/${guide.slug}`}>
                <article
                  className="block rounded-2xl p-6 transition hover:scale-[1.01]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h2 className="mb-2 text-xl font-semibold text-white">{guide.title}</h2>
                  <p className="mb-3 text-white/65 leading-relaxed">{guide.excerpt}</p>
                  <div className="flex items-center gap-2 text-xs text-white/45">
                    <Clock className="h-3.5 w-3.5" />
                    {guide.readMinutes} min read
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Routines by age</h2>
          <div className="flex flex-wrap gap-2">
            {listRoutineByAgeSlugs().map((age) => (
              <Link key={age} href={`/routine-by-age/${age}`}>
                <span className="inline-block rounded-full px-4 py-2 text-sm bg-white/5 border border-white/10 hover:border-purple-400/40">
                  Age {age}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Feeding plans by month</h2>
          <div className="flex flex-wrap gap-2">
            {listFeedingPlanSlugs().map((months) => (
              <Link key={months} href={`/feeding-plan/${months}`}>
                <span className="inline-block rounded-full px-4 py-2 text-sm bg-white/5 border border-white/10 hover:border-purple-400/40">
                  {months.replace("-", " ")}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl p-8 text-center" style={{ border: "1px solid rgba(168,85,247,0.25)" }}>
          <h2 className="mb-2 text-xl font-bold">Put these guides into practice</h2>
          <p className="mb-6 text-white/65">AmyNest turns advice into daily routines, logs, and learning sessions.</p>
          <StoreDownloadRow location="guides_index" page="guides" />
        </section>
      </main>

      <MarketingSiteFooter />
    </div>
  );
}
