# Project Completion Checklist

This checklist is based on the DPP scope for the Smart Tourist Movement Monitoring Web Application with AI-Based Travel Recommendation.

The project should be handled as staged delivery with completion gates. It does not need to be pure waterfall, because the DPP uses an adapted Agile method, but each phase below should be stable before depending on it too heavily.

## Phase 0: Project Foundation

- [x] Create standalone project folder outside the Codex dated workspace.
- [x] Initialize React web application structure.
- [x] Use normal project naming.
- [x] Set up npm-based tooling.
- [x] Add `package-lock.json`.
- [x] Add local startup helpers for Windows.
- [x] Add Git repository.
- [x] Add GitHub Actions CI workflow.
- [ ] Connect local repository to a GitHub remote.
- [ ] Push first working branch to GitHub.
- [ ] Confirm GitHub Actions passes on GitHub.
- [x] Add clear environment setup notes for Firebase.

Completion gate:

- [ ] A fresh clone can run `npm install`, `npm run build`, and `npm run dev`.
- [ ] The GitHub repository contains the current source and CI workflow.

## Phase 1: Requirements And Scope Lock

- [x] Identify direct user roles: Tourist and Tourism Administrator.
- [x] Extract DPP functional requirements FR1 to FR14.
- [x] Extract DPP non-functional requirements NFR1 to NFR11.
- [x] Confirm system boundary as an academic prototype.
- [x] Confirm excluded scope: nationwide deployment, commercial release, government database integration, and large-scale public use.
- [ ] Convert FR1 to FR14 into GitHub issues or project board tasks.
- [ ] Convert NFR1 to NFR11 into testable acceptance checks.
- [ ] Define selected Malaysian tourist locations for the prototype dataset.
- [ ] Decide final Firebase project name and deployment environment.

Completion gate:

- [ ] Every DPP requirement has an implementation task and a test/evidence task.

## Phase 2: Data Model And Architecture

- [x] Draft local data entities for users, consents, trips, movement points, destinations, AI analysis, and recommendations.
- [x] Separate trip sessions from movement records.
- [x] Separate destinations from recommendation output.
- [x] Build the first local storage layer for prototype use.
- [x] Finalize Firestore collection design.
- [x] Write Firestore security rules for tourist/admin access.
- [x] Add database seed data for destinations.
- [x] Add migration notes from local storage to Firebase.
- [x] Document the final ERD in the report or project docs.

Completion gate:

- [ ] Firebase data structure matches the DPP ERD and supports all user flows.
- [ ] Movement data access is restricted by role.

## Phase 3: Authentication And Role Access

- [x] Add tourist login screen.
- [x] Add tourist registration flow.
- [x] Add administrator login path.
- [x] Add role-based navigation in the UI.
- [ ] Replace demo/local authentication with Firebase Authentication.
- [x] Store user role safely in Firestore.
- [x] Add protected route handling.
- [x] Block tourists from administrator pages.
- [x] Block administrators from tourist-only trip tracking actions.
- [x] Add logout verification.
- [x] Add invalid login feedback tests.

Completion gate:

- [x] Users must log in before accessing protected tourist or administrator features.
- [x] Role access cannot be bypassed through manual URL changes or browser state edits.

## Phase 4: Tourist Movement Tracking

- [x] Add location consent gate.
- [x] Add start trip action.
- [x] Add stop trip action.
- [x] Add browser geolocation watch support.
- [x] Add demo movement point fallback for local testing.
- [x] Store movement points locally with trip IDs and timestamps.
- [x] Store trip sessions in Firestore.
- [x] Store movement records in Firestore.
- [x] Handle browser permission denial cleanly.
- [x] Handle browser geolocation timeout cleanly.
- [x] Prevent movement collection before consent.
- [x] Add active trip recovery if the page reloads.
- [x] Add minimum movement filtering to avoid duplicate/noisy points.
- [x] Add clear user message for tracking accuracy limitations.

Completion gate:

- [x] A tourist can start and stop a trip, and the resulting movement records are saved under the correct user and trip.
- [x] No movement record is created before consent is granted.

## Phase 5: Map Visualization And Destination Information

- [x] Add Leaflet map.
- [x] Use OpenStreetMap tile layer.
- [x] Show destination markers.
- [x] Show tourist movement route line.
- [x] Show movement point popups.
- [x] Show destination list.
- [x] Add destination detail screen or panel.
- [x] Show destination movement demand inside tourist destination information.
- [x] Show previously visited places clearly.
- [x] Add route history selection by trip.
- [x] Show trip-level distance, duration, accuracy, and visited-stop summaries.
- [x] Add map loading/error state.
- [x] Add marker category styling.
- [ ] Verify map behavior on Chrome, Edge, and Firefox.
- [x] Check OpenStreetMap attribution remains visible.

Completion gate:

- [x] Tourist can view current/latest route, previous movement history, and destination details on the map.

## Phase 6: Administrator Dashboard

- [x] Add administrator dashboard route.
- [x] Show tourist count, trip count, movement point count, and destination count.
- [x] Show all movement records on map.
- [x] Show movement record list.
- [x] Add destination creation form.
- [x] Show basic destination category distribution.
- [x] Add dashboard charts for movement trends.
- [x] Add movement alert signals for high-demand destinations.
- [x] Add movement alert CSV export.
- [x] Add tourist filters.
- [x] Add date/trip filters.
- [x] Add destination edit function.
- [x] Add destination delete function.
- [x] Add dashboard summary export or evidence screenshot flow.
- [x] Include trip distance and duration evidence in movement CSV export.
- [x] Add configurable movement-based travel plan builder for administrator planning.
- [x] Add admin-only Firestore reads/writes.
- [x] Add empty-state handling for no movement data.

Completion gate:

- [x] Tourism Administrator can review movement records, understand travel patterns, and manage destination information.

## Phase 7: AI Analysis

- [x] Add first explainable profile inference logic.
- [x] Add first cluster-like grouping output.
- [x] Add category count analysis.
- [x] Add silhouette-like score placeholder for UI evidence.
- [x] Implement actual K-Means clustering.
- [x] Decide whether K-Means runs in frontend JavaScript, a backend function, or a Python analysis script.
- [x] Prepare prototype movement dataset for AI testing.
- [x] Prepare destination category features.
- [x] Select and justify K value.
- [x] Calculate and record silhouette score from the real clustering output.
- [x] Implement actual Decision Tree classification.
- [x] Prepare labelled sample records for tourist profiles.
- [x] Report Decision Tree accuracy.
- [x] Report confusion matrix.
- [x] Store AI analysis results in Firestore.
- [x] Show AI result explanation in admin dashboard.
- [x] Handle insufficient movement data without misleading output.

Completion gate:

- [x] Valid movement data produces a cluster, tourist category, and explainable AI result.
- [x] AI testing evidence includes cluster interpretation, silhouette score, classification accuracy, and confusion matrix where data allows.

## Phase 8: Recommendation Engine

- [x] Add first recommendation scoring flow.
- [x] Use profile match in recommendation scoring.
- [x] Use unvisited destination priority.
- [x] Use recent location distance in scoring.
- [x] Show recommendation cards to tourist.
- [x] Connect recommendation logic to real AI output.
- [x] Use K-Means cluster pattern in recommendation scoring.
- [x] Store recommendation results in Firestore.
- [x] Prevent already visited destinations from being repeatedly suggested.
- [x] Add fallback recommendation for insufficient data.
- [x] Add explanation text for why each destination is suggested.
- [x] Show score breakdown for recommendation evidence.
- [x] Show tourist movement demand beside recommendation output.
- [x] Add recommendation test cases.

Completion gate:

- [x] Tourist receives relevant destination suggestions based on movement history, tourist profile, cluster pattern, and unvisited destination rule.

## Phase 9: Firebase Integration

- [ ] Create Firebase project.
- [ ] Enable Firebase Authentication.
- [ ] Enable Firestore.
- [ ] Add Firebase config to `.env.local`.
- [x] Add Firebase client module.
- [ ] Replace local user storage with Firebase Authentication.
- [x] Replace local app data storage with Firestore reads/writes.
- [x] Add Firestore security rules.
- [x] Add Firestore indexes if needed.
- [x] Add seed script or admin seed screen for destinations.
- [ ] Test account creation in Firebase.
- [ ] Test tourist data isolation.
- [ ] Test admin access to movement summaries.

Completion gate:

- [ ] The app works after clearing browser local storage because all important data is stored in Firebase.

## Phase 10: Privacy, Security, And Reliability

- [x] Show consent before tracking.
- [x] Keep project scope prototype-level.
- [x] Add privacy note near location consent.
- [x] Add explicit explanation of what location data is stored.
- [x] Add option to stop tracking clearly.
- [x] Add data deletion/reset option for tourist prototype testing.
- [x] Ensure tourist-owned Firestore movement records can be deleted during privacy reset.
- [x] Enforce role-based Firestore rules.
- [x] Prevent unauthenticated access to protected pages.
- [x] Validate form inputs.
- [x] Add loading and error handling around Firebase operations.
- [x] Normalize older local and Firestore prototype data during app loading.
- [ ] Confirm main pages load under the three-second target in normal testing.

Completion gate:

- [ ] Security and privacy requirements NFR3, NFR4, and NFR5 are testable and pass.

## Phase 11: Functional Testing

- [ ] FT1: Tourist registration creates a new account.
- [ ] FT2: Correct login reaches the correct user interface.
- [ ] FT3: Incorrect login is rejected.
- [ ] FT4: Location permission returns current location.
- [ ] FT5: Location denial prevents tracking.
- [ ] FT6: Start/stop trip stores trip session and movement records.
- [ ] FT7: Map shows current location, route history, and destination markers.
- [ ] FT8: Movement history retrieves stored trip records.
- [ ] FT9: Destination selection shows correct details.
- [ ] FT10: Recommendation generation displays suitable destinations.
- [ ] FT11: Admin dashboard displays movement records, summaries, and charts.
- [ ] FT12: AI analysis section shows cluster, tourist category, and recommendation output.
- [ ] FT13: Admin can add, edit, or delete destination records.
- [ ] FT14: Logout ends the user session.

Completion gate:

- [ ] All critical functional tests pass without unresolved blocking defects.

## Phase 12: Non-Functional Testing

- [ ] NFT1: Main pages load within three seconds under standard testing conditions.
- [ ] NFT2: Protected pages reject unauthenticated access.
- [ ] NFT3: Tracking cannot begin without browser location permission.
- [ ] NFT4: Repeated login, map viewing, tracking, and dashboard actions do not crash.
- [ ] NFT5: Tourist and administrator tasks can be completed with minimal confusion.
- [ ] NFT6: Main pages work in selected Chrome, Edge, and Firefox versions.
- [ ] NFT7: Database accepts additional users, destinations, movement records, and recommendation records.
- [ ] NFT8: File/module structure remains separated by major function.

Completion gate:

- [ ] Non-functional requirements NFR1 to NFR11 have evidence.

## Phase 13: Usability Testing

- [ ] Prepare usability test script.
- [ ] Prepare feedback form with 1 to 5 rating scale.
- [ ] UT1: Tourist registers a new account.
- [ ] UT2: Tourist logs in and reaches tourist interface.
- [ ] UT3: Tourist grants location access and starts tracking.
- [ ] UT4: Tourist views movement history on the map.
- [ ] UT5: Tourist views recommended destinations.
- [ ] UT6: Administrator logs in and reaches dashboard.
- [ ] UT7: Administrator views movement summaries.
- [ ] UT8: Administrator manages destination information.
- [ ] Record task success rate.
- [ ] Record task completion time.
- [ ] Record user satisfaction score.
- [ ] Summarize usability issues and refinements.

Completion gate:

- [ ] At least 80% of assigned tasks are completed successfully.
- [ ] Average user satisfaction is at least 4 out of 5.

## Phase 14: Report Evidence And Screenshots

- [ ] Capture registration screen.
- [ ] Capture login screen.
- [ ] Capture location permission/tracking screen.
- [ ] Capture recorded coordinate data.
- [ ] Capture trip route map.
- [ ] Capture destination marker/detail screen.
- [ ] Capture recommendation output.
- [ ] Capture admin dashboard.
- [ ] Capture dashboard chart output.
- [ ] Capture destination management screen.
- [ ] Capture Firebase user record.
- [ ] Capture Firestore movement records.
- [ ] Capture AI cluster result.
- [ ] Capture Decision Tree profile result.
- [ ] Capture testing result tables.

Completion gate:

- [ ] Every implemented DPP feature has screenshot or data evidence for the final report.

## Phase 15: Final Polish And Submission Readiness

- [ ] Remove unused demo-only code or clearly label it as prototype/demo data.
- [ ] Replace placeholder metrics with real test results.
- [ ] Check spelling and UI labels.
- [ ] Check responsive layout on laptop and mobile widths.
- [ ] Confirm OpenStreetMap attribution is visible.
- [ ] Confirm all buttons have clear states.
- [ ] Confirm no secrets are committed to Git.
- [ ] Confirm `.env.local` is ignored.
- [ ] Confirm README run instructions work on your machine.
- [ ] Confirm final build passes.
- [ ] Push final version to GitHub.
- [ ] Tag or mark final submission commit.

Completion gate:

- [ ] Final submitted system matches the DPP scope and has implementation, test, and report evidence.

## Current Reality Snapshot

- [x] UI prototype exists.
- [x] Local browser-storage flow exists.
- [x] Map display exists.
- [x] Admin dashboard shell exists.
- [x] First recommendation logic exists.
- [x] GitHub remote is connected locally.
- [x] Frontend K-Means and Decision Tree prototype logic exists.
- [ ] Firebase project credentials are not completed yet.
- [ ] Formal screenshot/usability testing evidence is not produced yet.
- [ ] Final report evidence/screenshots are not collected yet.
