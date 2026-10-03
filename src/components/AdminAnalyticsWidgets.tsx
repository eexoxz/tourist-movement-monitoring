import { Fragment } from "react";
import type { KMeansFeatureVector } from "../types";
import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { profileLabel } from "../services/planningText";

function profileText(locale: Locale, value: string) {
  return profileLabel(locale, value);
}

export function CategoryBars({ values, locale }: { values: Record<string, number>; locale: Locale }) {
  const max = Math.max(1, ...Object.values(values));

  return (
    <div className="category-bars">
      {Object.entries(values).map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{profileText(locale, label)}</span>
          <div>
            <i style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function KMeansFeatureBars({ features, locale }: { features: KMeansFeatureVector; locale: Locale }) {
  const rows = [
    { label: "Cultural proportion", value: features.culturalProportion, width: features.culturalProportion, suffix: "%" },
    { label: "Nature proportion", value: features.natureProportion, width: features.natureProportion, suffix: "%" },
    { label: "Urban proportion", value: features.urbanProportion, width: features.urbanProportion, suffix: "%" },
    { label: "Unique destinations", value: features.uniqueDestinations, width: Math.min(100, (features.uniqueDestinations / 10) * 100), suffix: "" },
  ];

  return (
    <div className="kmeans-feature-bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{uiText(locale, row.label)}</span>
          <div>
            <i style={{ width: `${Math.max(8, row.width)}%` }} />
          </div>
          <strong>
            {row.value}
            {row.suffix}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function ConfusionMatrix({ values, locale }: { values: Record<string, Record<string, number>>; locale: Locale }) {
  const profiles = ["cultural", "nature", "urban", "mixed"];

  return (
    <section className="panel">
      <h2>{uiText(locale, "Decision Tree Test Matrix")}</h2>
      <div className="matrix-table" role="table" aria-label={uiText(locale, "Decision Tree confusion matrix")}>
        <span />
        {profiles.map((profile) => (
          <strong key={profile}>{uiText(locale, "Predicted {profile}", { profile: profileText(locale, profile) })}</strong>
        ))}
        {profiles.map((actual) => (
          <Fragment key={actual}>
            <strong key={`${actual}-label`}>{uiText(locale, "Actual {profile}", { profile: profileText(locale, actual) })}</strong>
            {profiles.map((predicted) => (
              <span key={`${actual}-${predicted}`}>{values[actual]?.[predicted] ?? 0}</span>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
