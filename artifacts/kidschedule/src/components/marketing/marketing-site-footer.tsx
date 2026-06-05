import { Link } from "wouter";
import { FEATURE_PAGES } from "@/lib/marketing/feature-pages";
import { GUIDE_ARTICLES } from "@/lib/marketing/guides-content";

export function MarketingSiteFooter() {
  return (
    <footer
      className="border-t border-white/10 px-5 py-10 text-sm text-white/55"
      style={{ background: "rgba(0,0,0,0.25)" }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        <div>
          <p className="mb-3 font-semibold text-white/80">AmyNest AI</p>
          <p className="leading-relaxed">
            AI-powered parenting — routines, infant care, speech, nutrition, and learning in one app.
          </p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white/80">Features</p>
          <ul className="space-y-2">
            {FEATURE_PAGES.map((page) => (
              <li key={page.slug}>
                <Link href={`/features/${page.slug}`} className="hover:text-white">
                  {page.headlineAccent}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white/80">Resources</p>
          <ul className="space-y-2">
            <li>
              <Link href="/guides" className="hover:text-white">
                Parenting guides
              </Link>
            </li>
            <li>
              <Link href="/get-app" className="hover:text-white">
                Get the app
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/support" className="hover:text-white">
                Support
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-white/40">
        © {new Date().getFullYear()} AmyNest AI · {GUIDE_ARTICLES.length} guides for parents
      </p>
    </footer>
  );
}
