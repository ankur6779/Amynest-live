import { useEffect, useRef } from "react";
import { CinematicLandingPage } from "@/components/marketing/cinematic-landing/cinematic-landing-page";
import { trackGetAppFunnelEvent } from "@/lib/marketing/ga4-analytics";

const OG_IMAGE = "/opengraph.jpg";

function setMetaTag(selector: string, attr: "content" | "href", value: string) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function useGetAppSeo() {
  useEffect(() => {
    document.title = "AmyNest AI — Parenting Is Hard. Amy Makes It Easier.";
    const description =
      "Meet Amy — your AI parenting companion for routines, learning, behavior, health, and family growth. Ages 0–16. Free on Android & iOS.";
    setMetaTag('meta[name="description"]', "content", description);
    setMetaTag('link[rel="canonical"]', "href", "https://www.amynest.in/get-app");
    setMetaTag('meta[property="og:title"]', "content", "AmyNest AI — Parenting Is Hard. Amy Makes It Easier.");
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    setMetaTag('meta[property="og:type"]', "content", "website");
    setMetaTag('meta[property="og:url"]', "content", "https://www.amynest.in/get-app");
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "content", "AmyNest AI — Parenting Is Hard. Amy Makes It Easier.");
    setMetaTag('meta[name="twitter:description"]', "content", description);
    setMetaTag('meta[name="twitter:image"]', "content", `https://www.amynest.in${OG_IMAGE}`);
    trackGetAppFunnelEvent("landing_page_view", { page: "get-app" });
  }, []);
}

function useScrollDepthTracking() {
  const scrollDepths = useRef(new Set<number>());

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = Math.round((window.scrollY / scrollable) * 100);
      [25, 50, 75, 100].forEach((marker) => {
        if (depth >= marker && !scrollDepths.current.has(marker)) {
          scrollDepths.current.add(marker);
          trackGetAppFunnelEvent("scroll_depth", { percent: marker, page: "get-app" });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

export default function SocialLandingPage() {
  useGetAppSeo();
  useScrollDepthTracking();
  return <CinematicLandingPage />;
}
