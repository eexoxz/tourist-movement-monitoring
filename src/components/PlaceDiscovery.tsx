import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { destinationCategories } from "../services/destinationManagement";
import { distanceKm } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AnalysisResult, Destination, DestinationCategory, DestinationDemand, FestivalEvent, MovementPoint, Recommendation, TouristProfile, User } from "../types";
import { EmptyState } from "./SummaryCards";

type PlaceDiscoveryMode = "recommended" | "trending" | "nearby" | "events" | "hidden";

const placeDiscoveryModes: Array<{ value: PlaceDiscoveryMode; labelKey: TranslationKey }> = [
  { value: "recommended", labelKey: "tourist.places.mode.bestMatch" },
  { value: "trending", labelKey: "tourist.places.mode.trending" },
  { value: "nearby", labelKey: "tourist.places.mode.nearMe" },
  { value: "events", labelKey: "tourist.places.mode.eventLinked" },
  { value: "hidden", labelKey: "tourist.places.mode.quieter" },
];

const categoryLabelKeys: Record<DestinationCategory, TranslationKey> = {
  cultural: "category.cultural",
  nature: "category.nature",
  urban: "category.urban",
  heritage: "category.heritage",
  food: "category.food",
  coastal: "category.coastal",
};

type PlaceDiscoveryProps = {
  destinations: Destination[];
  demand: DestinationDemand[];
  festivals: FestivalEvent[];
  recommendations: Recommendation[];
  user: User;
  latestAnalysis: AnalysisResult | undefined;
  visitedIds: Set<string>;
  referencePoint?: MovementPoint;
  selectedDestinationId?: string;
  locale?: Locale;
  onSelectDestination: (id: string) => void;
  onOpenEvents: () => void;
};

function getCategoryLabel(category: DestinationCategory, t: (key: TranslationKey) => string) {
  return t(categoryLabelKeys[category]);
}

function formatDistanceLabel(distance: number | undefined, t: (key: TranslationKey) => string) {
  if (distance === undefined) {
    return t("tourist.places.locationNotActive");
  }

  return distance < 1 ? `${Math.round(distance * 1000)} ${t("tourist.places.mAway")}` : `${distance.toFixed(1)} ${t("tourist.places.kmAway")}`;
}

function formatDemandLabel(tier: DestinationDemand["tier"] | undefined, t: (key: TranslationKey) => string) {
  if (!tier) {
    return t("tourist.places.quietSignal");
  }

  return `${t(`map.tier.${tier}` as TranslationKey)} ${t("common.demand").toLowerCase()}`;
}

function formatPlaceFitLabel(score: number, t: (key: TranslationKey) => string) {
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

function categoryFitsProfile(category: DestinationCategory, profile?: TouristProfile) {
  if (!profile || profile === "mixed") {
    return true;
  }

  if (profile === "cultural") {
    return category === "cultural" || category === "heritage";
  }

  if (profile === "nature") {
    return category === "nature" || category === "coastal";
  }

  return category === "urban" || category === "food";
}

function getPlaceDiscoveryInsight({
  recommendation,
  demandRow,
  festivalBoosted,
  preferenceMatch,
  visited,
  t,
}: {
  recommendation?: Recommendation;
  demandRow?: DestinationDemand;
  festivalBoosted: boolean;
  preferenceMatch: boolean;
  visited: boolean;
  t: (key: TranslationKey) => string;
}) {
  if (recommendation) {
    return recommendation.reason || t("tourist.places.insightRecommendationFallback");
  }

  if (festivalBoosted && demandRow && demandRow.popularityScore > 0) {
    return t("tourist.places.insightEventDemand");
  }

  if (festivalBoosted) {
    return t("tourist.places.insightEvent");
  }

  if (demandRow && demandRow.tier !== "low") {
    return t("tourist.places.insightDemand");
  }

  if (preferenceMatch && !visited) {
    return t("tourist.places.insightPreference");
  }

  if (visited) {
    return t("tourist.places.insightVisited");
  }

  return t("tourist.places.insightQuiet");
}

export function PlaceDiscovery({
  destinations,
  demand,
  festivals,
  recommendations,
  user,
  latestAnalysis,
  visitedIds,
  referencePoint,
  selectedDestinationId,
  locale = "en",
  onSelectDestination,
  onOpenEvents,
}: PlaceDiscoveryProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DestinationCategory | "all">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [mode, setMode] = useState<PlaceDiscoveryMode>("recommended");
  const cityOptions = useMemo(() => Array.from(new Set(destinations.map((destination) => destination.city))).sort(), [destinations]);
  const festivalDestinationIds = useMemo(() => new Set(festivals.flatMap((festival) => festival.destinationIds)), [festivals]);
  const recommendationByDestinationId = useMemo(() => new Map(recommendations.map((recommendation) => [recommendation.destinationId, recommendation])), [recommendations]);
  const demandByDestinationId = useMemo(() => new Map(demand.map((row) => [row.destinationId, row])), [demand]);
  const normalizedSearch = search.trim().toLowerCase();

  const rows = useMemo(() => {
    return destinations
      .map((destination) => {
        const recommendation = recommendationByDestinationId.get(destination.id);
        const demandRow = demandByDestinationId.get(destination.id);
        const visited = visitedIds.has(destination.id);
        const preferenceMatch = user.travelPreferences?.includes(destination.category) || categoryFitsProfile(destination.category, latestAnalysis?.profile ?? user.expectedProfile);
        const festivalBoosted = festivalDestinationIds.has(destination.id);
        const distance = referencePoint ? distanceKm(referencePoint, destination) : undefined;
        const demandScore = demandRow?.popularityScore ?? 0;
        const recommendationScore = recommendation?.score ?? 42;
        const score = Math.round(Math.min(100, recommendationScore * 0.45 + demandScore * 0.32 + (preferenceMatch ? 14 : 0) + (festivalBoosted ? 10 : 0) + (visited ? 0 : 8)));
        const insight = getPlaceDiscoveryInsight({ recommendation, demandRow, festivalBoosted, preferenceMatch, visited, t });

        return {
          destination,
          recommendation,
          demandRow,
          visited,
          preferenceMatch,
          festivalBoosted,
          distance,
          score,
          insight,
        };
      })
      .filter((row) => {
        if (categoryFilter !== "all" && row.destination.category !== categoryFilter) {
          return false;
        }

        if (cityFilter !== "all" && row.destination.city !== cityFilter) {
          return false;
        }

        if (mode === "events" && !row.festivalBoosted) {
          return false;
        }

        if (mode === "hidden" && (row.demandRow?.tier === "high" || row.visited)) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [row.destination.name, row.destination.city, row.destination.category, row.destination.address ?? "", row.destination.description].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        if (mode === "trending") {
          return (b.demandRow?.popularityScore ?? 0) - (a.demandRow?.popularityScore ?? 0) || b.score - a.score;
        }

        if (mode === "nearby") {
          return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || b.score - a.score;
        }

        if (mode === "events") {
          return Number(b.festivalBoosted) - Number(a.festivalBoosted) || b.score - a.score;
        }

        if (mode === "hidden") {
          return (a.demandRow?.popularityScore ?? 0) - (b.demandRow?.popularityScore ?? 0) || b.score - a.score;
        }

        return b.score - a.score;
      });
  }, [
    categoryFilter,
    cityFilter,
    demandByDestinationId,
    destinations,
    festivalDestinationIds,
    latestAnalysis?.profile,
    locale,
    mode,
    normalizedSearch,
    recommendationByDestinationId,
    referencePoint,
    user.expectedProfile,
    user.travelPreferences,
    visitedIds,
  ]);

  const selectedRow = rows.find((row) => row.destination.id === selectedDestinationId) ?? rows[0];
  const personalized = Boolean(latestAnalysis);

  return (
    <section className="places-page">
      <section className="places-hero">
        <div>
          <span>{latestAnalysis ? `${latestAnalysis.profile} ${t("tourist.places.profileTraveller")}` : t("tourist.places.discoveryMode")}</span>
          <h2>{t("tourist.places.heroTitle")}</h2>
          <p>{t("tourist.places.heroDescription")}</p>
        </div>
        <div className="places-hero-stats">
          <span>
            <strong>{rows.length}</strong>
            {t("tourist.places.placesShown")}
          </span>
          <span>
            <strong>{demand.filter((row) => row.popularityScore > 0).length}</strong>
            {t("tourist.places.withDemand")}
          </span>
          <span>
            <strong>{festivals.length}</strong>
            {t("tourist.places.eventSignals")}
          </span>
        </div>
      </section>

      {!personalized && (
        <section className="recommendation-mode-notice">
          <strong>{t("tourist.places.basicModeTitle")}</strong>
          <p>{t("tourist.places.basicModeDescription")}</p>
        </section>
      )}

      <section className="places-controls" aria-label="Place discovery filters">
        <label>
          {t("tourist.places.searchLabel")}
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("tourist.places.searchPlaceholder")} />
        </label>
        <label>
          {t("common.category")}
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as DestinationCategory | "all")}>
            <option value="all">{t("tourist.places.allCategories")}</option>
            {destinationCategories.map((category) => (
              <option key={category} value={category}>
                {getCategoryLabel(category, t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("tourist.places.area")}
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
            <option value="all">{t("tourist.places.allMalaysia")}</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="places-mode-row" aria-label="Place discovery mode">
        {placeDiscoveryModes.map((option) => (
          <button key={option.value} className={mode === option.value ? "active" : ""} type="button" onClick={() => setMode(option.value)}>
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      <section className="places-discovery-layout">
        <div className="places-results">
          {rows.map((row) => (
            <button
              className={selectedRow?.destination.id === row.destination.id ? "place-discovery-card active" : "place-discovery-card"}
              type="button"
              key={row.destination.id}
              onClick={() => onSelectDestination(row.destination.id)}
            >
              <div className="place-card-heading">
                <div>
                  <span>{getCategoryLabel(row.destination.category, t)}</span>
                  <strong>{row.destination.name}</strong>
                </div>
                <small>{formatPlaceFitLabel(row.score, t)}</small>
              </div>
              <p>{row.insight}</p>
              <div className="place-card-address">{row.destination.address ?? `${row.destination.city}, Malaysia`}</div>
              <div className="place-card-meta">
                <span>{row.destination.city}</span>
                <span>{formatDemandLabel(row.demandRow?.tier, t)}</span>
                <span>{formatDistanceLabel(row.distance, t)}</span>
                {row.festivalBoosted && <span>{t("tourist.places.eventLinked")}</span>}
                {row.visited ? <span>{t("tourist.places.visited")}</span> : <span>{t("tourist.places.newToYou")}</span>}
              </div>
            </button>
          ))}
          {rows.length === 0 && <EmptyState text={t("tourist.places.noMatches")} />}
        </div>

        {selectedRow && (
          <aside className="place-detail-card">
            <span>{getCategoryLabel(selectedRow.destination.category, t)}</span>
            <h2>{selectedRow.destination.name}</h2>
            <p>{selectedRow.destination.description}</p>
            <dl>
              <div>
                <dt>{t("common.address")}</dt>
                <dd>{selectedRow.destination.address ?? `${selectedRow.destination.city}, Malaysia`}</dd>
              </div>
              <div>
                <dt>{t("common.demand")}</dt>
                <dd>{formatDemandLabel(selectedRow.demandRow?.tier, t)}</dd>
              </div>
              <div>
                <dt>{t("tourist.places.tripFit")}</dt>
                <dd>{selectedRow.preferenceMatch ? t("tourist.places.matchesProfile") : t("tourist.places.differentStyle")}</dd>
              </div>
              <div>
                <dt>{t("tourist.places.eventRelevance")}</dt>
                <dd>{selectedRow.festivalBoosted ? t("tourist.places.linkedUpcoming") : t("tourist.places.noCurrentEvent")}</dd>
              </div>
              <div>
                <dt>{t("common.distance")}</dt>
                <dd>{formatDistanceLabel(selectedRow.distance, t)}</dd>
              </div>
              <div>
                <dt>{t("common.averageVisit")}</dt>
                <dd>{selectedRow.destination.averageVisitMinutes} {t("common.minutes")}</dd>
              </div>
              <div>
                <dt>{t("common.openingHours")}</dt>
                <dd>{selectedRow.destination.openingHours ?? t("common.checkLocally")}</dd>
              </div>
              <div>
                <dt>{t("common.feeNote")}</dt>
                <dd>{selectedRow.destination.feeNote ?? t("common.feeMayVary")}</dd>
              </div>
            </dl>
            {selectedRow.destination.visitTips && selectedRow.destination.visitTips.length > 0 && (
              <section className="visit-tips-panel compact">
                <strong>{t("tourist.places.beforeYouGo")}</strong>
                <ul>
                  {selectedRow.destination.visitTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
            <div className="place-detail-actions">
              <button className="secondary-action" type="button" onClick={onOpenEvents}>
                <CalendarDays size={18} />
                {t("common.checkEvents")}
              </button>
            </div>
          </aside>
        )}
      </section>
    </section>
  );
}
