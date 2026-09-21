export type PasswordStrengthLevel = "empty" | "weak" | "fair" | "strong";

export type PasswordRule = {
  id: "length" | "upper" | "lower" | "number" | "symbol";
  label: string;
  passed: boolean;
};

const passwordRules = [
  {
    id: "length",
    label: "8 to 20 characters",
    test: (password: string) => password.length >= 8 && password.length <= 20,
  },
  {
    id: "upper",
    label: "At least one uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "lower",
    label: "At least one lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "At least one number",
    test: (password: string) => /\d/.test(password),
  },
  {
    id: "symbol",
    label: "At least one symbol",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
] as const;

export function getPasswordStrength(password: string) {
  const rules: PasswordRule[] = passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.test(password),
  }));
  const passedCount = rules.filter((rule) => rule.passed).length;
  const level: PasswordStrengthLevel = password.length === 0 ? "empty" : passedCount <= 2 ? "weak" : passedCount <= 4 ? "fair" : "strong";

  return {
    level,
    passedCount,
    rules,
    isValid: rules.every((rule) => rule.passed),
  };
}

export function passwordRequirementMessage(password: string) {
  const result = getPasswordStrength(password);
  if (result.isValid) {
    return "";
  }

  return `Password must include ${result.rules
    .filter((rule) => !rule.passed)
    .map((rule) => rule.label.toLowerCase())
    .join(", ")}.`;
}
