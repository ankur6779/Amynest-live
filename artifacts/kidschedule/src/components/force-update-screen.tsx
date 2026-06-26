import { ArrowUpCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";
import { Button } from "@/components/ui/button";

type ForceUpdateScreenProps = {
  message: string;
  latestVersion: string;
  onUpdateNow: () => void;
};

export function ForceUpdateScreen({
  message,
  latestVersion,
  onUpdateNow,
}: ForceUpdateScreenProps) {
  return (
    <main
      className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-hidden bg-[#10051f] px-5 py-8 text-white"
      aria-labelledby="force-update-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7c3aed66,transparent_38%),radial-gradient(circle_at_bottom,#ec489966,transparent_40%)]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-white/15 bg-white/10 p-7 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white text-[#1f0b38] shadow-lg">
          <AmyIcon size={62} ring />
        </div>
        <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
          <ShieldCheck className="h-4 w-4" />
          Secure app update required
        </div>
        <ArrowUpCircle className="mx-auto mb-4 h-14 w-14 text-pink-200" aria-hidden />
        <h1 id="force-update-title" className="mb-3 text-3xl font-black tracking-tight">
          Update AmyNest AI
        </h1>
        <p className="mx-auto mb-2 max-w-sm text-base leading-7 text-white/85">{message}</p>
        <p className="mb-7 text-sm font-semibold text-pink-100">
          Latest version: {latestVersion}
        </p>
        <Button
          type="button"
          size="lg"
          className="min-h-14 w-full rounded-2xl bg-white text-base font-black text-[#2a0a45] shadow-xl"
          onClick={onUpdateNow}
          autoFocus
        >
          Update Now
          <ExternalLink className="h-5 w-5" aria-hidden />
        </Button>
      </section>
    </main>
  );
}
