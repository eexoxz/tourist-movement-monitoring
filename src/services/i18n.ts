export type Locale = "en" | "ms" | "zh" | "ja" | "ko" | "pt" | "ta" | "es" | "fr";

export type TranslationKey =
  | "language.label"
  | "language.english"
  | "language.malay"
  | "language.chinese"
  | "language.japanese"
  | "language.korean"
  | "language.portuguese"
  | "language.tamil"
  | "language.spanish"
  | "language.french"
  | "brand.title"
  | "brand.subtitle"
  | "nav.home"
  | "nav.trips"
  | "nav.places"
  | "nav.events"
  | "nav.dashboard"
  | "nav.destinations"
  | "nav.profile"
  | "nav.adminRole"
  | "nav.exportData"
  | "nav.resetDemo"
  | "nav.logout"
  | "sync.retrying"
  | "sync.retry"
  | "auth.title"
  | "auth.description"
  | "auth.mode"
  | "auth.login"
  | "auth.register"
  | "auth.demoRole"
  | "auth.firebaseMode"
  | "auth.name"
  | "auth.email"
  | "auth.password"
  | "auth.confirmPassword"
  | "auth.nationality"
  | "auth.selectNationality"
  | "auth.passportNumber"
  | "auth.passportHint"
  | "auth.privacyTitle"
  | "auth.privacyBody"
  | "auth.privacyAgreement"
  | "auth.rememberLogin"
  | "auth.checkingAccess"
  | "auth.enterSystem"
  | "auth.createAccount"
  | "auth.resendVerification"
  | "auth.forgotPassword"
  | "auth.createTouristAccount"
  | "auth.alreadyHaveAccount"
  | "auth.showPassword"
  | "auth.hidePassword"
  | "common.tourist"
  | "common.refresh"
  | "common.save"
  | "common.edit"
  | "common.complete"
  | "common.checkEvents"
  | "common.viewAll"
  | "common.viewTrips"
  | "common.active"
  | "common.completed"
  | "common.notStarted"
  | "common.waiting"
  | "common.justNow"
  | "common.privacy"
  | "common.category"
  | "common.address"
  | "common.demand"
  | "common.distance"
  | "common.averageVisit"
  | "common.openingHours"
  | "common.feeNote"
  | "common.minutes"
  | "common.points"
  | "common.stops"
  | "common.noSignalYet"
  | "common.checkLocally"
  | "common.feeMayVary"
  | "category.cultural"
  | "category.nature"
  | "category.urban"
  | "category.heritage"
  | "category.food"
  | "category.coastal"
  | "profile.option.relaxed"
  | "profile.option.balanced"
  | "profile.option.packed"
  | "profile.option.solo"
  | "profile.option.partner"
  | "profile.option.family"
  | "profile.option.friends"
  | "profile.option.noPreference"
  | "profile.option.lowWalking"
  | "profile.option.wheelchair"
  | "tourist.profile.pageTitle"
  | "tourist.profile.setupPageTitle"
  | "tourist.profile.formTitle"
  | "tourist.profile.formDescription"
  | "tourist.profile.setupTitle"
  | "tourist.profile.setupDescription"
  | "tourist.profile.saveProfile"
  | "tourist.profile.skipForNow"
  | "tourist.home.planTitle"
  | "tourist.home.welcomeBack"
  | "tourist.home.activeTripTitle"
  | "tourist.home.readyNextTripTitle"
  | "tourist.home.firstTripTitle"
  | "tourist.home.activeTripDescription"
  | "tourist.home.readyNextTripDescription"
  | "tourist.home.firstTripDescription"
  | "tourist.home.locationAllowed"
  | "tourist.home.allowLocation"
  | "tourist.home.locationAllowedText"
  | "tourist.home.locationNeededText"
  | "tourist.home.startTrip"
  | "tourist.home.stopTrip"
  | "tourist.home.resumeTracking"
  | "tourist.home.addDemoPoint"
  | "tourist.home.addSampleRoute"
  | "tourist.home.tryLocationAgain"
  | "tourist.home.howItWorks"
  | "tourist.home.stepAllowLocation"
  | "tourist.home.stepStartTrip"
  | "tourist.home.stepStopTrip"
  | "tourist.geofence.eyebrow"
  | "tourist.geofence.title"
  | "tourist.geofence.description"
  | "tourist.checkin.eyebrow"
  | "tourist.checkin.activeTitlePrefix"
  | "tourist.checkin.emptyTitle"
  | "tourist.checkin.activeDescription"
  | "tourist.checkin.emptyDescription"
  | "tourist.checkin.attraction"
  | "tourist.checkin.checkIn"
  | "tourist.checkin.useNearest"
  | "tourist.checkin.checkOut"
  | "tourist.checkin.emptyHistory"
  | "tourist.safety.eyebrow"
  | "tourist.safety.title"
  | "tourist.safety.description"
  | "tourist.safety.open"
  | "tourist.safety.emergencyContact"
  | "tourist.safety.notAdded"
  | "tourist.safety.addInProfile"
  | "tourist.safety.editContact"
  | "tourist.safety.sos"
  | "tourist.safety.prototypeNote"
  | "tourist.safety.incidentType"
  | "tourist.safety.locationNote"
  | "tourist.safety.locationPlaceholder"
  | "tourist.safety.whatHappened"
  | "tourist.safety.descriptionPlaceholder"
  | "tourist.safety.submitIncident"
  | "tourist.safety.noRequests"
  | "tourist.metrics.tripStatus"
  | "tourist.metrics.savedPoints"
  | "tourist.metrics.latestCategory"
  | "tourist.metrics.distance"
  | "tourist.profile.summaryTitle"
  | "tourist.profile.summaryDescription"
  | "tourist.profile.name"
  | "tourist.profile.interests"
  | "tourist.profile.pace"
  | "tourist.profile.emergencyContact"
  | "tourist.profile.notSetYet"
  | "tourist.profile.personalSetup"
  | "tourist.profile.preferredName"
  | "tourist.profile.preferredNamePlaceholder"
  | "tourist.profile.preferencesLegend"
  | "tourist.profile.travelPace"
  | "tourist.profile.travellingWith"
  | "tourist.profile.walkingPreference"
  | "tourist.profile.emergencyDescription"
  | "tourist.profile.contactName"
  | "tourist.profile.contactNamePlaceholder"
  | "tourist.profile.contactPhone"
  | "tourist.profile.contactPhonePlaceholder"
  | "tourist.profile.relationship"
  | "tourist.profile.relationshipPlaceholder"
  | "tourist.checkin.unknownAttraction"
  | "tourist.checkin.minVisit"
  | "tourist.checkin.currentlyCheckedIn"
  | "tourist.completed.title"
  | "tourist.completed.started"
  | "tourist.completed.ended"
  | "tourist.completed.duration"
  | "tourist.completed.movementPoints"
  | "tourist.completed.recognisedStops"
  | "tourist.completed.analysisStatus"
  | "tourist.completed.analysisComplete"
  | "tourist.completed.analysisReady"
  | "tourist.completed.analysisNeedsPoints"
  | "tourist.completed.noNearbyDestination"
  | "tourist.completed.viewHistory"
  | "tourist.completed.viewRecommendations"
  | "tourist.trips.pageTitle"
  | "tourist.trips.routeHistory"
  | "tourist.trips.heroTitle"
  | "tourist.trips.heroDescription"
  | "tourist.trips.kmRecorded"
  | "tourist.trips.stopsFound"
  | "tourist.trips.selectedRoute"
  | "tourist.trips.noTripSelected"
  | "tourist.trips.currentTripTitle"
  | "tourist.trips.malaysiaTripTitle"
  | "tourist.trips.tripSuffix"
  | "tourist.trips.keepRecording"
  | "tourist.trips.ready"
  | "tourist.trips.refresh"
  | "tourist.trips.insightRecording"
  | "tourist.trips.insightKnownRoute"
  | "tourist.trips.insightSavedRoute"
  | "tourist.trips.kmTravelled"
  | "tourist.trips.minSpent"
  | "tourist.trips.placesNoticed"
  | "tourist.trips.suggestions"
  | "tourist.trips.noSavedDestination"
  | "tourist.trips.guidanceTitle"
  | "tourist.trips.guidanceText"
  | "tourist.trips.findPlaces"
  | "tourist.trips.personalizedNext"
  | "tourist.trips.basicNext"
  | "tourist.trips.needTripForRecommendations"
  | "tourist.trips.emptyHistory"
  | "tourist.trips.savedTrips"
  | "tourist.trips.pickRoute"
  | "tourist.trips.pickRouteDescription"
  | "tourist.trips.completedTrip"
  | "tourist.trips.activeTrip"
  | "tourist.trips.stillActive"
  | "tourist.trips.firstEntry"
  | "tourist.home.recommendationsPersonalized"
  | "tourist.home.recommendationsBasic"
  | "tourist.home.recommendationsPersonalizedText"
  | "tourist.home.recommendationsBasicText"
  | "tourist.home.recentTrip"
  | "tourist.home.popularRightNow"
  | "tourist.home.destinationInfo"
  | "tourist.places.profileTraveller"
  | "tourist.places.discoveryMode"
  | "tourist.places.mode.bestMatch"
  | "tourist.places.mode.trending"
  | "tourist.places.mode.nearMe"
  | "tourist.places.mode.eventLinked"
  | "tourist.places.mode.quieter"
  | "tourist.places.heroTitle"
  | "tourist.places.heroDescription"
  | "tourist.places.placesShown"
  | "tourist.places.withDemand"
  | "tourist.places.eventSignals"
  | "tourist.places.basicModeTitle"
  | "tourist.places.basicModeDescription"
  | "tourist.places.searchLabel"
  | "tourist.places.searchPlaceholder"
  | "tourist.places.allCategories"
  | "tourist.places.area"
  | "tourist.places.allMalaysia"
  | "tourist.places.fit"
  | "tourist.places.locationNotActive"
  | "tourist.places.mAway"
  | "tourist.places.kmAway"
  | "tourist.places.quietSignal"
  | "tourist.places.eventLinked"
  | "tourist.places.visited"
  | "tourist.places.newToYou"
  | "tourist.places.noMatches"
  | "tourist.places.tripFit"
  | "tourist.places.matchesProfile"
  | "tourist.places.differentStyle"
  | "tourist.places.eventRelevance"
  | "tourist.places.linkedUpcoming"
  | "tourist.places.noCurrentEvent"
  | "tourist.places.beforeYouGo"
  | "tourist.places.insightRecommendationFallback"
  | "tourist.places.insightEventDemand"
  | "tourist.places.insightEvent"
  | "tourist.places.insightDemand"
  | "tourist.places.insightPreference"
  | "tourist.places.insightVisited"
  | "tourist.places.insightQuiet"
  | "tourist.recommendations.emptyPersonalized"
  | "tourist.recommendations.emptyBasic"
  | "tourist.recommendations.basicSuggestion"
  | "tourist.recommendations.noDemandSignal"
  | "tourist.recommendations.movementScore"
  | "tourist.recommendations.profile"
  | "tourist.recommendations.basicFit"
  | "tourist.recommendations.aiClusterPending"
  | "tourist.recommendations.newPlace"
  | "tourist.recommendations.score"
  | "tourist.recommendations.viewDestination"
  | "tourist.events.planningWindow"
  | "tourist.events.next12Months"
  | "tourist.events.malaysiaFocus"
  | "tourist.events.eventSignals"
  | "tourist.events.pageDescription"
  | "tourist.events.calendarTitle"
  | "tourist.events.upcomingSignals"
  | "tourist.events.state"
  | "tourist.events.allMalaysia"
  | "tourist.events.showFull"
  | "tourist.events.showFewer"
  | "tourist.events.noMatches"
  | "tourist.recommendations.pageTitle"
  | "tourist.events.pageTitle";

const STORAGE_KEY = "tourist-movement-monitoring:locale";

export const localeOptions: Array<{ value: Locale; labelKey: TranslationKey }> = [
  { value: "en", labelKey: "language.english" },
  { value: "ms", labelKey: "language.malay" },
  { value: "zh", labelKey: "language.chinese" },
  { value: "ja", labelKey: "language.japanese" },
  { value: "ko", labelKey: "language.korean" },
  { value: "pt", labelKey: "language.portuguese" },
  { value: "ta", labelKey: "language.tamil" },
  { value: "es", labelKey: "language.spanish" },
  { value: "fr", labelKey: "language.french" },
];

const translations: Record<Locale, Partial<Record<TranslationKey, string>>> = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.malay": "Malay",
    "language.chinese": "Chinese",
    "language.japanese": "Japanese",
    "language.korean": "Korean",
    "language.portuguese": "Portuguese",
    "language.tamil": "Tamil",
    "language.spanish": "Spanish",
    "language.french": "French",
    "brand.title": "Tourist Movement",
    "brand.subtitle": "Monitoring",
    "nav.home": "Home",
    "nav.trips": "Trips",
    "nav.places": "Places",
    "nav.events": "Event Calendar",
    "nav.dashboard": "Dashboard",
    "nav.destinations": "Destinations",
    "nav.profile": "Travel profile",
    "nav.adminRole": "Tourism Administrator",
    "nav.exportData": "Export data",
    "nav.resetDemo": "Reset demo",
    "nav.logout": "Logout",
    "sync.retrying": "Retrying",
    "sync.retry": "Retry sync",
    "auth.title": "Smart Tourist Movement Monitoring",
    "auth.description": "Consent-based trip tracking, route visualization, dashboard monitoring, and explainable destination recommendations for selected Malaysian tourist locations.",
    "auth.mode": "Authentication mode",
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.demoRole": "Demo role",
    "auth.firebaseMode": "Firebase mode is active. Use a registered and verified Firebase account.",
    "auth.name": "Name",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.nationality": "Nationality",
    "auth.selectNationality": "Select nationality",
    "auth.passportNumber": "Passport Number",
    "auth.passportHint": "Use 5 to 20 letters or numbers, for example A12345678.",
    "auth.privacyTitle": "Data privacy and tourist safety",
    "auth.privacyBody": "The app stores your profile, consent choice, trip route points and recommendation results so tourism administrators can monitor movement trends. Passport and nationality details are kept with your account for identity support if assistance is needed during a recorded trip.",
    "auth.privacyAgreement": "I agree to consent-based location tracking and account data storage.",
    "auth.rememberLogin": "Remember login on this device",
    "auth.checkingAccess": "Checking access",
    "auth.enterSystem": "Enter system",
    "auth.createAccount": "Create tourist account",
    "auth.resendVerification": "Resend verification email",
    "auth.forgotPassword": "Forgot password",
    "auth.createTouristAccount": "Create Tourist Account",
    "auth.alreadyHaveAccount": "Already have an account? Login",
    "auth.showPassword": "Show password",
    "auth.hidePassword": "Hide password",
    "common.tourist": "Tourist",
    "common.refresh": "Refresh",
    "common.save": "Save",
    "common.edit": "Edit",
    "common.complete": "Complete",
    "common.checkEvents": "Check events",
    "common.viewAll": "View all",
    "common.viewTrips": "View trips",
    "common.active": "Active",
    "common.completed": "Completed",
    "common.notStarted": "Not Started",
    "common.waiting": "Waiting",
    "common.justNow": "Just now",
    "common.privacy": "Privacy",
    "common.category": "Category",
    "common.address": "Address",
    "common.demand": "Demand",
    "common.distance": "Distance",
    "common.averageVisit": "Average visit",
    "common.openingHours": "Opening hours",
    "common.feeNote": "Fee note",
    "common.minutes": "minutes",
    "common.points": "points",
    "common.stops": "stops",
    "common.noSignalYet": "No signal yet",
    "common.checkLocally": "Check locally before visiting.",
    "common.feeMayVary": "Fee information may vary.",
    "category.cultural": "Culture",
    "category.nature": "Nature",
    "category.urban": "City spots",
    "category.heritage": "Heritage",
    "category.food": "Food",
    "category.coastal": "Coastal",
    "profile.option.relaxed": "Relaxed",
    "profile.option.balanced": "Balanced",
    "profile.option.packed": "Packed schedule",
    "profile.option.solo": "Solo",
    "profile.option.partner": "Partner",
    "profile.option.family": "Family",
    "profile.option.friends": "Friends",
    "profile.option.noPreference": "No special preference",
    "profile.option.lowWalking": "Prefer less walking",
    "profile.option.wheelchair": "Prefer wheelchair-friendly places",
    "tourist.profile.pageTitle": "Travel Profile",
    "tourist.profile.setupPageTitle": "Set Up Your Travel Profile",
    "tourist.profile.formTitle": "Travel Preferences",
    "tourist.profile.formDescription": "Update the details used to personalise your trip suggestions.",
    "tourist.profile.setupTitle": "Make the app feel like yours",
    "tourist.profile.setupDescription": "Add your travel style so recommendations are useful from the start. You can skip this and change it later.",
    "tourist.profile.saveProfile": "Save profile",
    "tourist.profile.skipForNow": "Skip for now",
    "tourist.home.planTitle": "Plan Your Visit",
    "tourist.home.welcomeBack": "Welcome back",
    "tourist.home.activeTripTitle": "Your trip is being recorded",
    "tourist.home.readyNextTripTitle": "Ready for your next trip",
    "tourist.home.firstTripTitle": "Start your first tracked trip",
    "tourist.home.activeTripDescription": "Keep this page open while your trip is being recorded.",
    "tourist.home.readyNextTripDescription": "Use Home when you are ready to record another route.",
    "tourist.home.firstTripDescription": "Allow location, start a trip, and the app will use your route to improve recommendations.",
    "tourist.home.locationAllowed": "Location is allowed",
    "tourist.home.allowLocation": "Allow location first",
    "tourist.home.locationAllowedText": "You can start a trip whenever you are ready.",
    "tourist.home.locationNeededText": "Location is requested only when you choose to record a trip.",
    "tourist.home.startTrip": "Start Trip",
    "tourist.home.stopTrip": "Stop Trip",
    "tourist.home.resumeTracking": "Resume tracking",
    "tourist.home.addDemoPoint": "Add demo movement point",
    "tourist.home.addSampleRoute": "Add sample Malaysia route",
    "tourist.home.tryLocationAgain": "Try location again",
    "tourist.home.howItWorks": "How it works",
    "tourist.home.stepAllowLocation": "Allow location when you are ready to record.",
    "tourist.home.stepStartTrip": "Start a trip and keep this page open.",
    "tourist.home.stepStopTrip": "Stop the trip to update your travel category and recommendations.",
    "tourist.geofence.eyebrow": "Area guidance",
    "tourist.geofence.title": "Useful notice near you",
    "tourist.geofence.description": "These notices use local monitoring zones and your latest saved trip point.",
    "tourist.checkin.eyebrow": "Attraction visit",
    "tourist.checkin.activeTitlePrefix": "Checked in at",
    "tourist.checkin.emptyTitle": "Check in when you arrive",
    "tourist.checkin.activeDescription": "Check out when you leave so the visit duration can be recorded.",
    "tourist.checkin.emptyDescription": "This adds a clear attraction visit record alongside your movement route.",
    "tourist.checkin.attraction": "Attraction",
    "tourist.checkin.checkIn": "Check in",
    "tourist.checkin.useNearest": "Use nearest place",
    "tourist.checkin.checkOut": "Check out",
    "tourist.checkin.emptyHistory": "No attraction check-ins yet.",
    "tourist.safety.eyebrow": "Safety support",
    "tourist.safety.title": "Need help during a trip?",
    "tourist.safety.description": "Record an SOS or incident report for tourism administrators to review in this prototype.",
    "tourist.safety.open": "open",
    "tourist.safety.emergencyContact": "Emergency contact",
    "tourist.safety.notAdded": "Not added yet",
    "tourist.safety.addInProfile": "Add this in Travel Profile",
    "tourist.safety.editContact": "Edit contact",
    "tourist.safety.sos": "Send SOS Request",
    "tourist.safety.prototypeNote": "Prototype note: this saves an assistance request for the administrator dashboard. In real danger, call local emergency services immediately.",
    "tourist.safety.incidentType": "Incident type",
    "tourist.safety.locationNote": "Location note",
    "tourist.safety.locationPlaceholder": "Example: near entrance gate",
    "tourist.safety.whatHappened": "What happened?",
    "tourist.safety.descriptionPlaceholder": "Briefly describe the issue.",
    "tourist.safety.submitIncident": "Submit incident report",
    "tourist.safety.noRequests": "No safety requests submitted yet.",
    "tourist.metrics.tripStatus": "Trip status",
    "tourist.metrics.savedPoints": "Saved points",
    "tourist.metrics.latestCategory": "Latest category",
    "tourist.metrics.distance": "Distance",
    "tourist.profile.summaryTitle": "Travel Profile",
    "tourist.profile.summaryDescription": "Your preferences give the app a starting point before movement history becomes strong enough for AI recommendations.",
    "tourist.profile.name": "Name",
    "tourist.profile.interests": "Interests",
    "tourist.profile.pace": "Pace",
    "tourist.profile.emergencyContact": "Emergency contact",
    "tourist.profile.notSetYet": "Not set yet",
    "tourist.profile.personalSetup": "Personal setup",
    "tourist.profile.preferredName": "Preferred name",
    "tourist.profile.preferredNamePlaceholder": "What should the app call you?",
    "tourist.profile.preferencesLegend": "What kind of places do you like?",
    "tourist.profile.travelPace": "Travel pace",
    "tourist.profile.travellingWith": "Travelling with",
    "tourist.profile.walkingPreference": "Walking preference",
    "tourist.profile.emergencyDescription": "Optional, but useful if the tourist submits an SOS or incident report.",
    "tourist.profile.contactName": "Contact name",
    "tourist.profile.contactNamePlaceholder": "Example: Nur Aisyah",
    "tourist.profile.contactPhone": "Contact phone",
    "tourist.profile.contactPhonePlaceholder": "Example: +60123456789",
    "tourist.profile.relationship": "Relationship",
    "tourist.profile.relationshipPlaceholder": "Example: Parent, spouse, friend",
    "tourist.checkin.unknownAttraction": "Unknown attraction",
    "tourist.checkin.minVisit": "min visit",
    "tourist.checkin.currentlyCheckedIn": "Currently checked in",
    "tourist.completed.title": "Completed Trip",
    "tourist.completed.started": "Started",
    "tourist.completed.ended": "Ended",
    "tourist.completed.duration": "Duration",
    "tourist.completed.movementPoints": "Movement points",
    "tourist.completed.recognisedStops": "Recognised stops",
    "tourist.completed.analysisStatus": "Analysis status",
    "tourist.completed.analysisComplete": "Complete",
    "tourist.completed.analysisReady": "Ready to refresh",
    "tourist.completed.analysisNeedsPoints": "Needs at least 2 movement points",
    "tourist.completed.noNearbyDestination": "No nearby saved destination was recognised for this trip yet.",
    "tourist.completed.viewHistory": "View Trip History",
    "tourist.completed.viewRecommendations": "View Recommendations",
    "tourist.trips.pageTitle": "Trip Diary",
    "tourist.trips.routeHistory": "Route history",
    "tourist.trips.heroTitle": "See what each trip taught the app.",
    "tourist.trips.heroDescription": "Your saved movement becomes a simple route story, recognised stops and recommendation learning instead of raw tracking records.",
    "tourist.trips.kmRecorded": "km recorded",
    "tourist.trips.stopsFound": "Stops found",
    "tourist.trips.selectedRoute": "Selected route",
    "tourist.trips.noTripSelected": "No trip selected",
    "tourist.trips.currentTripTitle": "Current trip",
    "tourist.trips.malaysiaTripTitle": "Malaysia trip",
    "tourist.trips.tripSuffix": "trip",
    "tourist.trips.keepRecording": "Keep recording",
    "tourist.trips.ready": "Ready",
    "tourist.trips.refresh": "Refresh",
    "tourist.trips.insightRecording": "Keep this trip recording while you move around. Once there is a little more activity, the app can suggest places that better fit your route.",
    "tourist.trips.insightKnownRoute": "Use this trip to find similar places nearby and compare where visitor movement is forming next.",
    "tourist.trips.insightSavedRoute": "Your route is saved. Recommendations will become more useful as your trip gets closer to known Malaysian attractions and active visitor areas.",
    "tourist.trips.kmTravelled": "km travelled",
    "tourist.trips.minSpent": "min spent",
    "tourist.trips.placesNoticed": "places noticed",
    "tourist.trips.suggestions": "suggestions",
    "tourist.trips.noSavedDestination": "No saved destination was close enough to this route yet.",
    "tourist.trips.guidanceTitle": "What this trip is useful for",
    "tourist.trips.guidanceText": "It helps the app compare real visitor movement around Malaysia, then turn that activity into place suggestions instead of relying only on ratings.",
    "tourist.trips.findPlaces": "Find places from this trip",
    "tourist.trips.personalizedNext": "Places you may want next",
    "tourist.trips.basicNext": "Places to try next",
    "tourist.trips.needTripForRecommendations": "Complete a trip with enough movement data to generate recommendations.",
    "tourist.trips.emptyHistory": "Your saved trips will appear here after you start tracking.",
    "tourist.trips.savedTrips": "Saved trips",
    "tourist.trips.pickRoute": "Pick a route",
    "tourist.trips.pickRouteDescription": "Select a trip to inspect its map, stops and recommendation learning.",
    "tourist.trips.completedTrip": "Completed trip",
    "tourist.trips.activeTrip": "Active trip",
    "tourist.trips.stillActive": "Trip still active",
    "tourist.trips.firstEntry": "Start tracking or add a sample Malaysia route to create your first trip diary entry.",
    "tourist.home.recommendationsPersonalized": "Recommended For You",
    "tourist.home.recommendationsBasic": "Basic Suggestions",
    "tourist.home.recommendationsPersonalizedText": "These places use your latest movement pattern, tourist category and unvisited destination list.",
    "tourist.home.recommendationsBasicText": "These are general suggestions from destination demand and your current location until a completed trip creates an AI result.",
    "tourist.home.recentTrip": "Recent Trip",
    "tourist.home.popularRightNow": "Popular Right Now",
    "tourist.home.destinationInfo": "Destination Info",
    "tourist.places.profileTraveller": "traveller",
    "tourist.places.discoveryMode": "Discovery mode",
    "tourist.places.mode.bestMatch": "Best match",
    "tourist.places.mode.trending": "Trending",
    "tourist.places.mode.nearMe": "Near me",
    "tourist.places.mode.eventLinked": "Event-linked",
    "tourist.places.mode.quieter": "Quieter picks",
    "tourist.places.heroTitle": "Find places that match your trip right now.",
    "tourist.places.heroDescription": "Browse destinations using movement demand, your travel style, event timing and your latest route instead of only static ratings.",
    "tourist.places.placesShown": "places shown",
    "tourist.places.withDemand": "with demand",
    "tourist.places.eventSignals": "event signals",
    "tourist.places.basicModeTitle": "Basic suggestion mode",
    "tourist.places.basicModeDescription": "Complete a tracked trip to unlock AI personalisation. Until then, Places still uses demand, profile preferences and event signals for browsing.",
    "tourist.places.searchLabel": "Search places",
    "tourist.places.searchPlaceholder": "Search by place, state, address or interest",
    "tourist.places.allCategories": "All categories",
    "tourist.places.area": "Area",
    "tourist.places.allMalaysia": "All Malaysia",
    "tourist.places.fit": "fit",
    "tourist.places.locationNotActive": "Location not active",
    "tourist.places.mAway": "m away",
    "tourist.places.kmAway": "km away",
    "tourist.places.quietSignal": "quiet signal",
    "tourist.places.eventLinked": "event-linked",
    "tourist.places.visited": "visited",
    "tourist.places.newToYou": "new to you",
    "tourist.places.noMatches": "No places match these filters yet. Try another category, area or discovery mode.",
    "tourist.places.tripFit": "Trip fit",
    "tourist.places.matchesProfile": "Matches your profile",
    "tourist.places.differentStyle": "Different from your usual style",
    "tourist.places.eventRelevance": "Event relevance",
    "tourist.places.linkedUpcoming": "Linked to upcoming calendar signals",
    "tourist.places.noCurrentEvent": "No current event link",
    "tourist.places.beforeYouGo": "Before you go",
    "tourist.places.insightRecommendationFallback": "This place is recommended from your latest trip pattern.",
    "tourist.places.insightEventDemand": "Upcoming event signals and current tourist movement both point toward this area.",
    "tourist.places.insightEvent": "Upcoming calendar events may bring more visitors to this place or nearby routes.",
    "tourist.places.insightDemand": "Tourist movement is already forming around this destination, so it is useful for route planning.",
    "tourist.places.insightPreference": "This matches your travel style and gives you a new place to explore.",
    "tourist.places.insightVisited": "You have visited this before, so it is better for revisits or comparing with nearby alternatives.",
    "tourist.places.insightQuiet": "A quieter option that can help balance the trip if busy places feel too crowded.",
    "tourist.recommendations.emptyPersonalized": "Complete another trip to unlock stronger personalised recommendations.",
    "tourist.recommendations.emptyBasic": "No basic suggestions are available yet.",
    "tourist.recommendations.basicSuggestion": "Basic suggestion",
    "tourist.recommendations.noDemandSignal": "No demand signal",
    "tourist.recommendations.movementScore": "movement score",
    "tourist.recommendations.profile": "Profile",
    "tourist.recommendations.basicFit": "Basic fit",
    "tourist.recommendations.aiClusterPending": "AI cluster pending",
    "tourist.recommendations.newPlace": "New",
    "tourist.recommendations.score": "Score",
    "tourist.recommendations.viewDestination": "View Destination",
    "tourist.events.planningWindow": "Planning window",
    "tourist.events.next12Months": "Next 12 months",
    "tourist.events.malaysiaFocus": "Malaysia focus",
    "tourist.events.eventSignals": "event signals",
    "tourist.events.pageDescription": "Use these public holidays and tourism events as context for where tourist movement may increase. Past one-time events are hidden automatically, and annual dates roll forward from the day you open the app.",
    "tourist.events.calendarTitle": "Malaysia Festival Calendar",
    "tourist.events.upcomingSignals": "upcoming signal(s)",
    "tourist.events.state": "State",
    "tourist.events.allMalaysia": "All Malaysia",
    "tourist.events.showFull": "Show full 12-month calendar",
    "tourist.events.showFewer": "Show fewer events",
    "tourist.events.noMatches": "No festival planning signals match this state inside the current date range.",
    "tourist.recommendations.pageTitle": "Explore Places",
    "tourist.events.pageTitle": "Event Calendar",
  },
  ms: {
    "language.label": "Bahasa",
    "language.english": "English",
    "language.malay": "Bahasa Melayu",
    "language.chinese": "Bahasa Cina",
    "language.japanese": "Bahasa Jepun",
    "language.korean": "Bahasa Korea",
    "language.portuguese": "Bahasa Portugis",
    "language.tamil": "Bahasa Tamil",
    "language.spanish": "Bahasa Sepanyol",
    "language.french": "Bahasa Perancis",
    "brand.title": "Pergerakan Pelancong",
    "brand.subtitle": "Pemantauan",
    "nav.home": "Utama",
    "nav.trips": "Perjalanan",
    "nav.places": "Tempat",
    "nav.events": "Kalendar Acara",
    "nav.dashboard": "Papan Pemuka",
    "nav.destinations": "Destinasi",
    "nav.profile": "Profil perjalanan",
    "nav.adminRole": "Pentadbir Pelancongan",
    "nav.exportData": "Eksport data",
    "nav.resetDemo": "Tetap semula demo",
    "nav.logout": "Log keluar",
    "sync.retrying": "Mencuba semula",
    "sync.retry": "Cuba segerak",
    "auth.title": "Pemantauan Pergerakan Pelancong Pintar",
    "auth.description": "Penjejakan perjalanan berasaskan persetujuan, visualisasi laluan, pemantauan papan pemuka dan cadangan destinasi untuk lokasi pelancongan terpilih di Malaysia.",
    "auth.mode": "Mod pengesahan",
    "auth.login": "Log masuk",
    "auth.register": "Daftar",
    "auth.demoRole": "Peranan demo",
    "auth.firebaseMode": "Mod Firebase aktif. Gunakan akaun Firebase yang telah didaftarkan dan disahkan.",
    "auth.name": "Nama",
    "auth.email": "E-mel",
    "auth.password": "Kata laluan",
    "auth.confirmPassword": "Sahkan kata laluan",
    "auth.nationality": "Kewarganegaraan",
    "auth.selectNationality": "Pilih kewarganegaraan",
    "auth.passportNumber": "Nombor Pasport",
    "auth.passportHint": "Gunakan 5 hingga 20 huruf atau nombor, contohnya A12345678.",
    "auth.privacyTitle": "Privasi data dan keselamatan pelancong",
    "auth.privacyBody": "Aplikasi menyimpan profil, pilihan persetujuan, titik laluan perjalanan dan keputusan cadangan supaya pentadbir pelancongan boleh memantau trend pergerakan. Butiran pasport dan kewarganegaraan disimpan bersama akaun untuk sokongan identiti jika bantuan diperlukan semasa perjalanan direkodkan.",
    "auth.privacyAgreement": "Saya bersetuju dengan penjejakan lokasi berasaskan persetujuan dan penyimpanan data akaun.",
    "auth.rememberLogin": "Ingat log masuk pada peranti ini",
    "auth.checkingAccess": "Menyemak akses",
    "auth.enterSystem": "Masuk sistem",
    "auth.createAccount": "Cipta akaun pelancong",
    "auth.resendVerification": "Hantar semula e-mel pengesahan",
    "auth.forgotPassword": "Lupa kata laluan",
    "auth.createTouristAccount": "Cipta Akaun Pelancong",
    "auth.alreadyHaveAccount": "Sudah ada akaun? Log masuk",
    "auth.showPassword": "Papar kata laluan",
    "auth.hidePassword": "Sembunyi kata laluan",
  },
  zh: {
    "language.label": "语言",
    "language.english": "英语",
    "language.malay": "马来语",
    "language.chinese": "中文",
    "language.japanese": "日语",
    "language.korean": "韩语",
    "language.portuguese": "葡萄牙语",
    "language.tamil": "泰米尔语",
    "language.spanish": "西班牙语",
    "language.french": "法语",
    "brand.title": "游客流动",
    "brand.subtitle": "监测",
    "nav.home": "首页",
    "nav.trips": "行程",
    "nav.places": "地点",
    "nav.events": "活动日历",
    "nav.dashboard": "仪表板",
    "nav.destinations": "目的地",
    "nav.profile": "旅行档案",
    "nav.adminRole": "旅游管理员",
    "nav.exportData": "导出数据",
    "nav.resetDemo": "重置演示",
    "nav.logout": "退出登录",
    "sync.retrying": "重试中",
    "sync.retry": "重新同步",
    "auth.title": "智能游客流动监测",
    "auth.description": "基于同意的行程追踪、路线可视化、管理仪表板，以及针对马来西亚精选旅游地点的可解释推荐。",
    "auth.mode": "认证模式",
    "auth.login": "登录",
    "auth.register": "注册",
    "auth.demoRole": "演示角色",
    "auth.firebaseMode": "Firebase 模式已启用。请使用已注册并验证的 Firebase 账号。",
    "auth.name": "姓名",
    "auth.email": "电子邮件",
    "auth.password": "密码",
    "auth.confirmPassword": "确认密码",
    "auth.nationality": "国籍",
    "auth.selectNationality": "选择国籍",
    "auth.passportNumber": "护照号码",
    "auth.passportHint": "请输入 5 至 20 个字母或数字，例如 A12345678。",
    "auth.privacyTitle": "数据隐私与游客安全",
    "auth.privacyBody": "应用会储存你的档案、同意选择、行程位置点和推荐结果，方便旅游管理员观察游客流动趋势。护照和国籍资料会与账号一起保存，以便记录行程期间需要协助时进行身份支持。",
    "auth.privacyAgreement": "我同意基于同意的位置追踪和账号数据储存。",
    "auth.rememberLogin": "在此设备记住登录资料",
    "auth.checkingAccess": "正在检查访问权限",
    "auth.enterSystem": "进入系统",
    "auth.createAccount": "创建游客账号",
    "auth.resendVerification": "重新发送验证邮件",
    "auth.forgotPassword": "忘记密码",
    "auth.createTouristAccount": "创建游客账号",
    "auth.alreadyHaveAccount": "已有账号？登录",
    "auth.showPassword": "显示密码",
    "auth.hidePassword": "隐藏密码",
  },
  ja: {
    "language.label": "言語",
    "language.english": "英語",
    "language.malay": "マレー語",
    "language.chinese": "中国語",
    "language.japanese": "日本語",
    "language.korean": "韓国語",
    "language.portuguese": "ポルトガル語",
    "language.tamil": "タミル語",
    "language.spanish": "スペイン語",
    "language.french": "フランス語",
    "brand.title": "観光客の移動",
    "brand.subtitle": "モニタリング",
    "nav.home": "ホーム",
    "nav.trips": "旅程",
    "nav.places": "場所",
    "nav.events": "イベントカレンダー",
    "nav.dashboard": "ダッシュボード",
    "nav.destinations": "目的地",
    "nav.profile": "旅行プロフィール",
    "nav.adminRole": "観光管理者",
    "nav.exportData": "データを書き出す",
    "nav.resetDemo": "デモをリセット",
    "nav.logout": "ログアウト",
    "sync.retrying": "再試行中",
    "sync.retry": "同期を再試行",
    "auth.title": "スマート観光客移動モニタリング",
    "auth.description": "同意に基づく旅程追跡、ルート表示、管理ダッシュボード、マレーシアの選定観光地向けの説明可能な目的地推薦。",
    "auth.mode": "認証モード",
    "auth.login": "ログイン",
    "auth.register": "登録",
    "auth.demoRole": "デモ役割",
    "auth.firebaseMode": "Firebase モードが有効です。登録済みで確認済みの Firebase アカウントを使用してください。",
    "auth.name": "名前",
    "auth.email": "メール",
    "auth.password": "パスワード",
    "auth.confirmPassword": "パスワード確認",
    "auth.nationality": "国籍",
    "auth.selectNationality": "国籍を選択",
    "auth.passportNumber": "パスポート番号",
    "auth.passportHint": "5〜20文字の英数字を入力してください。例: A12345678。",
    "auth.privacyTitle": "データプライバシーと観光客の安全",
    "auth.privacyBody": "このアプリは、観光管理者が移動傾向を確認できるように、プロフィール、同意設定、旅程ルート地点、推薦結果を保存します。記録された旅行中に支援が必要な場合に備え、パスポートと国籍情報もアカウントに保存されます。",
    "auth.privacyAgreement": "同意に基づく位置追跡とアカウントデータ保存に同意します。",
    "auth.rememberLogin": "この端末でログイン情報を記憶する",
    "auth.checkingAccess": "アクセスを確認中",
    "auth.enterSystem": "システムに入る",
    "auth.createAccount": "観光客アカウントを作成",
    "auth.resendVerification": "確認メールを再送信",
    "auth.forgotPassword": "パスワードを忘れた場合",
    "auth.createTouristAccount": "観光客アカウントを作成",
    "auth.alreadyHaveAccount": "すでにアカウントがありますか？ログイン",
    "auth.showPassword": "パスワードを表示",
    "auth.hidePassword": "パスワードを非表示",
  },
  ko: {
    "language.label": "언어",
    "language.english": "영어",
    "language.malay": "말레이어",
    "language.chinese": "중국어",
    "language.japanese": "일본어",
    "language.korean": "한국어",
    "language.portuguese": "포르투갈어",
    "language.tamil": "타밀어",
    "language.spanish": "스페인어",
    "language.french": "프랑스어",
    "brand.title": "관광객 이동",
    "brand.subtitle": "모니터링",
    "nav.home": "홈",
    "nav.trips": "여행",
    "nav.places": "장소",
    "nav.events": "이벤트 캘린더",
    "nav.dashboard": "대시보드",
    "nav.destinations": "목적지",
    "nav.profile": "여행 프로필",
    "nav.adminRole": "관광 관리자",
    "nav.exportData": "데이터 내보내기",
    "nav.resetDemo": "데모 초기화",
    "nav.logout": "로그아웃",
    "sync.retrying": "다시 시도 중",
    "sync.retry": "동기화 재시도",
    "auth.title": "스마트 관광객 이동 모니터링",
    "auth.description": "동의 기반 여행 추적, 경로 시각화, 관리자 대시보드, 말레이시아 선정 관광지에 대한 설명 가능한 목적지 추천.",
    "auth.mode": "인증 모드",
    "auth.login": "로그인",
    "auth.register": "등록",
    "auth.demoRole": "데모 역할",
    "auth.firebaseMode": "Firebase 모드가 활성화되었습니다. 등록되고 인증된 Firebase 계정을 사용하세요.",
    "auth.name": "이름",
    "auth.email": "이메일",
    "auth.password": "비밀번호",
    "auth.confirmPassword": "비밀번호 확인",
    "auth.nationality": "국적",
    "auth.selectNationality": "국적 선택",
    "auth.passportNumber": "여권 번호",
    "auth.passportHint": "5~20자의 문자 또는 숫자를 입력하세요. 예: A12345678.",
    "auth.privacyTitle": "데이터 개인정보와 관광객 안전",
    "auth.privacyBody": "이 앱은 관광 관리자가 이동 추세를 모니터링할 수 있도록 프로필, 동의 선택, 여행 경로 지점 및 추천 결과를 저장합니다. 기록된 여행 중 도움이 필요한 경우 신원 지원을 위해 여권 및 국적 정보도 계정에 보관됩니다.",
    "auth.privacyAgreement": "동의 기반 위치 추적 및 계정 데이터 저장에 동의합니다.",
    "auth.rememberLogin": "이 기기에 로그인 정보 저장",
    "auth.checkingAccess": "접근 확인 중",
    "auth.enterSystem": "시스템 입장",
    "auth.createAccount": "관광객 계정 만들기",
    "auth.resendVerification": "인증 이메일 다시 보내기",
    "auth.forgotPassword": "비밀번호 찾기",
    "auth.createTouristAccount": "관광객 계정 만들기",
    "auth.alreadyHaveAccount": "이미 계정이 있나요? 로그인",
    "auth.showPassword": "비밀번호 표시",
    "auth.hidePassword": "비밀번호 숨기기",
  },
  pt: {
    "language.label": "Idioma",
    "language.english": "Inglês",
    "language.malay": "Malaio",
    "language.chinese": "Chinês",
    "language.japanese": "Japonês",
    "language.korean": "Coreano",
    "language.portuguese": "Português",
    "language.tamil": "Tâmil",
    "language.spanish": "Espanhol",
    "language.french": "Francês",
    "brand.title": "Movimento Turístico",
    "brand.subtitle": "Monitorização",
    "nav.home": "Início",
    "nav.trips": "Viagens",
    "nav.places": "Locais",
    "nav.events": "Calendário de Eventos",
    "nav.dashboard": "Painel",
    "nav.destinations": "Destinos",
    "nav.profile": "Perfil de viagem",
    "nav.adminRole": "Administrador de Turismo",
    "nav.exportData": "Exportar dados",
    "nav.resetDemo": "Repor demo",
    "nav.logout": "Sair",
    "sync.retrying": "A tentar novamente",
    "sync.retry": "Tentar sincronizar",
    "auth.title": "Monitorização Inteligente do Movimento Turístico",
    "auth.description": "Acompanhamento de viagens com consentimento, visualização de rotas, painel administrativo e recomendações explicáveis para locais turísticos selecionados na Malásia.",
    "auth.mode": "Modo de autenticação",
    "auth.login": "Iniciar sessão",
    "auth.register": "Registar",
    "auth.demoRole": "Função demo",
    "auth.firebaseMode": "O modo Firebase está ativo. Use uma conta Firebase registada e verificada.",
    "auth.name": "Nome",
    "auth.email": "Email",
    "auth.password": "Palavra-passe",
    "auth.confirmPassword": "Confirmar palavra-passe",
    "auth.nationality": "Nacionalidade",
    "auth.selectNationality": "Selecionar nacionalidade",
    "auth.passportNumber": "Número do passaporte",
    "auth.passportHint": "Use 5 a 20 letras ou números, por exemplo A12345678.",
    "auth.privacyTitle": "Privacidade dos dados e segurança do turista",
    "auth.privacyBody": "A aplicação guarda o seu perfil, escolha de consentimento, pontos da rota da viagem e resultados de recomendação para que administradores de turismo possam monitorizar tendências de movimento. Dados de passaporte e nacionalidade ficam guardados na conta para apoio de identidade se for necessária assistência durante uma viagem registada.",
    "auth.privacyAgreement": "Aceito o rastreio de localização com consentimento e o armazenamento dos dados da conta.",
    "auth.rememberLogin": "Guardar login neste dispositivo",
    "auth.checkingAccess": "A verificar acesso",
    "auth.enterSystem": "Entrar no sistema",
    "auth.createAccount": "Criar conta de turista",
    "auth.resendVerification": "Reenviar email de verificação",
    "auth.forgotPassword": "Esqueci-me da palavra-passe",
    "auth.createTouristAccount": "Criar Conta de Turista",
    "auth.alreadyHaveAccount": "Já tem conta? Iniciar sessão",
    "auth.showPassword": "Mostrar palavra-passe",
    "auth.hidePassword": "Ocultar palavra-passe",
  },
  ta: {
    "language.label": "மொழி",
    "language.english": "ஆங்கிலம்",
    "language.malay": "மலாய்",
    "language.chinese": "சீனம்",
    "language.japanese": "ஜப்பானியம்",
    "language.korean": "கொரியம்",
    "language.portuguese": "போர்த்துகீசியம்",
    "language.tamil": "தமிழ்",
    "language.spanish": "ஸ்பானிஷ்",
    "language.french": "பிரெஞ்சு",
    "brand.title": "சுற்றுலா பயணி நகர்வு",
    "brand.subtitle": "கண்காணிப்பு",
    "nav.home": "முகப்பு",
    "nav.trips": "பயணங்கள்",
    "nav.places": "இடங்கள்",
    "nav.events": "நிகழ்வு நாட்காட்டி",
    "nav.dashboard": "டாஷ்போர்டு",
    "nav.destinations": "இலக்குகள்",
    "nav.profile": "பயண சுயவிவரம்",
    "nav.adminRole": "சுற்றுலா நிர்வாகி",
    "nav.exportData": "தரவை ஏற்றுமதி செய்",
    "nav.resetDemo": "டெமோவை மீட்டமை",
    "nav.logout": "வெளியேறு",
    "sync.retrying": "மீண்டும் முயற்சி",
    "sync.retry": "ஒத்திசைவை மீண்டும் முயற்சி",
    "auth.title": "ஸ்மார்ட் சுற்றுலா பயணி நகர்வு கண்காணிப்பு",
    "auth.description": "ஒப்புதல் அடிப்படையிலான பயண கண்காணிப்பு, வழித்தட காட்சி, நிர்வாக டாஷ்போர்டு மற்றும் மலேசியாவின் தேர்ந்தெடுக்கப்பட்ட சுற்றுலா இடங்களுக்கு விளக்கக்கூடிய பரிந்துரைகள்.",
    "auth.mode": "அங்கீகார முறை",
    "auth.login": "உள்நுழை",
    "auth.register": "பதிவு செய்",
    "auth.demoRole": "டெமோ பங்கு",
    "auth.firebaseMode": "Firebase முறை செயலில் உள்ளது. பதிவு செய்து உறுதிப்படுத்தப்பட்ட Firebase கணக்கைப் பயன்படுத்தவும்.",
    "auth.name": "பெயர்",
    "auth.email": "மின்னஞ்சல்",
    "auth.password": "கடவுச்சொல்",
    "auth.confirmPassword": "கடவுச்சொல்லை உறுதிசெய்",
    "auth.nationality": "தேசியம்",
    "auth.selectNationality": "தேசியத்தைத் தேர்வு செய்",
    "auth.passportNumber": "பாஸ்போர்ட் எண்",
    "auth.passportHint": "5 முதல் 20 எழுத்துகள் அல்லது எண்கள் பயன்படுத்தவும், உதாரணம் A12345678.",
    "auth.privacyTitle": "தரவு தனியுரிமை மற்றும் சுற்றுலா பயணி பாதுகாப்பு",
    "auth.privacyBody": "சுற்றுலா நிர்வாகிகள் நகர்வு போக்குகளை கண்காணிக்க இந்த பயன்பாடு உங்கள் சுயவிவரம், ஒப்புதல் தேர்வு, பயண வழித்தட புள்ளிகள் மற்றும் பரிந்துரை முடிவுகளை சேமிக்கிறது. பதிவு செய்யப்பட்ட பயணத்தின் போது உதவி தேவைப்பட்டால் அடையாள ஆதரவுக்காக பாஸ்போர்ட் மற்றும் தேசிய விவரங்கள் உங்கள் கணக்கில் வைக்கப்படும்.",
    "auth.privacyAgreement": "ஒப்புதல் அடிப்படையிலான இடம் கண்காணிப்பு மற்றும் கணக்கு தரவு சேமிப்பை ஏற்கிறேன்.",
    "auth.rememberLogin": "இந்த சாதனத்தில் உள்நுழைவை நினைவில் வை",
    "auth.checkingAccess": "அணுகலைச் சரிபார்க்கிறது",
    "auth.enterSystem": "அமைப்புக்குள் செல்",
    "auth.createAccount": "சுற்றுலா பயணி கணக்கை உருவாக்கு",
    "auth.resendVerification": "உறுதிப்படுத்தல் மின்னஞ்சலை மீண்டும் அனுப்பு",
    "auth.forgotPassword": "கடவுச்சொல் மறந்துவிட்டதா",
    "auth.createTouristAccount": "சுற்றுலா பயணி கணக்கை உருவாக்கு",
    "auth.alreadyHaveAccount": "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழை",
    "auth.showPassword": "கடவுச்சொல்லைக் காட்டு",
    "auth.hidePassword": "கடவுச்சொல்லை மறை",
  },
  es: {
    "language.label": "Idioma",
    "language.english": "Inglés",
    "language.malay": "Malayo",
    "language.chinese": "Chino",
    "language.japanese": "Japonés",
    "language.korean": "Coreano",
    "language.portuguese": "Portugués",
    "language.tamil": "Tamil",
    "language.spanish": "Español",
    "language.french": "Francés",
    "brand.title": "Movimiento Turístico",
    "brand.subtitle": "Monitoreo",
    "nav.home": "Inicio",
    "nav.trips": "Viajes",
    "nav.places": "Lugares",
    "nav.events": "Calendario de Eventos",
    "nav.dashboard": "Panel",
    "nav.destinations": "Destinos",
    "nav.profile": "Perfil de viaje",
    "nav.adminRole": "Administrador de Turismo",
    "nav.exportData": "Exportar datos",
    "nav.resetDemo": "Restablecer demo",
    "nav.logout": "Cerrar sesión",
    "sync.retrying": "Reintentando",
    "sync.retry": "Reintentar sincronización",
    "auth.title": "Monitoreo Inteligente del Movimiento Turístico",
    "auth.description": "Seguimiento de viajes con consentimiento, visualización de rutas, panel administrativo y recomendaciones explicables para destinos turísticos seleccionados de Malasia.",
    "auth.mode": "Modo de autenticación",
    "auth.login": "Iniciar sesión",
    "auth.register": "Registrarse",
    "auth.demoRole": "Rol demo",
    "auth.firebaseMode": "El modo Firebase está activo. Usa una cuenta Firebase registrada y verificada.",
    "auth.name": "Nombre",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.confirmPassword": "Confirmar contraseña",
    "auth.nationality": "Nacionalidad",
    "auth.selectNationality": "Seleccionar nacionalidad",
    "auth.passportNumber": "Número de pasaporte",
    "auth.passportHint": "Usa de 5 a 20 letras o números, por ejemplo A12345678.",
    "auth.privacyTitle": "Privacidad de datos y seguridad del turista",
    "auth.privacyBody": "La aplicación guarda tu perfil, consentimiento, puntos de ruta del viaje y resultados de recomendación para que los administradores de turismo puedan monitorear tendencias de movimiento. Los datos de pasaporte y nacionalidad se guardan con tu cuenta para apoyo de identidad si se necesita asistencia durante un viaje registrado.",
    "auth.privacyAgreement": "Acepto el seguimiento de ubicación con consentimiento y el almacenamiento de datos de la cuenta.",
    "auth.rememberLogin": "Recordar inicio de sesión en este dispositivo",
    "auth.checkingAccess": "Comprobando acceso",
    "auth.enterSystem": "Entrar al sistema",
    "auth.createAccount": "Crear cuenta de turista",
    "auth.resendVerification": "Reenviar correo de verificación",
    "auth.forgotPassword": "Olvidé mi contraseña",
    "auth.createTouristAccount": "Crear Cuenta de Turista",
    "auth.alreadyHaveAccount": "¿Ya tienes cuenta? Iniciar sesión",
    "auth.showPassword": "Mostrar contraseña",
    "auth.hidePassword": "Ocultar contraseña",
  },
  fr: {
    "language.label": "Langue",
    "language.english": "Anglais",
    "language.malay": "Malais",
    "language.chinese": "Chinois",
    "language.japanese": "Japonais",
    "language.korean": "Coréen",
    "language.portuguese": "Portugais",
    "language.tamil": "Tamoul",
    "language.spanish": "Espagnol",
    "language.french": "Français",
    "brand.title": "Mouvement Touristique",
    "brand.subtitle": "Surveillance",
    "nav.home": "Accueil",
    "nav.trips": "Voyages",
    "nav.places": "Lieux",
    "nav.events": "Calendrier des Événements",
    "nav.dashboard": "Tableau de bord",
    "nav.destinations": "Destinations",
    "nav.profile": "Profil de voyage",
    "nav.adminRole": "Administrateur du Tourisme",
    "nav.exportData": "Exporter les données",
    "nav.resetDemo": "Réinitialiser la démo",
    "nav.logout": "Déconnexion",
    "sync.retrying": "Nouvel essai",
    "sync.retry": "Réessayer la sync",
    "auth.title": "Surveillance Intelligente du Mouvement Touristique",
    "auth.description": "Suivi de voyage avec consentement, visualisation d'itinéraires, tableau de bord administratif et recommandations explicables pour des lieux touristiques sélectionnés en Malaisie.",
    "auth.mode": "Mode d'authentification",
    "auth.login": "Connexion",
    "auth.register": "Inscription",
    "auth.demoRole": "Rôle démo",
    "auth.firebaseMode": "Le mode Firebase est actif. Utilisez un compte Firebase inscrit et vérifié.",
    "auth.name": "Nom",
    "auth.email": "E-mail",
    "auth.password": "Mot de passe",
    "auth.confirmPassword": "Confirmer le mot de passe",
    "auth.nationality": "Nationalité",
    "auth.selectNationality": "Sélectionner la nationalité",
    "auth.passportNumber": "Numéro de passeport",
    "auth.passportHint": "Utilisez 5 à 20 lettres ou chiffres, par exemple A12345678.",
    "auth.privacyTitle": "Confidentialité des données et sécurité du touriste",
    "auth.privacyBody": "L'application enregistre votre profil, votre choix de consentement, les points de votre itinéraire et les résultats de recommandation afin que les administrateurs du tourisme puissent surveiller les tendances de déplacement. Les informations de passeport et de nationalité sont conservées avec votre compte pour aider à l'identification si une assistance est nécessaire pendant un voyage enregistré.",
    "auth.privacyAgreement": "J'accepte le suivi de localisation avec consentement et le stockage des données du compte.",
    "auth.rememberLogin": "Mémoriser la connexion sur cet appareil",
    "auth.checkingAccess": "Vérification de l'accès",
    "auth.enterSystem": "Entrer dans le système",
    "auth.createAccount": "Créer un compte touriste",
    "auth.resendVerification": "Renvoyer l'e-mail de vérification",
    "auth.forgotPassword": "Mot de passe oublié",
    "auth.createTouristAccount": "Créer un Compte Touriste",
    "auth.alreadyHaveAccount": "Vous avez déjà un compte ? Connexion",
    "auth.showPassword": "Afficher le mot de passe",
    "auth.hidePassword": "Masquer le mot de passe",
  },
};

const touristTranslations: Record<Locale, Partial<Record<TranslationKey, string>>> = {
  en: {},
  ms: {
    "common.tourist": "Pelancong",
    "common.refresh": "Segar semula",
    "common.save": "Simpan",
    "common.edit": "Edit",
    "common.complete": "Lengkapkan",
    "common.checkEvents": "Semak acara",
    "tourist.profile.pageTitle": "Profil Perjalanan",
    "tourist.profile.setupPageTitle": "Sediakan Profil Perjalanan",
    "tourist.profile.formTitle": "Pilihan Perjalanan",
    "tourist.profile.formDescription": "Kemas kini butiran yang digunakan untuk memperibadikan cadangan perjalanan anda.",
    "tourist.profile.setupTitle": "Jadikan aplikasi ini sesuai dengan anda",
    "tourist.profile.setupDescription": "Tambah gaya perjalanan supaya cadangan berguna dari awal. Anda boleh langkau dan ubah kemudian.",
    "tourist.profile.saveProfile": "Simpan profil",
    "tourist.profile.skipForNow": "Langkau dahulu",
    "tourist.home.planTitle": "Rancang Lawatan Anda",
    "tourist.home.welcomeBack": "Selamat kembali",
    "tourist.home.activeTripTitle": "Perjalanan anda sedang direkodkan",
    "tourist.home.readyNextTripTitle": "Sedia untuk perjalanan seterusnya",
    "tourist.home.firstTripTitle": "Mulakan perjalanan pertama",
    "tourist.home.activeTripDescription": "Biarkan halaman ini terbuka semasa perjalanan direkodkan.",
    "tourist.home.readyNextTripDescription": "Gunakan Utama apabila anda bersedia merekod laluan baharu.",
    "tourist.home.firstTripDescription": "Benarkan lokasi, mulakan perjalanan, dan aplikasi akan menggunakan laluan anda untuk memperbaiki cadangan.",
    "tourist.home.locationAllowed": "Lokasi dibenarkan",
    "tourist.home.allowLocation": "Benarkan lokasi dahulu",
    "tourist.home.locationAllowedText": "Anda boleh mulakan perjalanan apabila bersedia.",
    "tourist.home.locationNeededText": "Lokasi hanya diminta apabila anda memilih untuk merekod perjalanan.",
    "tourist.home.startTrip": "Mulakan Perjalanan",
    "tourist.home.stopTrip": "Hentikan Perjalanan",
    "tourist.home.resumeTracking": "Sambung penjejakan",
    "tourist.home.addDemoPoint": "Tambah titik pergerakan demo",
    "tourist.home.addSampleRoute": "Tambah laluan contoh Malaysia",
    "tourist.home.tryLocationAgain": "Cuba lokasi semula",
    "tourist.home.howItWorks": "Cara ia berfungsi",
    "tourist.home.stepAllowLocation": "Benarkan lokasi apabila anda bersedia untuk merekod.",
    "tourist.home.stepStartTrip": "Mulakan perjalanan dan biarkan halaman ini terbuka.",
    "tourist.home.stepStopTrip": "Hentikan perjalanan untuk mengemas kini kategori dan cadangan anda.",
    "tourist.geofence.eyebrow": "Panduan kawasan",
    "tourist.geofence.title": "Notis berguna berhampiran anda",
    "tourist.geofence.description": "Notis ini menggunakan zon pemantauan setempat dan titik perjalanan terkini anda.",
    "tourist.checkin.eyebrow": "Lawatan tarikan",
    "tourist.checkin.activeTitlePrefix": "Daftar masuk di",
    "tourist.checkin.emptyTitle": "Daftar masuk apabila tiba",
    "tourist.checkin.activeDescription": "Daftar keluar apabila anda pergi supaya tempoh lawatan boleh direkodkan.",
    "tourist.checkin.emptyDescription": "Ini menambah rekod lawatan tarikan yang jelas bersama laluan pergerakan anda.",
    "tourist.checkin.attraction": "Tarikan",
    "tourist.checkin.checkIn": "Daftar masuk",
    "tourist.checkin.useNearest": "Guna tempat terdekat",
    "tourist.checkin.checkOut": "Daftar keluar",
    "tourist.checkin.emptyHistory": "Belum ada daftar masuk tarikan.",
    "tourist.checkin.unknownAttraction": "Tarikan tidak diketahui",
    "tourist.checkin.minVisit": "min lawatan",
    "tourist.checkin.currentlyCheckedIn": "Sedang daftar masuk",
    "tourist.safety.eyebrow": "Sokongan keselamatan",
    "tourist.safety.title": "Perlukan bantuan semasa perjalanan?",
    "tourist.safety.description": "Rekod SOS atau laporan insiden untuk disemak oleh pentadbir pelancongan dalam prototaip ini.",
    "tourist.safety.open": "terbuka",
    "tourist.safety.emergencyContact": "Kenalan kecemasan",
    "tourist.safety.notAdded": "Belum ditambah",
    "tourist.safety.addInProfile": "Tambah di Profil Perjalanan",
    "tourist.safety.editContact": "Edit kenalan",
    "tourist.safety.sos": "Hantar Permintaan SOS",
    "tourist.safety.prototypeNote": "Nota prototaip: ini menyimpan permintaan bantuan untuk papan pemuka pentadbir. Jika benar-benar bahaya, hubungi perkhidmatan kecemasan tempatan segera.",
    "tourist.safety.incidentType": "Jenis insiden",
    "tourist.safety.locationNote": "Nota lokasi",
    "tourist.safety.locationPlaceholder": "Contoh: berhampiran pintu masuk",
    "tourist.safety.whatHappened": "Apa yang berlaku?",
    "tourist.safety.descriptionPlaceholder": "Terangkan isu secara ringkas.",
    "tourist.safety.submitIncident": "Hantar laporan insiden",
    "tourist.safety.noRequests": "Belum ada permintaan keselamatan.",
    "tourist.metrics.tripStatus": "Status perjalanan",
    "tourist.metrics.savedPoints": "Titik disimpan",
    "tourist.metrics.latestCategory": "Kategori terkini",
    "tourist.metrics.distance": "Jarak",
    "tourist.profile.summaryTitle": "Profil Perjalanan",
    "tourist.profile.summaryDescription": "Pilihan anda memberi aplikasi titik mula sebelum sejarah pergerakan cukup kuat untuk cadangan AI.",
    "tourist.profile.name": "Nama",
    "tourist.profile.interests": "Minat",
    "tourist.profile.pace": "Rentak",
    "tourist.profile.emergencyContact": "Kenalan kecemasan",
    "tourist.profile.notSetYet": "Belum ditetapkan",
    "tourist.recommendations.pageTitle": "Teroka Tempat",
    "tourist.events.pageTitle": "Kalendar Acara",
  },
  zh: {
    "common.tourist": "游客",
    "common.refresh": "刷新",
    "common.save": "保存",
    "common.edit": "编辑",
    "common.complete": "完成",
    "common.checkEvents": "查看活动",
    "tourist.profile.pageTitle": "旅行档案",
    "tourist.profile.setupPageTitle": "设置旅行档案",
    "tourist.profile.formTitle": "旅行偏好",
    "tourist.profile.formDescription": "更新用于个性化行程建议的资料。",
    "tourist.profile.setupTitle": "让应用更适合你",
    "tourist.profile.setupDescription": "添加旅行风格，让推荐从一开始就更有用。你也可以先跳过，之后再修改。",
    "tourist.profile.saveProfile": "保存档案",
    "tourist.profile.skipForNow": "暂时跳过",
    "tourist.home.planTitle": "规划你的游览",
    "tourist.home.welcomeBack": "欢迎回来",
    "tourist.home.activeTripTitle": "你的行程正在记录",
    "tourist.home.readyNextTripTitle": "准备开始下一段行程",
    "tourist.home.firstTripTitle": "开始第一次记录行程",
    "tourist.home.activeTripDescription": "行程记录时请保持此页面开启。",
    "tourist.home.readyNextTripDescription": "准备记录新路线时，请回到首页。",
    "tourist.home.firstTripDescription": "允许位置、开始行程，应用会使用你的路线改善推荐。",
    "tourist.home.locationAllowed": "已允许位置",
    "tourist.home.allowLocation": "先允许位置",
    "tourist.home.locationAllowedText": "准备好后即可开始行程。",
    "tourist.home.locationNeededText": "只有当你选择记录行程时才会请求位置。",
    "tourist.home.startTrip": "开始行程",
    "tourist.home.stopTrip": "停止行程",
    "tourist.home.resumeTracking": "继续追踪",
    "tourist.home.addDemoPoint": "添加演示移动点",
    "tourist.home.addSampleRoute": "添加马来西亚示例路线",
    "tourist.home.tryLocationAgain": "重新尝试定位",
    "tourist.home.howItWorks": "使用方式",
    "tourist.home.stepAllowLocation": "准备记录时允许位置。",
    "tourist.home.stepStartTrip": "开始行程并保持页面开启。",
    "tourist.home.stepStopTrip": "停止行程以更新旅行类别和推荐。",
    "tourist.geofence.eyebrow": "区域提示",
    "tourist.geofence.title": "你附近的实用提醒",
    "tourist.geofence.description": "这些提醒会使用本地监测区域和你最新保存的行程点。",
    "tourist.checkin.eyebrow": "景点到访",
    "tourist.checkin.activeTitlePrefix": "已在此签到:",
    "tourist.checkin.emptyTitle": "到达时签到",
    "tourist.checkin.activeDescription": "离开时签出，以记录停留时间。",
    "tourist.checkin.emptyDescription": "这会在移动路线旁加入清晰的景点到访记录。",
    "tourist.checkin.attraction": "景点",
    "tourist.checkin.checkIn": "签到",
    "tourist.checkin.useNearest": "使用最近地点",
    "tourist.checkin.checkOut": "签出",
    "tourist.checkin.emptyHistory": "还没有景点签到记录。",
    "tourist.checkin.unknownAttraction": "未知景点",
    "tourist.checkin.minVisit": "分钟到访",
    "tourist.checkin.currentlyCheckedIn": "当前已签到",
    "tourist.safety.eyebrow": "安全支援",
    "tourist.safety.title": "行程中需要帮助吗？",
    "tourist.safety.description": "在此原型中记录 SOS 或事故报告，供旅游管理员查看。",
    "tourist.safety.open": "待处理",
    "tourist.safety.emergencyContact": "紧急联系人",
    "tourist.safety.notAdded": "尚未添加",
    "tourist.safety.addInProfile": "在旅行档案中添加",
    "tourist.safety.editContact": "编辑联系人",
    "tourist.safety.sos": "发送 SOS 请求",
    "tourist.safety.prototypeNote": "原型说明：这会为管理员仪表板保存协助请求。如遇真实危险，请立即拨打当地紧急电话。",
    "tourist.safety.incidentType": "事故类型",
    "tourist.safety.locationNote": "位置备注",
    "tourist.safety.locationPlaceholder": "例如：入口附近",
    "tourist.safety.whatHappened": "发生了什么？",
    "tourist.safety.descriptionPlaceholder": "简要说明问题。",
    "tourist.safety.submitIncident": "提交事故报告",
    "tourist.safety.noRequests": "尚未提交安全请求。",
    "tourist.metrics.tripStatus": "行程状态",
    "tourist.metrics.savedPoints": "已保存点",
    "tourist.metrics.latestCategory": "最新类别",
    "tourist.metrics.distance": "距离",
    "tourist.profile.summaryTitle": "旅行档案",
    "tourist.profile.summaryDescription": "你的偏好会在移动历史足够丰富前，先为 AI 推荐提供基础。",
    "tourist.profile.name": "姓名",
    "tourist.profile.interests": "兴趣",
    "tourist.profile.pace": "节奏",
    "tourist.profile.emergencyContact": "紧急联系人",
    "tourist.profile.notSetYet": "尚未设置",
    "tourist.recommendations.pageTitle": "探索地点",
    "tourist.events.pageTitle": "活动日历",
  },
  ja: {
    "common.tourist": "観光客",
    "common.refresh": "更新",
    "common.save": "保存",
    "common.edit": "編集",
    "common.complete": "完了",
    "common.checkEvents": "イベントを見る",
    "tourist.profile.pageTitle": "旅行プロフィール",
    "tourist.profile.setupPageTitle": "旅行プロフィールを設定",
    "tourist.profile.formTitle": "旅行の好み",
    "tourist.profile.formDescription": "旅行提案を個人化するための情報を更新します。",
    "tourist.profile.setupTitle": "アプリを自分向けにする",
    "tourist.profile.setupDescription": "旅行スタイルを追加すると、最初からおすすめが使いやすくなります。後で変更することもできます。",
    "tourist.profile.saveProfile": "プロフィールを保存",
    "tourist.profile.skipForNow": "今はスキップ",
    "tourist.home.planTitle": "訪問を計画",
    "tourist.home.welcomeBack": "おかえりなさい",
    "tourist.home.activeTripTitle": "旅行を記録中です",
    "tourist.home.readyNextTripTitle": "次の旅行を始められます",
    "tourist.home.firstTripTitle": "最初の記録旅行を始める",
    "tourist.home.activeTripDescription": "旅行の記録中はこのページを開いたままにしてください。",
    "tourist.home.readyNextTripDescription": "新しいルートを記録する準備ができたらホームを使ってください。",
    "tourist.home.firstTripDescription": "位置情報を許可して旅行を開始すると、ルートを使っておすすめを改善します。",
    "tourist.home.locationAllowed": "位置情報は許可済み",
    "tourist.home.allowLocation": "先に位置情報を許可",
    "tourist.home.locationAllowedText": "準備ができたら旅行を開始できます。",
    "tourist.home.locationNeededText": "位置情報は旅行を記録するときだけ求められます。",
    "tourist.home.startTrip": "旅行開始",
    "tourist.home.stopTrip": "旅行終了",
    "tourist.home.resumeTracking": "追跡を再開",
    "tourist.home.addDemoPoint": "デモ移動地点を追加",
    "tourist.home.addSampleRoute": "マレーシアのサンプルルートを追加",
    "tourist.home.tryLocationAgain": "位置情報を再試行",
    "tourist.home.howItWorks": "使い方",
    "tourist.home.stepAllowLocation": "記録する準備ができたら位置情報を許可します。",
    "tourist.home.stepStartTrip": "旅行を開始し、このページを開いたままにします。",
    "tourist.home.stepStopTrip": "旅行を終了するとカテゴリとおすすめが更新されます。",
    "tourist.geofence.eyebrow": "エリア案内",
    "tourist.geofence.title": "近くの便利なお知らせ",
    "tourist.geofence.description": "これらのお知らせは監視エリアと最新の保存済み旅行地点を使います。",
    "tourist.checkin.eyebrow": "観光地訪問",
    "tourist.checkin.activeTitlePrefix": "チェックイン中:",
    "tourist.checkin.emptyTitle": "到着したらチェックイン",
    "tourist.checkin.activeDescription": "出発時にチェックアウトすると滞在時間を記録できます。",
    "tourist.checkin.emptyDescription": "移動ルートに加えて、明確な観光地訪問記録を残します。",
    "tourist.checkin.attraction": "観光地",
    "tourist.checkin.checkIn": "チェックイン",
    "tourist.checkin.useNearest": "最寄りを使う",
    "tourist.checkin.checkOut": "チェックアウト",
    "tourist.checkin.emptyHistory": "観光地チェックインはまだありません。",
    "tourist.checkin.unknownAttraction": "不明な観光地",
    "tourist.checkin.minVisit": "分滞在",
    "tourist.checkin.currentlyCheckedIn": "現在チェックイン中",
    "tourist.safety.eyebrow": "安全サポート",
    "tourist.safety.title": "旅行中に助けが必要ですか？",
    "tourist.safety.description": "このプロトタイプでは、管理者が確認できる SOS やインシデントを記録できます。",
    "tourist.safety.open": "未対応",
    "tourist.safety.emergencyContact": "緊急連絡先",
    "tourist.safety.notAdded": "未登録",
    "tourist.safety.addInProfile": "旅行プロフィールで追加",
    "tourist.safety.editContact": "連絡先を編集",
    "tourist.safety.sos": "SOS リクエスト送信",
    "tourist.safety.prototypeNote": "プロトタイプ注記: 管理者ダッシュボード用に支援リクエストを保存します。実際に危険な場合は、すぐに現地の緊急サービスへ連絡してください。",
    "tourist.safety.incidentType": "インシデント種別",
    "tourist.safety.locationNote": "場所メモ",
    "tourist.safety.locationPlaceholder": "例: 入口付近",
    "tourist.safety.whatHappened": "何が起きましたか？",
    "tourist.safety.descriptionPlaceholder": "問題を簡単に説明してください。",
    "tourist.safety.submitIncident": "インシデントを送信",
    "tourist.safety.noRequests": "安全リクエストはまだありません。",
    "tourist.metrics.tripStatus": "旅行状態",
    "tourist.metrics.savedPoints": "保存地点",
    "tourist.metrics.latestCategory": "最新カテゴリ",
    "tourist.metrics.distance": "距離",
    "tourist.profile.summaryTitle": "旅行プロフィール",
    "tourist.profile.summaryDescription": "移動履歴が十分になる前に、あなたの好みが AI おすすめの出発点になります。",
    "tourist.profile.name": "名前",
    "tourist.profile.interests": "興味",
    "tourist.profile.pace": "ペース",
    "tourist.profile.emergencyContact": "緊急連絡先",
    "tourist.profile.notSetYet": "未設定",
    "tourist.recommendations.pageTitle": "場所を探す",
    "tourist.events.pageTitle": "イベントカレンダー",
  },
  ko: {
    "common.tourist": "관광객",
    "common.refresh": "새로고침",
    "common.save": "저장",
    "common.edit": "수정",
    "common.complete": "완료",
    "common.checkEvents": "이벤트 확인",
    "tourist.profile.pageTitle": "여행 프로필",
    "tourist.profile.setupPageTitle": "여행 프로필 설정",
    "tourist.profile.formTitle": "여행 선호도",
    "tourist.profile.formDescription": "여행 추천을 개인화하는 데 쓰이는 정보를 업데이트하세요.",
    "tourist.profile.setupTitle": "앱을 나에게 맞게 설정",
    "tourist.profile.setupDescription": "여행 스타일을 추가하면 처음부터 더 유용한 추천을 받을 수 있습니다. 나중에 변경할 수도 있습니다.",
    "tourist.profile.saveProfile": "프로필 저장",
    "tourist.profile.skipForNow": "지금은 건너뛰기",
    "tourist.home.planTitle": "방문 계획",
    "tourist.home.welcomeBack": "다시 오신 것을 환영합니다",
    "tourist.home.activeTripTitle": "여행을 기록 중입니다",
    "tourist.home.readyNextTripTitle": "다음 여행 준비 완료",
    "tourist.home.firstTripTitle": "첫 기록 여행 시작",
    "tourist.home.activeTripDescription": "여행이 기록되는 동안 이 페이지를 열어 두세요.",
    "tourist.home.readyNextTripDescription": "새 경로를 기록할 준비가 되면 홈을 사용하세요.",
    "tourist.home.firstTripDescription": "위치를 허용하고 여행을 시작하면 앱이 경로를 사용해 추천을 개선합니다.",
    "tourist.home.locationAllowed": "위치 허용됨",
    "tourist.home.allowLocation": "먼저 위치 허용",
    "tourist.home.locationAllowedText": "준비되면 여행을 시작할 수 있습니다.",
    "tourist.home.locationNeededText": "여행 기록을 선택할 때만 위치를 요청합니다.",
    "tourist.home.startTrip": "여행 시작",
    "tourist.home.stopTrip": "여행 중지",
    "tourist.home.resumeTracking": "추적 재개",
    "tourist.home.addDemoPoint": "데모 이동 지점 추가",
    "tourist.home.addSampleRoute": "말레이시아 샘플 경로 추가",
    "tourist.home.tryLocationAgain": "위치 다시 시도",
    "tourist.home.howItWorks": "작동 방식",
    "tourist.home.stepAllowLocation": "기록할 준비가 되면 위치를 허용하세요.",
    "tourist.home.stepStartTrip": "여행을 시작하고 이 페이지를 열어 두세요.",
    "tourist.home.stepStopTrip": "여행을 중지하면 여행 카테고리와 추천이 업데이트됩니다.",
    "tourist.geofence.eyebrow": "지역 안내",
    "tourist.geofence.title": "주변 유용한 안내",
    "tourist.geofence.description": "이 안내는 현지 모니터링 구역과 최신 저장 여행 지점을 사용합니다.",
    "tourist.checkin.eyebrow": "관광지 방문",
    "tourist.checkin.activeTitlePrefix": "체크인 위치:",
    "tourist.checkin.emptyTitle": "도착하면 체크인",
    "tourist.checkin.activeDescription": "떠날 때 체크아웃하면 방문 시간이 기록됩니다.",
    "tourist.checkin.emptyDescription": "이동 경로와 함께 명확한 관광지 방문 기록을 추가합니다.",
    "tourist.checkin.attraction": "관광지",
    "tourist.checkin.checkIn": "체크인",
    "tourist.checkin.useNearest": "가장 가까운 장소 사용",
    "tourist.checkin.checkOut": "체크아웃",
    "tourist.checkin.emptyHistory": "아직 관광지 체크인이 없습니다.",
    "tourist.checkin.unknownAttraction": "알 수 없는 관광지",
    "tourist.checkin.minVisit": "분 방문",
    "tourist.checkin.currentlyCheckedIn": "현재 체크인 중",
    "tourist.safety.eyebrow": "안전 지원",
    "tourist.safety.title": "여행 중 도움이 필요하신가요?",
    "tourist.safety.description": "이 프로토타입에서 관리자 확인용 SOS 또는 사건 보고를 기록하세요.",
    "tourist.safety.open": "열림",
    "tourist.safety.emergencyContact": "긴급 연락처",
    "tourist.safety.notAdded": "아직 추가되지 않음",
    "tourist.safety.addInProfile": "여행 프로필에서 추가",
    "tourist.safety.editContact": "연락처 수정",
    "tourist.safety.sos": "SOS 요청 보내기",
    "tourist.safety.prototypeNote": "프로토타입 참고: 관리자 대시보드에 지원 요청을 저장합니다. 실제 위험 상황에서는 즉시 현지 긴급 서비스에 연락하세요.",
    "tourist.safety.incidentType": "사건 유형",
    "tourist.safety.locationNote": "위치 메모",
    "tourist.safety.locationPlaceholder": "예: 입구 근처",
    "tourist.safety.whatHappened": "무슨 일이 있었나요?",
    "tourist.safety.descriptionPlaceholder": "문제를 간단히 설명하세요.",
    "tourist.safety.submitIncident": "사건 보고 제출",
    "tourist.safety.noRequests": "아직 안전 요청이 없습니다.",
    "tourist.metrics.tripStatus": "여행 상태",
    "tourist.metrics.savedPoints": "저장 지점",
    "tourist.metrics.latestCategory": "최신 카테고리",
    "tourist.metrics.distance": "거리",
    "tourist.profile.summaryTitle": "여행 프로필",
    "tourist.profile.summaryDescription": "이동 기록이 충분해지기 전까지 선호도가 AI 추천의 시작점이 됩니다.",
    "tourist.profile.name": "이름",
    "tourist.profile.interests": "관심사",
    "tourist.profile.pace": "속도",
    "tourist.profile.emergencyContact": "긴급 연락처",
    "tourist.profile.notSetYet": "아직 설정되지 않음",
    "tourist.recommendations.pageTitle": "장소 탐색",
    "tourist.events.pageTitle": "이벤트 캘린더",
  },
  pt: {
    "common.tourist": "Turista",
    "common.refresh": "Atualizar",
    "common.save": "Guardar",
    "common.edit": "Editar",
    "common.complete": "Completar",
    "common.checkEvents": "Ver eventos",
    "tourist.profile.pageTitle": "Perfil de Viagem",
    "tourist.profile.setupPageTitle": "Configurar Perfil de Viagem",
    "tourist.profile.formTitle": "Preferências de viagem",
    "tourist.profile.formDescription": "Atualize os detalhes usados para personalizar sugestões de viagem.",
    "tourist.profile.setupTitle": "Faça a aplicação adaptar-se a si",
    "tourist.profile.setupDescription": "Adicione o seu estilo de viagem para obter recomendações úteis desde o início. Pode saltar e alterar depois.",
    "tourist.profile.saveProfile": "Guardar perfil",
    "tourist.profile.skipForNow": "Saltar por agora",
    "tourist.home.planTitle": "Planeie a sua visita",
    "tourist.home.welcomeBack": "Bem-vindo de volta",
    "tourist.home.activeTripTitle": "A sua viagem está a ser registada",
    "tourist.home.readyNextTripTitle": "Pronto para a próxima viagem",
    "tourist.home.firstTripTitle": "Inicie a primeira viagem registada",
    "tourist.home.activeTripDescription": "Mantenha esta página aberta enquanto a viagem é registada.",
    "tourist.home.readyNextTripDescription": "Use o Início quando estiver pronto para registar outra rota.",
    "tourist.home.firstTripDescription": "Permita a localização, inicie uma viagem e a aplicação usará a rota para melhorar recomendações.",
    "tourist.home.locationAllowed": "Localização permitida",
    "tourist.home.allowLocation": "Permitir localização primeiro",
    "tourist.home.locationAllowedText": "Pode iniciar uma viagem quando estiver pronto.",
    "tourist.home.locationNeededText": "A localização só é pedida quando escolhe registar uma viagem.",
    "tourist.home.startTrip": "Iniciar viagem",
    "tourist.home.stopTrip": "Parar viagem",
    "tourist.home.resumeTracking": "Retomar rastreio",
    "tourist.home.addDemoPoint": "Adicionar ponto de movimento demo",
    "tourist.home.addSampleRoute": "Adicionar rota exemplo da Malásia",
    "tourist.home.tryLocationAgain": "Tentar localização novamente",
    "tourist.home.howItWorks": "Como funciona",
    "tourist.home.stepAllowLocation": "Permita a localização quando estiver pronto para registar.",
    "tourist.home.stepStartTrip": "Inicie uma viagem e mantenha esta página aberta.",
    "tourist.home.stepStopTrip": "Pare a viagem para atualizar a categoria e recomendações.",
    "tourist.geofence.eyebrow": "Orientação de área",
    "tourist.geofence.title": "Aviso útil perto de si",
    "tourist.geofence.description": "Estes avisos usam zonas locais de monitorização e o seu ponto de viagem mais recente.",
    "tourist.checkin.eyebrow": "Visita a atração",
    "tourist.checkin.activeTitlePrefix": "Check-in em",
    "tourist.checkin.emptyTitle": "Faça check-in ao chegar",
    "tourist.checkin.activeDescription": "Faça check-out ao sair para registar a duração da visita.",
    "tourist.checkin.emptyDescription": "Isto adiciona um registo claro de visita a atração juntamente com a sua rota.",
    "tourist.checkin.attraction": "Atração",
    "tourist.checkin.checkIn": "Check-in",
    "tourist.checkin.useNearest": "Usar local mais próximo",
    "tourist.checkin.checkOut": "Check-out",
    "tourist.checkin.emptyHistory": "Ainda não há check-ins em atrações.",
    "tourist.checkin.unknownAttraction": "Atração desconhecida",
    "tourist.checkin.minVisit": "min de visita",
    "tourist.checkin.currentlyCheckedIn": "Check-in ativo",
    "tourist.safety.eyebrow": "Apoio de segurança",
    "tourist.safety.title": "Precisa de ajuda durante a viagem?",
    "tourist.safety.description": "Registe um SOS ou relatório de incidente para revisão pelos administradores de turismo neste protótipo.",
    "tourist.safety.open": "aberto",
    "tourist.safety.emergencyContact": "Contacto de emergência",
    "tourist.safety.notAdded": "Ainda não adicionado",
    "tourist.safety.addInProfile": "Adicione no Perfil de Viagem",
    "tourist.safety.editContact": "Editar contacto",
    "tourist.safety.sos": "Enviar pedido SOS",
    "tourist.safety.prototypeNote": "Nota do protótipo: isto guarda um pedido de assistência no painel administrativo. Em perigo real, contacte imediatamente os serviços de emergência locais.",
    "tourist.safety.incidentType": "Tipo de incidente",
    "tourist.safety.locationNote": "Nota de localização",
    "tourist.safety.locationPlaceholder": "Exemplo: perto da entrada",
    "tourist.safety.whatHappened": "O que aconteceu?",
    "tourist.safety.descriptionPlaceholder": "Descreva brevemente o problema.",
    "tourist.safety.submitIncident": "Enviar relatório de incidente",
    "tourist.safety.noRequests": "Ainda não há pedidos de segurança.",
    "tourist.metrics.tripStatus": "Estado da viagem",
    "tourist.metrics.savedPoints": "Pontos guardados",
    "tourist.metrics.latestCategory": "Categoria mais recente",
    "tourist.metrics.distance": "Distância",
    "tourist.profile.summaryTitle": "Perfil de Viagem",
    "tourist.profile.summaryDescription": "As suas preferências dão à aplicação um ponto de partida antes de haver histórico suficiente para recomendações de IA.",
    "tourist.profile.name": "Nome",
    "tourist.profile.interests": "Interesses",
    "tourist.profile.pace": "Ritmo",
    "tourist.profile.emergencyContact": "Contacto de emergência",
    "tourist.profile.notSetYet": "Ainda não definido",
    "tourist.recommendations.pageTitle": "Explorar Locais",
    "tourist.events.pageTitle": "Calendário de Eventos",
  },
  ta: {
    "common.tourist": "சுற்றுலா பயணி",
    "common.refresh": "புதுப்பி",
    "common.save": "சேமி",
    "common.edit": "திருத்து",
    "common.complete": "முடி",
    "common.checkEvents": "நிகழ்வுகளைப் பார்",
    "tourist.profile.pageTitle": "பயண சுயவிவரம்",
    "tourist.profile.setupPageTitle": "பயண சுயவிவரத்தை அமை",
    "tourist.profile.formTitle": "பயண விருப்பங்கள்",
    "tourist.profile.formDescription": "பயண பரிந்துரைகளை தனிப்பயனாக்கப் பயன்படும் விவரங்களை புதுப்பிக்கவும்.",
    "tourist.profile.setupTitle": "இந்த பயன்பாட்டை உங்களுக்கு ஏற்ப அமைக்கவும்",
    "tourist.profile.setupDescription": "தொடக்கத்திலிருந்தே பயனுள்ள பரிந்துரைகள் கிடைக்க உங்கள் பயண பாணியைச் சேர்க்கவும். இதைத் தவிர்த்து பின்னர் மாற்றலாம்.",
    "tourist.profile.saveProfile": "சுயவிவரத்தை சேமி",
    "tourist.profile.skipForNow": "இப்போது தவிர்",
    "tourist.home.planTitle": "உங்கள் வருகையைத் திட்டமிடுங்கள்",
    "tourist.home.welcomeBack": "மீண்டும் வரவேற்கிறோம்",
    "tourist.home.activeTripTitle": "உங்கள் பயணம் பதிவு செய்யப்படுகிறது",
    "tourist.home.readyNextTripTitle": "அடுத்த பயணத்திற்கு தயார்",
    "tourist.home.firstTripTitle": "முதல் பதிவு பயணத்தைத் தொடங்கு",
    "tourist.home.activeTripDescription": "பயணம் பதிவு செய்யும் போது இந்தப் பக்கத்தை திறந்தே வைத்திருங்கள்.",
    "tourist.home.readyNextTripDescription": "மற்றொரு வழித்தடத்தை பதிவு செய்ய தயாரானால் முகப்பைப் பயன்படுத்துங்கள்.",
    "tourist.home.firstTripDescription": "இடத்தை அனுமதி, பயணத்தைத் தொடங்கு, பயன்பாடு உங்கள் வழித்தடத்தைப் பயன்படுத்தி பரிந்துரைகளை மேம்படுத்தும்.",
    "tourist.home.locationAllowed": "இடம் அனுமதிக்கப்பட்டது",
    "tourist.home.allowLocation": "முதலில் இடத்தை அனுமதி",
    "tourist.home.locationAllowedText": "நீங்கள் தயாரானதும் பயணத்தைத் தொடங்கலாம்.",
    "tourist.home.locationNeededText": "பயணத்தை பதிவு செய்யும் போது மட்டும் இடம் கேட்கப்படும்.",
    "tourist.home.startTrip": "பயணத்தைத் தொடங்கு",
    "tourist.home.stopTrip": "பயணத்தை நிறுத்து",
    "tourist.home.resumeTracking": "கண்காணிப்பைத் தொடரு",
    "tourist.home.addDemoPoint": "டெமோ நகர்வு புள்ளி சேர்",
    "tourist.home.addSampleRoute": "மலேசியா மாதிரி வழித்தடம் சேர்",
    "tourist.home.tryLocationAgain": "இடத்தை மீண்டும் முயற்சி",
    "tourist.home.howItWorks": "இது எப்படி செயல்படுகிறது",
    "tourist.home.stepAllowLocation": "பதிவு செய்ய தயாரானபோது இடத்தை அனுமதிக்கவும்.",
    "tourist.home.stepStartTrip": "பயணத்தைத் தொடங்கி இந்தப் பக்கத்தை திறந்தே வைத்திருங்கள்.",
    "tourist.home.stepStopTrip": "பயண வகை மற்றும் பரிந்துரைகளைப் புதுப்பிக்க பயணத்தை நிறுத்தவும்.",
    "tourist.geofence.eyebrow": "பகுதி வழிகாட்டல்",
    "tourist.geofence.title": "உங்களுக்கு அருகிலுள்ள பயனுள்ள அறிவிப்பு",
    "tourist.geofence.description": "இந்த அறிவிப்புகள் உள்ளூர் கண்காணிப்பு பகுதிகளையும் உங்கள் சமீபத்திய பயண புள்ளியையும் பயன்படுத்தும்.",
    "tourist.checkin.eyebrow": "ஈர்ப்பு இட வருகை",
    "tourist.checkin.activeTitlePrefix": "செக்-இன் செய்த இடம்",
    "tourist.checkin.emptyTitle": "வந்தவுடன் செக்-இன் செய்யவும்",
    "tourist.checkin.activeDescription": "வெளியேறும் போது செக்-அவுட் செய்தால் வருகை நேரம் பதிவு செய்யப்படும்.",
    "tourist.checkin.emptyDescription": "இது உங்கள் நகர்வு வழித்தடத்துடன் தெளிவான ஈர்ப்பு இட வருகை பதிவை சேர்க்கும்.",
    "tourist.checkin.attraction": "ஈர்ப்பு இடம்",
    "tourist.checkin.checkIn": "செக்-இன்",
    "tourist.checkin.useNearest": "அருகிலுள்ள இடத்தை பயன்படுத்து",
    "tourist.checkin.checkOut": "செக்-அவுட்",
    "tourist.checkin.emptyHistory": "இன்னும் ஈர்ப்பு இட செக்-இன் இல்லை.",
    "tourist.checkin.unknownAttraction": "தெரியாத ஈர்ப்பு இடம்",
    "tourist.checkin.minVisit": "நிமிட வருகை",
    "tourist.checkin.currentlyCheckedIn": "தற்போது செக்-இன் செய்யப்பட்டுள்ளீர்கள்",
    "tourist.safety.eyebrow": "பாதுகாப்பு ஆதரவு",
    "tourist.safety.title": "பயணத்தின் போது உதவி வேண்டுமா?",
    "tourist.safety.description": "இந்த முன்மாதிரியில் சுற்றுலா நிர்வாகிகள் பார்வையிட SOS அல்லது சம்பவ அறிக்கையை பதிவு செய்யவும்.",
    "tourist.safety.open": "திறந்தது",
    "tourist.safety.emergencyContact": "அவசர தொடர்பு",
    "tourist.safety.notAdded": "இன்னும் சேர்க்கப்படவில்லை",
    "tourist.safety.addInProfile": "பயண சுயவிவரத்தில் சேர்க்கவும்",
    "tourist.safety.editContact": "தொடர்பைத் திருத்து",
    "tourist.safety.sos": "SOS கோரிக்கை அனுப்பு",
    "tourist.safety.prototypeNote": "முன்மாதிரி குறிப்பு: இது நிர்வாகி டாஷ்போர்டுக்கு உதவி கோரிக்கையை சேமிக்கும். உண்மையான ஆபத்தில் உடனே உள்ளூர் அவசர சேவைகளை அழைக்கவும்.",
    "tourist.safety.incidentType": "சம்பவ வகை",
    "tourist.safety.locationNote": "இட குறிப்பு",
    "tourist.safety.locationPlaceholder": "உதாரணம்: நுழைவாயில் அருகில்",
    "tourist.safety.whatHappened": "என்ன நடந்தது?",
    "tourist.safety.descriptionPlaceholder": "சிக்கலைச் சுருக்கமாக விளக்கவும்.",
    "tourist.safety.submitIncident": "சம்பவ அறிக்கை சமர்ப்பி",
    "tourist.safety.noRequests": "இன்னும் பாதுகாப்பு கோரிக்கைகள் இல்லை.",
    "tourist.metrics.tripStatus": "பயண நிலை",
    "tourist.metrics.savedPoints": "சேமித்த புள்ளிகள்",
    "tourist.metrics.latestCategory": "சமீபத்திய வகை",
    "tourist.metrics.distance": "தூரம்",
    "tourist.profile.summaryTitle": "பயண சுயவிவரம்",
    "tourist.profile.summaryDescription": "AI பரிந்துரைகளுக்கு போதுமான நகர்வு வரலாறு உருவாகும் முன் உங்கள் விருப்பங்கள் தொடக்கமாக இருக்கும்.",
    "tourist.profile.name": "பெயர்",
    "tourist.profile.interests": "ஆர்வங்கள்",
    "tourist.profile.pace": "வேகம்",
    "tourist.profile.emergencyContact": "அவசர தொடர்பு",
    "tourist.profile.notSetYet": "இன்னும் அமைக்கப்படவில்லை",
    "tourist.recommendations.pageTitle": "இடங்களை ஆராய்",
    "tourist.events.pageTitle": "நிகழ்வு நாட்காட்டி",
  },
  es: {
    "common.tourist": "Turista",
    "common.refresh": "Actualizar",
    "common.save": "Guardar",
    "common.edit": "Editar",
    "common.complete": "Completar",
    "common.checkEvents": "Ver eventos",
    "tourist.profile.pageTitle": "Perfil de Viaje",
    "tourist.profile.setupPageTitle": "Configurar Perfil de Viaje",
    "tourist.profile.formTitle": "Preferencias de viaje",
    "tourist.profile.formDescription": "Actualiza los datos usados para personalizar tus sugerencias de viaje.",
    "tourist.profile.setupTitle": "Haz que la app se adapte a ti",
    "tourist.profile.setupDescription": "Añade tu estilo de viaje para que las recomendaciones sean útiles desde el inicio. Puedes saltarlo y cambiarlo después.",
    "tourist.profile.saveProfile": "Guardar perfil",
    "tourist.profile.skipForNow": "Saltar por ahora",
    "tourist.home.planTitle": "Planifica tu visita",
    "tourist.home.welcomeBack": "Bienvenido de nuevo",
    "tourist.home.activeTripTitle": "Tu viaje se está registrando",
    "tourist.home.readyNextTripTitle": "Listo para tu próximo viaje",
    "tourist.home.firstTripTitle": "Inicia tu primer viaje registrado",
    "tourist.home.activeTripDescription": "Mantén esta página abierta mientras se registra tu viaje.",
    "tourist.home.readyNextTripDescription": "Usa Inicio cuando estés listo para registrar otra ruta.",
    "tourist.home.firstTripDescription": "Permite la ubicación, inicia un viaje y la app usará tu ruta para mejorar las recomendaciones.",
    "tourist.home.locationAllowed": "Ubicación permitida",
    "tourist.home.allowLocation": "Permitir ubicación primero",
    "tourist.home.locationAllowedText": "Puedes iniciar un viaje cuando estés listo.",
    "tourist.home.locationNeededText": "La ubicación solo se solicita cuando eliges registrar un viaje.",
    "tourist.home.startTrip": "Iniciar viaje",
    "tourist.home.stopTrip": "Detener viaje",
    "tourist.home.resumeTracking": "Reanudar seguimiento",
    "tourist.home.addDemoPoint": "Añadir punto de movimiento demo",
    "tourist.home.addSampleRoute": "Añadir ruta de ejemplo de Malasia",
    "tourist.home.tryLocationAgain": "Intentar ubicación otra vez",
    "tourist.home.howItWorks": "Cómo funciona",
    "tourist.home.stepAllowLocation": "Permite la ubicación cuando estés listo para registrar.",
    "tourist.home.stepStartTrip": "Inicia un viaje y mantén esta página abierta.",
    "tourist.home.stepStopTrip": "Detén el viaje para actualizar tu categoría y recomendaciones.",
    "tourist.geofence.eyebrow": "Guía de zona",
    "tourist.geofence.title": "Aviso útil cerca de ti",
    "tourist.geofence.description": "Estos avisos usan zonas locales de monitoreo y tu último punto de viaje guardado.",
    "tourist.checkin.eyebrow": "Visita a atracción",
    "tourist.checkin.activeTitlePrefix": "Registrado en",
    "tourist.checkin.emptyTitle": "Regístrate al llegar",
    "tourist.checkin.activeDescription": "Haz check-out al salir para registrar la duración de la visita.",
    "tourist.checkin.emptyDescription": "Esto añade un registro claro de visita junto a tu ruta de movimiento.",
    "tourist.checkin.attraction": "Atracción",
    "tourist.checkin.checkIn": "Check-in",
    "tourist.checkin.useNearest": "Usar lugar más cercano",
    "tourist.checkin.checkOut": "Check-out",
    "tourist.checkin.emptyHistory": "Aún no hay check-ins en atracciones.",
    "tourist.checkin.unknownAttraction": "Atracción desconocida",
    "tourist.checkin.minVisit": "min de visita",
    "tourist.checkin.currentlyCheckedIn": "Check-in activo",
    "tourist.safety.eyebrow": "Soporte de seguridad",
    "tourist.safety.title": "¿Necesitas ayuda durante un viaje?",
    "tourist.safety.description": "Registra un SOS o reporte de incidente para que los administradores de turismo lo revisen en este prototipo.",
    "tourist.safety.open": "abierto",
    "tourist.safety.emergencyContact": "Contacto de emergencia",
    "tourist.safety.notAdded": "Aún no añadido",
    "tourist.safety.addInProfile": "Añádelo en Perfil de Viaje",
    "tourist.safety.editContact": "Editar contacto",
    "tourist.safety.sos": "Enviar solicitud SOS",
    "tourist.safety.prototypeNote": "Nota del prototipo: esto guarda una solicitud de ayuda para el panel administrativo. En peligro real, llama inmediatamente a los servicios de emergencia locales.",
    "tourist.safety.incidentType": "Tipo de incidente",
    "tourist.safety.locationNote": "Nota de ubicación",
    "tourist.safety.locationPlaceholder": "Ejemplo: cerca de la entrada",
    "tourist.safety.whatHappened": "¿Qué ocurrió?",
    "tourist.safety.descriptionPlaceholder": "Describe brevemente el problema.",
    "tourist.safety.submitIncident": "Enviar reporte de incidente",
    "tourist.safety.noRequests": "Aún no hay solicitudes de seguridad.",
    "tourist.metrics.tripStatus": "Estado del viaje",
    "tourist.metrics.savedPoints": "Puntos guardados",
    "tourist.metrics.latestCategory": "Categoría reciente",
    "tourist.metrics.distance": "Distancia",
    "tourist.profile.summaryTitle": "Perfil de Viaje",
    "tourist.profile.summaryDescription": "Tus preferencias dan a la app un punto de partida antes de que el historial sea suficiente para recomendaciones de IA.",
    "tourist.profile.name": "Nombre",
    "tourist.profile.interests": "Intereses",
    "tourist.profile.pace": "Ritmo",
    "tourist.profile.emergencyContact": "Contacto de emergencia",
    "tourist.profile.notSetYet": "Aún no configurado",
    "tourist.recommendations.pageTitle": "Explorar lugares",
    "tourist.events.pageTitle": "Calendario de eventos",
  },
  fr: {
    "common.tourist": "Touriste",
    "common.refresh": "Actualiser",
    "common.save": "Enregistrer",
    "common.edit": "Modifier",
    "common.complete": "Compléter",
    "common.checkEvents": "Voir les événements",
    "tourist.profile.pageTitle": "Profil de Voyage",
    "tourist.profile.setupPageTitle": "Configurer le Profil de Voyage",
    "tourist.profile.formTitle": "Préférences de voyage",
    "tourist.profile.formDescription": "Mettez à jour les détails utilisés pour personnaliser vos suggestions de voyage.",
    "tourist.profile.setupTitle": "Adaptez l'application à vous",
    "tourist.profile.setupDescription": "Ajoutez votre style de voyage pour obtenir des recommandations utiles dès le départ. Vous pouvez ignorer et modifier plus tard.",
    "tourist.profile.saveProfile": "Enregistrer le profil",
    "tourist.profile.skipForNow": "Ignorer pour l'instant",
    "tourist.home.planTitle": "Planifiez votre visite",
    "tourist.home.welcomeBack": "Bon retour",
    "tourist.home.activeTripTitle": "Votre voyage est en cours d'enregistrement",
    "tourist.home.readyNextTripTitle": "Prêt pour votre prochain voyage",
    "tourist.home.firstTripTitle": "Démarrez votre premier voyage suivi",
    "tourist.home.activeTripDescription": "Gardez cette page ouverte pendant l'enregistrement du voyage.",
    "tourist.home.readyNextTripDescription": "Utilisez Accueil lorsque vous êtes prêt à enregistrer une autre route.",
    "tourist.home.firstTripDescription": "Autorisez la localisation, démarrez un voyage, et l'application utilisera votre route pour améliorer les recommandations.",
    "tourist.home.locationAllowed": "Localisation autorisée",
    "tourist.home.allowLocation": "Autoriser d'abord la localisation",
    "tourist.home.locationAllowedText": "Vous pouvez démarrer un voyage quand vous êtes prêt.",
    "tourist.home.locationNeededText": "La localisation est demandée uniquement lorsque vous choisissez d'enregistrer un voyage.",
    "tourist.home.startTrip": "Démarrer le voyage",
    "tourist.home.stopTrip": "Arrêter le voyage",
    "tourist.home.resumeTracking": "Reprendre le suivi",
    "tourist.home.addDemoPoint": "Ajouter un point de mouvement démo",
    "tourist.home.addSampleRoute": "Ajouter une route exemple de Malaisie",
    "tourist.home.tryLocationAgain": "Réessayer la localisation",
    "tourist.home.howItWorks": "Fonctionnement",
    "tourist.home.stepAllowLocation": "Autorisez la localisation quand vous êtes prêt à enregistrer.",
    "tourist.home.stepStartTrip": "Démarrez un voyage et gardez cette page ouverte.",
    "tourist.home.stepStopTrip": "Arrêtez le voyage pour mettre à jour votre catégorie et vos recommandations.",
    "tourist.geofence.eyebrow": "Guide de zone",
    "tourist.geofence.title": "Avis utile près de vous",
    "tourist.geofence.description": "Ces avis utilisent les zones locales de surveillance et votre dernier point de voyage enregistré.",
    "tourist.checkin.eyebrow": "Visite d'attraction",
    "tourist.checkin.activeTitlePrefix": "Enregistré à",
    "tourist.checkin.emptyTitle": "Enregistrez-vous à l'arrivée",
    "tourist.checkin.activeDescription": "Faites le check-out en partant pour enregistrer la durée de visite.",
    "tourist.checkin.emptyDescription": "Cela ajoute un relevé clair de visite d'attraction avec votre route.",
    "tourist.checkin.attraction": "Attraction",
    "tourist.checkin.checkIn": "Check-in",
    "tourist.checkin.useNearest": "Utiliser le lieu le plus proche",
    "tourist.checkin.checkOut": "Check-out",
    "tourist.checkin.emptyHistory": "Aucun check-in d'attraction pour l'instant.",
    "tourist.checkin.unknownAttraction": "Attraction inconnue",
    "tourist.checkin.minVisit": "min de visite",
    "tourist.checkin.currentlyCheckedIn": "Check-in actif",
    "tourist.safety.eyebrow": "Assistance sécurité",
    "tourist.safety.title": "Besoin d'aide pendant un voyage ?",
    "tourist.safety.description": "Enregistrez un SOS ou un rapport d'incident pour examen par les administrateurs du tourisme dans ce prototype.",
    "tourist.safety.open": "ouvert",
    "tourist.safety.emergencyContact": "Contact d'urgence",
    "tourist.safety.notAdded": "Pas encore ajouté",
    "tourist.safety.addInProfile": "Ajoutez-le dans le Profil de Voyage",
    "tourist.safety.editContact": "Modifier le contact",
    "tourist.safety.sos": "Envoyer une demande SOS",
    "tourist.safety.prototypeNote": "Note du prototype : cela enregistre une demande d'assistance pour le tableau de bord administrateur. En cas de danger réel, contactez immédiatement les services d'urgence locaux.",
    "tourist.safety.incidentType": "Type d'incident",
    "tourist.safety.locationNote": "Note de localisation",
    "tourist.safety.locationPlaceholder": "Exemple : près de l'entrée",
    "tourist.safety.whatHappened": "Que s'est-il passé ?",
    "tourist.safety.descriptionPlaceholder": "Décrivez brièvement le problème.",
    "tourist.safety.submitIncident": "Envoyer le rapport d'incident",
    "tourist.safety.noRequests": "Aucune demande de sécurité pour l'instant.",
    "tourist.metrics.tripStatus": "Statut du voyage",
    "tourist.metrics.savedPoints": "Points enregistrés",
    "tourist.metrics.latestCategory": "Catégorie récente",
    "tourist.metrics.distance": "Distance",
    "tourist.profile.summaryTitle": "Profil de Voyage",
    "tourist.profile.summaryDescription": "Vos préférences donnent à l'application un point de départ avant que l'historique de mouvement soit suffisant pour les recommandations IA.",
    "tourist.profile.name": "Nom",
    "tourist.profile.interests": "Intérêts",
    "tourist.profile.pace": "Rythme",
    "tourist.profile.emergencyContact": "Contact d'urgence",
    "tourist.profile.notSetYet": "Pas encore défini",
    "tourist.recommendations.pageTitle": "Explorer les lieux",
    "tourist.events.pageTitle": "Calendrier des événements",
  },
};

export function isLocale(value: string): value is Locale {
  return localeOptions.some((option) => option.value === value);
}

export function loadLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && isLocale(saved) ? saved : "en";
}

export function saveLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function translate(locale: Locale, key: TranslationKey) {
  return translations[locale][key] ?? touristTranslations[locale][key] ?? translations.en[key] ?? key;
}
