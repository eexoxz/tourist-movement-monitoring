import { Building2, CalendarDays, ChevronRight, CircleCheck, Compass, Landmark, MapPin, Maximize2, Navigation, Sparkles, Trees, Users, Utensils, Waves } from "lucide-react";
import { discoveryText } from "../services/discoveryCopy";
import { useEffect, useMemo, useState } from "react";
import { destinationCategories } from "../services/destinationManagement";
import { distanceKm } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AnalysisResult, Destination, DestinationCategory, DestinationDemand, FestivalEvent, MovementPoint, Recommendation, TouristProfile, User } from "../types";
import { DestinationVisual } from "./DestinationVisual";
import { uiText } from "../services/uiText";
import { localizeCity, localizeDestinations } from "../services/destinationLocale";
import { EmptyState } from "./SummaryCards";
import { PlaceGuide } from "./PlaceGuide";
import { PlaceGuideDialog } from "./PlaceGuideDialog";

type PlaceDiscoveryMode = "recommended" | "trending" | "nearby" | "events" | "hidden";

const placeDiscoveryModes: Array<{ value: PlaceDiscoveryMode; labelKey: TranslationKey }> = [
  { value: "recommended", labelKey: "tourist.places.mode.bestMatch" },
  { value: "trending", labelKey: "tourist.places.mode.trending" },
  { value: "nearby", labelKey: "tourist.places.mode.nearMe" },
  { value: "events", labelKey: "tourist.places.mode.eventLinked" },
  { value: "hidden", labelKey: "tourist.places.mode.quieter" },
];

const placePreviewLimit = 4;
const categoryIcons = { cultural: Landmark, nature: Trees, urban: Building2, heritage: Landmark, food: Utensils, coastal: Waves };

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
  onHideDestination?: (id: string) => void;
  isBrowsingArea?: boolean;
  onCheckIn?: (id: string) => void;
  guideRequested?: boolean;
  onGuideRequestConsumed?: () => void;
  requestedDestination?: Destination;
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
    return preferenceMatch ? t("tourist.places.insightPreference") : demandRow && demandRow.tier !== "low" ? t("tourist.places.insightDemand") : t("tourist.places.insightRecommendationFallback");
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
  onHideDestination,
  isBrowsingArea = false,
  onCheckIn,
  guideRequested = false,
  onGuideRequestConsumed,
  requestedDestination,
}: PlaceDiscoveryProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DestinationCategory | "all">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [mode, setMode] = useState<PlaceDiscoveryMode>("recommended");
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const cityOptions = useMemo(() => Array.from(new Set(destinations.map((destination) => destination.city))).sort(), [destinations]);
  const localizedDestinations = useMemo(() => localizeDestinations(destinations, locale), [destinations, locale]);
  const localizedRequest = useMemo(() => requestedDestination ? localizeDestinations([requestedDestination], locale)[0] : undefined, [requestedDestination, locale]);
  const cityByDestinationId = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination.city])), [destinations]);
  const festivalDestinationIds = useMemo(() => new Set(festivals.flatMap((festival) => festival.destinationIds)), [festivals]);
  const recommendationByDestinationId = useMemo(() => new Map(recommendations.map((recommendation) => [recommendation.destinationId, recommendation])), [recommendations]);
  const demandByDestinationId = useMemo(() => new Map(demand.map((row) => [row.destinationId, row])), [demand]);
  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    setShowAllPlaces(false);
  }, [categoryFilter, cityFilter, mode, normalizedSearch]);

  const rows = useMemo(() => {
    return localizedDestinations
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

        if (cityFilter !== "all" && cityByDestinationId.get(row.destination.id) !== cityFilter) {
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
    localizedDestinations,
    cityByDestinationId,
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
  useEffect(() => {
    if (!guideRequested || (!localizedRequest && !selectedRow)) return;
    setGuideOpen(true);
    onGuideRequestConsumed?.();
  }, [guideRequested, localizedRequest?.id, selectedRow?.destination.id, onGuideRequestConsumed]);
  const renderGuide = (destination: Destination) => <PlaceGuide destination={destination} locale={locale}
    distance={formatDistanceLabel(referencePoint ? distanceKm(referencePoint, destination) : undefined, t)} distanceLabel={isBrowsingArea ? discoveryText(locale, "fromArea") : t("common.distance")}
    demand={formatDemandLabel(demandByDestinationId.get(destination.id)?.tier, t)} preference={user.travelPreferences?.includes(destination.category) || categoryFitsProfile(destination.category, latestAnalysis?.profile ?? user.expectedProfile) ? t("tourist.places.matchesProfile") : t("tourist.places.differentStyle")}
    eventRelevance={festivalDestinationIds.has(destination.id) ? t("tourist.places.linkedUpcoming") : t("tourist.places.noCurrentEvent")}
    onCheckIn={onCheckIn ? () => { setGuideOpen(false); onCheckIn(destination.id); } : undefined}
    onOpenEvents={() => { setGuideOpen(false); onOpenEvents(); }}
    onHide={onHideDestination ? () => { setGuideOpen(false); onHideDestination(destination.id); } : undefined} />;
  const guideDestination = localizedRequest ?? selectedRow?.destination;
  const visibleRows = showAllPlaces ? rows : rows.slice(0, placePreviewLimit);
  const hiddenPlaceCount = rows.length - visibleRows.length;
  const personalized = Boolean(latestAnalysis);
  const demandSignalCount = useMemo(() => {
    const localIds = new Set(destinations.map((destination) => destination.id));
    return demand.filter((row) => row.popularityScore > 0 && localIds.has(row.destinationId)).length;
  }, [demand, destinations]);

  return (
    <section className="places-page">
      <section className="places-hero">
        <div>
          <span>{t("tourist.places.discoveryMode")}</span>
          <h2>{t("tourist.places.heroTitle")}</h2>
          <p>{t("tourist.places.heroDescription")}</p>
        </div>
        <div className="places-hero-stats">
          <span>
            <strong>{rows.length}</strong>
            {t("tourist.places.placesShown")}
          </span>
          <span>
            <strong>{demandSignalCount}</strong>
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

      <section className="places-controls" aria-label={uiText(locale, "Place discovery filters")}>
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
                {localizeCity(city, locale)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="places-mode-row" aria-label={uiText(locale, "Place discovery mode")}>
        {placeDiscoveryModes.map((option) => (
          <button key={option.value} className={mode === option.value ? "active" : ""} type="button" onClick={() => setMode(option.value)}>
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      <section className="places-discovery-layout">
        <div className="places-results">
          {visibleRows.map((row) => {
            const CategoryIcon = categoryIcons[row.destination.category];
            return (
            <button
              className={selectedRow?.destination.id === row.destination.id ? "place-discovery-card active" : "place-discovery-card"}
              type="button"
              key={row.destination.id}
              aria-pressed={selectedRow?.destination.id === row.destination.id}
              onClick={() => { onSelectDestination(row.destination.id); if (window.matchMedia("(max-width: 900px)").matches) setGuideOpen(true); }}
            >
              <DestinationVisual destination={row.destination} compact locale={locale} />
              <div className="place-card-content">
              <div className="place-card-heading">
                <div>
                  <span className="place-card-category"><CategoryIcon size={16} aria-hidden="true" />{getCategoryLabel(row.destination.category, t)}</span>
                  <strong>{row.destination.name}</strong>
                  <span className="place-card-city">{row.destination.city}</span>
                </div>
                <ChevronRight size={20} className="place-card-open" aria-hidden="true" />
              </div>
              <p>{row.insight}</p>
              <div className="place-card-address"><MapPin size={16} aria-hidden="true" /><span>{row.destination.address ?? `${row.destination.city}, Malaysia`}</span></div>
              <div className="place-card-meta">
                <span><Navigation size={16} aria-hidden="true" />{formatDistanceLabel(row.distance, t)}</span>
                <span><Users size={16} aria-hidden="true" />{formatDemandLabel(row.demandRow?.tier, t)}</span>
              </div>
              <div className="place-card-signals">
                <small className="place-card-fit"><Sparkles size={15} aria-hidden="true" />{formatPlaceFitLabel(row.score, t)}</small>
                {row.festivalBoosted && <span className="place-card-event"><CalendarDays size={15} aria-hidden="true" />{t("tourist.places.eventLinked")}</span>}
                <span className="place-card-history">{row.visited ? <CircleCheck size={15} aria-hidden="true" /> : <Compass size={15} aria-hidden="true" />}{t(row.visited ? "tourist.places.visited" : "tourist.places.newToYou")}</span>
              </div>
              </div>
            </button>
          ); })}
          {hiddenPlaceCount > 0 && (
            <div className="places-results-footer">
              <p>{t("tourist.places.moreAvailable")}</p>
              <button className="secondary-action compact-action" type="button" onClick={() => setShowAllPlaces(true)}>
                {t("tourist.places.showMore")} ({hiddenPlaceCount})
              </button>
            </div>
          )}
          {showAllPlaces && rows.length > placePreviewLimit && (
            <div className="places-results-footer subtle">
              <button className="secondary-action compact-action" type="button" onClick={() => setShowAllPlaces(false)}>
                {t("tourist.places.showFewer")}
              </button>
            </div>
          )}
          {rows.length === 0 && <EmptyState text={destinations.length === 0 ? discoveryText(locale, referencePoint ? "noLocal" : "locationNeeded") : t("tourist.places.noMatches")} />}
        </div>

        {selectedRow && <aside key={selectedRow.destination.id} className="place-guide-sidebar" aria-label={selectedRow.destination.name}><button type="button" className="place-guide-expand" onClick={() => { onSelectDestination(selectedRow.destination.id); setGuideOpen(true); }}><Maximize2 size={17} />{t("tourist.recommendations.viewDestination")}</button>{renderGuide(selectedRow.destination)}</aside>}
      </section>
      {guideOpen && guideDestination && <PlaceGuideDialog title={guideDestination.name} locale={locale} onClose={() => setGuideOpen(false)}>{renderGuide(guideDestination)}</PlaceGuideDialog>}
    </section>
  );
}
