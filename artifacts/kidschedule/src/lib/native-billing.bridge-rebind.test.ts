/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getNativeBilling } from "@/lib/native-billing";

type Bridge = {
  postMessage: (data: string) => void;
  onmessage: ((event: { data: string }) => void) | null;
};

function createBridge(label: string): Bridge {
  const bridge: Bridge = {
    postMessage: vi.fn((raw: string) => {
      const msg = JSON.parse(raw) as { cbId?: string };
      queueMicrotask(() => {
        bridge.onmessage?.({
          data: JSON.stringify({
            ok: true,
            cbId: msg.cbId,
            data: { available: true, label },
          }),
        });
      });
    }),
    onmessage: null,
  };
  return bridge;
}

describe("native-billing bridge onmessage rebind", () => {
  afterEach(() => {
    delete (window as Window & { AmyNestBillingNative?: Bridge }).AmyNestBillingNative;
  });

  it("rebinds onmessage when AmyNestBillingNative is swapped polyfill → WebMessageListener", async () => {
    const polyfill = createBridge("polyfill");
    (window as Window & { AmyNestBillingNative?: Bridge }).AmyNestBillingNative = polyfill;

    const first = getNativeBilling();
    expect(first).not.toBeNull();
    const firstResult = await first!.getOfferings();
    expect(firstResult).toMatchObject({ ok: true });
    expect(polyfill.onmessage).toEqual(expect.any(Function));

    // Simulate WebMessageListener replacing the document_start polyfill object
    // (use-native-billing listens for amynest-billing-bridge-ready and re-gets).
    const realBridge = createBridge("webview-listener");
    (window as Window & { AmyNestBillingNative?: Bridge }).AmyNestBillingNative = realBridge;

    const second = getNativeBilling();
    expect(second).not.toBeNull();
    const secondResult = await second!.getOfferings();

    // Without rebind, realBridge.onmessage stays null and this times out as bridge_timeout.
    expect(realBridge.onmessage).toEqual(expect.any(Function));
    expect(secondResult).toMatchObject({ ok: true, data: { label: "webview-listener" } });
  });
});
