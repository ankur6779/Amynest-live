import { Link, useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";

export function AmyFab() {
  const [location] = useLocation();
  if (location.startsWith("/assistant") || location.startsWith("/sign-in") || location.startsWith("/sign-up")) {
    return null;
  }
  return (
    <div className="fixed right-4 z-50 bottom-20 md:bottom-6 amy-fade-in">
      <Link
        href="/assistant"
        aria-label="Ask Amy AI"
        className="group relative flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none"
      >
        <AmyMascotLogo size={58} />
        <span className="absolute -top-2 -right-1 bg-white text-[9px] font-black text-violet-700 dark:text-violet-200 px-1.5 py-0.5 rounded-full shadow border border-violet-200 dark:border-violet-400/30 pointer-events-none">
          Amy AI
        </span>
      </Link>
    </div>
  );
}
