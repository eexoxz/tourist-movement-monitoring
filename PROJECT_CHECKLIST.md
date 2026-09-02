# Lean FYP Build Checklist

This checklist follows the lean DPP build brief for the Smart Tourist Movement Monitoring Web Application with AI-Based Travel Recommendation.

The goal is one complete, reliable academic prototype flow:

Tourist authentication -> consent-based trip tracking -> stored movement route -> K-Means cluster -> Decision Tree tourist category -> three relevant recommendations -> administrator movement review and destination management.

## Scope Decision

- [x] Keep the system as an academic prototype for selected Malaysian tourist locations.
- [x] Keep the app scope Malaysia-only for this FYP build.
- [x] Support only two user roles: Tourist and Tourism Administrator.
- [x] Use React, Firebase Authentication, Cloud Firestore, Browser Geolocation API, OpenStreetMap, Leaflet, K-Means and Decision Tree logic.
- [x] Keep the finished app to seven main pages only.
- [x] Prefer tabs, modals, expandable rows and side panels over extra pages.
- [x] Remove or hide features that make the app look like a commercial tourism platform.

Do not build:

- [x] No booking, payments, hotels or flights.
- [x] No reviews, social posting or messaging.
- [x] No AI chatbot or LLM feature.
- [x] No nationwide emergency dispatch integration or real authority integration.
- [x] No travel agency, researcher or government integration accounts.
- [x] No Singapore or other-country expansion unless the DPP/report scope changes.

## Lecturer Review Feature Gap

The supervisor review suggested the app needs more visible feature depth. Add only features that still fit the tourist movement monitoring scope and can be justified in the DPP/report.

- [x] Add passport number and nationality during tourist registration.
- [x] Add consent/T&C language for privacy, tourist data storage and consent-based location tracking.
- [x] Add event calendar for Malaysian nationwide and state-level festivals/public holidays.
- [x] Add reusable notification/toast system for tourist and administrator feedback.
- [x] Add first multilingual UI foundation without using a translation API.
- [ ] Expand language coverage across every tourist-facing page, not only login and navigation.
- [x] Add emergency contact details to tourist profile.
- [x] Add SOS/emergency assistance button for tourist side as a prototype-only safety feature.
- [x] Add administrator SOS/emergency monitoring section.
- [x] Add tourist check-in/check-out for attractions.
- [x] Decide whether check-in is manual only or QR-style simulation for the prototype.
- [x] Add incident reporting for lost item, accident, suspicious activity and general help.
- [x] Add administrator incident management section with status updates.
- [x] Add tourist management view for administrators using existing user/profile records.
- [x] Add geofencing warning logic around selected safe/restricted/dense areas without adding new APIs.
- [x] Add basic attraction practical info such as opening hours, fee note and visit tips where data is locally available.
- [ ] Document that weather, traffic and road-closure alerts are out of scope unless approved APIs are allowed.

## Malaysia Destination Scope

- [x] Keep destination data focused on Malaysian tourist locations only.
- [x] Include places beyond obvious major landmarks, such as locally known food streets, heritage walks, parks, viewpoints, markets and neighbourhood spots.
- [x] Keep famous landmarks visible where tourist movement would realistically be high, but do not let them dominate every recommendation.
- [x] Verify each seeded destination is real, currently existing and suitable for tourist visits before adding it to the app.
- [x] Cover multiple Malaysian states/cities instead of making the prototype only Kuala Lumpur-heavy.
- [x] Label destination categories consistently so K-Means and Decision Tree evidence stays explainable.
- [x] Add a balanced mix of Cultural, Nature and Urban destinations, with Food, Heritage and Coastal only where they help the report.
- [x] Avoid making recommendations look like a generic “top 10 tourist attractions” list.

## Seven Main Pages

- [x] Page 1: Login.
- [x] Page 2: Tourist Registration.
- [x] Page 3: Tourist Home and Trip Tracking.
- [x] Page 4: Trip History and Trip Details.
- [x] Page 5: Travel Recommendations.
- [x] Page 6: Tourism Administrator Dashboard.
- [x] Page 7: Destination Management.

Current alignment notes:

- [x] Login/register UI exists.
- [x] Tourist tracking, trips, recommendations and profile setup exist.
- [x] Administrator dashboard and destination management exist.
- [x] Refine navigation so Tourist Home and Trip Tracking are one main page.
- [x] Refine administrator navigation so Dashboard contains Overview, Movement Records and AI Results as tabs.
- [x] Decide whether Profile should remain a main nav item or become a profile menu/panel to preserve the seven-page scope.

## Navigation And Access

- [x] Tourist role and Administrator role exist.
- [x] UI navigation changes based on role.
- [x] Firebase mode requires real Firebase Authentication accounts.
- [x] Tourists cannot manually choose the Administrator role during registration.
- [x] Tourist login redirects to `/app/home`.
- [x] Administrator login redirects to `/admin/dashboard`.
- [x] Unauthenticated users return to `/login`.
- [x] Wrong-role access redirects to the authorised home page.
- [x] Remove Tourist/Admin selector style from the login page in the final Firebase flow.
- [x] Keep Tourist mobile navigation simple: Home, Trips, Recommendations, Profile menu.
- [x] Keep Administrator navigation simple: Dashboard, Destinations, Logout.

## Page 1: Login

- [x] Email field.
- [x] Password field.
- [x] Show/hide password.
- [x] Clear invalid-login message.
- [x] Loading state during authentication.
- [x] Prevent repeated submission while loading.
- [x] Keep signed-in session through Firebase Authentication.
- [x] Read role after login.
- [x] Resend email verification in Firebase mode.
- [x] Validate email format before Firebase login.
- [x] Remove misleading default demo credentials from Firebase login.
- [x] Create Tourist Account link should go to a clear registration screen.
- [x] Forgot Password link only if core flow is stable.

## Page 2: Tourist Registration

- [x] Name field exists.
- [x] Email field exists.
- [x] Password field exists.
- [x] Firebase account creation exists.
- [x] Firestore user record creation exists.
- [x] Email verification sending exists.
- [x] Tourist profile/preferences setup exists after login.
- [x] Add confirm password.
- [x] Validate matching passwords.
- [x] Collect initial preferred categories during registration or immediately after registration.
- [x] Create/store a clearer Tourist Profile document or equivalent structured profile data.
- [x] Redirect to `/app/home` after successful registration or verification.
- [x] Do not request browser location permission during registration.
- [x] Do not provide Administrator registration.

## Page 3: Tourist Home And Trip Tracking

- [x] Mobile-friendly tourist home exists.
- [x] Tracking status exists.
- [x] Location consent gate exists.
- [x] Start trip action exists.
- [x] Stop trip action exists.
- [x] Browser Geolocation watch exists.
- [x] Movement coordinates save with timestamp and accuracy.
- [x] Leaflet map exists.
- [x] OpenStreetMap tiles exist.
- [x] Destination markers exist.
- [x] Recorded route polyline exists.
- [x] Permission denied handling exists.
- [x] Position unavailable and timeout messages exist.
- [x] Insufficient/no-trip state exists.
- [x] Demo point support exists for prototype testing.
- [x] Combine home dashboard and live tracking into one final Tourist page.
- [x] Show current-location marker clearly.
- [x] Add Centre on Current Location control.
- [x] Add stop confirmation.
- [x] Show tracking states as Not Started, Active or Completed.
- [x] Display: "Keep this page open while your trip is being recorded."
- [x] Add a short three-step new-user guide.
- [x] Add Start Your First Trip action.
- [x] Show completed-trip summary with date, start/end time, duration, points, recognised destinations and analysis status.
- [x] Add View Trip History and View Recommendations actions after a completed trip.
- [x] Make Start and Stop buttons full-width on mobile.

## Page 4: Trip History And Trip Details

- [x] Trip history exists.
- [x] Selected trip route map exists.
- [x] Trip summary includes distance, duration, points and visited stops.
- [x] No-trip empty state exists.
- [x] Sort trips with the most recent first.
- [x] Show start and end times clearly.
- [x] Show tracking status.
- [x] Show recognised destinations count.
- [x] Open selected trip details in a modal, expandable section or side panel.
- [x] Trip detail should include start marker, end marker and visited destination markers.
- [x] Trip detail should include Cluster ID, Tourist Category, generated recommendations and analysis status.
- [x] Add loading, failed-load, analysis-processing and insufficient-data states.
- [x] Remove trip editing/deletion from final scope.

## Page 5: Travel Recommendations

- [x] Recommendation page exists.
- [x] Destination recommendation cards exist.
- [x] Recommendation score exists.
- [x] Recommendation reason exists.
- [x] Visited/unvisited logic exists.
- [x] Destination information panel exists.
- [x] Insufficient-data fallback exists.
- [x] Display only the top three recommended destinations.
- [x] Add profile section with latest Tourist Category, Cluster ID, analysis date and short category explanation.
- [x] Open destination details in a modal instead of another page/large dashboard panel.
- [x] Destination modal should show name, category, description, map marker, latitude and longitude.
- [x] Recommendation formula should be explainable as Profile Match + Cluster Pattern Match + Unvisited Priority.
- [x] Clearly label preference-based fallback suggestions as basic suggestions.
- [x] Ask the Tourist to complete another trip when data is insufficient.

## Page 6: Tourism Administrator Dashboard

- [x] Administrator dashboard exists.
- [x] Summary cards exist.
- [x] Movement records exist.
- [x] Movement map exists.
- [x] AI result section exists.
- [x] K-Means and Decision Tree outputs exist.
- [x] Charts exist.
- [x] Recent/filtered movement data exists.
- [x] Refactor admin into one dashboard route with tabs: Overview, Movement Records, AI Results.
- [x] Overview tab should show Total Tourists, Total completed trips, Total movement records and Total destinations.
- [x] Keep only one or two useful charts.
- [x] Add trips-over-time chart if not already clear enough.
- [x] Add Tourist Category distribution or destination-category visits chart.
- [x] Movement Records tab should list Trip ID, Tourist, date, duration, movement-point count, destinations visited, Cluster ID and Tourist Category.
- [x] Movement record details should open in expandable row, modal or side panel.
- [x] Administrators may review movement records but cannot edit individual coordinates.
- [x] AI Results tab should show selected K value, cluster size, dominant pattern, cluster description and recommendation result.
- [x] Keep confusion matrix/accuracy only if supported by labelled data and useful for report evidence.

## Page 7: Destination Management

- [x] Destination list exists.
- [x] Add destination exists.
- [x] Edit destination exists.
- [x] Delete destination exists.
- [x] Latitude/longitude validation exists.
- [x] Use Add/Edit modal instead of always showing long inline forms.
- [x] Keep Cultural, Nature and Urban as primary AI categories, with Food, Heritage and Coastal justified as supporting Malaysian destination labels.
- [x] Show loading state while saving.
- [x] Show clear success/failure message.
- [x] Require confirmation before deletion.
- [x] Include destination name in the delete confirmation message.
- [x] Add search and category filters after destination CRUD is stable; keep coordinate picking out of scope unless it becomes necessary.

## Firebase Data And Security

- [x] Firebase Authentication integration exists.
- [x] Cloud Firestore integration exists.
- [x] Firestore rules exist.
- [x] Passwords are not stored for Firebase-backed users.
- [x] Tourist-owned movement data is scoped by user.
- [x] Admin-only destination write rules exist.
- [x] Confirm Firebase project, Authentication and Firestore are fully enabled.
- [x] Confirm `.env` or `.env.local` values are present locally and ignored by Git.
- [x] Decide whether to keep current collection names or migrate closer to the DPP names.
- [x] Required DPP collections to map or document: users, tourist_profiles, tourist_preferences, location_consents, trip_sessions, movement_records, destination_categories, destinations, ai_analyses, recommendations.
- [x] Test account creation in Firebase.
- [x] Test tourist data isolation.
- [x] Test admin access to summaries and destination management.
- [x] Confirm app still works after clearing browser local storage.

## Lean AI Implementation

- [x] K-Means clustering exists.
- [x] Decision Tree classification exists.
- [x] Recommendation scoring exists.
- [x] Insufficient-data handling exists.
- [x] Prepared demo movement records exist.
- [x] Classification explanation path exists.
- [x] Confusion matrix and accuracy evidence exist in prototype logic.
- [x] Simplify user-facing AI output so it is understandable to non-technical users.
- [x] K-Means input should clearly use Cultural, Nature, Urban proportions and unique destinations visited.
- [x] Decision Tree output should be Cultural Tourist, Nature Tourist, Urban Tourist or Mixed Tourist.
- [x] Recommendation output should be exactly top three unvisited destinations.
- [x] Do not show unsupported personalised results when movement data is insufficient.
- [x] Clearly label prepared demo records as demonstration data.

## Demonstration Dataset

- [x] Seed at least 100 synthetic Tourist users for FYP demonstration.
- [x] Seed synthetic location consent records, completed trips and movement points.
- [x] Keep generated movement records deterministic so reset/demo testing is repeatable.
- [x] Keep original demo login accounts available.
- [x] Support chunked Firestore saves for larger demonstration datasets.
- [x] Keep synthetic seed size large enough for dashboard/AI evidence but small enough for fast local testing and Firebase sync.
- [x] Add an administrator control to regenerate or reload the demonstration dataset on demand.
- [ ] Document in the report that seeded movement records are synthetic demonstration data, not real collected tourist data.

## Mobile And Usability

- [x] Tourist pages are being redesigned mobile-first.
- [x] Password visibility exists.
- [x] Profile setup exists.
- [x] Form labels are above fields.
- [x] Touch-sized buttons mostly exist.
- [x] Body text should be at least 16px on Tourist pages.
- [x] Avoid horizontal scrolling on Tourist pages.
- [x] Make key trip controls easy to reach.
- [x] Let the map use most of the tracking screen.
- [x] Add visible keyboard focus states.
- [x] Add retry actions where failures are recoverable.
- [x] Test Tourist flow at mobile width.
- [x] Simplify Tourist Home so trip controls and quick actions appear before secondary content.
- [ ] Test Chrome, Edge and Firefox.

## Map Experience

- [x] Keep Leaflet/OpenStreetMap as the map engine unless the project scope changes.
- [x] Make the map feel visually aligned with the app through custom markers, route styling and calmer controls.
- [x] Reduce unnecessary map visual noise where possible so tracking and destination signals are easier to understand.
- [x] Add a simplified tourist map mode focused on current location, route, destination markers and selected place details.
- [x] Keep full custom map rendering out of scope unless Leaflet becomes a blocker.

## Notification System

- [x] Add reusable app-level toast notifications.
- [x] Show pop-up feedback for login, registration and email verification errors.
- [x] Show pop-up feedback for trip tracking, location permission, profile save and data deletion events.
- [x] Show pop-up feedback for destination add, edit, delete and AI refresh actions.
- [x] Keep inline messages where they help form accessibility and local context.
- [x] Audit every remaining failure path and connect it to the shared notification system.
- [x] Add retry buttons for recoverable Firebase and geolocation failures where useful.
- [x] Test notification placement on mobile tourist pages and desktop administrator pages.

## Required Demonstration Flow

- [x] Tourist registers a new account.
- [x] Tourist verifies/logs in.
- [x] Tourist completes or skips profile setup.
- [x] Tourist grants location permission.
- [x] Tourist starts and stops a short trip.
- [x] Tourist views a prepared previous trip route.
- [x] Tourist sees Tourist Category and three recommendations.
- [x] Administrator logs in.
- [x] Administrator finds the trip in Movement Records.
- [x] Administrator reviews dashboard charts and AI result.
- [x] Administrator adds or edits one destination.
- [x] Tourist and Administrator can log out.

## Functional Requirement Coverage

- [x] FR1 Register a new account.
- [x] FR2 Log in.
- [x] FR3 Allow location access.
- [x] FR4 Start and stop tracking.
- [x] FR5 View current location.
- [x] FR6 View movement history and routes.
- [x] FR7 View destination information.
- [x] FR8 Receive travel recommendations.
- [x] FR9 Administrator login.
- [x] FR10 View Tourist movement records.
- [x] FR11 Review movement trends and charts.
- [x] FR12 View AI analysis results.
- [x] FR13 Manage destination information.
- [x] FR14 View movement summaries.
- [x] FT14 Logout.

## Acceptance Criteria

- [x] All seven main pages work.
- [x] FR1 to FR14 can be demonstrated.
- [x] FT1 to FT14 can be tested.
- [x] Tourists and Administrators reach only authorised areas.
- [x] Movement is never recorded before permission is granted.
- [x] A Tourist can register, track a trip, view history and receive recommendations.
- [x] An Administrator can view summaries, charts and AI results.
- [x] An Administrator can add, edit and delete a destination.
- [x] Main pages load within three seconds under standard testing.
- [x] Core actions do not crash the app or lose stored records.
- [x] Main tasks work at mobile-browser width.
- [x] Valid AI input produces a cluster, Tourist Category and recommendations.
- [x] Insufficient AI input produces a clear message instead of a misleading result.

## Exhibition Preparation

- [x] Prepare one Tourist account with several completed sample trips.
- [x] Prepare one Tourism Administrator account.
- [x] Seed several Cultural, Nature and Urban destinations.
- [x] Prepare movement records for K-Means.
- [x] Prepare labelled records for Decision Tree testing.
- [x] Prepare one insufficient-data example.
- [x] Prepare at least one recommendation result for each Tourist Category.
- [x] Clearly label prepared records as demonstration data.
- [ ] Capture screenshots for login, registration, tracking, route map, history, recommendations, admin dashboard, AI result, destination management, Firebase Auth and Firestore records.

## Current Build Snapshot

- [x] The project already has a strong working prototype foundation.
- [x] The app already covers most of the technical DPP requirements in some form.
- [x] The tourist UX is improving but still needs to be simplified around the seven-page flow.
- [x] Firebase integration is active but still needs final testing and data-structure confirmation.
- [x] The next development focus should be scope trimming, navigation alignment and end-to-end demonstration reliability.
- [x] Report/evidence work should come after the app flow is stable.
