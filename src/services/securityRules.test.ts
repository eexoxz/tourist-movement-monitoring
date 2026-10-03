import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const firestoreRules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");

describe("Firestore security rules coverage", () => {
  it("keeps SOS closure terminal and protects ownership, response and closure history", () => {
    const sosRules = firestoreRules.split("match /sos_alerts/{alertId}")[1].split("match /incident_reports/{reportId}")[0];
    expect(sosRules).toContain("request.resource.data.userId == resource.data.userId");
    expect(sosRules).toContain('resource.data.status != "resolved"');
    expect(sosRules).toContain('request.resource.data.status == "resolved"');
    for (const field of ["closureReason", "closedBy", "resolvedAt", "adminNote"]) {
      expect(sosRules).toContain(`request.resource.data.get("${field}", null) == resource.data.get("${field}", null)`);
    }
  });
  it("keeps tourist movement records scoped to the authenticated owner", () => {
    expect(firestoreRules).toContain("function ownsExistingRecord()");
    expect(firestoreRules).toContain("function ownsRequestedRecord()");
    expect(firestoreRules).toContain("request.resource.data.userId == request.auth.uid");
    expect(firestoreRules).toContain("resource.data.userId == request.auth.uid");
    expect(firestoreRules).toContain("match /movement_records/{pointId}");
    expect(firestoreRules).toContain("match /sos_alerts/{alertId}");
    expect(firestoreRules).toContain("match /incident_reports/{reportId}");
    expect(firestoreRules).toContain("match /attraction_checkins/{checkInId}");
    expect(firestoreRules).toContain("match /geofences/{geofenceId}");
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
