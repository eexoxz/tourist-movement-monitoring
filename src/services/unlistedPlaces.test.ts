import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { checkOutFromAttraction, createAttractionCheckIn } from "./checkIns";
import { applyPlaceReview, createUnlistedCheckIn, groupUnlistedCheckIns, mergePlaceReviewRecords, sampleUnlistedCheckIns, preserveReviewedCheckIn, reviewUnlistedCheckIns, selectPlaceReports, type UnlistedPlaceDraft } from "./unlistedPlaces";
import { getTouristWorkspaceData } from "./touristWorkspace";
import { normalizeAppData } from "./storage";
import { placeSubmissionKeys, placeText } from "./placeSubmissionCopy";
import { localeOptions } from "./i18n";
import { unlistedLocationKeys, unlistedLocationText } from "./unlistedLocationCopy";
import type { AppData, AttractionCheckIn, MovementPoint } from "../types";

const data: AppData = { ...initialData, checkIns: [] };
const draft: UnlistedPlaceDraft = { name: "Test visitor report", address: "Test street address for local QA", city: "George Town", state: "Penang", category: "food", note: "Unverified local test" };
const point: MovementPoint = { id: "test-gps", tripId: "trip-demo-1", latitude: 5.414, longitude: 100.329, accuracyMeters: 20, source: "browser", recordedAt: new Date().toISOString() };
const consentData: AppData = { ...data, consents: [{ id: "test-consent", userId: "tourist-demo", granted: true }] };
const report = (id: string, userId: string, fields: Partial<AttractionCheckIn> = {}): AttractionCheckIn => ({ id, userId, destinationId: "", status: "checked-out", checkedInAt: "2026-10-13T01:00:00Z", checkedOutAt: "2026-10-13T02:00:00Z", submittedPlace: draft, reviewStatus: "pending", ...fields });

describe("unlisted place visits", () => {
  it("records an address-only visit without inventing a GPS position or catalogue place", () => {
    const result = createUnlistedCheckIn(data, "tourist-demo", draft);
    expect(result.checkIn).toMatchObject({ destinationId: "", reviewStatus: "pending", submittedPlace: draft });
    expect(result.checkIn?.latitude).toBeUndefined();
    expect(result.data?.destinations).toBe(data.destinations);
    expect(getTouristWorkspaceData(result.data!, "tourist-demo", "").visitedDestinationIds.has("")).toBe(false);
    expect(normalizeAppData(result.data).checkIns[0].submittedPlace).toMatchObject(draft);
  });
  it("supports checkout and prevents concurrent listed/unlisted visits", () => {
    const result = createUnlistedCheckIn(data, "tourist-demo", draft);
    expect(createUnlistedCheckIn(result.data!, "tourist-demo", draft).error).toBe("active");
    expect(createAttractionCheckIn(result.data!, { userId: "tourist-demo", destinationId: data.destinations[0].id }).error).toBeTruthy();
    const closed = checkOutFromAttraction(result.data!, result.checkIn!.id);
    expect(closed.checkIn?.submittedPlace).toEqual(result.checkIn?.submittedPlace);
    expect(closed.checkIn?.status).toBe("checked-out");
  });
  it("rejects inaccurate, stale, simulated or unconsented GPS", () => {
    expect(createUnlistedCheckIn({ ...data, consents: [] }, "tourist-demo", draft, point).error).toBe("location");
    for (const badPoint of [{ ...point, source: "demo" as const }, { ...point, accuracyMeters: 250 }, { ...point, latitude: 999 }, { ...point, recordedAt: "2020-01-01T00:00:00Z" }]) {
      expect(createUnlistedCheckIn(consentData, "tourist-demo", draft, badPoint).error).toBe("location");
    }
    expect(createUnlistedCheckIn(consentData, "tourist-demo", draft, { ...point, recordedAt: new Date().toISOString() }).checkIn?.latitude).toBe(point.latitude);
  });
  it("requires sufficient details and a tourist account", () => {
    expect(createUnlistedCheckIn(data, "admin-demo", draft).error).toBe("invalid");
    expect(createUnlistedCheckIn(data, "tourist-demo", { ...draft, name: "" }).error).toBe("invalid");
    expect(createUnlistedCheckIn(data, "tourist-demo", { ...draft, address: "Penang" }).error).toBe("invalid");
    expect(createUnlistedCheckIn(data, "tourist-demo", { ...draft, note: "x".repeat(501) }).error).toBe("invalid");
  });
  it("groups nearby same-name reports and counts repeated visits separately from people", () => {
    const reports = [report("a", "one", { latitude: 5.414, longitude: 100.329 }), report("b", "one", { latitude: 5.4142, longitude: 100.329 }), report("c", "two", { latitude: 5.4141, longitude: 100.329 })];
    const groups = groupUnlistedCheckIns(reports);
    expect(groups).toHaveLength(1);
    expect(groups[0].touristCount).toBe(2);
    expect(groups[0].reports).toHaveLength(3);
    expect(groupUnlistedCheckIns([...reports, report("d", "three", { latitude: 5.44, longitude: 100.329 })])).toHaveLength(2);
    expect(groupUnlistedCheckIns([...reports, report("e", "three", { submittedPlace: { ...draft, name: "Different business" }, latitude: 5.414, longitude: 100.329 })])).toHaveLength(1);
  });
  it("accepts a GPS-only location without inventing a street address or state", () => {
    const gpsDraft = { ...draft, address: "", city: "", state: undefined };
    const result = createUnlistedCheckIn(consentData, "tourist-demo", gpsDraft, { ...point, recordedAt: new Date().toISOString() });
    expect(result.checkIn?.submittedPlace).toMatchObject({ address: "", city: "" });
    expect(result.checkIn?.submittedPlace?.state).toBeUndefined();
    expect(normalizeAppData(result.data!).checkIns[0].submittedPlace?.state).toBeUndefined();
    expect(createUnlistedCheckIn(consentData, "tourist-demo", gpsDraft).error).toBe("invalid");
  });
  it("does not merge far-away GPS reports just because the address is the same", () => {
    expect(groupUnlistedCheckIns([report("a", "one", point), report("b", "two", { latitude: 5.44, longitude: point.longitude })])).toHaveLength(2);
  });
  it("keeps samples separate, removable and ineligible for catalogue approval", () => {
    const samples = sampleUnlistedCheckIns();
    expect(new Set(samples.map((record) => record.id)).size).toBe(3);
    expect(sampleUnlistedCheckIns().map((record) => record.id)).toEqual(samples.map((record) => record.id));
    const real = report("real", "tourist-demo", { latitude: samples[0].latitude, longitude: samples[0].longitude, submittedPlace: samples[0].submittedPlace });
    const groups = groupUnlistedCheckIns([real, ...samples]);
    expect(groups).toHaveLength(2);
    expect(groups[0].isDemo).toBeUndefined();
    expect(groups[1].touristCount).toBe(2);
    const admin = data.users.find((user) => user.role === "admin")!;
    expect(reviewUnlistedCheckIns({ ...data, checkIns: samples }, admin, [samples[0].id], data.destinations[0].id).error).toBe("missing");
    expect(groupUnlistedCheckIns([real, ...samples].filter((record) => !record.isDemo))).toHaveLength(1);
  });
  it("merges server pending reports without losing reviewed history or local samples", () => {
    const linked = report("linked", "one", { reviewStatus: "linked", destinationId: "approved" });
    const sample = sampleUnlistedCheckIns()[0];
    const pending = report("pending", "two");
    const current = [linked, sample, pending];
    expect(mergePlaceReviewRecords(current, [pending])).toBe(current);
    const reviewed = { ...pending, reviewStatus: "dismissed" as const };
    expect(mergePlaceReviewRecords(current, [], [reviewed])).toEqual([linked, sample, reviewed]);
    expect(mergePlaceReviewRecords(current, [])).toEqual([linked, sample]);
  });
  it("does not treat approximate addresses as GPS or merge different address-only reports", () => {
    const groups = groupUnlistedCheckIns([report("a", "one"), report("b", "two"), report("c", "three", { submittedPlace: { ...draft, address: "A different full street address" } })]);
    expect(groups).toHaveLength(2);
    expect(groups[0].latitude).toBeUndefined();
    const withGps = groupUnlistedCheckIns([report("a", "one"), report("b", "two", { latitude: 5.414, longitude: 100.329 })]);
    expect(withGps[0].latitude).toBe(5.414);
  });
  it("requires admin review and preserves visit evidence when linking or dismissing", () => {
    const submitted = { ...data, checkIns: [report("a", "tourist-demo")] };
    const admin = data.users.find((user) => user.role === "admin")!;
    expect(reviewUnlistedCheckIns(submitted, data.users.find((user) => user.id === "tourist-demo")!, ["a"], data.destinations[0].id).error).toBe("admin");
    const linked = reviewUnlistedCheckIns(submitted, admin, ["a"], data.destinations[0].id);
    expect(linked.data?.checkIns[0]).toMatchObject({ destinationId: data.destinations[0].id, reviewStatus: "linked", submittedPlace: draft, status: "checked-out" });
    expect(groupUnlistedCheckIns(linked.data!.checkIns)).toHaveLength(0);
    expect(reviewUnlistedCheckIns(linked.data!, admin, ["a"], "").error).toBe("missing");
    expect(reviewUnlistedCheckIns(submitted, admin, ["a"], "").data?.checkIns[0].reviewStatus).toBe("dismissed");
  });
  it("reviews only selected reports without reusing excluded evidence", () => {
    const reports = [report("a", "one", { latitude: 5.414, longitude: 100.329 }), report("b", "two", { submittedPlace: { ...draft, address: "Another full address" }, latitude: 5.4142, longitude: 100.329 })];
    const group = groupUnlistedCheckIns(reports)[0];
    const included = selectPlaceReports(group, new Set(["a"]))!;
    expect(included.place.address).toBe("Another full address");
    expect(included.latitude).toBe(5.4142);
    expect(included.touristCount).toBe(1);
    expect(selectPlaceReports(group, new Set(["a", "b"]))).toBeUndefined();
    const admin = data.users.find((user) => user.role === "admin")!;
    const reviewed = reviewUnlistedCheckIns({ ...data, checkIns: reports }, admin, included.reports.map((record) => record.id), data.destinations[0].id);
    expect(reviewed.data?.checkIns.map((record) => record.reviewStatus)).toEqual(["pending", "linked"]);
  });
  it("adds a reviewed place once and rejects missing report IDs", () => {
    const submitted = { ...data, checkIns: [report("a", "tourist-demo")] };
    const admin = data.users.find((user) => user.role === "admin")!;
    const destination = { ...data.destinations[0], id: "local-review-test" };
    const result = reviewUnlistedCheckIns(submitted, admin, ["a"], destination.id, destination);
    expect(result.data?.destinations).toHaveLength(data.destinations.length + 1);
    expect(result.review?.destination).toBe(destination);
    expect(reviewUnlistedCheckIns(submitted, admin, ["missing"], destination.id, destination).error).toBe("missing");
  });
  it("preserves the admin link when an older tourist device checks out", () => {
    const incoming = report("a", "one", { status: "checked-out" });
    const existing = report("a", "one", { status: "checked-in", destinationId: "approved", reviewStatus: "linked", reviewedBy: "admin" });
    expect(preserveReviewedCheckIn(incoming, existing)).toMatchObject({ destinationId: "approved", reviewStatus: "linked", reviewedBy: "admin", status: "checked-out" });
    expect(preserveReviewedCheckIn({ ...incoming, status: "checked-in" }, incoming)).toBe(incoming);
    expect(() => preserveReviewedCheckIn({ ...incoming, userId: "someone-else" }, existing)).toThrow("ownership");
  });
  it("merges a confirmed review with newer visits without reopening or duplicating anything", () => {
    const submitted = { ...data, checkIns: [report("a", "tourist-demo", { status: "checked-in" })] };
    const admin = data.users.find((user) => user.role === "admin")!;
    const destination = { ...data.destinations[0], id: "new-review-place" };
    const result = reviewUnlistedCheckIns(submitted, admin, ["a"], destination.id, destination);
    const current = { ...submitted, checkIns: [report("a", "tourist-demo"), report("newer", "someone-else")] };
    const merged = applyPlaceReview(current, result.review!);
    expect(merged.checkIns[0].status).toBe("checked-out");
    expect(merged.checkIns[1].reviewStatus).toBe("pending");
    expect(applyPlaceReview(merged, result.review!).destinations).toHaveLength(data.destinations.length + 1);
  });
});

describe("unlisted place language coverage", () => {
  for (const { value: locale } of localeOptions) it(`covers the workflow in ${locale}`, () => {
    for (const key of placeSubmissionKeys) {
      expect(placeText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(placeText(locale, key)).not.toBe(placeText("en", key));
    }
    for (const key of unlistedLocationKeys) {
      expect(unlistedLocationText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(unlistedLocationText(locale, key)).not.toBe(unlistedLocationText("en", key));
    }
  });
});
