import type {
  WorldAnalyticsEvent,
  WorldCatalogBase,
  WorldId,
  WorldItemBase,
  WorldModeDefinition,
  WorldProgressSnapshot,
} from "./types.js";

export type WorldEngineOptions<T extends WorldItemBase> = {
  worldId: WorldId;
  catalog: WorldCatalogBase<T>;
  modes: WorldModeDefinition[];
  getItemById?: (id: string) => T | undefined;
};

/**
 * Reusable catalog + mode registry for sound-world modules.
 * Feature UIs (Animal World, Vehicle World, …) wrap this engine without duplicating mode lists.
 */
export class WorldEngine<T extends WorldItemBase> {
  readonly worldId: WorldId;
  readonly catalogVersion: number;
  readonly modes: WorldModeDefinition[];
  private readonly items: T[];
  private readonly byId: Map<string, T>;

  constructor(opts: WorldEngineOptions<T>) {
    this.worldId = opts.worldId;
    this.catalogVersion = opts.catalog.version;
    this.modes = opts.modes;
    this.items = opts.catalog.items;
    this.byId = new Map(
      opts.catalog.items.map((item) => [item.id, item]),
    );
    if (opts.getItemById) {
      for (const item of opts.catalog.items) {
        const resolved = opts.getItemById(item.id);
        if (resolved) this.byId.set(item.id, resolved);
      }
    }
  }

  getAllItems(): T[] {
    return this.items;
  }

  getItemById(id: string): T | undefined {
    return this.byId.get(id);
  }

  getItemsByCategory(category: string): T[] {
    return this.items.filter((item) => item.category === category);
  }

  getCategories(): string[] {
    return [...new Set(this.items.map((item) => item.category))];
  }

  /** Memoized neighbor indices for carousel / preload (O(1) lookup). */
  getNeighborIds(itemId: string): { prev: string | null; next: string | null } {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index < 0) return { prev: null, next: null };
    return {
      prev: index > 0 ? this.items[index - 1].id : null,
      next: index < this.items.length - 1 ? this.items[index + 1].id : null,
    };
  }

  buildProgressSnapshot(childId: number, partial: Partial<WorldProgressSnapshot>): WorldProgressSnapshot {
    return {
      childId,
      worldId: this.worldId,
      xp: partial.xp ?? 0,
      itemsDiscovered: partial.itemsDiscovered ?? [],
      itemsMastered: partial.itemsMastered ?? [],
    };
  }

  analyticsPayload(event: WorldAnalyticsEvent, detail: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      event,
      worldId: this.worldId,
      catalogVersion: this.catalogVersion,
      ...detail,
    };
  }
}
