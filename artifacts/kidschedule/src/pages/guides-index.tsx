import { useEffect } from "react";
import { Link } from "wouter";
import { Clock } from "lucide-react";
import { applySeoMeta } from "@/lib/marketing/canonical-seo";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";
import { GUIDE_ARTICLES } from "@/lib/marketing/guides-content";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
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
            <img src={LOGO} alt="AmyNest AI" className="h-9 w-9 rounded-xl" />
            <span className="font-quicksand text-lg font-black">AmyNest AI</span>
          </span>
        </Link>
        <Link href="/get-app" className="text-sm text-purple-300 hover:text-purple-200">
          Get the app →
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-12">
        <h1 className="mb-3 font-quicksand text-4xl font-black">Parenting Guides</h1>
        <p className="mb-10 text-lg text-white/70 max-w-2xl">
          Evidence-informed, practical articles for real parents — no fluff, no guilt trips. Each guide connects
          to features inside AmyNest when you are ready to put ideas into action.
        </p>

        <ul className="space-y-5">
          {GUIDE_ARTICLES.map((guide) => (
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
