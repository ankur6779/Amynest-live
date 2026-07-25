import { Link } from "wouter";
import { FEATURE_PAGES } from "@/lib/marketing/feature-pages";
import { ALL_GUIDE_ARTICLES } from "@/lib/marketing/guides-content";
import {
  OWNERSHIP_OPERATED_LINE,
  OWNERSHIP_PRODUCT_LINE,
} from "@/lib/marketing/legal-entity";

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
              <Link href="/about" className="hover:text-white">
                About
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
      <div className="mx-auto mt-8 max-w-6xl space-y-1 text-center text-xs text-white/40">
        <p>{OWNERSHIP_PRODUCT_LINE}</p>
        <p>{OWNERSHIP_OPERATED_LINE}</p>
        <p>
          © {new Date().getFullYear()} AmyNest AI · {ALL_GUIDE_ARTICLES.length} guides for parents
        </p>
      </div>
    </footer>
  );
}
