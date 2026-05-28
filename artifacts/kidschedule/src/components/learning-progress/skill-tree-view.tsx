import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { SkillTreeBranch, SkillTreeNode } from "@workspace/learning-progress-engine";
import { skillStageLabel } from "@workspace/learning-progress-engine";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

export function SkillTreeView({
  math,
  language,
}: {
  math: SkillTreeBranch;
  language: SkillTreeBranch;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="skill-tree-view">
      <SkillTreeBranchCard branch={math} />
      <SkillTreeBranchCard branch={language} />
    </div>
  );
}

function SkillTreeBranchCard({ branch }: { branch: SkillTreeBranch }) {
  return (
    <PremiumCard>
      <div className="p-4">
        <h3 className="font-quicksand font-semibold text-sm flex items-center gap-2 mb-4">
          <span className="text-xl" aria-hidden>
            {branch.emoji}
          </span>
          {branch.title}
        </h3>
        <div className="relative space-y-0">
          <div
            className="absolute left-[1.15rem] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/30 via-primary/15 to-transparent rounded-full"
            aria-hidden
          />
          {branch.nodes.map((node, i) => (
            <SkillTreeNodeRow key={node.skillId} node={node} index={i} isLast={i === branch.nodes.length - 1} />
          ))}
        </div>
      </div>
    </PremiumCard>
  );
}

function SkillTreeNodeRow({
  node,
  index,
  isLast,
}: {
  node: SkillTreeNode;
  index: number;
  isLast: boolean;
}) {
  const mastered = node.stage === "mastered";
  const active = !node.locked && node.mastery > 0;

  return (
    <motion.div
      {...fadeUp}
      transition={{ ...PREMIUM_EASE, delay: index * 0.05 }}
      className={`relative flex gap-3 pl-1 pb-3 ${isLast ? "pb-0" : ""}`}
    >
      <div
        className={`relative z-10 mt-1 h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm border-2 transition-shadow ${
          mastered
            ? "border-primary bg-primary/15 shadow-[0_0_16px_-2px_rgba(168,85,247,0.5)]"
            : active
              ? "border-primary/40 bg-card shadow-sm"
              : "border-muted bg-muted/30"
        }`}
      >
        {node.locked ? (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <span aria-hidden>{node.emoji}</span>
        )}
      </div>
      <div
        className={`flex-1 rounded-xl border px-3 py-2.5 min-w-0 ${
          node.locked ? "opacity-55" : "border-primary/10 bg-primary/[0.03]"
        }`}
      >
        <div className="flex justify-between gap-2 text-sm font-medium">
          <span className="truncate">{node.title}</span>
          <span className="text-[10px] text-primary/80 shrink-0 font-medium">
            {skillStageLabel(node.stage)}
          </span>
        </div>
        {!node.locked && (
          <Progress
            value={node.mastery}
            className={`h-1 mt-2 ${mastered ? "[&>div]:bg-primary" : ""}`}
          />
        )}
      </div>
    </motion.div>
  );
}
