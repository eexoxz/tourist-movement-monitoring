import type { Destination, DestinationCategory, DestinationDemand, Recommendation } from "../types";
import { useMemo } from "react";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { DestinationVisual } from "./DestinationVisual";
import { EmptyState } from "./SummaryCards";

const categoryLabelKeys: Record<DestinationCategory, TranslationKey> = {
  cultural: "category.cultural",
  nature: "category.nature",
  urban: "category.urban",
  heritage: "category.heritage",
  food: "category.food",
  coastal: "category.coastal",
};

type RecommendationListProps = {
  recommendations: Recommendation[];
  destinations: Destination[];
  demand?: DestinationDemand[];
  personalized?: boolean;
  locale?: Locale;
  compact?: boolean;
  onSelect?: (recommendationId: string) => void;
};

function getRecommendationCategoryLabel(category: DestinationCategory, t: (key: TranslationKey) => string) {
  return t(categoryLabelKeys[category]);
}

function formatDemandActivity(tier: DestinationDemand["tier"] | undefined, t: (key: TranslationKey) => string) {
  if (tier === "high") {
    return t("tourist.recommendations.activityHigh");
  }

  if (tier === "medium") {
    return t("tourist.recommendations.activityMedium");
  }

  if (tier === "low") {
    return t("tourist.recommendations.activityLow");
  }

  return t("tourist.recommendations.noDemandSignal");
}

function formatRecommendationMatch(score: number, t: (key: TranslationKey) => string) {
  if (score >= 82) {
    return t("tourist.recommendations.matchExcellent");
  }

  if (score >= 68) {
    return t("tourist.recommendations.matchStrong");
  }

  if (score >= 52) {
    return t("tourist.recommendations.matchGood");
  }

  return t("tourist.recommendations.matchBasic");
}

export function RecommendationList({
  recommendations,
  destinations,
  demand = [],
  personalized = true,
  locale = "en",
  compact = false,
  onSelect,
}: RecommendationListProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const demandByDestinationId = useMemo(() => new Map(demand.map((row) => [row.destinationId, row])), [demand]);

  if (recommendations.length === 0) {
    return <EmptyState text={personalized ? t("tourist.recommendations.emptyPersonalized") : t("tourist.recommendations.emptyBasic")} />;
  }

  return (
    <section className={compact ? "recommendation-list compact" : "recommendation-list"}>
      {recommendations.map((recommendation) => {
        const destination = destinationById.get(recommendation.destinationId);
        if (!destination) {
          return null;
        }
        const demandRow = demandByDestinationId.get(destination.id);

        return (
          <article className="recommendation-card" key={recommendation.id}>
            <DestinationVisual destination={destination} compact />
            <div>
              <strong>{destination.name}</strong>
              <span>{destination.city}</span>
            </div>
            <div className="recommendation-meta">
              {!personalized && <span className="basic-suggestion-tag">{t("tourist.recommendations.basicSuggestion")}</span>}
              <span>{getRecommendationCategoryLabel(destination.category, t)}</span>
              <span>{formatDemandActivity(demandRow?.tier, t)}</span>
            </div>
            <p>{recommendation.reason}</p>
            <div className="recommendation-card-footer">
              <small>{formatRecommendationMatch(recommendation.score, t)}</small>
              {onSelect && (
                <button className="secondary-action compact-action" type="button" onClick={() => onSelect(recommendation.id)}>
                  {t("tourist.recommendations.viewDestination")}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
