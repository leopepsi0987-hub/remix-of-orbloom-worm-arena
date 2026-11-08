import { describe, expect, it, vi } from "vitest";
import { preloadAssets } from "@/lib/assets";

describe("Asset readiness", () => {
  it("does not finish before the last image is downloaded and decoded", async () => {
    const pending: { onload: () => void; src: string; decode: () => Promise<void> }[] = [];
    vi.stubGlobal("Image", class {
      onload = () => {}; src = ""; decode = () => Promise.resolve();
      constructor() { pending.push(this); }
    });
    try {
      const progress = vi.fn(); const done = vi.fn();
      const promise = preloadAssets(["/test-first", "/test-second"], progress).then(done);
      pending[0]?.onload(); await Promise.resolve(); await Promise.resolve();
      expect(done).not.toHaveBeenCalled();
      pending[1]?.onload(); await promise;
      expect(progress).toHaveBeenLastCalledWith(2, 2);
      expect(done).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
});