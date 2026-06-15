import { useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import { getAsOLandingPage } from "@/lib/marketing/aso-landing-pages";
import { AsOSeoLanding } from "@/components/marketing/aso-seo-landing";

export default function AsOLandingPageRoute() {
  const [location] = useLocation();
  const page = getAsOLandingPage(location);

  if (!page) {
    return <NotFound />;
  }

  return <AsOSeoLanding page={page} />;
}
