import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { authenticateLocalUser, createTouristAccount, findUserByEmail, isValidEmail, validateTouristAccount } from "./accounts";

describe("accounts service", () => {
  it("authenticates a valid local tourist account", () => {
    const user = authenticateLocalUser(initialData, "tourist@example.com", "tourist123");

    expect(user?.role).toBe("tourist");
    expect(user?.name).toBe("Demo Tourist");
  });

  it("rejects invalid login credentials", () => {
    const user = authenticateLocalUser(initialData, "tourist@example.com", "wrong-password");

    expect(user).toBeNull();
  });

  it("validates tourist registration input", () => {
    expect(isValidEmail("newtourist@example.com")).toBe(true);
    expect(validateTouristAccount(initialData, { name: "A", email: "newtourist@example.com", password: "secret1" }).error).toContain("name");
    expect(validateTouristAccount(initialData, { name: "New Tourist", email: "bad-email", password: "secret1" }).error).toContain("valid email");
    expect(validateTouristAccount(initialData, { name: "New Tourist", email: "newtourist@example.com", password: "123" }).error).toContain("at least 6");
  });

  it("creates a tourist account with normalized email", () => {
    const result = createTouristAccount(initialData, {
      name: "New Tourist",
      email: "  NEWTOURIST@Example.com ",
      password: "secret1",
    });

    expect(result.error).toBeUndefined();
    expect(result.user?.email).toBe("newtourist@example.com");
    expect(result.data?.users).toHaveLength(initialData.users.length + 1);
    expect(findUserByEmail(result.data!, "newtourist@example.com")?.name).toBe("New Tourist");
  });

  it("does not store Firebase-backed account passwords locally", () => {
    const result = createTouristAccount(initialData, {
      name: "Cloud Tourist",
      email: "cloud@example.com",
      password: "secret1",
      authUid: "firebase-user-1",
    });

    expect(result.user?.id).toBe("firebase-user-1");
    expect(result.user?.authUid).toBe("firebase-user-1");
    expect(result.user?.password).toBe("");
  });

  it("rejects duplicate email registration", () => {
    const result = createTouristAccount(initialData, {
      name: "Demo Tourist",
      email: "TOURIST@example.com",
      password: "secret1",
    });

    expect(result.error).toContain("already exists");
  });
});
