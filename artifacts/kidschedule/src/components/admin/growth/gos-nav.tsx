import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { GOS_NAV, type GosNavSection } from "./gos-types";

export function GosNav({ active }: { active: GosNavSection }) {
  const [location] = useLocation();

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin print:hidden"
      aria-label="Growth Operating System"
    >
      {GOS_NAV.map((item) => {
        const href = item.id === "overview" ? "/admin/growth" : `/admin/growth/${item.id}`;
        const isActive = active === item.id || (item.id === "overview" && location === "/admin/growth");
        return (
          <Link key={item.id} href={href}>
            <span
              className={cn(
                "inline-flex whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function parseGosSection(path: string): GosNavSection {
  const match = path.match(/^\/admin\/growth(?:\/([a-z-]+))?$/);
  const raw = match?.[1] ?? "overview";
  const found = GOS_NAV.find((n) => n.id === raw);
  return found?.id ?? "overview";
}
