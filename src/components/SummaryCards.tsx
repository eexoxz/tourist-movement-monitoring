import { MapPinned, Sparkles } from "lucide-react";
import { formatDateTime } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AnalysisResult, TripSummary } from "../types";

export function MetricGrid({ items }: { items: [string, string][] }) {
  return (
    <section className="metric-grid">
      {items.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

export function CompletedTripSummary({
  trip,
  summary,
  destinationNames,
  analysis,
  locale = "en",
  onViewHistory,
  onViewRecommendations,
}: {
  trip: { id: string; startedAt: string; endedAt?: string };
  summary: TripSummary;
  destinationNames: string[];
  analysis: AnalysisResult | null;
  locale?: Locale;
  onViewHistory: () => void;
  onViewRecommendations: () => void;
}) {
  const t = (key: TranslationKey) => translate(locale, key);
  const analysisStatus = analysis ? t("tourist.completed.analysisComplete") : summary.pointCount >= 2 ? t("tourist.completed.analysisReady") : t("tourist.completed.analysisNeedsPoints");

  return (
    <section className="completed-trip-card">
      <div className="section-heading">
        <div>
          <span>{t("tourist.completed.title")}</span>
          <h2>{formatDateTime(trip.startedAt)}</h2>
        </div>
      </div>
      <div className="completed-trip-grid">
        <div>
          <small>{t("tourist.completed.started")}</small>
          <strong>{formatDateTime(trip.startedAt)}</strong>
        </div>
        <div>
          <small>{t("tourist.completed.ended")}</small>
          <strong>{trip.endedAt ? formatDateTime(trip.endedAt) : t("common.justNow")}</strong>
        </div>
        <div>
          <small>{t("tourist.completed.duration")}</small>
          <strong>{summary.durationMinutes} min</strong>
        </div>
        <div>
          <small>{t("tourist.completed.movementPoints")}</small>
          <strong>{summary.pointCount}</strong>
        </div>
        <div>
          <small>{t("tourist.completed.recognisedStops")}</small>
          <strong>{summary.visitedDestinationCount}</strong>
        </div>
        <div>
          <small>{t("tourist.completed.analysisStatus")}</small>
          <strong>{analysisStatus}</strong>
        </div>
      </div>
      <p>{destinationNames.length > 0 ? destinationNames.join(", ") : t("tourist.completed.noNearbyDestination")}</p>
      <div className="completed-trip-actions">
        <button className="secondary-action" type="button" onClick={onViewHistory}>
          <MapPinned size={18} />
          {t("tourist.completed.viewHistory")}
        </button>
        <button className="primary-action" type="button" onClick={onViewRecommendations}>
          <Sparkles size={18} />
          {t("tourist.completed.viewRecommendations")}
        </button>
      </div>
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <section className="empty-state">
      <Sparkles size={22} />
      <p>{text}</p>
    </section>
  );
}
