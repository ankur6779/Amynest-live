import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import {
  ParentGrowthDashboardView,
  EmptyStateCard,
} from "@/components/learning-progress";
import { ScreenShell } from "@/components/screen-shell";
import { PremiumSkeletonStack } from "@/components/learning-progress/premium-polish";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ParentGrowthPage() {
  const { data: children = [], isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const child = (children as { id: number; name: string }[])[0];
  const { phase3, isLoading: progressLoading } = useLearningProgress(child?.id);

  const backAction = (
    <Link href="/parenting-hub">
      <Button variant="ghost" size="icon" className="rounded-full active:scale-95 transition-transform">
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </Link>
  );

  if (isLoading || progressLoading) {
    return (
      <ScreenShell title="Growth journey" actions={backAction}>
        <PremiumSkeletonStack rows={4} />
      </ScreenShell>
    );
  }

  if (!child || !phase3) {
    return (
      <ScreenShell title="Growth journey" actions={backAction}>
        <EmptyStateCard
          emoji="🌱"
          title="No child profile yet"
          message="Add a child to start watching their gentle growth journey unfold here."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={`${child.name}'s growth journey`}
      subtitle="A calm view of what's blossoming — celebrating progress, not measuring it."
      actions={backAction}
      amySurface="growth"
      childId={child.id}
    >
      <ParentGrowthDashboardView dashboard={phase3.parentDashboard} childName={child.name} />
    </ScreenShell>
  );
}
