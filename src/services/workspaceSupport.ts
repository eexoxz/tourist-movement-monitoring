import type { AnalysisResult, AppData, IncidentType, SosAlert, TravelPlanOptions, User } from "../types";
import type { TranslationKey } from "./i18n";

export type PlanAudience = NonNullable<TravelPlanOptions["audience"]>;

export type PlanTier = NonNullable<TravelPlanOptions["minimumTier"]>;

export type AdminDashboardTab = "overview" | "tourists" | "records" | "safety" | "ai";

export type CommitDataOptions = {
  localOnlyStatus?: string;
  sosAlert?: SosAlert;
};

export const PROFILE_SKIP_KEY_PREFIX = "tourist-movement-monitoring:profile-skip:";

export const DEMO_DATASET_LOCAL_ONLY_STATUS = "Demo dataset loaded locally; Firestore sync skipped";

export const adminTouristPreviewLimit = 8;
export const adminMovementPreviewLimit = 8;
export const adminSafetyPreviewLimit = 5;
export const adminAiPreviewLimit = 8;

export const incidentTypeOptions: Array<{ value: IncidentType; labelKey: TranslationKey }> = [
  { value: "lost-item", labelKey: "tourist.safety.incidentLostItem" },
  { value: "accident", labelKey: "tourist.safety.incidentAccident" },
  { value: "suspicious-activity", labelKey: "tourist.safety.incidentSuspicious" },
  { value: "medical", labelKey: "tourist.safety.incidentMedical" },
  { value: "other", labelKey: "tourist.safety.incidentOther" },
];

export function analysisKey(analysis: AnalysisResult) {
  return `${analysis.tripId}:${analysis.generatedAt}`;
}

export function getProfileSkipKey(userId: string) {
  return `${PROFILE_SKIP_KEY_PREFIX}${userId}`;
}

export function loadProfileSetupSkipped(userId: string) {
  if (typeof localStorage === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(getProfileSkipKey(userId)) === "true";
  } catch {
    return false;
  }
}

export function saveProfileSetupSkipped(userId: string, skipped: boolean) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    if (skipped) {
      localStorage.setItem(getProfileSkipKey(userId), "true");
      return;
    }

    localStorage.removeItem(getProfileSkipKey(userId));
  } catch {
    // Profile setup can still continue in the current session if storage is unavailable.
  }
}

export function getIncidentTypeLabel(type: IncidentType, t: (key: TranslationKey) => string) {
  const option = incidentTypeOptions.find((candidate) => candidate.value === type);
  return option ? t(option.labelKey) : t("tourist.safety.incidentFallback");
}

export function mergeUserRecord(data: AppData, user: User): AppData {
  const nextUsers = data.users.some((candidate) => candidate.id === user.id || candidate.email.toLowerCase() === user.email.toLowerCase())
    ? data.users.map((candidate) => (candidate.id === user.id || candidate.email.toLowerCase() === user.email.toLowerCase() ? { ...candidate, ...user } : candidate))
    : [...data.users, user];

  return { ...data, users: nextUsers };
}
