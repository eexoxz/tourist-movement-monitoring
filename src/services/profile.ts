import type { DestinationCategory, User } from "../types";
import { translate, type Locale, type TranslationKey } from "./i18n";

export const profilePreferenceOptions: Array<{ value: DestinationCategory; labelKey: TranslationKey }> = [
  { value: "cultural", labelKey: "category.cultural" },
  { value: "nature", labelKey: "category.nature" },
  { value: "urban", labelKey: "category.urban" },
  { value: "heritage", labelKey: "category.heritage" },
  { value: "food", labelKey: "category.food" },
  { value: "coastal", labelKey: "category.coastal" },
];

export function getDisplayName(user: User) {
  const name = user.name.trim();
  return name && name !== user.email && !name.includes("@") ? name : "";
}

export function inferExpectedProfileFromPreferences(preferences: DestinationCategory[]): NonNullable<User["expectedProfile"]> {
  const culturalScore = preferences.filter((category) => category === "cultural" || category === "heritage").length;
  const natureScore = preferences.filter((category) => category === "nature" || category === "coastal").length;
  const urbanScore = preferences.filter((category) => category === "urban" || category === "food").length;
  const scores = [
    ["cultural", culturalScore],
    ["nature", natureScore],
    ["urban", urbanScore],
  ] as const;
  const ranked = [...scores].sort((a, b) => b[1] - a[1]);

  return ranked[0][1] > 0 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : "mixed";
}

export function formatTravelPreferenceList(preferences?: DestinationCategory[], locale: Locale = "en") {
  if (!preferences || preferences.length === 0) {
    return translate(locale, "tourist.profile.notSetYet");
  }

  const labels = new Map(profilePreferenceOptions.map((option) => [option.value, translate(locale, option.labelKey)]));
  return preferences.map((preference) => labels.get(preference) ?? preference).join(", ");
}

export function getCategoryLabel(category: DestinationCategory, t?: (key: TranslationKey) => string) {
  if (t) {
    const categoryLabels: Record<DestinationCategory, TranslationKey> = {
      cultural: "category.cultural",
      nature: "category.nature",
      urban: "category.urban",
      heritage: "category.heritage",
      food: "category.food",
      coastal: "category.coastal",
    };

    return t(categoryLabels[category]);
  }

  return translate("en", profilePreferenceOptions.find((option) => option.value === category)?.labelKey ?? "category.cultural");
}
