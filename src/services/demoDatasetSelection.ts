import { demoDatasetMetadata, initialData, isSampleTourist, mergePreparedDemoDataset, removeBuiltInDemoActivity, removeGeneratedDemoDataset } from "../data/demoData";
import type { AppData } from "../types";

const selectionKey = "tourist-movement-monitoring:demo-dataset-selection";
const preparedIds = new Set(initialData.users.filter((user) => /^tourist-seed-\d{3}$/.test(user.id) && isSampleTourist(user)).map((user) => user.id));
let unsavedSelection: { storage: Storage; ids: ReadonlySet<string> } | undefined;

function readSelection(): ReadonlySet<string> | undefined {
  if (typeof localStorage === "undefined") return undefined;
  if (unsavedSelection?.storage === localStorage) return unsavedSelection.ids;
  try {
    const raw = localStorage.getItem(selectionKey);
    if (raw === null) return undefined;
    const ids: unknown = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && preparedIds.has(id)) : []);
  } catch { return new Set(); }
}

export function rememberDemoDatasetSelection(data: AppData) {
  const ids = new Set(data.users.filter((user) => preparedIds.has(user.id) && isSampleTourist(user)).map((user) => user.id));
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(selectionKey, JSON.stringify([...ids]));
    unsavedSelection = undefined;
  } catch { unsavedSelection = { storage: localStorage, ids }; }
}

export function applyDemoDatasetSelection(data: AppData, restoreSelected = false): AppData {
  const ids = readSelection();
  if (!ids) return removeGeneratedDemoDataset(data, preparedIds);
  const filtered = removeGeneratedDemoDataset(data, ids);
  if (!ids.size) return removeBuiltInDemoActivity(filtered);
  // Restore only explicitly loaded samples after a cloud refresh, never the whole legacy dataset.
  return restoreSelected && ids.size ? mergePreparedDemoDataset(filtered, demoDatasetMetadata.generatedTouristCount, ids) : filtered;
}
