import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useCalendarDay } from "../services/useCalendarDay";
import { CalendarDays, Compass, Navigation, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import type { AppData, AppView, Destination, IncidentType, MovementPoint, SosClosureReason, TripSession, User } from "../types";
import { loadData, loadSharedDestinations } from "../services/storage";
import { distanceKm, nearestDestination } from "../services/geo";
import { recommendForUser, refreshAllRecommendations, refreshAnalysis } from "../services/analytics";
import { malaysiaFestivalEvents } from "../data/festivals";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { getUpcomingFestivals } from "../services/festivals";
import { getRelevantTourismAdvisories } from "../services/advisories";
import { appendMovementPoint, addLocalTestRouteToActiveTrip, archiveTrip, createSampleTripForUser, deleteTouristMovementData, getLocalSampleDestinations, grantLocationConsent, revokeLocationConsent, simulatedPointNear, startFreshTripSession, startTripSession, stopActiveTrip, updateTripLabel } from "../services/movement";
import { hasTouristIdentity } from "../services/touristIdentity";
import { reviewText } from "../services/reviewUpdateCopy";
import { getDestinationState } from "../services/destinationState";
import { checkOutFromAttraction, createAttractionCheckIn, getActiveCheckIn } from "../services/checkIns";
import { getActiveGeofenceWarnings } from "../services/geofencing";
import { closeOwnSosAlert, createIncidentReport, createSosAlert } from "../services/safety";
import { sosText } from "../services/sosCopy";
import { createTouristWorkspaceSelector } from "../services/touristWorkspace";
import { formatTripTitle, getTripDiaryInsight, getTripSuggestionStatus } from "../services/tripPresentation";
import { prepareIncidentPhotoAttachment, type IncidentPhotoAttachment } from "../services/incidentAttachments";
import { getLiveNearbySuggestion, type LiveNearbySuggestion } from "../services/liveSuggestions";
import { discoveryRadiusKm, getDiscoveryDestinations, getDiscoveryReference, getLatestDiscoveryPoint, getLocalEventAnnouncement } from "../services/discovery";
import { discoveryAreas, getDiscoveryState } from "../data/discoveryAreas";
import { discoveryText } from "../services/discoveryCopy";
import { DiscoveryPrompt } from "../components/DiscoveryPrompt";
import { ActivityBasis } from "../components/ActivityBasis";
import { activityText } from "../services/activityCopy";
import { createTouristDemandSelector } from "../services/activitySummary";
import { getMovementQualityIssue, type MovementQualityIssue } from "../services/movementQuality";
import { getNearbyEmergencyServices } from "../services/emergencyServices";
import { emergencyHelpText } from "../services/emergencyHelpCopy";
import { localizeDestinations } from "../services/destinationLocale";
import { type NotificationTone, type NotifyFn } from "../components/ToastViewport";
import { uiText } from "../services/uiText";
import { FestivalCalendarPanel } from "../components/FestivalCalendarPanel";
import { Page } from "../components/Page";
import { PlaceDiscovery } from "../components/PlaceDiscovery";
import { DiscoveryAreaPicker } from "../components/DiscoveryAreaPicker";
import { TouristHome } from "../components/TouristHome";
import { TouristPassCard } from "../components/TouristPassCard";
import { TouristProfileForm } from "../components/TouristProfileForm";
import { TripDiary } from "../components/TripDiary";
import { TripExperience } from "../components/TripExperience";
import { TripActionDialog } from "../components/TripActionDialog";
import { TrackingStatus } from "../components/TrackingStatus";
import { travelText } from "../services/travelExperienceCopy";
import { createUnlistedCheckIn, type UnlistedPlaceDraft } from "../services/unlistedPlaces";
import { unlistedLocationText } from "../services/unlistedLocationCopy";
import { placeText } from "../services/placeSubmissionCopy";
import { getDisplayName } from "../services/profile";
import { geolocationErrorMessage, hasBrowserGeolocation, clearBrowserLocationWatch, createBrowserLocationWatchGuard, loadLastBrowserLocation, saveLastBrowserLocation, movementPointFromBrowserPosition } from "../services/browserLocation";
import { type CommitDataOptions, incidentTypeOptions, loadProfileSetupSkipped, saveProfileSetupSkipped } from "../services/workspaceSupport";

const ItineraryPage = lazy(() => import("../components/ItineraryPage").then((module) => ({ default: module.ItineraryPage })));

export function TouristWorkspace({
  data,
  view,
  user,
  locale,
  pendingCheckInDestinationId,
  onPendingCheckInConsumed,
  onDataChange,
  onViewChange,
  watchId,
  notify,
  hasNotifications,
  syncStatus,
}: {
  data: AppData;
  view: AppView;
  user: User;
  locale: Locale;
  pendingCheckInDestinationId: string | null;
  onPendingCheckInConsumed: () => void;
  onDataChange: (data: AppData, actor?: User | null, options?: CommitDataOptions) => void | Promise<boolean>;
  onViewChange: (view: AppView) => void;
  watchId: React.MutableRefObject<number | null>;
  notify: NotifyFn;
  hasNotifications: boolean;
  syncStatus?: string;
}) {
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [trackingQualityIssue, setTrackingQualityIssue] = useState<MovementQualityIssue | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [locationRetryAvailable, setLocationRetryAvailable] = useState(false);
  const [refreshingActivities, setRefreshingActivities] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
  const [placeGuideRequested, setPlaceGuideRequested] = useState(false);
  const [manualLocation, setManualLocation] = useState({ latitude: "3.1478", longitude: "101.6937", accuracyMeters: "25" });
  const [lastBrowserLocation, setLastBrowserLocation] = useState<MovementPoint | undefined>(() => loadLastBrowserLocation(user.id));
  const [checkInDestinationId, setCheckInDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
  const [incidentType, setIncidentType] = useState<IncidentType>("lost-item");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentLocationNote, setIncidentLocationNote] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState<IncidentPhotoAttachment | null>(null);
  const [incidentPhotoMessage, setIncidentPhotoMessage] = useState<string | null>(null);
  const [isPreparingIncidentPhoto, setIsPreparingIncidentPhoto] = useState(false);
  const [profileSetupSkipped, setProfileSetupSkipped] = useState(() => loadProfileSetupSkipped(user.id));
  const [identitySafetyAccess, setIdentitySafetyAccess] = useState(false);
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [openSafetyPanel, setOpenSafetyPanel] = useState(false);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [spotlightEventId, setSpotlightEventId] = useState<string>();
  const [tripDialog, setTripDialog] = useState<{ kind: "rename"; trip: TripSession } | { kind: "stop" } | null>(null);
  const [tripLabelDraft, setTripLabelDraft] = useState("");
  const geofenceNoticeKey = useRef("");
  const liveSuggestionDestinationIds = useRef(new Set<string>());
  const lastSuggestionAt = useRef(0);
  const browserPositionHandler = useRef<((position: GeolocationPosition) => void) | null>(null);
  const [liveSuggestion, setLiveSuggestion] = useState<LiveNearbySuggestion | null>(null);
  const [eventAnnouncementsDismissed, setEventAnnouncementsDismissed] = useState(false);
  const localizedDestinations = useMemo(() => localizeDestinations(data.destinations, locale), [data.destinations, locale]);
  const localizedData = useMemo(() => ({ ...data, destinations: localizedDestinations }), [data, localizedDestinations]);
  const selectWorkspace = useMemo(createTouristWorkspaceSelector, []);
  const touristWorkspace = useMemo(() => selectWorkspace(localizedData, user.id, selectedTripId), [localizedData, selectedTripId, user.id, selectWorkspace]);
  const {
    userTrips,
    activeTrip,
    currentConsent,
    tripPoints,
    activePoints,
    latestAnalysis,
    recentTrips,
    tripSummaries,
    selectedTrip,
    selectedTripPoints,
    selectedTripSummary,
    selectedTripAnalysis,
    selectedTripDestinationNames,
    visitedDestinationIds,
    userSosAlerts,
    userIncidentReports,
    openSafetyCount,
    recentCheckIns,
  } = touristWorkspace;
  const activeTripSummary = activeTrip ? tripSummaries.find((summary) => summary.tripId === activeTrip.id) ?? null : null;
  const activeGpsFix = activeTrip && lastBrowserLocation?.tripId === activeTrip.id ? lastBrowserLocation : undefined;
  const selectDestinationDemand = useMemo(createTouristDemandSelector, []);
  const destinationDemand = useMemo(() => selectDestinationDemand(data, user), [data, user, selectDestinationDemand]);
  const calendarDay = useCalendarDay();
  const upcomingFestivals = useMemo(() => getUpcomingFestivals(malaysiaFestivalEvents, new Date(`${calendarDay}T00:00:00`)), [calendarDay]);
  const latestKnownPoint = activePoints.at(-1) ?? lastBrowserLocation ?? (activeTrip ? undefined : tripPoints.at(-1));
  const latestGpsPoint = currentConsent ? getLatestDiscoveryPoint(activePoints.at(-1), lastBrowserLocation) : undefined;
  const discoveryGpsPoint = getDiscoveryReference({ ...user, discoveryLocationMode: "current" }, latestGpsPoint);
  const discoveryReference = useMemo(() => getDiscoveryReference(user, discoveryGpsPoint), [user, discoveryGpsPoint]);
  const canonicalDiscoveryDestinations = useMemo(() => getDiscoveryDestinations(data.destinations, user, discoveryReference), [data.destinations, user, discoveryReference]);
  const discoveryDestinations = useMemo(() => localizeDestinations(canonicalDiscoveryDestinations, locale), [canonicalDiscoveryDestinations, locale]);
  const spotlightContext = useMemo(() => ({
    localDestinationIds: discoveryReference ? canonicalDiscoveryDestinations.map((place) => place.id) : undefined,
    referencePoint: user.discoveryLocationMode === "area" ? undefined : discoveryReference,
    activityDemand: destinationDemand,
    excludedDestinationIds: user.hiddenDestinationIds,
  }), [canonicalDiscoveryDestinations, discoveryReference, destinationDemand, user.discoveryLocationMode, user.hiddenDestinationIds]);
  const nextFestival = useMemo(() => getLocalEventAnnouncement(upcomingFestivals, discoveryReference), [upcomingFestivals, discoveryReference, calendarDay]);
  const eventAnnouncement = user.eventAnnouncementsEnabled !== false && !eventAnnouncementsDismissed
    ? nextFestival
    : null;
  const tourismAdvisories = useMemo(
    () => getRelevantTourismAdvisories({ destinations: data.destinations, activePoint: discoveryReference }),
    [data.destinations, discoveryReference, calendarDay]
  );
  const recommendations = useMemo(
    () => discoveryReference && (view === "overview" || view === "recommendations" || view === "tracking" || view === "itinerary") ? recommendForUser(user.id, { ...localizedData, destinations: discoveryDestinations }, latestAnalysis, destinationDemand, discoveryReference, { localOnly: true, radiusKm: user.discoveryLocationMode === "area" ? Infinity : discoveryRadiusKm, ignoreHistoryLocation: true }) : [],
    [destinationDemand, latestAnalysis, discoveryReference, discoveryDestinations, localizedData, user.id, user.discoveryLocationMode, view]
  );
  const activeSamplePoint = activeTrip && activePoints.at(-1)?.source === "demo" ? activePoints.at(-1) : undefined;
  const tripReference = activeSamplePoint ?? discoveryGpsPoint;
  const tripBrowsingReference = tripReference ?? (!activeTrip ? discoveryReference : undefined);
  const tripDestinations = useMemo(() => view === "tracking" && tripBrowsingReference ? getDiscoveryDestinations(localizedDestinations, tripReference ? { ...user, discoveryLocationMode: "current" } : user, tripBrowsingReference) : [], [localizedDestinations, tripReference, tripBrowsingReference, user, view]);
  const tripRecommendations = useMemo(() => {
    if (view !== "tracking" || !tripBrowsingReference) return [];
    if (tripBrowsingReference === discoveryReference) return recommendations;
    return recommendForUser(user.id, localizedData, latestAnalysis, destinationDemand, tripBrowsingReference, { localOnly: true, radiusKm: discoveryRadiusKm, ignoreHistoryLocation: true });
  }, [destinationDemand, discoveryReference, latestAnalysis, localizedData, recommendations, tripBrowsingReference, user.id, view]);
  const nearbyTripPlaces = tripRecommendations.flatMap((recommendation) => {
    const destination = tripDestinations.find((candidate) => candidate.id === recommendation.destinationId);
    return destination ? [destination] : [];
  });
  const selectedRoutePoint = selectedTripPoints.at(-1);
  const selectedRouteRecommendations = useMemo(() => view === "history" && selectedRoutePoint
    ? recommendForUser(user.id, localizedData, selectedTripAnalysis ?? undefined, destinationDemand, selectedRoutePoint, { localOnly: true, radiusKm: discoveryRadiusKm, ignoreHistoryLocation: true })
    : [], [destinationDemand, localizedData, selectedRoutePoint, selectedTripAnalysis, user.id, view]);
  const activeCheckIn = getActiveCheckIn(data, user.id);
  const activeCheckInDestination = activeCheckIn ? localizedDestinations.find((destination) => destination.id === activeCheckIn.destinationId) ?? null : null;
  const nearestCheckIn = discoveryGpsPoint ? nearestDestination(discoveryGpsPoint, localizedDestinations) : null;
  const recommendedCheckIn = nearestCheckIn && nearestCheckIn.distance <= 1.2 ? nearestCheckIn.destination : null;
  const geofenceWarnings = useMemo(() => getActiveGeofenceWarnings(tripReference, data.geofences), [data.geofences, tripReference]);
  const displayName = getDisplayName(user);
  const trackingFeedback = trackingQualityIssue ? activityText(locale, trackingQualityIssue) : trackingMessage;
  const t = (key: TranslationKey) => translate(locale, key);
  const showProfileSetup = !user.profileCompletedAt && !profileSetupSkipped;
  const topRecommendationDestination = recommendations[0]
    ? localizedDestinations.find((destination) => destination.id === recommendations[0].destinationId)
    : null;
  const nearbyEmergencyServices = useMemo(() => getNearbyEmergencyServices(discoveryGpsPoint), [discoveryGpsPoint]);

  useEffect(() => () => clearBrowserLocationWatch(watchId), [user.id, watchId]);
  useEffect(() => { if (view !== "overview") setToolPanelOpen(false); }, [view]);
  useEffect(() => { if (view !== "events") setSpotlightEventId(undefined); }, [view]);

  const showTrackingNotice = (tone: NotificationTone, title: string, message: string) => {
    setTrackingMessage(message);
    notify({ tone, title, message });
  };

  useEffect(() => {
    liveSuggestionDestinationIds.current.clear();
    lastSuggestionAt.current = 0;
    setLiveSuggestion(null);
  }, [activeTrip?.id, user.id, user.discoveryLocationMode]);

  useEffect(() => {
    if (user.trackingSuggestionMode === "off" || user.discoveryLocationMode === "area" || !currentConsent) {
      setLiveSuggestion(null);
      return;
    }
    const point = discoveryGpsPoint;
    if (!point || point.accuracyMeters > 200 || Date.now() - new Date(point.recordedAt).getTime() > 5 * 60 * 1000) {
      setLiveSuggestion(null);
      return;
    }
    if (liveSuggestion) {
      const stillNearby = getLiveNearbySuggestion({ point, destinations: [liveSuggestion.destination], demand: destinationDemand, user });
      if (!stillNearby) setLiveSuggestion(null);
      else if (stillNearby.distanceKm !== liveSuggestion.distanceKm || stillNearby.destination.description !== liveSuggestion.destination.description) setLiveSuggestion(stillNearby);
      return;
    }
    if (Date.now() - lastSuggestionAt.current < 2 * 60 * 1000) return;
    const suggestion = getLiveNearbySuggestion({
      point,
      destinations: localizedDestinations,
      demand: destinationDemand,
      user,
      excludeDestinationIds: liveSuggestionDestinationIds.current,
    });

    if (!suggestion) {
      return;
    }

    liveSuggestionDestinationIds.current.add(suggestion.destination.id);
    lastSuggestionAt.current = Date.now();
    setLiveSuggestion(suggestion);
  }, [currentConsent, discoveryGpsPoint, destinationDemand, localizedDestinations, user, liveSuggestion]);

  const saveDiscoveryPreferences = (preferences: Partial<User>) => {
    const current = loadData();
    onDataChange({ ...current, users: current.users.map((candidate) => candidate.id === user.id ? { ...candidate, ...preferences } : candidate) });
  };

  const refreshActivities = async () => {
    if (refreshingActivities) return;
    setRefreshingActivities(true);
    try {
      const destinations = await loadSharedDestinations();
      if (!destinations?.length) throw new Error("No shared destinations available");
      onDataChange({ ...loadData(), destinations });
    } catch {
      notify({ tone: "warning", title: activityText(locale, "title"), message: activityText(locale, "refreshFailed") });
    } finally {
      setRefreshingActivities(false);
    }
  };

  const changeDiscoveryLocation = (mode: "current" | "area", areaId?: string) => {
    setLiveSuggestion(null);
    saveDiscoveryPreferences({ discoveryLocationMode: mode, discoveryAreaId: areaId });
  };

  const hideDestination = (destinationId: string) => {
    const savedUser = loadData().users.find((candidate) => candidate.id === user.id) ?? user;
    saveDiscoveryPreferences({ hiddenDestinationIds: [...new Set([...(savedUser.hiddenDestinationIds ?? []), destinationId])] });
    setLiveSuggestion(null);
  };

  const openSuggestedPlace = () => {
    if (liveSuggestion) { setSelectedDestinationId(liveSuggestion.destination.id); setPlaceGuideRequested(true); }
    setLiveSuggestion(null);
    onViewChange("recommendations");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const warningKey = geofenceWarnings.map((warning) => warning.geofence.id).join("|");
    if (!warningKey) {
      geofenceNoticeKey.current = "";
      return;
    }

    if (warningKey !== geofenceNoticeKey.current) {
      const warning = geofenceWarnings[0];
      geofenceNoticeKey.current = warningKey;
      notify({ tone: warning.tone, title: warning.geofence.name, message: warning.geofence.message, browser: true });
    }
  }, [geofenceWarnings, notify]);

  useEffect(() => {
    if (!activeTrip || !currentConsent) {
      clearBrowserLocationWatch(watchId);
      setIsLiveTracking(false);
    }
  }, [activeTrip?.id, currentConsent?.id, isLiveTracking, watchId]);

  useEffect(() => {
    setLastBrowserLocation(loadLastBrowserLocation(user.id));
  }, [user.id]);

  useEffect(() => {
    if (!currentConsent || activeTrip || user.discoveryLocationMode === "area" || !hasBrowserGeolocation()) {
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return;
        }

        const browserPoint = movementPointFromBrowserPosition(position, `browser-preview-${user.id}`, user.id);
        const issue = getMovementQualityIssue(browserPoint, undefined, Date.now(), true);
        if (issue) {
          setTrackingQualityIssue(issue);
          return;
        }
        setTrackingQualityIssue(null);
        setLastBrowserLocation(browserPoint);
        saveLastBrowserLocation(user.id, browserPoint);
      },
      undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [activeTrip, currentConsent, user.id, user.discoveryLocationMode]);

  const grantConsent = () => {
    onDataChange(grantLocationConsent(data, user.id));
    notify({ tone: "success", title: "Location consent saved", message: "You can start a tracked trip when you are ready." });
  };

  const appendPoint = (
    tripId: string,
    latitude: number,
    longitude: number,
    accuracyMeters: number,
    source: "browser" | "demo",
    options: { quietDuplicate?: boolean; recordedAt?: string } = {}
  ) => {
    const result = appendMovementPoint(loadData(), {
      tripId,
      latitude,
      longitude,
      accuracyMeters,
      source,
      recordedAt: options.recordedAt,
    });

    if (result.error || !result.data) {
      if (result.qualityIssue) {
        setTrackingQualityIssue(result.qualityIssue);
        return false;
      }
      if (options.quietDuplicate && result.error?.includes("too close")) {
        return false;
      }

      showTrackingNotice("error", "Movement point not saved", result.error ?? "Movement point could not be saved.");
      return false;
    }

    onDataChange(result.data);
    return result.point ?? true;
  };

  const startLocationWatch = (tripId: string, message: string) => {
    setLocationRetryAvailable(false);

    if (!hasBrowserGeolocation()) {
      showTrackingNotice("warning", "Browser location unavailable", "Browser geolocation is unavailable. Demo points can still be added manually.");
      setLocationRetryAvailable(true);
      setIsLiveTracking(false);
      return false;
    }

    if (watchId.current !== null) {
      if (!locationRetryAvailable) {
        setIsLiveTracking(true);
        showTrackingNotice("info", "Tracking already active", "Live browser tracking is already active.");
        return true;
      }
      clearBrowserLocationWatch(watchId);
    }

    const isCurrentWatch = createBrowserLocationWatchGuard(watchId);
    const rememberBrowserPosition = (position: GeolocationPosition, saveInitialPoint = false) => {
      if (!isCurrentWatch()) return false;
      const current = loadData();
      if (!current.trips.some((trip) => trip.id === tripId && trip.userId === user.id && trip.status === "active") || !current.consents.some((consent) => consent.userId === user.id && consent.granted)) return false;
      const browserPoint = movementPointFromBrowserPosition(position, tripId, user.id);
      const previous = loadLastBrowserLocation(user.id);
      const issue = getMovementQualityIssue(browserPoint, previous?.tripId === tripId ? previous : undefined, Date.now(), true);
      if (issue) {
        setTrackingQualityIssue(issue);
        return false;
      }
      setTrackingQualityIssue(null);
      setLastBrowserLocation(browserPoint);
      saveLastBrowserLocation(user.id, browserPoint);
      setLocationRetryAvailable(false);

      if (saveInitialPoint) {
        appendPoint(tripId, position.coords.latitude, position.coords.longitude, position.coords.accuracy, "browser", { quietDuplicate: true, recordedAt: browserPoint.recordedAt });
      }
      return true;
    };

    const saveBrowserPosition = (position: GeolocationPosition) => {
      if (!rememberBrowserPosition(position)) return;
      const saved = appendPoint(tripId, position.coords.latitude, position.coords.longitude, position.coords.accuracy, "browser", { quietDuplicate: true, recordedAt: new Date(position.timestamp || Date.now()).toISOString() });
      if (saved) {
        setTrackingMessage("Live movement point recorded.");
      }
    };
    browserPositionHandler.current = saveBrowserPosition;

    navigator.geolocation.getCurrentPosition(
      (position) => rememberBrowserPosition(position, true),
      undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 12000,
      }
    );

    watchId.current = navigator.geolocation.watchPosition(
      saveBrowserPosition,
      (error) => {
        if (!isCurrentWatch() || !loadData().trips.some((trip) => trip.id === tripId && trip.userId === user.id && trip.status === "active")) return;
        if (error.code === error.PERMISSION_DENIED) {
          clearBrowserLocationWatch(watchId);
          setIsLiveTracking(false);

          const stopped = stopActiveTrip(loadData(), user.id);
          if (stopped.data) {
            onDataChange(refreshAllRecommendations(stopped.data));
          }
        }

        setLocationRetryAvailable(error.code !== error.PERMISSION_DENIED);
        showTrackingNotice("error", "Location tracking stopped", geolocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    setIsLiveTracking(true);
    showTrackingNotice("success", "Trip tracking active", message);
    return true;
  };

  useEffect(() => {
    if (!activeTrip || !currentConsent || !isLiveTracking) return;
    let cancelled = false;
    // Some watches are quiet while stationary; periodic foreground readings provide dwell evidence.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || watchId.current === null) return;
      navigator.geolocation.getCurrentPosition((position) => {
        if (!cancelled && watchId.current !== null) browserPositionHandler.current?.(position);
      }, () => undefined, { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 });
    }, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeTrip?.id, currentConsent?.id, isLiveTracking, watchId]);

  const beginTrip = (fresh: boolean) => {
    const result = fresh ? startFreshTripSession(loadData(), user.id) : startTripSession(loadData(), user.id);
    if (result.error || !result.trip || !result.data) {
      showTrackingNotice("error", "Trip could not start", result.error ?? "Trip could not be started.");
      return;
    }

    onDataChange(result.data);
    startLocationWatch(result.trip.id, "Trip started and live browser tracking is active.");
  };
  const startTrip = () => beginTrip(false);
  const startNewTrip = () => beginTrip(true);

  const resumeLiveTracking = () => {
    if (!activeTrip) {
      showTrackingNotice("warning", "No active trip", "No active trip is available to resume.");
      return;
    }

    startLocationWatch(activeTrip.id, "Live browser tracking resumed for the active trip.");
  };

  const stopTrip = () => {
    clearBrowserLocationWatch(watchId);
    setIsLiveTracking(false);
    setLocationRetryAvailable(false);

    const result = stopActiveTrip(loadData(), user.id);
    if (result.error || !result.data) {
      showTrackingNotice("error", "Trip could not stop", result.error ?? "Trip could not be stopped.");
      return;
    }

    onDataChange(refreshAnalysis(result.data, user.id));
    setSelectedTripId(result.tripId);
    showTrackingNotice("success", "Trip completed", "Trip stopped and recommendation analysis refreshed.");
  };

  const addDemoPoint = () => {
    if (!activeTrip) {
      return;
    }

    const currentPoints = data.points
      .filter((point) => point.tripId === activeTrip.id)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    const anchor = currentPoints.at(-1) ?? latestKnownPoint;
    const profile = user.expectedProfile ?? "mixed";
    const localDestinations = getLocalSampleDestinations(data, profile, anchor);
    const destination = localDestinations[currentPoints.length % localDestinations.length];

    if (!destination) {
      showTrackingNotice("error", "Test movement unavailable", "No saved destination is available for a test movement point.");
      return;
    }

    const point = simulatedPointNear(destination, currentPoints.length);
    const saved = appendPoint(activeTrip.id, point.latitude, point.longitude, 32, "demo");
    if (saved) {
      showTrackingNotice("success", "Test movement added", `A test movement point was added near ${destination.name}.`);
    }
  };

  const addLocalTestRoute = () => {
    const result = addLocalTestRouteToActiveTrip(loadData(), user.id, latestKnownPoint);
    if (result.error || !result.data) {
      showTrackingNotice("error", "Test route unavailable", result.error ?? "Local test route could not be added.");
      return;
    }

    onDataChange(result.data, user);
    showTrackingNotice(
      "success",
      "Local test route added",
      `${result.pointCount} nearby movement points were added around ${result.destinationNames?.slice(0, 3).join(", ")}.`
    );
  };

  const createSampleRoute = () => {
    if (activeTrip) {
      showTrackingNotice("warning", "Finish active trip first", "Finish the current trip before adding a completed sample route.");
      return;
    }

    const result = createSampleTripForUser(data, user.id, latestKnownPoint);
    if (result.error || !result.data || !result.tripId) {
      showTrackingNotice("error", "Sample route unavailable", result.error ?? "Sample route could not be created.");
      return;
    }

    const refreshed = refreshAnalysis(result.data, user.id);
    onDataChange(refreshed, user);
    setSelectedTripId(result.tripId);
    showTrackingNotice(
      "success",
      "Sample Malaysia route added",
      `${result.pointCount} movement point(s) were added to your account so distance, route history, AI analysis and recommendations can be tested.`
    );
  };

  const addManualPoint = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTrip) {
      showTrackingNotice("warning", "Start a trip first", "Start a trip before saving a manual movement point.");
      return;
    }

    const saved = appendPoint(activeTrip.id, Number(manualLocation.latitude), Number(manualLocation.longitude), Number(manualLocation.accuracyMeters), "demo");
    if (saved) {
      showTrackingNotice("success", "Manual point saved", "Manual movement point saved to the active trip.");
    }
  };

  const refreshRecommendations = () => {
    onDataChange(refreshAnalysis(data, user.id));
    notify({ tone: "success", title: "Recommendations refreshed", message: "Your latest trip analysis has been recalculated." });
  };

  const revokeConsent = () => {
    clearBrowserLocationWatch(watchId);
    setIsLiveTracking(false);
    setLocationRetryAvailable(false);

    const nextData = revokeLocationConsent(data, user.id);
    onDataChange(refreshAllRecommendations(nextData));
    showTrackingNotice("info", "Location consent revoked", "Location consent revoked. Active tracking has been stopped.");
  };

  const deleteMyMovementData = () => {
    clearBrowserLocationWatch(watchId);
    setIsLiveTracking(false);

    const nextData = deleteTouristMovementData(data, user.id);
    onDataChange(refreshAllRecommendations(nextData));
    setSelectedTripId("");
    showTrackingNotice("success", "Movement data deleted", "Your movement history and AI recommendation records were deleted.");
  };

  const renameTrip = (trip: TripSession, fallbackTitle: string) => {
    setTripLabelDraft(trip.label ?? fallbackTitle);
    setTripDialog({ kind: "rename", trip });
  };

  const saveTripName = (trip: TripSession) => {
    const nextLabel = tripLabelDraft;

    const result = updateTripLabel(data, user.id, trip.id, nextLabel);
    if (result.error || !result.data) {
      notify({ tone: "error", title: "Trip name not saved", message: result.error ?? "Try again in a moment." });
      return;
    }

    onDataChange(refreshAllRecommendations(result.data));
    setTripDialog(null);
    notify({ tone: "success", title: "Trip name saved", message: nextLabel.trim() ? "This trip now uses your custom name." : "This trip now uses its automatic route name." });
  };

  const deleteSelectedTrip = (trip: TripSession, fallbackTitle: string) => {
    if (!window.confirm(`${fallbackTitle}\n\n${reviewText(locale, "retention")}`)) {
      return;
    }

    if (trip.status === "active" && watchId.current !== null) {
      clearBrowserLocationWatch(watchId);
      setIsLiveTracking(false);
      setLocationRetryAvailable(false);
    }

    const result = archiveTrip(loadData(), user.id, trip.id);
    if (result.error || !result.data) {
      notify({ tone: "error", title: reviewText(locale, "removeFailed"), message: result.error ?? "Try again in a moment." });
      return;
    }

    const nextTrip = recentTrips.find((candidate) => candidate.id !== trip.id);
    onDataChange(refreshAllRecommendations(result.data));
    setSelectedTripId(nextTrip?.id ?? "");
    notify({ tone: "success", title: reviewText(locale, "removed"), message: reviewText(locale, "retention") });
  };

  const saveProfile = (nextUser: User) => {
    const nextData = {
      ...data,
      users: data.users.map((candidate) => (candidate.id === user.id ? nextUser : candidate)),
    };
    saveProfileSetupSkipped(user.id, false);
    setProfileSetupSkipped(false);
    onDataChange(refreshAllRecommendations(nextData), nextUser);
    notify({ tone: "success", title: "Profile saved", message: "Your travel preferences will be used for recommendations." });
  };

  const sendSosAlert = () => {
    const result = createSosAlert(loadData(), user.id, discoveryGpsPoint);
    if (result.alreadyOpen) {
      notify({ tone: "info", title: emergencyHelpText(locale, "recorded"), message: sosText(locale, "activeExists") });
      return;
    }
    onDataChange(result.data, user, { sosAlert: result.alert });
    notify({
      tone: "warning",
      title: emergencyHelpText(locale, "recorded"),
      message: emergencyHelpText(locale, discoveryGpsPoint ? "withLocation" : "withoutLocation"),
      browser: true,
    });
  };

  const handleIncidentPhotoChange = async (file: File | null) => {
    if (!file) {
      setIncidentPhoto(null);
      setIncidentPhotoMessage(null);
      return;
    }

    setIsPreparingIncidentPhoto(true);
    setIncidentPhotoMessage("Preparing photo evidence...");
    const result = await prepareIncidentPhotoAttachment(file);
    setIsPreparingIncidentPhoto(false);

    if (result.error || !result.attachment) {
      setIncidentPhoto(null);
      setIncidentPhotoMessage(result.error ?? "Incident photo could not be prepared.");
      notify({ tone: "error", title: "Photo not attached", message: result.error ?? "Try a smaller image or submit without a photo." });
      return;
    }

    setIncidentPhoto(result.attachment);
    setIncidentPhotoMessage(`${result.attachment.photoName} attached.`);
    notify({ tone: "success", title: "Photo attached", message: "The incident photo will be submitted with the report." });
  };

  const closeSosAlert = (id: string, reason: SosClosureReason) => {
    const current = loadData();
    const next = closeOwnSosAlert(current, user.id, id, reason);
    if (next === current) return;
    onDataChange(next, user, { sosAlert: next.sosAlerts.find((alert) => alert.id === id)! });
    notify({ tone: "info", title: sosText(locale, "saved"), message: sosText(locale, "savedDetail") });
  };

  const removeIncidentPhoto = () => {
    setIncidentPhoto(null);
    setIncidentPhotoMessage(null);
  };

  const submitIncidentReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createIncidentReport(data, {
      userId: user.id,
      type: incidentType,
      description: incidentDescription,
      locationNote: incidentLocationNote,
      location: discoveryGpsPoint,
      photoDataUrl: incidentPhoto?.photoDataUrl,
      photoName: incidentPhoto?.photoName,
      photoType: incidentPhoto?.photoType,
      photoSizeBytes: incidentPhoto?.photoSizeBytes,
      photoCapturedAt: incidentPhoto?.photoCapturedAt,
    });

    if (result.error || !result.data) {
      notify({ tone: "error", title: "Incident report not saved", message: result.error ?? "Check the report details and try again." });
      return;
    }

    onDataChange(result.data, user);
    setIncidentDescription("");
    setIncidentLocationNote("");
    setIncidentPhoto(null);
    setIncidentPhotoMessage(null);
    notify({ tone: "success", title: "Incident report saved", message: "Tourism administrators can review this case from the dashboard.", browser: true });
  };

  const startAttractionCheckIn = (destinationIdOverride?: string) => {
    if (!hasTouristIdentity(user)) { notify({ tone: "warning", title: reviewText(locale, "identity"), message: reviewText(locale, "identityRequired") }); onViewChange("profile"); return; }
    const destinationId = destinationIdOverride ?? checkInDestinationId;
    const result = createAttractionCheckIn(data, {
      userId: user.id,
      destinationId,
      tripId: activeTrip?.id,
      location: discoveryGpsPoint,
    });

    if (result.error || !result.data) {
      notify({ tone: "error", title: "Check-in not saved", message: result.error ?? "Choose an attraction and try again." });
      return;
    }

    const destination = localizedDestinations.find((candidate) => candidate.id === destinationId);
    onDataChange(result.data, user, { checkIn: result.checkIn });
    notify({ tone: "success", title: "Checked in", message: destination ? `${destination.name} was added to your visit log.` : "Your attraction visit was added.", browser: true });
  };

  const locateUnlistedPlace = (): Promise<{ point?: MovementPoint; error?: string }> => {
    if (!hasBrowserGeolocation()) return Promise.resolve({ error: placeText(locale, "location") });
    const current = loadData();
    if (!current.consents.some((consent) => consent.userId === user.id && consent.granted)) onDataChange(grantLocationConsent(current, user.id), user);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition((position) => {
        const point = movementPointFromBrowserPosition(position, activeTrip?.id ?? "unlisted-checkin", user.id);
        if (getMovementQualityIssue(point, undefined, Date.now(), true) || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) { resolve({ error: placeText(locale, "location") }); return; }
        setLastBrowserLocation(point); saveLastBrowserLocation(user.id, point);
        resolve({ point });
      }, (error) => resolve({ error: uiText(locale, geolocationErrorMessage(error)) }), { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    });
  };

  const startUnlistedCheckIn = async (draft: UnlistedPlaceDraft, point?: MovementPoint): Promise<string | null> => {
    if (!hasTouristIdentity(user)) return reviewText(locale, "identityRequired");
    const result = createUnlistedCheckIn(loadData(), user.id, draft, point);
    if (result.error || !result.data) return placeText(locale, result.error ?? "invalid");
    const synced = await onDataChange(result.data, user, { checkIn: result.checkIn });
    if (synced === false) return unlistedLocationText(locale, "saveFailed");
    notify({ tone: "success", title: t("tourist.checkin.checkIn"), message: placeText(locale, "saved") });
    return null;
  };

  useEffect(() => {
    if (!pendingCheckInDestinationId) {
      return;
    }

    const destination = localizedDestinations.find((candidate) => candidate.id === pendingCheckInDestinationId);
    onPendingCheckInConsumed();

    if (!destination) {
      notify({ tone: "error", title: "Check-in link not recognised", message: "This QR code is not linked to a destination in the app." });
      return;
    }

    setCheckInDestinationId(destination.id);
    setShowCheckInPanel(true);
    if (view !== "overview") {
      onViewChange("overview");
    }

    if (!activeCheckIn) {
      startAttractionCheckIn(destination.id);
    } else if (activeCheckIn.destinationId === destination.id) {
      notify({ tone: "info", title: "Already checked in", message: `${destination.name} is already your active visit.` });
    } else {
      notify({ tone: "warning", title: "Check-out needed first", message: "You already have an active attraction visit. Check out before scanning another place." });
    }

    window.setTimeout(() => {
      document.getElementById("tourist-check-in")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 80);
  }, [activeCheckIn, localizedDestinations, notify, onPendingCheckInConsumed, onViewChange, pendingCheckInDestinationId, startAttractionCheckIn, view]);

  const finishAttractionCheckIn = async () => {
    if (checkingOut) return;
    if (!activeCheckIn) {
      notify({ tone: "error", title: "No active check-in", message: "There is no attraction visit to check out from." });
      return;
    }

    const result = checkOutFromAttraction(data, activeCheckIn.id);
    if (result.error || !result.data) {
      notify({ tone: "error", title: "Check-out not saved", message: result.error ?? "Try again in a moment." });
      return;
    }

    setCheckingOut(true);
    try {
      const synced = await onDataChange(result.data, user, { checkIn: result.checkIn });
      if (synced === false) throw new Error("Checkout not accepted");
      notify({ tone: "success", title: "Checked out", message: "Your attraction visit duration was saved.", browser: true });
    } catch {
      notify({ tone: "error", title: t("tourist.checkin.checkOut"), message: t("publicCheckin.saveErrorMessage") });
    } finally { setCheckingOut(false); }
  };

  const skipProfileSetup = () => {
    saveProfileSetupSkipped(user.id, true);
    setProfileSetupSkipped(true);
    notify({ tone: "info", title: "Profile skipped", message: "You can complete your travel profile later from Home." });
  };

  const browseAreaNear = (location: Pick<MovementPoint, "latitude" | "longitude"> | Destination) => {
    const area = discoveryAreas.reduce((nearest, candidate) => distanceKm(location, candidate) < distanceKm(location, nearest) ? candidate : nearest);
    changeDiscoveryLocation("area", `state:${"city" in location ? getDestinationState(location) ?? area.state : area.state}`);
  };
  const openPlace = (destinationId: string) => {
    const destination = data.destinations.find((candidate) => candidate.id === destinationId);
    if (destination && !canonicalDiscoveryDestinations.some((candidate) => candidate.id === destinationId)) {
      if (view === "tracking" && tripReference?.source === "browser") changeDiscoveryLocation("current");
      else browseAreaNear(destination);
    }
    setSelectedDestinationId(destinationId);
    setPlaceGuideRequested(true);
    onViewChange("recommendations");
  };
  const openSafety = () => {
    setIdentitySafetyAccess(true);
    setShowCheckInPanel(false);
    setOpenSafetyPanel(true);
    onViewChange("overview");
  };
  const discoveryPrompt = !showCheckInPanel && !toolPanelOpen && !hasNotifications ? <DiscoveryPrompt
    suggestion={liveSuggestion}
    event={view === "tracking" || liveSuggestion ? null : eventAnnouncement}
    locale={locale}
    onClose={() => { if (liveSuggestion) setLiveSuggestion(null); else setEventAnnouncementsDismissed(true); }}
    onView={() => { if (liveSuggestion) openSuggestedPlace(); else { setEventAnnouncementsDismissed(true); onViewChange("events"); } }}
    onHide={() => { if (liveSuggestion) hideDestination(liveSuggestion.destination.id); }}
    onSettings={() => { setLiveSuggestion(null); onViewChange("profile"); }}
  /> : null;
  const tripActionDialog = tripDialog ? <TripActionDialog kind={tripDialog.kind} label={tripLabelDraft} locale={locale} onLabelChange={setTripLabelDraft} onCancel={() => setTripDialog(null)} onConfirm={() => {
    if (tripDialog.kind === "rename") saveTripName(tripDialog.trip);
    else { setTripDialog(null); stopTrip(); }
  }} /> : null;

  if (view === "profile") {
    return (
      <Page title={t("tourist.profile.pageTitle")} eyebrow={t("common.tourist")}>
        <section className="profile-page-grid">
          <TouristProfileForm
            user={user}
            title={t("tourist.profile.formTitle")}
            description={t("tourist.profile.formDescription")}
            primaryLabel={t("tourist.profile.saveProfile")}
            locale={locale}
            onSave={saveProfile}
          />
          <TouristPassCard user={user} locale={locale} />
        </section>
      </Page>
    );
  }

  if ((!hasTouristIdentity(user) && !(view === "overview" && identitySafetyAccess)) || (view === "overview" && showProfileSetup && !identitySafetyAccess)) {
    return (
      <Page title={t("tourist.profile.setupPageTitle")} eyebrow={t("common.tourist")}>
        <button className="secondary-action" type="button" onClick={openSafety}><ShieldCheck size={18} />{t("tourist.safety.eyebrow")}</button>
        <TouristProfileForm
          user={user}
          title={t("tourist.profile.setupTitle")}
          description={hasTouristIdentity(user) ? t("tourist.profile.setupDescription") : t("tourist.profile.formDescription")}
          primaryLabel={t("tourist.profile.saveProfile")}
          secondaryLabel={t("tourist.profile.skipForNow")}
          locale={locale}
          onSave={saveProfile}
          onSkip={hasTouristIdentity(user) ? skipProfileSetup : undefined}
        />
      </Page>
    );
  }

  if (view === "tracking") {
    return <><Page title={travelText(locale, "tripTitle")} eyebrow={t("common.tourist")}>
      <TripExperience activeTrip={activeTrip} consent={currentConsent} points={activePoints} reference={tripBrowsingReference} gpsFix={activeGpsFix} gpsAttention={Boolean(trackingQualityIssue)} isBrowsingArea={!tripReference && Boolean(discoveryReference)} destinations={tripDestinations} nearbyPlaces={nearbyTripPlaces} demand={destinationDemand} summary={activeTripSummary} trackingMessage={trackingFeedback} isLiveTracking={isLiveTracking} locationRetryAvailable={locationRetryAvailable} geofenceWarnings={geofenceWarnings} locale={locale} syncStatus={syncStatus} onAllowLocation={grantConsent} onStart={startTrip} onStartNew={startNewTrip} onStop={() => setTripDialog({ kind: "stop" })} onResume={resumeLiveTracking} onManage={() => onViewChange("history")} onPlan={() => onViewChange("itinerary")} onOpenPlace={openPlace} onSafety={openSafety} />
    </Page>{discoveryPrompt}{tripActionDialog}</>;
  }

  if (view === "itinerary") {
    return <Suspense fallback={<p role="status">{travelText(locale, "itinerary")}…</p>}><ItineraryPage key={user.id} user={user} destinations={localizedDestinations} suggestedIds={recommendations.map((item) => item.destinationId)} locale={locale} onBack={() => onViewChange("tracking")} onOpenPlace={openPlace} /></Suspense>;
  }

  if (view === "history") {
    const selectedTripTitle = selectedTrip ? formatTripTitle(selectedTrip, selectedTripDestinationNames, t) : t("tourist.trips.noTripSelected");
    const selectedTripInsight = selectedTripSummary ? getTripDiaryInsight(selectedTripSummary, selectedTripDestinationNames, t) : "";
    const selectedTripSuggestionStatus = selectedTripSummary ? getTripSuggestionStatus(selectedTripSummary, selectedTripAnalysis, t) : t("common.waiting");

    return (
      <Page title={travelText(locale, "manage")} eyebrow={t("nav.trips")} actions={<button className="secondary-action" type="button" onClick={() => onViewChange("tracking")}><Navigation size={18} />{travelText(locale, "back")}</button>}>
        <section className="trip-management-tools">
          <button className="secondary-action" type="button" onClick={() => onViewChange("profile")}><Compass size={18} />{t("tourist.profile.formTitle")}</button>
          <details><summary>{travelText(locale, "privacy")}</summary><p>{travelText(locale, "locationNote")}</p><button className="secondary-action" type="button" onClick={currentConsent ? revokeConsent : grantConsent}><ShieldCheck size={18} />{uiText(locale, currentConsent ? "Revoke consent" : "Allow location")}</button><button className="secondary-action danger" type="button" onClick={deleteMyMovementData} disabled={!data.trips.some((trip) => trip.userId === user.id) && !data.points.some((point) => point.userId === user.id)}><Trash2 size={18} />{uiText(locale, "Delete my route history")}</button></details>
          <details><summary>{travelText(locale, "sampleTools")}</summary><p>{travelText(locale, "sampleNote")}</p><div className="action-row"><button className="secondary-action" type="button" onClick={createSampleRoute} disabled={Boolean(activeTrip)}><Compass size={18} />{t("tourist.home.addSampleRoute")}</button><button className="secondary-action" type="button" onClick={addDemoPoint} disabled={!activeTrip}>{t("tourist.home.addDemoPoint")}</button><button className="secondary-action" type="button" onClick={addLocalTestRoute} disabled={!activeTrip}><Navigation size={18} />{t("tourist.home.simulateLocalRoute")}</button></div>
            <form className="mini-form" onSubmit={addManualPoint}><div className="field-pair"><label>{uiText(locale, "Latitude")}<input value={manualLocation.latitude} onChange={(event) => setManualLocation({ ...manualLocation, latitude: event.target.value })} required /></label><label>{uiText(locale, "Longitude")}<input value={manualLocation.longitude} onChange={(event) => setManualLocation({ ...manualLocation, longitude: event.target.value })} required /></label></div><label>{uiText(locale, "Accuracy meters")}<input value={manualLocation.accuracyMeters} onChange={(event) => setManualLocation({ ...manualLocation, accuracyMeters: event.target.value })} required /></label><button className="secondary-action" type="submit" disabled={!activeTrip}><Save size={18} />{uiText(locale, "Save manual point")}</button></form>
          </details>
        </section>
        <TripDiary
          trips={userTrips}
          recentTrips={recentTrips}
          tripSummaries={tripSummaries}
          selectedTrip={selectedTrip}
          selectedTripPoints={selectedTripPoints}
          selectedTripSummary={selectedTripSummary}
          selectedTripTitle={selectedTripTitle}
          selectedTripInsight={selectedTripInsight}
          selectedTripSuggestionStatus={selectedTripSuggestionStatus}
          selectedTripDestinationNames={selectedTripDestinationNames}
          selectedTripRecommendations={selectedRouteRecommendations}
          fallbackPoints={tripPoints}
          destinations={localizedDestinations}
          activityDemand={destinationDemand}
          hasPersonalizedRecommendations={Boolean(selectedTripAnalysis)}
          locale={locale}
          onSelectTrip={setSelectedTripId}
          onViewRecommendations={() => { if (selectedRoutePoint) browseAreaNear(selectedRoutePoint); onViewChange("recommendations"); }}
          onOpenPlace={openPlace}
          onRenameTrip={renameTrip}
          onDeleteTrip={deleteSelectedTrip}
        />
        {tripActionDialog}
      </Page>
    );
  }

  if (view === "recommendations") {
    return (
      <Page
        title={t("tourist.recommendations.pageTitle")}
        eyebrow={t("common.tourist")}
        actions={
          <button className="secondary-action" onClick={refreshRecommendations}>
            <RotateCcw size={18} />
            {t("common.refresh")}
          </button>
        }
      >
        <DiscoveryAreaPicker user={user} locale={locale} onChange={changeDiscoveryLocation} onSettings={() => onViewChange("profile")} />
        <ActivityBasis destinations={discoveryDestinations} user={user} locale={locale} onRefresh={user.authUid ? refreshActivities : undefined} refreshing={refreshingActivities} />
        <PlaceDiscovery
          destinations={canonicalDiscoveryDestinations}
          demand={destinationDemand}
          festivals={upcomingFestivals}
          recommendations={recommendations}
          user={user}
          latestAnalysis={latestAnalysis}
          visitedIds={visitedDestinationIds}
          referencePoint={discoveryReference}
          selectedDestinationId={selectedDestinationId}
          locale={locale}
          onSelectDestination={setSelectedDestinationId}
          guideRequested={placeGuideRequested}
          requestedDestination={data.destinations.find((destination) => destination.id === selectedDestinationId)}
          onGuideRequestConsumed={() => setPlaceGuideRequested(false)}
          onCheckIn={(id) => { setCheckInDestinationId(id); setShowCheckInPanel(true); onViewChange("overview"); }}
          onOpenEvents={() => onViewChange("events")}
          onHideDestination={hideDestination}
          isBrowsingArea={user.discoveryLocationMode === "area"}
        />
      </Page>
    );
  }

  if (view === "events") {
    return (
      <Page title={t("tourist.events.pageTitle")} eyebrow={t("common.tourist")}>
        <section className="event-calendar-page">
          <section className="calendar-window"><CalendarDays size={22} aria-hidden="true" /><strong>{t("tourist.events.next12Months")}</strong><span>{upcomingFestivals.length} {t("tourist.events.eventSignals")}</span></section>
          <DiscoveryAreaPicker user={user} locale={locale} onChange={changeDiscoveryLocation} onSettings={() => onViewChange("profile")} />
          <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} locale={locale} initialEventId={spotlightEventId} referencePoint={discoveryReference} referenceState={user.discoveryLocationMode === "area" ? getDiscoveryState(user.discoveryAreaId) : undefined} />
        </section>
      </Page>
    );
  }

  return (
    <>
    <TouristHome
      displayName={displayName}
      trackingStatus={activeTrip ? <TrackingStatus point={activePoints.at(-1)} fix={activeGpsFix} attention={Boolean(trackingQualityIssue) || locationRetryAvailable} listening={isLiveTracking} syncStatus={syncStatus} locale={locale} /> : undefined}
      activeTrip={activeTrip}
      currentConsent={currentConsent}
      destinations={discoveryReference ? discoveryDestinations : localizedDestinations}
      checkInDestinations={localizedDestinations}
      discoveryControl={<DiscoveryAreaPicker user={user} locale={locale} onChange={changeDiscoveryLocation} onSettings={() => onViewChange("profile")} />}
      hasLocalReference={Boolean(discoveryReference)}
      geofenceWarnings={geofenceWarnings}
      tourismAdvisories={tourismAdvisories}
      activeCheckIn={activeCheckIn}
      activeCheckInDestination={activeCheckInDestination}
      checkInDestinationId={checkInDestinationId}
      showCheckInPanel={showCheckInPanel}
      onCloseCheckInPanel={() => { setShowCheckInPanel(false); onViewChange("overview"); }}
      openSafetyPanel={openSafetyPanel}
      onSafetyPanelOpened={() => setOpenSafetyPanel(false)}
      recentCheckIns={recentCheckIns}
      recommendedCheckIn={recommendedCheckIn}
      openSafetyCount={openSafetyCount}
      user={user}
      incidentType={incidentType}
      incidentDescription={incidentDescription}
      incidentLocationNote={incidentLocationNote}
      incidentPhoto={incidentPhoto}
      incidentPhotoMessage={incidentPhotoMessage}
      isPreparingIncidentPhoto={isPreparingIncidentPhoto}
      incidentTypeOptions={incidentTypeOptions}
      userSosAlerts={userSosAlerts}
      userIncidentReports={userIncidentReports}
      nearbyEmergencyServices={nearbyEmergencyServices}
      safetyReferencePoint={discoveryGpsPoint ?? discoveryReference}
      isSafetyAreaReference={!discoveryGpsPoint && user.discoveryLocationMode === "area"}
      topRecommendationDestination={topRecommendationDestination ?? (discoveryReference ? discoveryDestinations[0] : localizedDestinations[0])}
      nextFestival={nextFestival}
      spotlightEvents={upcomingFestivals}
      spotlightContext={spotlightContext}
      onOpenSpotlightEvent={(id) => { setSpotlightEventId(id); onViewChange("events"); }}
      locale={locale}
      onViewChange={onViewChange}
      onGrantConsent={grantConsent}
      onOpenPlace={openPlace}
      onCheckInDestinationChange={setCheckInDestinationId}
      onStartAttractionCheckIn={startAttractionCheckIn}
      onFinishAttractionCheckIn={finishAttractionCheckIn}
      checkingOut={checkingOut}
      onUnlistedCheckIn={startUnlistedCheckIn}
      onLocateUnlistedPlace={locateUnlistedPlace}
      onToolPanelOpenChange={setToolPanelOpen}
      onSendSosAlert={sendSosAlert}
      onCloseSosAlert={closeSosAlert}
      onIncidentTypeChange={setIncidentType}
      onIncidentDescriptionChange={setIncidentDescription}
      onIncidentLocationNoteChange={setIncidentLocationNote}
      onIncidentPhotoChange={handleIncidentPhotoChange}
      onRemoveIncidentPhoto={removeIncidentPhoto}
      onSubmitIncidentReport={submitIncidentReport}
    />
    {discoveryPrompt}
    </>
  );
}
