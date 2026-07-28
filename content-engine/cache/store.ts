import type { ContentPackage } from "../types/content-package.js";
import { CONTENT_PACKAGE_VERSION } from "../types/content-package.js";

export interface CacheEntry<T> {
  key: string;
  value: T;
  version: string;
  createdAt: string;
  expiresAt: string;
}

export interface ContentCache {
  get(key: string): ContentPackage | undefined;
  set(key: string, value: ContentPackage, ttlSeconds: number): void;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

export class InMemoryContentCache implements ContentCache {
  private readonly map = new Map<string, CacheEntry<ContentPackage>>();

  get(key: string): ContentPackage | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.version !== CONTENT_PACKAGE_VERSION) {
      this.map.delete(key);
      return undefined;
    }
    if (Date.parse(entry.expiresAt) <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return structuredClone(entry.value);
  }

  set(key: string, value: ContentPackage, ttlSeconds: number): void {
    const now = Date.now();
    const ttlMs = Math.max(1, ttlSeconds) * 1000;
    this.map.set(key, {
      key,
      value: structuredClone(value),
      version: CONTENT_PACKAGE_VERSION,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    });
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

/** Stable cache key for identical generation inputs. */
export function buildContentCacheKey(input: {
  topicId: string;
  language: string;
  duration: number;
  videoStyle: string;
  provider: string;
  version?: string;
}): string {
  const version = input.version ?? CONTENT_PACKAGE_VERSION;
  return [
    "cp",
    version,
    input.provider,
    input.topicId,
    input.language,
    String(input.duration),
    input.videoStyle,
  ].join(":");
}
