import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { authenticateLocalUser, createTouristAccount, findUserByEmail, isValidEmail, validateTouristAccount } from "./accounts";

const validRegistration = {
  name: "New Tourist",
  email: "newtourist@example.com",
  password: "secret1",
  nationality: "Malaysia",
  passportNumber: "A12345678",
  termsAccepted: true,
};

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
    expect(isValidEmail("newtourist@example")).toBe(false);
    expect(isValidEmail("newtourist@example..com")).toBe(false);
    expect(isValidEmail("newtourist@-example.com")).toBe(false);
    expect(validateTouristAccount(initialData, { ...validRegistration, name: "A" }).error).toContain("name");
    expect(validateTouristAccount(initialData, { ...validRegistration, email: "bad-email" }).error).toContain("valid email");
    expect(validateTouristAccount(initialData, { ...validRegistration, password: "123" }).error).toContain("at least 6");
    expect(validateTouristAccount(initialData, { ...validRegistration, nationality: "" }).error).toContain("nationality");
    expect(validateTouristAccount(initialData, { ...validRegistration, passportNumber: "A1" }).error).toContain("passport");
    expect(validateTouristAccount(initialData, { ...validRegistration, termsAccepted: false }).error).toContain("privacy");
  });

  it("creates a tourist account with normalized email", () => {
    const result = createTouristAccount(initialData, {
      ...validRegistration,
      email: "  NEWTOURIST@Example.com ",
      passportNumber: " a123 45678 ",
      travelPreferences: ["nature", "coastal"],
      expectedProfile: "nature",
      tripPace: "relaxed",
      travelGroup: "family",
      accessibilityPreference: "low-walking",
    });

    expect(result.error).toBeUndefined();
    expect(result.user?.email).toBe("newtourist@example.com");
    expect(result.user?.nationality).toBe("Malaysia");
    expect(result.user?.passportNumber).toBe("A12345678");
    expect(result.user?.termsAcceptedAt).toBeTruthy();
    expect(result.user?.privacyAcceptedAt).toBeTruthy();
    expect(result.user?.travelPreferences).toEqual(["nature", "coastal"]);
    expect(result.user?.expectedProfile).toBe("nature");
    expect(result.user?.tripPace).toBe("relaxed");
    expect(result.user?.travelGroup).toBe("family");
    expect(result.user?.accessibilityPreference).toBe("low-walking");
    expect(result.data?.users).toHaveLength(initialData.users.length + 1);
    expect(findUserByEmail(result.data!, "newtourist@example.com")?.name).toBe("New Tourist");
  });

  it("does not store Firebase-backed account passwords locally", () => {
    const result = createTouristAccount(initialData, {
      name: "Cloud Tourist",
      email: "cloud@example.com",
      password: "secret1",
      authUid: "firebase-user-1",
      nationality: "Indonesia",
      passportNumber: "B12345678",
      termsAccepted: true,
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
      nationality: "Malaysia",
      passportNumber: "A12345678",
      termsAccepted: true,
    });

    expect(result.error).toContain("already exists");
  });
});
