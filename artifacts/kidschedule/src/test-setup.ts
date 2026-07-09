import "@testing-library/jest-dom";
import "./i18n";

function installStoragePolyfill(target: "localStorage" | "sessionStorage"): void {
  const store = new Map<string, string>();
  const storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, target, {
    configurable: true,
    value: storage,
  });
}

installStoragePolyfill("localStorage");
installStoragePolyfill("sessionStorage");
