import { describe, expect, it, vi } from "vitest";
import { readSignInAccount } from "./signInAccount";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("parallel sign-in account checks", () => {
  it("starts both reads together and waits for both before returning the server profile", async () => {
    const deletion = deferred<boolean>(), profile = deferred<{ role: string } | null>();
    const readDeletion = vi.fn(() => deletion.promise), readProfile = vi.fn(() => profile.promise);
    const finished = vi.fn();
    const request = readSignInAccount(readDeletion, readProfile).then((result) => { finished(); return result; });
    await Promise.resolve();
    expect(readDeletion).toHaveBeenCalledOnce(); expect(readProfile).toHaveBeenCalledOnce();
    profile.resolve({ role: "tourist" }); await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    deletion.resolve(false);
    expect(await request).toEqual({ deleting: false, record: { role: "tourist" } });
  });
  it("allows deletion recovery without waiting for an unreadable or delayed profile", async () => {
    expect(await readSignInAccount(async () => true, async () => { throw new Error("Permission denied"); })).toEqual({ deleting: true, record: null });
    expect(await readSignInAccount(async () => true, () => new Promise<null>(() => {}))).toEqual({ deleting: true, record: null });
  });
  it("fails closed when either required read fails and keeps an absent profile distinct", async () => {
    await expect(readSignInAccount(async () => { throw new Error("Deletion check failed"); }, async () => { throw new Error("Profile failed"); })).rejects.toThrow("Deletion check failed");
    await expect(readSignInAccount(async () => false, async () => { throw new Error("Profile failed"); })).rejects.toThrow("Profile failed");
    expect(await readSignInAccount(async () => false, async () => null)).toEqual({ deleting: false, record: null });
  });
});
