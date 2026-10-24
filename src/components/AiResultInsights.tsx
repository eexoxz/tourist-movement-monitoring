import { ChartNoAxesCombined, Database, Route } from "lucide-react";
import type { KMeansFeatureVector } from "../types";
import { aiProfiles, type AiInsights } from "../services/aiInsights";
import { aiText } from "../services/aiInsightsCopy";
import { uniqueDestinationScale } from "../services/analytics";
import { translateAdmin } from "../services/adminI18n";
import { uiText } from "../services/uiText";
import { profileLabel, clusterText } from "../services/planningText";
import type { Locale } from "../services/i18n";

export function AiCoverage({ insights, locale }: { insights: AiInsights; locale: Locale }) {
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const totals = [[translateAdmin(locale, "overview.completedTrips"), insights.completedTripCount], [aiText(locale, "analysed"), insights.analysedTripCount], [aiText(locale, "insufficient"), insights.insufficientTripCount], [aiText(locale, "sparse"), insights.sparseTripCount]] as const;
  return <section className="ai-coverage" aria-label={aiText(locale, "coverage")}>
    <h3><Route size={18} aria-hidden="true" />{aiText(locale, "coverage")}</h3>
    <dl className="ai-coverage-totals">{totals.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
    <div className="ai-source-heading"><Database size={16} aria-hidden="true" /><h4>{aiText(locale, "sources")}</h4></div>
    <dl className="ai-source-counts">{(["browser", "sample", "mixed", "none"] as const).map((source) => <div key={source} data-source={source}><dt><i aria-hidden="true" />{aiText(locale, source)}</dt><dd>{number(insights.sources[source])}</dd></div>)}</dl>
    <p className="ai-method-note">{aiText(locale, "coverageNote")}</p>
  </section>;
}

export function ClusterComposition({ clusters, locale }: { clusters: AiInsights["clusters"]; locale: Locale }) {
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const max = Math.max(1, ...clusters.map((cluster) => cluster.size));
  return <section className="ai-composition" aria-label={aiText(locale, "composition")}>
    <h3><ChartNoAxesCombined size={18} aria-hidden="true" />{aiText(locale, "composition")}</h3>
    <p className="ai-method-note">{aiText(locale, "compositionNote")}</p>
    {!clusters.length && <p>{translateAdmin(locale, "ai.noClusters")}</p>}
    {clusters.length > 0 && <div className="ai-composition-axis" aria-hidden="true"><span>0</span><span>{translateAdmin(locale, "ai.tripCount", { count: max })}</span></div>}
    {clusters.map((cluster) => <figure className="ai-composition-row" key={cluster.cluster}>
      <figcaption><strong>{translateAdmin(locale, "ai.cluster")} {number(cluster.cluster + 1)}</strong><span>{translateAdmin(locale, "ai.tripCount", { count: cluster.size })}</span></figcaption>
      <div className="ai-composition-track" aria-hidden="true"><div className="ai-composition-stack" style={{ width: `${cluster.size / max * 100}%` }}>{aiProfiles.map((profile) => <i key={profile} data-profile={profile} style={{ width: `${cluster.profileCounts[profile] / cluster.size * 100}%` }} />)}</div></div>
      <div className="ai-composition-counts">{aiProfiles.map((profile) => <span key={profile} data-profile={profile}><i aria-hidden="true" />{profileLabel(locale, profile)} <strong>{number(cluster.profileCounts[profile])}</strong></span>)}</div>
      <p>{clusterText(locale, cluster.label)} <span>· {translateAdmin(locale, "ai.avgSilhouette")} {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(cluster.averageSilhouette)}</span></p>
    </figure>)}
  </section>;
}

export function TripClusterComparison({ trip, centroid, locale }: { trip: KMeansFeatureVector; centroid: KMeansFeatureVector; locale: Locale }) {
  const finite = (value: number, max: number) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
  const rows: Array<{ key: keyof KMeansFeatureVector; label: string; max: number; percent: boolean }> = [
    { key: "culturalProportion", label: "Cultural proportion", max: 100, percent: true },
    { key: "natureProportion", label: "Nature proportion", max: 100, percent: true },
    { key: "urbanProportion", label: "Urban proportion", max: 100, percent: true },
    { key: "uniqueDestinations", label: "Unique destinations", max: uniqueDestinationScale, percent: false },
  ];
  return <section className="ai-feature-comparison" aria-label={aiText(locale, "comparison")}>
    <h3>{aiText(locale, "comparison")}</h3>
    {rows.map((row) => <div className="ai-feature-pair" key={row.key}>
      <h4>{uiText(locale, row.label)}</h4>
      {([{ label: "thisTrip", features: trip, kind: "trip" }, { label: "clusterAverage", features: centroid, kind: "centroid" }] as const).map(({ label, features, kind }) => {
        const value = finite(features[row.key], row.max);
        return <div className="ai-comparison-bar" data-series={kind} key={kind}><span>{aiText(locale, label)}</span><div aria-hidden="true"><i style={{ width: `${value / row.max * 100}%` }} /></div><strong>{new Intl.NumberFormat(locale, row.percent ? { style: "percent", maximumFractionDigits: 1 } : { maximumFractionDigits: 1 }).format(row.percent ? value / 100 : value)}</strong></div>;
      })}
    </div>)}
    <p className="ai-method-note">{aiText(locale, "capNote", { count: uniqueDestinationScale })}</p>
  </section>;
}
