import { Award } from "lucide-react";

export function PatentPendingPill({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-200 ${className}`}
      style={{
        background: "linear-gradient(135deg,rgba(168,85,247,0.22),rgba(236,72,153,0.12))",
        border: "1px solid rgba(168,85,247,0.42)",
        boxShadow: "0 0 20px rgba(168,85,247,0.12)",
      }}
    >
      <Award className="h-3 w-3 shrink-0 text-purple-300" aria-hidden />
      Patent-Pending Adaptive AI
    </span>
  );
}

export const PATENT_TRUST_LINE =
  "Powered by patent-pending context-aware AI — provisional patent filed.";
