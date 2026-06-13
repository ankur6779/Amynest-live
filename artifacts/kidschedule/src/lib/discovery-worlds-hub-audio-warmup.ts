import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import { getAllAnimals, collectAnimalSoundUrls } from "@workspace/animal-world";
import { warmAnimalWorldOnOpen } from "@/lib/animal-world-audio-warmup";
import { discoveryWorldAudioManager } from "@/lib/discovery-world-audio-manager";
import { getDiscoveryWorldConfig } from "@/lib/discovery-world-config";
import { scheduleWorldLibraryDeepPreload } from "@/lib/world-library-audio-prewarm";

const HUB_WARM_ITEMS_PER_WORLD = 4;
const HUB_WARM_MAX_URLS = 28;

/** Hub open — warm likely first taps across Animal + platform worlds. */
export function warmDiscoveryWorldsHubOnOpen(): void {
  if (typeof window === "undefined") return;

  warmAnimalWorldOnOpen();

  const urls: string[] = [];
  const animals = getAllAnimals();
  for (const animal of animals.slice(0, 3)) {
    urls.push(...collectAnimalSoundUrls(animal).slice(0, 1));
  }

  for (const def of DISCOVERY_WORLDS_REGISTRY) {
    if (def.worldId === "animal_world") continue;
    const config = getDiscoveryWorldConfig(def.worldId);
    if (!config) continue;
    for (const item of config.manifest.items.slice(0, HUB_WARM_ITEMS_PER_WORLD)) {
      const sound = config.getPrimarySound(item);
      if (sound) urls.push(config.resolveAssetUrl(sound.gcsPath));
    }
  }

  const unique = [...new Set(urls)].slice(0, HUB_WARM_MAX_URLS);
  discoveryWorldAudioManager.preloadSmart({ current: unique });
  scheduleWorldLibraryDeepPreload(unique, HUB_WARM_MAX_URLS);
}
