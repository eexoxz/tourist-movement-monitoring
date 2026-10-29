import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppData, User } from "../types";
const mocked = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./storage", () => ({ loadCloudData: mocked.load }));
import { restoreCloudConnection } from "./cloudRecovery";
const actor = { id: "alice", authUid: "alice", role: "tourist" } as User;
const data = { users: [actor] } as AppData;
beforeEach(() => vi.clearAllMocks());
describe("cloud connection recovery", () => {
  it("requires a fresh cloud read with catalogue refresh before reporting recovery", async () => {
    mocked.load.mockResolvedValue(data); const current = () => true;
    expect(await restoreCloudConnection(actor, current)).toBe(data);
    expect(mocked.load).toHaveBeenCalledWith(actor, current, { forceCatalogue: true });
  });
  it("propagates quota failures and rejects missing cloud data or the signed-in profile", async () => {
    mocked.load.mockRejectedValueOnce({ code: "resource-exhausted" }).mockResolvedValueOnce(null).mockResolvedValueOnce({ users: [] });
    await expect(restoreCloudConnection(actor, () => true)).rejects.toMatchObject({ code: "resource-exhausted" });
    await expect(restoreCloudConnection(actor, () => true)).rejects.toThrow("Cloud refresh unavailable");
    await expect(restoreCloudConnection(actor, () => true)).rejects.toThrow("Cloud refresh unavailable");
  });
  it("does not apply a result after signing out or changing accounts", async () => {
    expect(await restoreCloudConnection(actor, () => false)).toBeNull(); expect(mocked.load).not.toHaveBeenCalled();
    let active = true; mocked.load.mockImplementationOnce(async () => { active = false; return data; });
    expect(await restoreCloudConnection(actor, () => active)).toBeNull();
  });
});
