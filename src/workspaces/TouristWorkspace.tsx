import { useEffect, useMemo, useRef, useState } from "react";
import { useCalendarDay } from "../services/useCalendarDay";
import { Compass, Navigation, RotateCcw, Play, Save, ShieldCheck, Square, Trash2 } from "lucide-react";
import type { AppData, AppView, IncidentType, MovementPoint, SosClosureReason, TripSession, User } from "../types";
import { loadData, loadSharedDestinations } from "../services/storage";
import { nearestDestination } from "../services/geo";
import { recommendForUser, refreshAllRecommendations, refreshAnalysis } from "../services/analytics";
import { malaysiaFestivalEvents } from "../data/festivals";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { getUpcomingFestivals } from "../services/festivals";
import { getRelevantTourismAdvisories } from "../services/advisories";
import { appendMovementPoint, addLocalTestRouteToActiveTrip, createSampleTripForUser, deleteTrip, deleteTouristMovementData, getLocalSampleDestinations, grantLocationConsent, revokeLocationConsent, simulatedPointNear, startTripSession, stopActiveTrip, updateTripLabel } from "../services/movement";
import { checkOutFromAttraction, createAttractionCheckIn, getActiveCheckIn } from "../services/checkIns";
import { getActiveGeofenceWarnings } from "../services/geofencing";
import { closeOwnSosAlert, createIncidentReport, createSosAlert } from "../services/safety";
import { sosText } from "../services/sosCopy";
import { getTouristWorkspaceData } from "../services/touristWorkspace";
import { formatTripTitle, getTripDiaryInsight, getTripSuggestionStatus } from "../services/tripPresentation";
import { prepareIncidentPhotoAttachment, type IncidentPhotoAttachment } from "../services/incidentAttachments";
import { getLiveNearbySuggestion, type LiveNearbySuggestion } from "../services/liveSuggestions";
import { discoveryRadiusKm, getDiscoveryDestinations, getDiscoveryReference, getLatestDiscoveryPoint, getLocalEventAnnouncement } from "../services/discovery";
import { discoveryAreas } from "../data/discoveryAreas";
import { DiscoveryLocationControl } from "../components/DiscoveryLocationControl";
import { DiscoveryPrompt } from "../components/DiscoveryPrompt";
import { ActivityBasis } from "../components/ActivityBasis";
import { activityText } from "../services/activityCopy";
import { getTouristDestinationDemand } from "../services/activitySummary";
import { getMovementQualityIssue, type MovementQualityIssue } from "../services/movementQuality";
import { getNearbyEmergencyServices } from "../services/emergencyServices";
import { emergencyHelpText } from "../services/emergencyHelpCopy";
import { localizeDestinations } from "../services/destinationLocale";
import { CompletedTripSummary, MetricGrid } from "../components/SummaryCards";
import { type NotificationTone, type NotifyFn } from "../components/ToastViewport";
import { uiText } from "../services/uiText";
import { profileLabel } from "../services/planningText";
import { FestivalCalendarPanel } from "../components/FestivalCalendarPanel";
import { MovementMap } from "../components/MovementMap";
import { Page } from "../components/Page";
import { PlaceDiscovery } from "../components/PlaceDiscovery";
import { TouristHome } from "../components/TouristHome";
import { TouristPassCard } from "../components/TouristPassCard";
import { TouristProfileForm } from "../components/TouristProfileForm";
import { TripDiary } from "../components/TripDiary";
import { getDisplayName } from "../services/profile";
import { geolocationErrorMessage, hasBrowserGeolocation, clearBrowserLocationWatch, loadLastBrowserLocation, saveLastBrowserLocation, movementPointFromBrowserPosition } from "../services/browserLocation";
import { type CommitDataOptions, incidentTypeOptions, loadProfileSetupSkipped, saveProfileSetupSkipped } from "../services/workspaceSupport";

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
}: {
  data: AppData;
  view: AppView;
  user: User;
  locale: Locale;
  pendingCheckInDestinationId: string | null;
  onPendingCheckInConsumed: () => void;
  onDataChange: (data: AppData, actor?: User | null, options?: CommitDataOptions) => void;
  onViewChange: (view: AppView) => void;
  watchId: React.MutableRefObject<number | null>;
  notify: NotifyFn;
  hasNotifications: boolean;
}) {
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [trackingQualityIssue, setTrackingQualityIssue] = useState<MovementQualityIssue | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [locationRetryAvailable, setLocationRetryAvailable] = useState(false);
  const [refreshingActivities, setRefreshingActivities] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
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
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);
  const geofenceNoticeKey = useRef("");
  const liveSuggestionDestinationIds = useRef(new Set<string>());
  const lastSuggestionAt = useRef(0);
  const browserPositionHandler = useRef<((position: GeolocationPosition) => void) | null>(null);
  const [liveSuggestion, setLiveSuggestion] = useState<LiveNearbySuggestion | null>(null);
  const [eventAnnouncementsDismissed, setEventAnnouncementsDismissed] = useState(false);
  const localizedDestinations = useMemo(() => localizeDestinations(data.destinations, locale), [data.destinations, locale]);
  const localizedData = useMemo(() => ({ ...data, destinations: localizedDestinations }), [data, localizedDestinations]);
  const touristWorkspace = useMemo(() => getTouristWorkspaceData(localizedData, user.id, selectedTripId), [localizedData, selectedTripId, user.id]);
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
    selectedTripRecommendations,
    latestCompletedTrip,
    latestCompletedTripPoints,
    latestCompletedTripSummary,
    latestCompletedTripAnalysis,
    latestCompletedTripDestinationNames,
    visitedDestinationIds,
    userSosAlerts,
    userIncidentReports,
    openSafetyCount,
    recentCheckIns,
  } = touristWorkspace;
  const activeTripSummary = activeTrip ? tripSummaries.find((summary) => summary.tripId === activeTrip.id) ?? null : null;
  const recentTrip = recentTrips[0];
  const selectedDestination = localizedDestinations.find((destination) => destination.id === selectedDestinationId) ?? localizedDestinations[0];
  const destinationDemand = useMemo(() => getTouristDestinationDemand(data, user), [data, user]);
  const calendarDay = useCalendarDay();
  const upcomingFestivals = useMemo(() => getUpcomingFestivals(malaysiaFestivalEvents, new Date(`${calendarDay}T00:00:00`)), [calendarDay]);
  const latestKnownPoint = activePoints.at(-1) ?? lastBrowserLocation ?? (activeTrip ? undefined : tripPoints.at(-1));
  const latestGpsPoint = currentConsent ? getLatestDiscoveryPoint(activePoints.at(-1), lastBrowserLocation) : undefined;
  const discoveryGpsPoint = getDiscoveryReference({ ...user, discoveryLocationMode: "current" }, latestGpsPoint);
  const discoveryReference = useMemo(() => getDiscoveryReference(user, discoveryGpsPoint), [user, discoveryGpsPoint]);
  const canonicalDiscoveryDestinations = useMemo(() => discoveryReference ? getDiscoveryDestinations(data.destinations, user, discoveryReference) : [], [data.destinations, user, discoveryReference]);
  const discoveryDestinations = useMemo(() => localizeDestinations(canonicalDiscoveryDestinations, locale), [canonicalDiscoveryDestinations, locale]);
  const eventAnnouncement = user.eventAnnouncementsEnabled !== false && !eventAnnouncementsDismissed
    ? getLocalEventAnnouncement(upcomingFestivals, discoveryReference)
    : null;
  const tourismAdvisories = useMemo(
    () => getRelevantTourismAdvisories({ destinations: data.destinations, activePoint: discoveryReference }),
    [data.destinations, discoveryReference, calendarDay]
  );
  const recommendations = useMemo(
    () => discoveryReference ? recommendForUser(user.id, localizedData, latestAnalysis, destinationDemand, discoveryReference, { localOnly: true, radiusKm: discoveryRadiusKm, ignoreHistoryLocation: true }) : [],
    [destinationDemand, latestAnalysis, discoveryReference, localizedData, user.id]
  );
  const activeCheckIn = getActiveCheckIn(data, user.id);
  const activeCheckInDestination = activeCheckIn ? localizedDestinations.find((destination) => destination.id === activeCheckIn.destinationId) ?? null : null;
  const nearestCheckIn = discoveryGpsPoint ? nearestDestination(discoveryGpsPoint, localizedDestinations) : null;
  const recommendedCheckIn = nearestCheckIn && nearestCheckIn.distance <= 1.2 ? nearestCheckIn.destination : null;
  const geofenceWarnings = useMemo(() => getActiveGeofenceWarnings(discoveryGpsPoint, data.geofences), [data.geofences, discoveryGpsPoint]);
  const displayName = getDisplayName(user);
  const trackingFeedback = trackingQualityIssue ? activityText(locale, trackingQualityIssue) : trackingMessage;
  const t = (key: TranslationKey) => translate(locale, key);
  const showProfileSetup = !user.profileCompletedAt && !profileSetupSkipped;
  const hasPersonalizedRecommendations = Boolean(latestAnalysis);
  const tripStateLabel = activeTrip ? t("common.active") : latestCompletedTrip ? t("common.completed") : t("common.notStarted");
  const recommendationHeading = hasPersonalizedRecommendations ? t("tourist.home.recommendationsPersonalized") : t("tourist.home.recommendationsBasic");
  const recommendationSupportText = hasPersonalizedRecommendations
    ? t("tourist.home.recommendationsPersonalizedText")
    : t("tourist.home.recommendationsBasicText");
  const activeJourneyPoints = activePoints.length ? activePoints : activeTrip ? [] : latestCompletedTripPoints;
  const activeJourneyPoint = activePoints.at(-1) ?? lastBrowserLocation ?? (activeTrip ? undefined : latestCompletedTripPoints.at(-1));
  const topRecommendationDestination = recommendations[0]
    ? localizedDestinations.find((destination) => destination.id === recommendations[0].destinationId)
    : null;
  const localDestinationIds = new Set(discoveryDestinations.map((destination) => destination.id));
  const topDemandDestination = discoveryReference
    ? localizedDestinations.find((destination) => destination.id === destinationDemand.find((row) => row.popularityScore > 0 && localDestinationIds.has(row.destinationId))?.destinationId)
    : null;
  const nextFestival = getLocalEventAnnouncement(upcomingFestivals, discoveryReference);
  const nearbyEmergencyServices = useMemo(() => getNearbyEmergencyServices(discoveryGpsPoint), [discoveryGpsPoint]);

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
    if (liveSuggestion) setSelectedDestinationId(liveSuggestion.destination.id);
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
    if (!activeTrip && isLiveTracking) {
      setIsLiveTracking(false);
    }
  }, [activeTrip, isLiveTracking]);

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
      setIsLiveTracking(true);
      showTrackingNotice("info", "Tracking already active", "Live browser tracking is already active.");
      return true;
    }

    const rememberBrowserPosition = (position: GeolocationPosition, saveInitialPoint = false) => {
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

  const startTrip = () => {
    const result = startTripSession(data, user.id);
    if (result.error || !result.trip || !result.data) {
      showTrackingNotice("error", "Trip could not start", result.error ?? "Trip could not be started.");
      return;
    }

    onDataChange(result.data);
    startLocationWatch(result.trip.id, "Trip started and live browser tracking is active.");
  };

  const resumeLiveTracking = () => {
    if (!activeTrip) {
      showTrackingNotice("warning", "No active trip", "No active trip is available to resume.");
      return;
    }

    startLocationWatch(activeTrip.id, "Live browser tracking resumed for the active trip.");
  };

  const stopTrip = () => {
    if (!window.confirm(uiText(locale, "Stop recording this trip?"))) {
      return;
    }

    clearBrowserLocationWatch(watchId);
    setIsLiveTracking(false);
    setLocationRetryAvailable(false);

    const result = stopActiveTrip(data, user.id);
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
    const nextLabel = window.prompt("Rename this trip. Leave it blank to use the automatic route name.", trip.label ?? fallbackTitle);
    if (nextLabel === null) {
      return;
    }

    const result = updateTripLabel(data, user.id, trip.id, nextLabel);
    if (result.error || !result.data) {
      notify({ tone: "error", title: "Trip name not saved", message: result.error ?? "Try again in a moment." });
      return;
    }

    onDataChange(refreshAllRecommendations(result.data));
    notify({ tone: "success", title: "Trip name saved", message: nextLabel.trim() ? "This trip now uses your custom name." : "This trip now uses its automatic route name." });
  };

  const deleteSelectedTrip = (trip: TripSession, fallbackTitle: string) => {
    if (!window.confirm(uiText(locale, 'Delete "{name}" and its saved movement points?', { name: fallbackTitle }))) {
      return;
    }

    if (trip.status === "active" && watchId.current !== null) {
      clearBrowserLocationWatch(watchId);
      setIsLiveTracking(false);
      setLocationRetryAvailable(false);
    }

    const result = deleteTrip(data, user.id, trip.id);
    if (result.error || !result.data) {
      notify({ tone: "error", title: "Trip not deleted", message: result.error ?? "Try again in a moment." });
      return;
    }

    const nextTrip = recentTrips.find((candidate) => candidate.id !== trip.id);
    onDataChange(refreshAllRecommendations(result.data));
    setSelectedTripId(nextTrip?.id ?? "");
    notify({ tone: "success", title: "Trip deleted", message: "The selected route and its movement points were removed." });
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
    onDataChange(result.data, user);
    notify({ tone: "success", title: "Checked in", message: destination ? `${destination.name} was added to your visit log.` : "Your attraction visit was added.", browser: true });
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

  const finishAttractionCheckIn = () => {
    if (!activeCheckIn) {
      notify({ tone: "error", title: "No active check-in", message: "There is no attraction visit to check out from." });
      return;
    }

    const result = checkOutFromAttraction(data, activeCheckIn.id);
    if (result.error || !result.data) {
      notify({ tone: "error", title: "Check-out not saved", message: result.error ?? "Try again in a moment." });
      return;
    }

    onDataChange(result.data, user);
    notify({ tone: "success", title: "Checked out", message: "Your attraction visit duration was saved.", browser: true });
  };

  const skipProfileSetup = () => {
    saveProfileSetupSkipped(user.id, true);
    setProfileSetupSkipped(true);
    notify({ tone: "info", title: "Profile skipped", message: "You can complete your travel profile later from Home." });
  };

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

  if (view === "overview" && showProfileSetup) {
    return (
      <Page title={t("tourist.profile.setupPageTitle")} eyebrow={t("common.tourist")}>
        <TouristProfileForm
          user={user}
          title={t("tourist.profile.setupTitle")}
          description={t("tourist.profile.setupDescription")}
          primaryLabel={t("tourist.profile.saveProfile")}
          secondaryLabel={t("tourist.profile.skipForNow")}
          locale={locale}
          onSave={saveProfile}
          onSkip={skipProfileSetup}
        />
      </Page>
    );
  }

  if (view === "tracking") {
    return (
      <Page title={uiText(locale, "Track My Trip")} eyebrow={t("common.tourist")}>
        <div className="two-column">
          <section className="panel">
            <h2>{uiText(locale, "Current Trip")}</h2>
            <div className="consent-box">
              <ShieldCheck size={22} />
              <div>
                <strong>{currentConsent ? "Location is allowed" : "Allow location first"}</strong>
                <p>{currentConsent ? "You can start a trip whenever you are ready." : "The app needs permission before it can record a route for recommendations."}</p>
              </div>
            </div>

            {!currentConsent && (
              <button className="primary-action" onClick={grantConsent}>
                <ShieldCheck size={18} />{" "}{uiText(locale, "Allow location")}{" "}</button>
            )}
            {currentConsent && (
              <button className="secondary-action wide" onClick={revokeConsent}>
                <ShieldCheck size={18} />{" "}{uiText(locale, "Revoke consent")}{" "}</button>
            )}

            <div className="action-row">
              <button className="primary-action" onClick={startTrip} disabled={!currentConsent || Boolean(activeTrip)}>
                <Play size={18} />{" "}{uiText(locale, "Start trip")}{" "}</button>
              <button className="secondary-action" onClick={resumeLiveTracking} disabled={!activeTrip || isLiveTracking}>
                <Navigation size={18} />{" "}{uiText(locale, "Resume")}{" "}</button>
              <button className="secondary-action" onClick={stopTrip} disabled={!activeTrip}>
                <Square size={18} />{" "}{uiText(locale, "Finish trip")}{" "}</button>
            </div>

            <button className="secondary-action wide" onClick={addDemoPoint} disabled={!activeTrip}>
              {t("tourist.home.addDemoPoint")}
            </button>

            <button className="secondary-action wide" onClick={createSampleRoute} disabled={Boolean(activeTrip)}>
              <Compass size={18} />{" "}{uiText(locale, "Add sample Malaysia route")}{" "}</button>

            <form className="mini-form" onSubmit={addManualPoint}>
              <div className="field-pair">
                <label>{" "}{uiText(locale, "Latitude")}{" "}<input value={manualLocation.latitude} onChange={(event) => setManualLocation({ ...manualLocation, latitude: event.target.value })} required />
                </label>
                <label>{" "}{uiText(locale, "Longitude")}{" "}<input value={manualLocation.longitude} onChange={(event) => setManualLocation({ ...manualLocation, longitude: event.target.value })} required />
                </label>
              </div>
              <label>{" "}{uiText(locale, "Accuracy meters")}{" "}<input value={manualLocation.accuracyMeters} onChange={(event) => setManualLocation({ ...manualLocation, accuracyMeters: event.target.value })} required />
              </label>
              <button className="secondary-action wide" type="submit" disabled={!activeTrip}>
                <Save size={18} />{" "}{uiText(locale, "Save manual point")}{" "}</button>
            </form>

            {trackingFeedback && <p className="status-message">{uiText(locale, trackingFeedback)}</p>}

            {locationRetryAvailable && activeTrip && (
              <button className="secondary-action wide" type="button" onClick={resumeLiveTracking}>
                <RotateCcw size={18} />{" "}{uiText(locale, "Try location again")}{" "}</button>
            )}

            {latestCompletedTrip && latestCompletedTripSummary && (
              <CompletedTripSummary
                trip={latestCompletedTrip}
                summary={latestCompletedTripSummary}
                destinationNames={latestCompletedTripDestinationNames}
                analysis={latestCompletedTripAnalysis}
                locale={locale}
                onViewHistory={() => {
                  setSelectedTripId(latestCompletedTrip.id);
                  onViewChange("history");
                }}
                onViewRecommendations={() => onViewChange("recommendations")}
              />
            )}

            <section className="privacy-actions">
              <strong>{uiText(locale, "Privacy")}</strong>
              <p>{uiText(locale, "Your route can be deleted from your tourist account at any time.")}</p>
              <button className="secondary-action wide danger" onClick={deleteMyMovementData} disabled={userTrips.length === 0}>
                <Trash2 size={18} />{" "}{uiText(locale, "Delete my route history")}{" "}</button>
            </section>

            <MetricGrid
              items={[
                [uiText(locale, "Points saved"), activePoints.length.toString()],
                [t("common.distance"), `${activeTripSummary?.distanceKm ?? 0} km`],
                [uiText(locale, "Trip status"), tripStateLabel],
                [uiText(locale, "Profile"), latestAnalysis ? profileLabel(locale, latestAnalysis.profile) : t("common.waiting")],
              ]}
            />
          </section>

          <MovementMap
            points={activePoints.length ? activePoints : tripPoints}
            destinations={localizedDestinations}
            activePoint={activePoints.at(-1) ?? latestKnownPoint}
            mode="tourist"
            displayMode={activePoints.length ? "route" : "signals"}
            locale={locale}
            activityDemand={destinationDemand}
          />
        </div>
      </Page>
    );
  }

  if (view === "history") {
    const selectedTripTitle = selectedTrip ? formatTripTitle(selectedTrip, selectedTripDestinationNames, t) : t("tourist.trips.noTripSelected");
    const selectedTripInsight = selectedTripSummary ? getTripDiaryInsight(selectedTripSummary, selectedTripDestinationNames, t) : "";
    const selectedTripSuggestionStatus = selectedTripSummary ? getTripSuggestionStatus(selectedTripSummary, selectedTripAnalysis, t) : t("common.waiting");

    return (
      <Page title={t("tourist.trips.pageTitle")} eyebrow={t("common.tourist")}>
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
          selectedTripRecommendations={selectedTripRecommendations}
          fallbackPoints={tripPoints}
          destinations={localizedDestinations}
          activityDemand={destinationDemand}
          hasPersonalizedRecommendations={hasPersonalizedRecommendations}
          locale={locale}
          onSelectTrip={setSelectedTripId}
          onViewRecommendations={() => onViewChange("recommendations")}
          onRenameTrip={renameTrip}
          onDeleteTrip={deleteSelectedTrip}
        />
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
        <DiscoveryLocationControl user={user} locale={locale} onChange={changeDiscoveryLocation} onSettings={() => onViewChange("profile")} />
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
          <section className="recommendation-profile-card">
            <div>
              <span>{t("tourist.events.planningWindow")}</span>
              <strong>{t("tourist.events.next12Months")}</strong>
            </div>
            <div>
              <span>{t("tourist.events.malaysiaFocus")}</span>
              <strong>{upcomingFestivals.length} {t("tourist.events.eventSignals")}</strong>
            </div>
            <p>{t("tourist.events.pageDescription")}</p>
          </section>
          <DiscoveryLocationControl user={user} locale={locale} onChange={changeDiscoveryLocation} onSettings={() => onViewChange("profile")} />
          <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} locale={locale} referencePoint={discoveryReference} referenceState={user.discoveryLocationMode === "area" ? discoveryAreas.find((area) => area.id === user.discoveryAreaId)?.state : undefined} />
        </section>
      </Page>
    );
  }

  return (
    <>
    <TouristHome
      displayName={displayName}
      tripStateLabel={tripStateLabel}
      activeTrip={activeTrip}
      recentTrip={recentTrip}
      currentConsent={currentConsent}
      activeJourneyPoints={activeJourneyPoints}
      activeJourneyPoint={activeTrip ? activeJourneyPoint : discoveryReference}
      destinations={showCheckInPanel ? localizedDestinations : discoveryDestinations}
      checkInDestinations={localizedDestinations}
      discoveryControl={<DiscoveryLocationControl user={user} locale={locale} onChange={changeDiscoveryLocation} onSettings={() => onViewChange("profile")} />}
      activityBasis={<ActivityBasis destinations={discoveryDestinations} user={user} locale={locale} onRefresh={user.authUid ? refreshActivities : undefined} refreshing={refreshingActivities} />}
      activityDemand={destinationDemand}
      isBrowsingArea={!activeTrip && user.discoveryLocationMode === "area"}
      geofenceWarnings={geofenceWarnings}
      tourismAdvisories={tourismAdvisories}
      isLiveTracking={isLiveTracking}
      locationRetryAvailable={locationRetryAvailable}
      trackingMessage={trackingFeedback}
      userTrips={userTrips}
      activeCheckIn={activeCheckIn}
      activeCheckInDestination={activeCheckInDestination}
      checkInDestinationId={checkInDestinationId}
      showCheckInPanel={showCheckInPanel}
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
      recommendationHeading={recommendationHeading}
      recommendationSupportText={recommendationSupportText}
      topRecommendationDestination={topRecommendationDestination}
      nextFestival={nextFestival}
      topDemandDestination={topDemandDestination}
      locale={locale}
      onViewChange={onViewChange}
      onGrantConsent={grantConsent}
      onStartTrip={startTrip}
      onStopTrip={stopTrip}
      onResumeLiveTracking={resumeLiveTracking}
      onAddDemoPoint={addDemoPoint}
      onAddLocalTestRoute={addLocalTestRoute}
      onCreateSampleRoute={createSampleRoute}
      onCheckInDestinationChange={setCheckInDestinationId}
      onStartAttractionCheckIn={startAttractionCheckIn}
      onFinishAttractionCheckIn={finishAttractionCheckIn}
      onSendSosAlert={sendSosAlert}
      onCloseSosAlert={closeSosAlert}
      onIncidentTypeChange={setIncidentType}
      onIncidentDescriptionChange={setIncidentDescription}
      onIncidentLocationNoteChange={setIncidentLocationNote}
      onIncidentPhotoChange={handleIncidentPhotoChange}
      onRemoveIncidentPhoto={removeIncidentPhoto}
      onSubmitIncidentReport={submitIncidentReport}
    />
    {!showCheckInPanel && !hasNotifications && <DiscoveryPrompt
      suggestion={liveSuggestion}
      event={liveSuggestion ? null : eventAnnouncement}
      locale={locale}
      onClose={() => {
        if (liveSuggestion) setLiveSuggestion(null);
        else if (eventAnnouncement) setEventAnnouncementsDismissed(true);
      }}
      onView={() => {
        if (liveSuggestion) openSuggestedPlace();
        else {
          if (eventAnnouncement) setEventAnnouncementsDismissed(true);
          onViewChange("events");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      onHide={() => { if (liveSuggestion) hideDestination(liveSuggestion.destination.id); }}
      onSettings={() => { setLiveSuggestion(null); onViewChange("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
    />}
    </>
  );
}
