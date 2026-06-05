import { useParams } from "wouter";
import NotFound from "@/pages/not-found";
import { getFeaturePage } from "@/lib/marketing/feature-pages";
import { FeatureSeoLanding } from "@/components/marketing/feature-seo-landing";

export default function FeatureSeoLandingPage() {
  const params = useParams<{ slug: string }>();
  const page = getFeaturePage(params.slug ?? "");

  if (!page) {
    return <NotFound />;
  }

  return <FeatureSeoLanding page={page} />;
}
