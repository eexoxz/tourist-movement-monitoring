import { Fragment } from "react";
import type { KMeansFeatureVector } from "../types";

export function CategoryBars({ values }: { values: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(values));

  return (
    <div className="category-bars">
      {Object.entries(values).map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function KMeansFeatureBars({ features }: { features: KMeansFeatureVector }) {
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
          <span>{row.label}</span>
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

export function ConfusionMatrix({ values }: { values: Record<string, Record<string, number>> }) {
  const profiles = ["cultural", "nature", "urban", "mixed"];

  return (
    <section className="panel">
      <h2>Decision Tree Test Matrix</h2>
      <div className="matrix-table" role="table" aria-label="Decision Tree confusion matrix">
        <span />
        {profiles.map((profile) => (
          <strong key={profile}>Predicted {profile}</strong>
        ))}
        {profiles.map((actual) => (
          <Fragment key={actual}>
            <strong key={`${actual}-label`}>Actual {actual}</strong>
            {profiles.map((predicted) => (
              <span key={`${actual}-${predicted}`}>{values[actual]?.[predicted] ?? 0}</span>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
