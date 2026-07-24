import { SHOP_ITEMS } from "../shop";
import { HEALTH_LAB_THEME, HEALTH_LAB_TOUCH_TARGET } from "../theme";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import type { HealthLabPersistedState } from "../types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Coins } from "lucide-react";

export function HealthLabShop({
  state,
  onBack,
  onPurchase,
  onEquip,
}: {
  state: HealthLabPersistedState;
  onBack: () => void;
  onPurchase: (itemId: string) => void;
  onEquip: (itemId: string) => void;
}) {
  const { t } = useHealthLabI18n();
  const categories = ["costume", "avatar", "pet", "decoration", "trail", "particle"] as const;

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} className={cn(HEALTH_LAB_TOUCH_TARGET, "rounded-full p-2 text-violet-200 hover:bg-white/10")} aria-label={t("back", "Back")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t("shop")}</h1>
          <p className="flex items-center gap-1 text-xs text-amber-300">
            <Coins className="h-3 w-3" /> {state.coins} {t("coins_label", "coins")}
          </p>
        </div>
      </header>

      {categories.map((cat) => {
        const items = SHOP_ITEMS.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="mb-2 text-sm font-semibold capitalize text-white">{cat}s</h2>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => {
                const owned = state.unlockedAvatarItems.includes(item.id);
                const equipped = Object.values(state.equippedItems).includes(item.id);
                return (
                  <div key={item.id} className={cn(HEALTH_LAB_THEME.cardGlass, "p-3", owned && !equipped && "opacity-80")}>
                    <span className="text-2xl" aria-hidden>{item.emoji}</span>
                    <p className="mt-1 text-sm font-medium text-white">{item.name}</p>
                    <p className="text-[10px] text-violet-300/60">{item.description}</p>
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => onEquip(item.id)}
                        className={cn(
                          "mt-2 w-full min-h-[48px] rounded-lg text-xs font-bold",
                          equipped ? "bg-emerald-500/30 text-emerald-300" : "bg-violet-500/40 text-white",
                        )}
                      >
                        {equipped ? t("equipped") : t("equip")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPurchase(item.id)}
                        disabled={state.coins < item.price}
                        className={cn(
                          "mt-2 w-full min-h-[48px] rounded-lg text-xs font-bold",
                          state.coins >= item.price
                            ? "bg-amber-500/80 text-white"
                            : "bg-white/10 text-violet-300/50",
                        )}
                      >
                        {item.price} 🪙
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
