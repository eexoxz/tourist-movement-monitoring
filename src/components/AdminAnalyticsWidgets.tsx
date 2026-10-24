import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { profileLabel } from "../services/planningText";
import { aiText } from "../services/aiInsightsCopy";

function profileText(locale: Locale, value: string) {
  return profileLabel(locale, value);
}

export function CategoryBars({ values, locale }: { values: Record<string, number>; locale: Locale }) {
  const max = Math.max(1, ...Object.values(values));

  return (
    <div className="category-bars">
      {Object.entries(values).map(([label, value]) => (
        <div className="bar-row" key={label} data-category={label}>
          <span>{profileText(locale, label)}</span>
          <div>
            <i style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
          </div>
          <strong>{new Intl.NumberFormat(locale).format(value)}</strong>
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
      <div className="directory-table-scroll" tabIndex={0} aria-label={uiText(locale, "Decision Tree confusion matrix")}>
        <table className="directory-table matrix-table" aria-label={uiText(locale, "Decision Tree confusion matrix")}>
          <thead><tr><th scope="col" aria-hidden="true" />{profiles.map((profile) => <th scope="col" key={profile}>{uiText(locale, "Predicted {profile}", { profile: profileText(locale, profile) })}</th>)}</tr></thead>
          <tbody>{profiles.map((actual) => <tr key={actual}>
            <th scope="row">{aiText(locale, "referenceProfile", { profile: profileText(locale, actual) })}</th>
            {profiles.map((predicted) => <td key={predicted} className={actual === predicted ? "matrix-correct" : undefined}>{new Intl.NumberFormat(locale).format(values[actual]?.[predicted] ?? 0)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
