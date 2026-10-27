function validStory(value) {
  return value && typeof value.theme === "string" && /^[a-zA-Z]+$/.test(value.theme)
    && Array.isArray(value.highlights) && value.highlights.length >= 2 && value.highlights.length <= 4
    && value.highlights.every(key => typeof key === "string" && /^[a-zA-Z]+$/.test(key));
}

// An editorial patch may only change these two fields, never IDs, positions or visitor data.
export function planDescriptionUpdates(updates, existing) {
  const rows = new Map(existing.map(row => [row.id, row]));
  const seen = new Set();
  const change = [], unchanged = [], protectedRows = [];
  for (const update of updates) {
    if (typeof update.id !== "string" || !/^[a-z0-9-]+$/.test(update.id) || seen.has(update.id)) throw new Error("Invalid or repeated editorial destination ID");
    seen.add(update.id);
    if (typeof update.beforeDescription !== "string" || typeof update.description !== "string" || update.description.length < 120 || update.description.length > 1600 || !validStory(update.visitorStory)) throw new Error(`Invalid editorial description: ${update.id}`);
    if (Object.keys(update).some(key => !["id", "beforeDescription", "description", "visitorStory"].includes(key))) throw new Error(`Editorial patch contains unrelated fields: ${update.id}`);
    const current = rows.get(update.id);
    if (!current || !current.updateTime) { protectedRows.push({ id: update.id, reason: "Missing record or update-time guard" }); continue; }
    const sameStory = current.visitorStory?.theme === update.visitorStory.theme
      && JSON.stringify(current.visitorStory?.highlights) === JSON.stringify(update.visitorStory.highlights);
    if (current.description === update.description && sameStory) { unchanged.push(update.id); continue; }
    if (current.description !== update.beforeDescription) { protectedRows.push({ id: update.id, reason: "Description changed outside the approved baseline" }); continue; }
    change.push({ id: update.id, description: update.description, visitorStory: update.visitorStory, updateTime: current.updateTime });
  }
  return { change, unchanged, protectedRows };
}
