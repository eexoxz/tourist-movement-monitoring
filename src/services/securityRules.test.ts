import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const firestoreRules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");

describe("Firestore security rules coverage", () => {
  it("keeps tourist movement records scoped to the authenticated owner", () => {
    expect(firestoreRules).toContain("function ownsExistingRecord()");
    expect(firestoreRules).toContain("function ownsRequestedRecord()");
    expect(firestoreRules).toContain("request.resource.data.userId == request.auth.uid");
    expect(firestoreRules).toContain("resource.data.userId == request.auth.uid");
    expect(firestoreRules).toContain("match /movement_records/{pointId}");
    expect(firestoreRules).toContain("match /sos_alerts/{alertId}");
    expect(firestoreRules).toContain("match /incident_reports/{reportId}");
    expect(firestoreRules).toContain("match /attraction_checkins/{checkInId}");
  });

  it("lets administrators review summaries and manage destination records", () => {
    expect(firestoreRules).toContain("function isAdmin()");
    expect(firestoreRules).toContain('get(userPath(request.auth.uid)).data.role == "admin"');
    expect(firestoreRules).toContain("allow read: if canReadOwnedRecord();");
    expect(firestoreRules).toContain("match /destinations/{destinationId}");
    expect(firestoreRules).toContain("allow create, update: if isAdmin()");
    expect(firestoreRules).toContain("allow delete: if isAdmin();");
  });
});
