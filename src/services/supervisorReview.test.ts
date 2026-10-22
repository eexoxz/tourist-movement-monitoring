import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { archiveTrip, deleteTouristMovementData } from "./movement";
import { createTouristWorkspaceSelector } from "./touristWorkspace";
import { getTouristManagementRows } from "./touristManagement";
import { buildTouristCsv, buildTouristReportHtml, getCountryCounts, matchesTouristIdentity } from "./touristReports";
import { hasTouristIdentity, normalizeIdentity } from "./touristIdentity";
import { reviewCopyLength, reviewText, reviewTranslations } from "./reviewUpdateCopy";
import { localeOptions } from "./i18n";
import { getDestinationState } from "./destinationState";
import { localizeDestinations } from "./destinationLocale";

describe("supervisor workflow review", () => {
  it("removes a route from the owner's diary but not admin monitoring, and privacy deletion still erases it", () => {
    const next = archiveTrip(initialData, "tourist-cultural-demo", "trip-cultural-demo").data!;
    const select = createTouristWorkspaceSelector();
    expect(select(next, "tourist-cultural-demo", "").visitedDestinationIds).toEqual(createTouristWorkspaceSelector()(initialData, "tourist-cultural-demo", "").visitedDestinationIds);
    expect(select(next, "tourist-cultural-demo", "trip-cultural-demo").userTrips.some((trip) => trip.id === "trip-cultural-demo")).toBe(false);
    expect(getTouristManagementRows(next).find((row) => row.tourist.id === "tourist-cultural-demo")?.totalTrips).toBe(getTouristManagementRows(initialData).find((row) => row.tourist.id === "tourist-cultural-demo")?.totalTrips);
    const erased = deleteTouristMovementData(next, "tourist-cultural-demo");
    expect(erased.trips.some((trip) => trip.id === "trip-cultural-demo")).toBe(false);
    expect(erased.points.some((point) => point.tripId === "trip-cultural-demo")).toBe(false);
  });
  it("normalizes identity searches and combines country and missing-ID filters", () => {
    const user = { ...initialData.users[0], nationality: "Malaysia", passportNumber: "ab 123-456" };
    expect(normalizeIdentity(user.passportNumber)).toBe("AB123456");
    expect(hasTouristIdentity(user)).toBe(true);
    expect(matchesTouristIdentity(user, "AB-123 456", "malaysia", "provided")).toBe(true);
    expect(matchesTouristIdentity(user, "", "singapore", "all")).toBe(false);
    expect(matchesTouristIdentity({ ...user, passportNumber: "   " }, "", "all", "missing")).toBe(true);
    expect(hasTouristIdentity({ ...user, nationality: "" })).toBe(false);
    expect(matchesTouristIdentity(user, user.id, "all", "all")).toBe(true);
  });
  it("counts people rather than trips, excludes admins and preserves unknown countries", () => {
    const base = initialData.users.find((user) => user.role === "tourist")!;
    const counts = getCountryCounts([{ ...base, id: "1", nationality: "Malaysia" }, { ...base, id: "2", nationality: " malaysia " }, { ...base, id: "3", nationality: "" }, { ...base, id: "admin", role: "admin" }]);
    expect(counts.find((row) => row.key === "malaysia")?.count).toBe(2);
    expect(counts.find((row) => row.key === "")?.count).toBe(1);
    expect(counts.reduce((sum, row) => sum + row.count, 0)).toBe(3);
  });
  it("exports every supplied filtered row, masks IDs by default and escapes CSV/HTML content", () => {
    const base = getTouristManagementRows(initialData)[0];
    const rows = Array.from({ length: 30 }, (_, index) => ({ ...base, tourist: { ...base.tourist, id: `u${index}`, name: ' =HYPERLINK("bad")<script>alert(1)</script>', passportNumber: "AB1234567" } }));
    const csv = buildTouristCsv(rows, "en");
    expect(csv.split("\r\n")).toHaveLength(31);
    expect(csv).not.toContain("AB1234567");
    expect(csv).toContain("*****4567");
    expect(csv).toContain("' =HYPERLINK");
    expect(buildTouristCsv(rows.slice(0, 1), "en", true)).toContain("AB1234567");
    const html = buildTouristReportHtml(rows, "zh");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("u29");
    expect(html).not.toContain("AB1234567");
    expect(html).toContain('lang="zh"');
  });
  it("supplies every new message in all nine languages", () => {
    for (const values of Object.values(reviewTranslations)) {
      expect(values).toHaveLength(reviewCopyLength);
      expect(values.every(Boolean)).toBe(true);
    }
    for (const { value: locale } of localeOptions) expect(reviewText(locale, "retention")).toBeTruthy();
  });
  it("keeps state membership consistent when destination names and cities are translated", () => {
    const expected = initialData.destinations.map(getDestinationState);
    expect(expected.every(Boolean)).toBe(true);
    for (const { value: locale } of localeOptions) expect(localizeDestinations(initialData.destinations, locale).map(getDestinationState)).toEqual(expected);
  });
});
