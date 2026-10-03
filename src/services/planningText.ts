import type { TravelPlan } from "../types";
import { translate, type Locale, type TranslationKey } from "./i18n";
import { uiText } from "./uiText";

export function profileLabel(locale: Locale, profile: string) {
  return ["cultural", "nature", "urban"].includes(profile) ? translate(locale, `category.${profile}` as TranslationKey) : profile === "mixed" ? uiText(locale, "Mixed") : profile;
}

export function demandTierText(locale: Locale, tier: string) {
  const keys: Record<string, TranslationKey> = { low: "map.tier.low", emerging: "map.tier.emerging", medium: "map.tier.medium", high: "map.tier.high", pending: "common.waiting" };
  return keys[tier] ? translate(locale, keys[tier]) : tier;
}

export function recommendationReason(locale: Locale, reason: string) {
  const match = /^Matches the (cultural|nature|urban|mixed) travel profile (.+)$/.exec(reason);
  return match
    ? uiText(locale, `Matches the {profile} travel profile ${match[2]}`, { profile: profileLabel(locale, match[1]) })
    : uiText(locale, reason);
}

export function planningStopReason(locale: Locale, reason: string) {
  const match = /^(low|emerging|medium|high) demand, (.+)$/.exec(reason);
  return match
    ? uiText(locale, `{tier} demand, ${match[2]}`, { tier: demandTierText(locale, match[1]) })
    : uiText(locale, reason);
}

export function clusterText(locale: Locale, label: string) {
  const match = /^([a-z/]+) (focused-route|varied-route) cluster$/.exec(label);
  return match
    ? uiText(locale, `{profiles} ${match[2]} cluster`, { profiles: match[1].split("/").map((profile) => profileLabel(locale, profile)).join(" / ") })
    : uiText(locale, label);
}

export function decisionStepText(locale: Locale, step: string) {
  const match = /^(Rule \d: .+ -> )(yes|no)(.*)$/.exec(step);
  return match
    ? uiText(locale, `${match[1]}{answer}${match[3]}`, { answer: uiText(locale, match[2]) })
    : uiText(locale, step);
}

export function planSummary(locale: Locale, plan: TravelPlan) {
  const city = plan.criteria.city === "all" ? uiText(locale, "All cities") : plan.criteria.city;
  const tier = demandTierText(locale, plan.criteria.minimumTier);
  const audience = plan.criteria.audience === "movement" ? uiText(locale, "Overall movement") : profileLabel(locale, plan.criteria.audience);
  return plan.stops.length === 0
    ? uiText(locale, "No destinations match the selected {tier} demand threshold for {city}.", { tier, city })
    : uiText(locale, "Suggested route for {audience}, filtered to {city}, using {tier}+ movement demand signals.", { audience, city, tier });
}
