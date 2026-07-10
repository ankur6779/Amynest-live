import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Wand2, FileDown, Smartphone } from "lucide-react";
import { WS_GLASS_CARD, WS_OVERLAY, WS_DIALOG, WS_MUTED_TEXT, WS_PRIMARY_BTN, WS_HEADING_SM, WS_ONBOARDING_KEY } from "./worksheet-studio-theme";

const LPS_BANNER_LOGO = "/illustrations/worksheet-studio/lps-banner-logo.png";

type Props = { onComplete: () => void };

const STEPS = [
  { icon: Sparkles, title: "Describe your worksheet", body: "Type what you need — sea animals, math, Hindi Swar — and AI builds it in seconds." },
  { icon: Wand2, title: "Edit on your phone", body: "Tap any text, upload reference images, use the bottom toolbar. Everything is touch-friendly." },
  { icon: FileDown, title: "Export & print", body: "One tap PDF, Word, or print. Pixel-perfect A4 with the official LPS header." },
  { icon: Smartphone, title: "Never lose work", body: "Auto-saves every few seconds. Drafts restore even after refresh." },
];

export function WorksheetOnboarding({ onComplete }: Props) {
  const finish = () => {
    try { localStorage.setItem(WS_ONBOARDING_KEY, "1"); } catch { /* ignore */ }
    onComplete();
  };

  return (
    <div className={cn(WS_OVERLAY, "z-[60] bg-black/50 backdrop-blur-sm")}>
      <div className={cn(WS_GLASS_CARD, WS_DIALOG, "w-full animate-in slide-in-from-bottom-4 duration-300")}>
        <img
          src={LPS_BANNER_LOGO}
          alt="Lucknow Public School"
          className="mx-auto h-14 w-auto max-w-full object-contain sm:h-16"
        />
        <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-[#c9a227]">Welcome</p>
        <h2 className={cn("mt-2 text-center", WS_HEADING_SM)}>LPS Worksheet Studio</h2>
        <p className={cn("mt-1 text-center text-sm", WS_MUTED_TEXT)}>Premium worksheets in under a minute</p>
        <ul className="mt-6 space-y-4">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/10 text-[#1e3a5f]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-[#1e3a5f]">{title}</p>
                <p className={cn("text-sm leading-relaxed", WS_MUTED_TEXT)}>{body}</p>
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
