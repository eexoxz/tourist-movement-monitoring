import { describe, expect, it, vi } from "vitest";
import { createQrCameraSession } from "./qrCamera";

function stream() {
  const stop = vi.fn();
  return { stop, media: { getTracks: () => [{ stop }] } as unknown as MediaStream };
}

describe("QR scanner camera lifecycle", () => {
  it("releases late permission grants without interrupting a newer scan", async () => {
    const camera = createQrCameraSession();
    const late = stream(), active = stream();
    let resolve!: (value: MediaStream) => void;
    const pending = camera.start(() => new Promise<MediaStream>((done) => { resolve = done; }));
    camera.stop();
    expect(await camera.start(async () => active.media)).toBe(active.media);
    resolve(late.media);
    expect(await pending).toBeNull();
    expect(late.stop).toHaveBeenCalledOnce();
    expect(active.stop).not.toHaveBeenCalled();
    expect(camera.isCurrent(active.media)).toBe(true);
    camera.stop(); camera.stop();
    expect(active.stop).toHaveBeenCalledOnce();
  });
  it("deduplicates permission requests and allows retry after failure or cancellation", async () => {
    const camera = createQrCameraSession();
    let reject!: (error: Error) => void;
    const pending = camera.start(() => new Promise<MediaStream>((_, fail) => { reject = fail; }));
    const duplicate = vi.fn();
    expect(await camera.start(duplicate)).toBeNull();
    expect(duplicate).not.toHaveBeenCalled();
    camera.stop();
    reject(new Error("Permission request cancelled"));
    expect(await pending).toBeNull();
    await expect(camera.start(async () => { throw new Error("Denied"); })).rejects.toThrow("Denied");
    const active = stream();
    expect(await camera.start(async () => active.media)).toBe(active.media);
    camera.stop();
    expect(active.stop).toHaveBeenCalledOnce();
  });
});
