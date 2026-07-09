import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Wand2, FileDown, Smartphone } from "lucide-react";
import { WS_GLASS_CARD, WS_ONBOARDING_KEY, WS_PRIMARY_BTN } from "./worksheet-studio-theme";

type Props = { onComplete: () => void };

const STEPS = [
  { icon: Sparkles, title: "Describe your worksheet", body: "Type what you need — sea animals, math, Hindi Swar — and AI builds it in seconds." },
  { icon: Wand2, title: "Edit on your phone", body: "Tap any text, drag images, use the bottom toolbar. Everything is touch-friendly." },
  { icon: FileDown, title: "Export & print", body: "One tap PDF, Word, or print. Pixel-perfect A4 with the official LPS header." },
  { icon: Smartphone, title: "Never lose work", body: "Auto-saves every few seconds. Drafts restore even after refresh." },
];

export function WorksheetOnboarding({ onComplete }: Props) {
  const finish = () => {
    try { localStorage.setItem(WS_ONBOARDING_KEY, "1"); } catch { /* ignore */ }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className={cn(WS_GLASS_CARD, "w-full max-w-md animate-in slide-in-from-bottom-4 p-6 duration-300")}>
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#c9a227]">Welcome</p>
        <h2 className="mt-2 text-center text-2xl font-bold text-[#1e3a5f]">LPS Worksheet Studio</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">Premium worksheets in under a minute</p>
        <ul className="mt-6 space-y-4">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/8 text-[#1e3a5f]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-[#1e3a5f]">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button className={cn(WS_PRIMARY_BTN, "mt-8 w-full")} onClick={finish}>
          Get started
        </Button>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(): boolean {
  try { return !localStorage.getItem(WS_ONBOARDING_KEY); } catch { return false; }
}
