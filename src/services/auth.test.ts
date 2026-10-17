import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ services: { auth: { currentUser: null } }, setPersistence: vi.fn(), signIn: vi.fn(), register: vi.fn(), verification: vi.fn(), observe: vi.fn() }));
vi.mock("./firebaseClient", () => ({ getFirebaseServices: () => mocks.services, isFirebaseConfigured: () => true }));
vi.mock("firebase/auth", () => ({
  browserLocalPersistence: "local", browserSessionPersistence: "session",
  setPersistence: mocks.setPersistence, signInWithEmailAndPassword: mocks.signIn,
  createUserWithEmailAndPassword: mocks.register, sendEmailVerification: mocks.verification,
  onAuthStateChanged: mocks.observe,
}));
import { registerWithConfiguredProvider, signInWithConfiguredProvider, subscribeConfiguredSessionEnd } from "./auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setPersistence.mockResolvedValue(undefined);
  mocks.signIn.mockResolvedValue({ user: { uid: "test" } });
  mocks.register.mockResolvedValue({ user: { uid: "test", emailVerified: false } });
});
describe("Firebase session persistence", () => {
  it("defaults to session-only persistence when no remember choice is supplied", async () => {
    await signInWithConfiguredProvider("test@example.test", "test-password");
    expect(mocks.setPersistence).toHaveBeenCalledWith(mocks.services.auth, "session");
  });
  it("ends app access on Firebase sign-out or a different account being restored", async () => {
    const stop = vi.fn(); mocks.observe.mockReturnValue(stop);
    const signedOut = vi.fn();
    expect(await subscribeConfiguredSessionEnd("test", signedOut)).toBe(stop);
    const change = mocks.observe.mock.calls[0][1];
    change({ uid: "test" });
    expect(signedOut).not.toHaveBeenCalled();
    change(null);
    expect(signedOut).toHaveBeenCalledOnce();
    change({ uid: "another-user" });
    expect(signedOut).toHaveBeenCalledTimes(2);
  });
  it("uses SDK local persistence only when remember login is selected", async () => {
    await signInWithConfiguredProvider("test@example.test", "test-password", true);
    expect(mocks.setPersistence).toHaveBeenCalledWith(mocks.services.auth, "local");
    expect(mocks.setPersistence.mock.invocationCallOrder[0]).toBeLessThan(mocks.signIn.mock.invocationCallOrder[0]);
  });
  it("switches to session persistence for an unchecked subsequent login", async () => {
    await signInWithConfiguredProvider("test@example.test", "test-password", true);
    await signInWithConfiguredProvider("test@example.test", "test-password", false);
    expect(mocks.setPersistence).toHaveBeenNthCalledWith(2, mocks.services.auth, "session");
  });
  it("keeps registration temporary while email verification is pending", async () => {
    await registerWithConfiguredProvider("test@example.test", "test-password");
    expect(mocks.setPersistence).toHaveBeenCalledWith(mocks.services.auth, "session");
    expect(mocks.verification).toHaveBeenCalled();
  });
  it("keeps a created account recoverable when verification email delivery fails", async () => {
    mocks.verification.mockRejectedValueOnce(new Error("email throttled"));
    const result = await registerWithConfiguredProvider("test@example.test", "test-password");
    expect(result).toMatchObject({ user: { uid: "test" }, verificationSent: false });
    expect(mocks.register).toHaveBeenCalledTimes(1);
  });
  it("does not sign in when persistence setup fails and allows a retry", async () => {
    mocks.setPersistence.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(signInWithConfiguredProvider("test@example.test", "test-password", false)).rejects.toThrow("storage unavailable");
    expect(mocks.signIn).not.toHaveBeenCalled();
    await signInWithConfiguredProvider("test@example.test", "test-password", false);
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
  });
});
