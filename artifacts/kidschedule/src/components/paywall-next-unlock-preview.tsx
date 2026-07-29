import type { NextUnlockItem } from "@/lib/paywall-next-unlocks";

type Props = {
  items: NextUnlockItem[];
};

export function PaywallNextUnlockPreview({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4" data-testid="paywall-next-unlocks">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">
        Here&apos;s what unlocks next
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-center"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent blur-[1px]"
              aria-hidden
            />
            <div className="relative opacity-90">
              <div className="text-lg" aria-hidden>
                {item.emoji}
              </div>
              <p className="mt-1 text-[10px] font-bold leading-tight text-white/80">
                {item.label}
              </p>
            </div>
            <div
              className="pointer-events-none absolute inset-x-1 bottom-1 h-6 rounded-md bg-white/5 blur-[2px]"
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}
