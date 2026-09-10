import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Compass,
  Download,
  LogOut,
  MapPinned,
  Navigation,
  RotateCcw,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  UserRound,
} from "lucide-react";
import type {
  AnalysisResult,
  AppData,
  AppView,
  Destination,
  IncidentType,
  MovementPoint,
  SafetyStatus,
  TouristProfile,
  TravelPlanOptions,
  TripSession,
  User,
  UserRole,
} from "./types";
import {
  coerceViewForRole,
  getAuthModeFromPath,
  getDefaultViewForRole,
  getPathForAuthMode,
  getPathForView,
  getPrimaryViewsForRole,
  getViewFromPath,
  type AuthMode,
} from "./services/access";
import { cacheLocalData, clearSession, createId, getStorageMode, loadCloudData, loadData, loadSession, resetData, saveData, saveSession } from "./services/storage";
import { formatDateTime, nearestDestination } from "./services/geo";
import {
  buildMovementAlertsCsv,
  buildTravelPlanCsv,
  calculateDestinationDemand,
  calculateMovementAlerts,
  createMovementBasedTravelPlan,
  evaluateAiOutput,
  recommendForUser,
  refreshAllRecommendations,
  refreshAnalysis,
} from "./services/analytics";
import {
  authProviderName,
  getConfiguredAuthState,
  getConfiguredUserRecord,
  hasConfiguredAuth,
  registerWithConfiguredProvider,
  sendPasswordResetToConfiguredProvider,
  sendVerificationEmail,
  signInWithConfiguredProvider,
  signOutConfiguredProvider,
} from "./services/auth";
import { authenticateLocalUser, createTouristAccount, findUserByEmail, isValidEmail, validateTouristAccount } from "./services/accounts";
import { translateAdmin, type AdminCopyKey } from "./services/adminI18n";
import { isPreparedDemoDatasetLoaded, mergePreparedDemoDataset, removeGeneratedDemoDataset } from "./data/demoData";
import { malaysiaFestivalEvents } from "./data/festivals";
import { loadLocale, saveLocale, translate, type Locale, type TranslationKey } from "./services/i18n";
import { getUpcomingFestivals } from "./services/festivals";
import {
  buildMovementRecordsCsv,
  getDailyMovementTrend,
  getMovementDataStatus,
  getMovementRecords,
  getMovementTripRecords,
  getProfileDistribution,
  getTourists,
  getTripFilterOptions,
  summarizeDashboard,
} from "./services/dashboard";
import {
  appendMovementPoint,
  addLocalTestRouteToActiveTrip,
  createSampleTripForUser,
  deleteTrip,
  deleteTouristMovementData,
  getActiveTrip,
  getGrantedConsent,
  getLocalSampleDestinations,
  getUserTrips,
  getVisitedDestinationIds,
  grantLocationConsent,
  revokeLocationConsent,
  startTripSession,
  stopActiveTrip,
  summarizeTrip,
  summarizeUserTrips,
  updateTripLabel,
} from "./services/movement";
import { checkOutFromAttraction, createAttractionCheckIn, getActiveCheckIn } from "./services/checkIns";
import { calculateGeofenceActivity, getActiveGeofenceWarnings } from "./services/geofencing";
import { createIncidentReport, createSosAlert, getOpenSafetyCount, updateIncidentStatus, updateSosStatus } from "./services/safety";
import { getTouristManagementRows } from "./services/touristManagement";
import { formatTripTitle, getRecognizedDestinationNames, getTripDiaryInsight, getTripSuggestionStatus } from "./services/tripPresentation";
import { MovementAlertList, MovementDemandList, TravelPlanPanel } from "./components/AdminPlanningPanels";
import { CategoryBars, ConfusionMatrix, KMeansFeatureBars } from "./components/AdminAnalyticsWidgets";
import { AuthScreen, LanguageSelector, type AuthResult, type TouristRegistrationDraft } from "./components/AuthScreen";
import { CompletedTripSummary, EmptyState, MetricGrid } from "./components/SummaryCards";
import { ListLimitFooter } from "./components/ListLimitFooter";
import { ToastViewport, type AppNotification, type NotificationTone, type NotifyFn } from "./components/ToastViewport";
import { DestinationManager } from "./components/DestinationManager";
import { FestivalCalendarPanel } from "./components/FestivalCalendarPanel";
import { MovementMap } from "./components/MovementMap";
import { MovementPulseHero } from "./components/MovementPulseHero";
import { Page } from "./components/Page";
import { PlaceDiscovery } from "./components/PlaceDiscovery";
import { RecommendationList } from "./components/RecommendationList";
import { TouristHome } from "./components/TouristHome";
import { TouristPassCard } from "./components/TouristPassCard";
import { TouristProfileForm } from "./components/TouristProfileForm";
import { TripDiary } from "./components/TripDiary";
import { formatTravelPreferenceList, getDisplayName } from "./services/profile";

type PlanAudience = NonNullable<TravelPlanOptions["audience"]>;
type PlanTier = NonNullable<TravelPlanOptions["minimumTier"]>;
type AdminDashboardTab = "overview" | "tourists" | "records" | "safety" | "ai";
type CommitDataOptions = {
  localOnlyStatus?: string;
};
const PROFILE_SKIP_KEY_PREFIX = "tourist-movement-monitoring:profile-skip:";
const LAST_BROWSER_LOCATION_KEY_PREFIX = "tourist-movement-monitoring:last-location:";
const DEMO_DATASET_LOCAL_ONLY_STATUS = "Demo dataset loaded locally; Firestore sync skipped";
const adminTouristPreviewLimit = 8;
const adminMovementPreviewLimit = 8;
const adminSafetyPreviewLimit = 5;
const adminAiPreviewLimit = 8;
const incidentTypeOptions: Array<{ value: IncidentType; labelKey: TranslationKey }> = [
  { value: "lost-item", labelKey: "tourist.safety.incidentLostItem" },
  { value: "accident", labelKey: "tourist.safety.incidentAccident" },
  { value: "suspicious-activity", labelKey: "tourist.safety.incidentSuspicious" },
  { value: "medical", labelKey: "tourist.safety.incidentMedical" },
  { value: "other", labelKey: "tourist.safety.incidentOther" },
];


function analysisKey(analysis: AnalysisResult) {
  return `${analysis.tripId}:${analysis.generatedAt}`;
}

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Tracking was stopped and no browser movement point was saved.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Current location is unavailable. Check device location settings or add a demo point for prototype testing.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Move to a clearer signal area or try again.";
  }

  return error.message || "Location could not be read by the browser.";
}

function friendlyAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("auth/invalid-email")) {
    return "Enter a valid email address.";
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/user-not-found") || message.includes("auth/wrong-password")) {
    return "Email or password is incorrect, or this Firebase account does not exist.";
  }

  if (message.includes("auth/email-already-in-use")) {
    return "This email is already registered. Log in or resend the verification email.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Too many attempts. Wait a bit before trying again.";
  }

  if (message.includes("auth/weak-password")) {
    return "Password must be at least 6 characters.";
  }

  return message || fallback;
}

function getProfileSkipKey(userId: string) {
  return `${PROFILE_SKIP_KEY_PREFIX}${userId}`;
}

function getLastBrowserLocationKey(userId: string) {
  return `${LAST_BROWSER_LOCATION_KEY_PREFIX}${userId}`;
}

function isStoredMovementPoint(value: unknown): value is MovementPoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as Partial<MovementPoint>;
  return (
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    typeof point.recordedAt === "string" &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

function loadLastBrowserLocation(userId: string): MovementPoint | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(getLastBrowserLocationKey(userId));
    const parsed = stored ? JSON.parse(stored) : null;
    return isStoredMovementPoint(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function saveLastBrowserLocation(userId: string, point: MovementPoint) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getLastBrowserLocationKey(userId), JSON.stringify(point));
  } catch {
    // Location still works for this session when browser storage is unavailable.
  }
}

function getIncidentTypeLabel(type: IncidentType, t: (key: TranslationKey) => string) {
  const option = incidentTypeOptions.find((candidate) => candidate.value === type);
  return option ? t(option.labelKey) : t("tourist.safety.incidentFallback");
}

function simulatedPointNear(destination: Destination, step: number) {
  const latitudeOffset = ((step % 5) - 2) * 0.00022;
  const longitudeOffset = (((step * 2) % 5) - 2) * 0.00022;

  return {
    latitude: Number((destination.latitude + latitudeOffset).toFixed(6)),
    longitude: Number((destination.longitude + longitudeOffset).toFixed(6)),
  };
}

function movementPointFromBrowserPosition(position: GeolocationPosition, tripId: string, userId: string): MovementPoint {
  return {
    id: `browser-current-${tripId}`,
    tripId,
    userId,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    recordedAt: new Date(position.timestamp || Date.now()).toISOString(),
    source: "browser",
  };
}

function mergeUserRecord(data: AppData, user: User): AppData {
  const nextUsers = data.users.some((candidate) => candidate.id === user.id || candidate.email.toLowerCase() === user.email.toLowerCase())
    ? data.users.map((candidate) => (candidate.id === user.id || candidate.email.toLowerCase() === user.email.toLowerCase() ? { ...candidate, ...user } : candidate))
    : [...data.users, user];

  return { ...data, users: nextUsers };
}

function getCurrentPathname() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function replaceBrowserPath(path: string) {
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.history.replaceState(null, "", path);
  }
}

function pushBrowserPath(path: string) {
  if (typeof window !== "undefined" && window.location.pathname !== path) {
    window.history.pushState(null, "", path);
  }
}

function App() {
  const [data, setData] = useState<AppData>(() => refreshAllRecommendations(loadData()));
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadSession());
  const currentUser = data.users.find((user) => user.id === sessionUserId || user.authUid === sessionUserId) ?? null;
  const [view, setView] = useState<AppView>(() => getViewFromPath(getCurrentPathname()) ?? "overview");
  const [authMode, setAuthMode] = useState<AuthMode>(() => getAuthModeFromPath(getCurrentPathname()) ?? "login");
  const [locale, setLocale] = useState<Locale>(() => loadLocale());
  const safeView = currentUser ? coerceViewForRole(currentUser.role, view) : view;
  const [syncStatus, setSyncStatus] = useState(getStorageMode());
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const watchId = useRef<number | null>(null);
  const lastSyncWarningAt = useRef(0);
  const t = (key: TranslationKey) => translate(locale, key);

  const notify: NotifyFn = (notification) => {
    setNotifications((current) => [...current.slice(-2), { ...notification, id: createId("notification") }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const notifySyncIssue = (title: string, message: string) => {
    const now = Date.now();
    if (now - lastSyncWarningAt.current < 30000) {
      return;
    }

    lastSyncWarningAt.current = now;
    notify({ tone: "warning", title, message });
  };

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    saveLocale(nextLocale);
  };

  const goToAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    pushBrowserPath(getPathForAuthMode(mode));
  };

  const goToView = (nextView: AppView) => {
    const activeUser = currentUser;
    if (!activeUser) {
      return;
    }

    const nextSafeView = coerceViewForRole(activeUser.role, nextView);
    setView(nextSafeView);
    pushBrowserPath(getPathForView(activeUser.role, nextSafeView));
  };

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : locale;
  }, [locale]);

  useEffect(() => {
    let isMounted = true;

    const hydrateCloudData = async () => {
      try {
        const firebaseUser = hasConfiguredAuth() ? await getConfiguredAuthState() : null;
        if (!isMounted) {
          return;
        }

        if (hasConfiguredAuth() && !firebaseUser) {
          clearSession();
          setSessionUserId(null);
        }

        if (firebaseUser?.uid) {
          saveSession(firebaseUser.uid);
          setSessionUserId(firebaseUser.uid);
        }

        const cloudData = await loadCloudData();
        if (!isMounted || !cloudData) {
          return;
        }

        const refreshed = refreshAllRecommendations(cloudData);
        setData(refreshed);
        if (firebaseUser?.uid && refreshed.users.some((user) => user.id === firebaseUser.uid || user.authUid === firebaseUser.uid)) {
          setSessionUserId(firebaseUser.uid);
        }
        setSyncStatus("Loaded from Firebase Firestore");
      } catch {
        if (isMounted) {
          setSyncStatus("Local mode; Firebase sync unavailable");
          notifySyncIssue("Firebase sync unavailable", "The app is still usable, but data is currently saved on this device.");
        }
      }
    };

    void hydrateCloudData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser && safeView !== view) {
      setView(safeView);
    }
  }, [currentUser, safeView, view]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [safeView]);

  useEffect(() => {
    const handlePopState = () => {
      const pathname = getCurrentPathname();

      if (!currentUser) {
        setAuthMode(getAuthModeFromPath(pathname) ?? "login");
        return;
      }

      const pathView = getViewFromPath(pathname) ?? getDefaultViewForRole(currentUser.role);
      setView(coerceViewForRole(currentUser.role, pathView));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser]);

  useEffect(() => {
    const pathname = getCurrentPathname();

    if (!currentUser) {
      const nextMode = getAuthModeFromPath(pathname) ?? authMode;
      if (nextMode !== authMode) {
        setAuthMode(nextMode);
      }
      replaceBrowserPath(getPathForAuthMode(nextMode));
      return;
    }

    const pathView = getViewFromPath(pathname);
    const nextView = coerceViewForRole(currentUser.role, pathView ?? safeView);
    if (nextView !== safeView) {
      setView(nextView);
      return;
    }

    replaceBrowserPath(getPathForView(currentUser.role, nextView));
  }, [authMode, currentUser, safeView]);

  const commitData = (nextData: AppData, actor: User | null = currentUser, options: CommitDataOptions = {}) => {
    setData(nextData);

    if (options.localOnlyStatus) {
      cacheLocalData(nextData);
      setSyncStatus(options.localOnlyStatus);
      return;
    }

    void saveData(nextData, actor)
      .then((synced) => {
        setSyncStatus(synced ? "Saved to Firestore collections" : "Saved to local browser storage");
      })
      .catch(() => {
        setSyncStatus("Saved on this device; cloud retry pending");
        notifySyncIssue("Cloud save needs retry", "Your change was kept locally. Firestore did not accept the latest sync.");
      });
  };

  const retryCloudSync = async () => {
    if (!currentUser) {
      return;
    }

    setIsRetryingSync(true);
    try {
      const synced = await saveData(data, currentUser);
      if (synced) {
        setSyncStatus("Saved to Firestore collections");
        notify({ tone: "success", title: "Cloud sync restored", message: "The latest local data was saved to Firestore." });
      } else {
        setSyncStatus("Saved on this device; cloud retry pending");
        notify({ tone: "warning", title: "Cloud sync still unavailable", message: "The app is still keeping changes locally on this device." });
      }
    } catch {
      setSyncStatus("Saved on this device; cloud retry pending");
      notify({ tone: "warning", title: "Cloud sync still unavailable", message: "Firestore did not accept the retry. Check Firebase rules and connection." });
    } finally {
      setIsRetryingSync(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const firebaseMode = hasConfiguredAuth();
    const localEmailUser = findUserByEmail(data, email);

    if (firebaseMode) {
      let authUid: string | undefined;
      let firebaseStoredUser: User | null = null;

      try {
        const firebaseUser = await signInWithConfiguredProvider(email, password);
        authUid = firebaseUser?.uid;
        if (!authUid) {
          return { error: "Firebase login could not return a user account." };
        }

        const needsFirestoreProfile = !localEmailUser || localEmailUser.role === "admin";
        firebaseStoredUser = needsFirestoreProfile ? await getConfiguredUserRecord(authUid).catch(() => null) : null;
        const loginRole = firebaseStoredUser?.role ?? localEmailUser?.role ?? "tourist";
        if (firebaseUser && !firebaseUser.emailVerified && loginRole !== "admin") {
          await sendVerificationEmail(firebaseUser).catch(() => undefined);
          await signOutConfiguredProvider().catch(() => undefined);
          return { error: "Verify your email first. A fresh verification email has been sent." };
        }
      } catch (error) {
        return { error: friendlyAuthError(error, "Firebase login failed.") };
      }

      if (localEmailUser?.role === "admin" && firebaseStoredUser?.role !== "admin") {
        await signOutConfiguredProvider().catch(() => undefined);
        return {
          error:
            "This Firebase account is not linked as an admin in Firestore yet. Add a users document using this Firebase UID with role set to admin, then log in again.",
        };
      }

      const user =
        firebaseStoredUser ??
        (localEmailUser
          ? { ...localEmailUser, id: authUid, authUid, password: "" }
          : {
              id: authUid,
              authUid,
              name: email.split("@")[0],
              email,
              password: "",
              role: "tourist" as const,
              createdAt: new Date().toISOString(),
            });
      const nextData = mergeUserRecord(data, { ...user, authUid });
      const defaultView = getDefaultViewForRole(user.role);

      cacheLocalData(nextData);
      setData(nextData);
      saveSession(authUid);
      setSessionUserId(authUid);
      setView(defaultView);
      replaceBrowserPath(getPathForView(user.role, defaultView));

      void loadCloudData({ ...user, authUid })
        .then((cloudData) => {
          if (!cloudData) {
            setSyncStatus("Signed in; local backup ready");
            return;
          }

          const refreshed = refreshAllRecommendations(mergeUserRecord(cloudData, { ...user, authUid }));
          cacheLocalData(refreshed);
          setData(refreshed);
          setSyncStatus("Loaded from Firebase Firestore");
        })
        .catch(() => {
          setSyncStatus("Signed in; cloud refresh needs retry");
        });

      return {};
    }

    const localUser = authenticateLocalUser(data, email, password);
    if (!localUser) {
      return { error: "Invalid email or password." };
    }
    saveSession(localUser.id);
    setSessionUserId(localUser.id);
    setView(getDefaultViewForRole(localUser.role));
    replaceBrowserPath(getPathForView(localUser.role, getDefaultViewForRole(localUser.role)));
    return {};
  };

  const register = async (draft: TouristRegistrationDraft): Promise<AuthResult> => {
    const precheck = validateTouristAccount(data, {
      name: draft.name,
      email: draft.email,
      password: draft.password,
      nationality: draft.nationality,
      passportNumber: draft.passportNumber,
      termsAccepted: draft.termsAccepted,
    });
    if (precheck.error) {
      return { error: precheck.error };
    }

    let authUid: string | undefined;
    try {
      const firebaseUser = await registerWithConfiguredProvider(draft.email, draft.password);
      authUid = firebaseUser?.uid;
    } catch (error) {
      return { error: friendlyAuthError(error, "Firebase registration failed.") };
    }

    const created = createTouristAccount(data, {
      name: draft.name,
      email: draft.email,
      password: draft.password,
      authUid,
      nationality: draft.nationality,
      passportNumber: draft.passportNumber,
      termsAccepted: draft.termsAccepted,
    });
    if (created.error || !created.user || !created.data) {
      return { error: created.error ?? "Unable to create tourist account." };
    }

    const user = created.user;
    if (hasConfiguredAuth()) {
      setData(created.data);
      await saveData(created.data, user).catch(() => false);
      await signOutConfiguredProvider().catch(() => undefined);
      return { message: "Account created. Check your email for the Firebase verification link, then log in after verifying." };
    }

    commitData(created.data, user);
    saveSession(user.id);
    setSessionUserId(user.id);
    setView(getDefaultViewForRole(user.role));
    replaceBrowserPath(getPathForView(user.role, getDefaultViewForRole(user.role)));
    return {};
  };

  const resendVerification = async (email: string, password: string): Promise<AuthResult> => {
    if (!hasConfiguredAuth()) {
      return { error: "Verification email is only available in Firebase mode." };
    }

    try {
      const firebaseUser = await signInWithConfiguredProvider(email, password);
      if (!firebaseUser) {
        return { error: "Firebase account could not be found." };
      }

      if (firebaseUser.emailVerified) {
        return { message: "This email is already verified. You can log in now." };
      }

      await sendVerificationEmail(firebaseUser);
      await signOutConfiguredProvider().catch(() => undefined);
      return { message: "Verification email sent again. Check your inbox or spam folder." };
    } catch (error) {
      return { error: friendlyAuthError(error, "Verification email could not be sent.") };
    }
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!hasConfiguredAuth()) {
      return { error: "Password reset is only available in Firebase mode." };
    }

    try {
      const sent = await sendPasswordResetToConfiguredProvider(email);
      return sent ? { message: "Password reset email sent. Check your inbox or spam folder." } : { error: "Firebase password reset is not configured." };
    } catch (error) {
      return { error: friendlyAuthError(error, "Password reset email could not be sent.") };
    }
  };

  const logout = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    await signOutConfiguredProvider().catch(() => undefined);
    clearSession();
    setSessionUserId(null);
    replaceBrowserPath(getPathForAuthMode("login"));
  };

  const resetPrototype = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const freshData = refreshAllRecommendations(resetData());
    saveData(freshData, currentUser);
    setData(freshData);
    setSessionUserId(null);
    setView("overview");
    replaceBrowserPath(getPathForAuthMode("login"));
    notify({ tone: "info", title: "Demo data reset", message: "The prototype data has been restored to its prepared sample state." });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tourist-movement-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify({ tone: "success", title: "Export started", message: "The current prototype data is downloading as a JSON file." });
  };

  if (!currentUser) {
    return (
      <>
        <AuthScreen
          mode={authMode}
          locale={locale}
          onLocaleChange={changeLocale}
          onModeChange={goToAuthMode}
          onLogin={login}
          onRegister={register}
          onResendVerification={resendVerification}
          onPasswordReset={sendPasswordReset}
          notify={notify}
        />
        <ToastViewport notifications={notifications} onDismiss={dismissNotification} />
      </>
    );
  }

  const roleViews =
    currentUser.role === "admin"
      ? ([
          ["dashboard", t("nav.dashboard"), BarChart3],
          ["destinations", t("nav.destinations"), MapPinned],
        ] as const)
      : ([
          ["overview", t("nav.home"), Compass],
          ["history", t("nav.trips"), MapPinned],
          ["recommendations", t("nav.places"), Sparkles],
          ["events", t("nav.events"), CalendarDays],
        ] as const);
  const primaryViews = getPrimaryViewsForRole(currentUser.role);

  return (
    <div className={currentUser.role === "tourist" ? "app-shell tourist-shell" : "app-shell admin-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <MapPinned size={22} />
          </div>
          <div>
            <strong>{t("brand.title")}</strong>
            <span>{t("brand.subtitle")}</span>
          </div>
        </div>

        <LanguageSelector locale={locale} onLocaleChange={changeLocale} />

        <nav className="nav-list" aria-label="Primary navigation">
          {roleViews.filter(([key]) => primaryViews.includes(key)).map(([key, label, Icon]) => (
            <button key={key} className={safeView === key ? "nav-item active" : "nav-item"} onClick={() => goToView(key)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {currentUser.role === "tourist" ? (
          <button className="account-strip account-action" onClick={() => goToView("profile")}>
            <UserRound size={18} />
            <div>
              <strong>{currentUser.name}</strong>
              <span>{t("nav.profile")}</span>
            </div>
          </button>
        ) : (
          <div className="account-strip">
            <UserRound size={18} />
            <div>
              <strong>{currentUser.name}</strong>
              <span>{t("nav.adminRole")}</span>
            </div>
          </div>
        )}

        <div className="status-pill">
          <span>{authProviderName()}</span>
          <strong>{syncStatus}</strong>
          {hasConfiguredAuth() && (
            <button className="status-retry-button" type="button" onClick={retryCloudSync} disabled={isRetryingSync}>
              <RotateCcw size={15} />
              {isRetryingSync ? t("sync.retrying") : t("sync.retry")}
            </button>
          )}
        </div>

        <div className="sidebar-tools">
          <button className="nav-item utility" onClick={exportData} title="Export prototype data">
            <Download size={18} />
            {t("nav.exportData")}
          </button>
          <button className="nav-item utility danger" onClick={resetPrototype} title="Reset prototype data">
            <RotateCcw size={18} />
            {t("nav.resetDemo")}
          </button>
        </div>

        <button className="nav-item logout" onClick={logout}>
          <LogOut size={18} />
          {t("nav.logout")}
        </button>
      </aside>

      <main className="content">
        {currentUser.role === "admin" ? (
          <AdminWorkspace data={data} view={safeView} locale={locale} onDataChange={commitData} notify={notify} />
        ) : (
          <TouristWorkspace data={data} view={safeView} user={currentUser} locale={locale} onDataChange={commitData} onViewChange={goToView} watchId={watchId} notify={notify} />
        )}
      </main>
      <ToastViewport notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

function TouristWorkspace({
  data,
  view,
  user,
  locale,
  onDataChange,
  onViewChange,
  watchId,
  notify,
}: {
  data: AppData;
  view: AppView;
  user: User;
  locale: Locale;
  onDataChange: (data: AppData, actor?: User | null) => void;
  onViewChange: (view: AppView) => void;
  watchId: React.MutableRefObject<number | null>;
  notify: NotifyFn;
}) {
  const userTrips = getUserTrips(data, user.id);
  const activeTrip = getActiveTrip(data, user.id);
  const currentConsent = getGrantedConsent(data, user.id);
  const tripPoints = data.points.filter((point) => userTrips.some((trip) => trip.id === point.tripId));
  const activePoints = activeTrip ? data.points.filter((point) => point.tripId === activeTrip.id) : [];
  const latestAnalysis = data.analyses.filter((analysis) => analysis.userId === user.id).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
  const savedRecommendations = data.recommendations.filter((recommendation) => recommendation.userId === user.id);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [locationRetryAvailable, setLocationRetryAvailable] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>(userTrips[0]?.id ?? "");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
  const [manualLocation, setManualLocation] = useState({ latitude: "3.1478", longitude: "101.6937", accuracyMeters: "25" });
  const [lastBrowserLocation, setLastBrowserLocation] = useState<MovementPoint | undefined>(() => loadLastBrowserLocation(user.id));
  const [checkInDestinationId, setCheckInDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
  const [incidentType, setIncidentType] = useState<IncidentType>("lost-item");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentLocationNote, setIncidentLocationNote] = useState("");
  const [profileSetupSkipped, setProfileSetupSkipped] = useState(() => localStorage.getItem(getProfileSkipKey(user.id)) === "true");
  const geofenceNoticeKey = useRef("");
  const activeTripSummary = activeTrip ? summarizeTrip(data, activeTrip.id) : null;
  const tripSummaries = useMemo(() => summarizeUserTrips(data, user.id), [data, user.id]);
  const recentTrips = useMemo(() => [...userTrips].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()), [userTrips]);
  const selectedTrip = userTrips.find((trip) => trip.id === selectedTripId) ?? recentTrips[0];
  const selectedTripPoints = selectedTrip ? data.points.filter((point) => point.tripId === selectedTrip.id) : [];
  const selectedTripSummary = selectedTrip ? summarizeTrip(data, selectedTrip.id) : null;
  const selectedTripAnalysis = selectedTrip
    ? data.analyses.find((analysis) => analysis.tripId === selectedTrip.id && analysis.userId === user.id) ?? null
    : null;
  const selectedTripDestinationNames = useMemo(() => {
    return getRecognizedDestinationNames(selectedTripPoints, data.destinations);
  }, [selectedTripPoints, data.destinations]);
  const selectedTripRecommendations = savedRecommendations.slice(0, 3);
  const latestCompletedTrip = recentTrips.find((trip) => trip.status === "completed") ?? null;
  const latestCompletedTripPoints = latestCompletedTrip ? data.points.filter((point) => point.tripId === latestCompletedTrip.id) : [];
  const latestCompletedTripSummary = latestCompletedTrip ? summarizeTrip(data, latestCompletedTrip.id) : null;
  const latestCompletedTripAnalysis = latestCompletedTrip
    ? data.analyses.find((analysis) => analysis.tripId === latestCompletedTrip.id && analysis.userId === user.id) ?? null
    : null;
  const latestCompletedTripDestinationNames = useMemo(() => {
    return getRecognizedDestinationNames(latestCompletedTripPoints, data.destinations);
  }, [latestCompletedTripPoints, data.destinations]);
  const recentTrip = recentTrips[0];
  const selectedDestination = data.destinations.find((destination) => destination.id === selectedDestinationId) ?? data.destinations[0];
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data]);
  const upcomingFestivals = useMemo(() => getUpcomingFestivals(malaysiaFestivalEvents), []);
  const visitedDestinationIds = useMemo(() => getVisitedDestinationIds(data, user.id), [data, user.id]);
  const latestKnownPoint = activePoints.at(-1) ?? lastBrowserLocation ?? (activeTrip ? undefined : tripPoints.at(-1));
  const recommendations = useMemo(
    () => recommendForUser(user.id, data, latestAnalysis, destinationDemand, latestKnownPoint),
    [data, destinationDemand, latestAnalysis, latestKnownPoint, user.id]
  );
  const userSosAlerts = data.sosAlerts.filter((alert) => alert.userId === user.id);
  const userIncidentReports = data.incidentReports.filter((report) => report.userId === user.id);
  const openSafetyCount = [...userSosAlerts, ...userIncidentReports].filter((record) => record.status !== "resolved").length;
  const activeCheckIn = getActiveCheckIn(data, user.id);
  const activeCheckInDestination = activeCheckIn ? data.destinations.find((destination) => destination.id === activeCheckIn.destinationId) ?? null : null;
  const recentCheckIns = data.checkIns.filter((checkIn) => checkIn.userId === user.id).slice(0, 3);
  const recommendedCheckIn = latestKnownPoint ? nearestDestination(latestKnownPoint, data.destinations)?.destination : null;
  const geofenceWarnings = useMemo(() => getActiveGeofenceWarnings(latestKnownPoint, data.geofences), [data.geofences, latestKnownPoint]);
  const displayName = getDisplayName(user);
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
    ? data.destinations.find((destination) => destination.id === recommendations[0].destinationId)
    : null;
  const topDemandDestination = destinationDemand[0]
    ? data.destinations.find((destination) => destination.id === destinationDemand[0].destinationId)
    : null;
  const nextFestival = upcomingFestivals[0] ?? null;

  const showTrackingNotice = (tone: NotificationTone, title: string, message: string) => {
    setTrackingMessage(message);
    notify({ tone, title, message });
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
      notify({ tone: warning.tone, title: warning.geofence.name, message: warning.geofence.message });
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
    if (!currentConsent || activeTrip || !navigator.geolocation) {
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return;
        }

        const browserPoint = movementPointFromBrowserPosition(position, `browser-preview-${user.id}`, user.id);
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
  }, [activeTrip, currentConsent, user.id]);

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
    options: { quietDuplicate?: boolean } = {}
  ) => {
    const result = appendMovementPoint(loadData(), {
      tripId,
      latitude,
      longitude,
      accuracyMeters,
      source,
    });

    if (result.error || !result.data) {
      if (options.quietDuplicate && result.error?.includes("too close")) {
        return false;
      }

      showTrackingNotice("error", "Movement point not saved", result.error ?? "Movement point could not be saved.");
      return false;
    }

    onDataChange(result.data);
    return true;
  };

  const startLocationWatch = (tripId: string, message: string) => {
    setLocationRetryAvailable(false);

    if (!navigator.geolocation) {
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
      const browserPoint = movementPointFromBrowserPosition(position, tripId, user.id);
      setLastBrowserLocation(browserPoint);
      saveLastBrowserLocation(user.id, browserPoint);
      setLocationRetryAvailable(false);

      if (saveInitialPoint) {
        appendPoint(tripId, position.coords.latitude, position.coords.longitude, position.coords.accuracy, "browser", { quietDuplicate: true });
      }
    };

    const saveBrowserPosition = (position: GeolocationPosition) => {
      rememberBrowserPosition(position);
      const saved = appendPoint(tripId, position.coords.latitude, position.coords.longitude, position.coords.accuracy, "browser", { quietDuplicate: true });
      if (saved) {
        setTrackingMessage("Live movement point recorded.");
      }
    };

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
          if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
          }
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
    if (!window.confirm("Stop recording this trip?")) {
      return;
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
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
    if (appendPoint(activeTrip.id, point.latitude, point.longitude, 32, "demo")) {
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

    if (appendPoint(activeTrip.id, Number(manualLocation.latitude), Number(manualLocation.longitude), Number(manualLocation.accuracyMeters), "demo")) {
      showTrackingNotice("success", "Manual point saved", "Manual movement point saved to the active trip.");
    }
  };

  const refreshRecommendations = () => {
    onDataChange(refreshAnalysis(data, user.id));
    notify({ tone: "success", title: "Recommendations refreshed", message: "Your latest trip analysis has been recalculated." });
  };

  const revokeConsent = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsLiveTracking(false);
    setLocationRetryAvailable(false);

    const nextData = revokeLocationConsent(data, user.id);
    onDataChange(refreshAllRecommendations(nextData));
    showTrackingNotice("info", "Location consent revoked", "Location consent revoked. Active tracking has been stopped.");
  };

  const deleteMyMovementData = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
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
    if (!window.confirm(`Delete "${fallbackTitle}" and its saved movement points?`)) {
      return;
    }

    if (trip.status === "active" && watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
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
    localStorage.removeItem(getProfileSkipKey(user.id));
    setProfileSetupSkipped(false);
    onDataChange(refreshAllRecommendations(nextData), nextUser);
    notify({ tone: "success", title: "Profile saved", message: "Your travel preferences will be used for recommendations." });
  };

  const sendSosAlert = () => {
    if (!window.confirm("Record an SOS assistance request for tourism administrators? For real danger, call local emergency services too.")) {
      return;
    }

    const result = createSosAlert(data, user.id, latestKnownPoint);
    onDataChange(result.data, user);
    notify({
      tone: "warning",
      title: "SOS request recorded",
      message: latestKnownPoint ? "Your latest saved location was attached for administrator review." : "No saved location was available, but the request was recorded.",
    });
  };

  const submitIncidentReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = createIncidentReport(data, {
      userId: user.id,
      type: incidentType,
      description: incidentDescription,
      locationNote: incidentLocationNote,
      location: latestKnownPoint,
    });

    if (result.error || !result.data) {
      notify({ tone: "error", title: "Incident report not saved", message: result.error ?? "Check the report details and try again." });
      return;
    }

    onDataChange(result.data, user);
    setIncidentDescription("");
    setIncidentLocationNote("");
    notify({ tone: "success", title: "Incident report saved", message: "Tourism administrators can review this case from the dashboard." });
  };

  const startAttractionCheckIn = () => {
    const result = createAttractionCheckIn(data, {
      userId: user.id,
      destinationId: checkInDestinationId,
      tripId: activeTrip?.id,
      location: latestKnownPoint,
    });

    if (result.error || !result.data) {
      notify({ tone: "error", title: "Check-in not saved", message: result.error ?? "Choose an attraction and try again." });
      return;
    }

    const destination = data.destinations.find((candidate) => candidate.id === checkInDestinationId);
    onDataChange(result.data, user);
    notify({ tone: "success", title: "Checked in", message: destination ? `${destination.name} was added to your visit log.` : "Your attraction visit was added." });
  };

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
    notify({ tone: "success", title: "Checked out", message: "Your attraction visit duration was saved." });
  };

  const skipProfileSetup = () => {
    localStorage.setItem(getProfileSkipKey(user.id), "true");
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
      <Page title="Track My Trip" eyebrow="Tourist">
        <div className="two-column">
          <section className="panel">
            <h2>Current Trip</h2>
            <div className="consent-box">
              <ShieldCheck size={22} />
              <div>
                <strong>{currentConsent ? "Location is allowed" : "Allow location first"}</strong>
                <p>{currentConsent ? "You can start a trip whenever you are ready." : "The app needs permission before it can record a route for recommendations."}</p>
              </div>
            </div>

            {!currentConsent && (
              <button className="primary-action" onClick={grantConsent}>
                <ShieldCheck size={18} />
                Allow location
              </button>
            )}
            {currentConsent && (
              <button className="secondary-action wide" onClick={revokeConsent}>
                <ShieldCheck size={18} />
                Revoke consent
              </button>
            )}

            <div className="action-row">
              <button className="primary-action" onClick={startTrip} disabled={!currentConsent || Boolean(activeTrip)}>
                <Play size={18} />
                Start trip
              </button>
              <button className="secondary-action" onClick={resumeLiveTracking} disabled={!activeTrip || isLiveTracking}>
                <Navigation size={18} />
                Resume
              </button>
              <button className="secondary-action" onClick={stopTrip} disabled={!activeTrip}>
                <Square size={18} />
                Finish trip
              </button>
            </div>

            <button className="secondary-action wide" onClick={addDemoPoint} disabled={!activeTrip}>
              {t("tourist.home.addDemoPoint")}
            </button>

            <button className="secondary-action wide" onClick={createSampleRoute} disabled={Boolean(activeTrip)}>
              <Compass size={18} />
              Add sample Malaysia route
            </button>

            <form className="mini-form" onSubmit={addManualPoint}>
              <div className="field-pair">
                <label>
                  Latitude
                  <input value={manualLocation.latitude} onChange={(event) => setManualLocation({ ...manualLocation, latitude: event.target.value })} required />
                </label>
                <label>
                  Longitude
                  <input value={manualLocation.longitude} onChange={(event) => setManualLocation({ ...manualLocation, longitude: event.target.value })} required />
                </label>
              </div>
              <label>
                Accuracy meters
                <input value={manualLocation.accuracyMeters} onChange={(event) => setManualLocation({ ...manualLocation, accuracyMeters: event.target.value })} required />
              </label>
              <button className="secondary-action wide" type="submit" disabled={!activeTrip}>
                <Save size={18} />
                Save manual point
              </button>
            </form>

            {trackingMessage && <p className="status-message">{trackingMessage}</p>}

            {locationRetryAvailable && activeTrip && (
              <button className="secondary-action wide" type="button" onClick={resumeLiveTracking}>
                <RotateCcw size={18} />
                Try location again
              </button>
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
              <strong>Privacy</strong>
              <p>Your route can be deleted from your tourist account at any time.</p>
              <button className="secondary-action wide danger" onClick={deleteMyMovementData} disabled={userTrips.length === 0}>
                <Trash2 size={18} />
                Delete my route history
              </button>
            </section>

            <MetricGrid
              items={[
                ["Points saved", activePoints.length.toString()],
                ["Distance", `${activeTripSummary?.distanceKm ?? 0} km`],
                ["Trip status", tripStateLabel],
                ["Profile", latestAnalysis?.profile ?? "Learning"],
              ]}
            />
          </section>

          <MovementMap
            points={activePoints.length ? activePoints : tripPoints}
            destinations={data.destinations}
            activePoint={activePoints.at(-1) ?? latestKnownPoint}
            mode="tourist"
            locale={locale}
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
          destinations={data.destinations}
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
        <PlaceDiscovery
          destinations={data.destinations}
          demand={destinationDemand}
          festivals={upcomingFestivals}
          recommendations={recommendations}
          user={user}
          latestAnalysis={latestAnalysis}
          visitedIds={visitedDestinationIds}
          referencePoint={latestKnownPoint}
          selectedDestinationId={selectedDestinationId}
          locale={locale}
          onSelectDestination={setSelectedDestinationId}
          onOpenEvents={() => onViewChange("events")}
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
          <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} locale={locale} />
        </section>
      </Page>
    );
  }

  return (
    <TouristHome
      displayName={displayName}
      tripStateLabel={tripStateLabel}
      activeTrip={activeTrip}
      recentTrip={recentTrip}
      currentConsent={currentConsent}
      activeJourneyPoints={activeJourneyPoints}
      activeJourneyPoint={activeJourneyPoint}
      destinations={data.destinations}
      geofenceWarnings={geofenceWarnings}
      isLiveTracking={isLiveTracking}
      locationRetryAvailable={locationRetryAvailable}
      trackingMessage={trackingMessage}
      userTrips={userTrips}
      activeCheckIn={activeCheckIn}
      activeCheckInDestination={activeCheckInDestination}
      checkInDestinationId={checkInDestinationId}
      recentCheckIns={recentCheckIns}
      recommendedCheckIn={recommendedCheckIn}
      openSafetyCount={openSafetyCount}
      user={user}
      incidentType={incidentType}
      incidentDescription={incidentDescription}
      incidentLocationNote={incidentLocationNote}
      incidentTypeOptions={incidentTypeOptions}
      userSosAlerts={userSosAlerts}
      userIncidentReports={userIncidentReports}
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
      onIncidentTypeChange={setIncidentType}
      onIncidentDescriptionChange={setIncidentDescription}
      onIncidentLocationNoteChange={setIncidentLocationNote}
      onSubmitIncidentReport={submitIncidentReport}
    />
  );
}

function AdminWorkspace({
  data,
  view,
  locale,
  onDataChange,
  notify,
}: {
  data: AppData;
  view: AppView;
  locale: Locale;
  onDataChange: (data: AppData, actor?: User | null, options?: CommitDataOptions) => void;
  notify: NotifyFn;
}) {
  const t = (key: TranslationKey) => translate(locale, key);
  const adminText = (key: AdminCopyKey, values?: Record<string, string | number>) => translateAdmin(locale, key, values);
  const tourists = getTourists(data);
  const summary = useMemo(() => summarizeDashboard(data), [data]);
  const profileDistribution = useMemo(() => getProfileDistribution(data), [data]);
  const movementTrend = useMemo(() => getDailyMovementTrend(data), [data]);
  const movementDataStatus = useMemo(() => getMovementDataStatus(data), [data]);
  const [selectedTouristId, setSelectedTouristId] = useState<string>("all");
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [adminTab, setAdminTab] = useState<AdminDashboardTab>("overview");
  const [planAudience, setPlanAudience] = useState<PlanAudience>("movement");
  const [planCity, setPlanCity] = useState("all");
  const [planMaxStops, setPlanMaxStops] = useState(5);
  const [planMinimumTier, setPlanMinimumTier] = useState<PlanTier>("emerging");
  const [planDiversifyCategories, setPlanDiversifyCategories] = useState(true);
  const [selectedAnalysisKey, setSelectedAnalysisKey] = useState<string | null>(null);
  const [touristSearch, setTouristSearch] = useState("");
  const [touristProfileFilter, setTouristProfileFilter] = useState<TouristProfile | "all" | "incomplete">("all");
  const [selectedManagedTouristId, setSelectedManagedTouristId] = useState<string | null>(null);
  const [safetyAdminNotes, setSafetyAdminNotes] = useState<Record<string, string>>({});
  const [showAllAdminTourists, setShowAllAdminTourists] = useState(false);
  const [showAllMovementRecords, setShowAllMovementRecords] = useState(false);
  const [showAllSafetyCases, setShowAllSafetyCases] = useState(false);
  const [showAllAiResults, setShowAllAiResults] = useState(false);

  const tripOptions = useMemo(() => getTripFilterOptions(data, selectedTouristId), [data, selectedTouristId]);
  const movementRecords = useMemo(
    () =>
      getMovementRecords(data, {
        touristId: selectedTouristId,
        tripId: selectedTripId,
        fromDate,
        toDate,
      }),
    [data, selectedTouristId, selectedTripId, fromDate, toDate]
  );
  const movementTripRecords = useMemo(
    () =>
      getMovementTripRecords(data, {
        touristId: selectedTouristId,
        tripId: selectedTripId,
        fromDate,
        toDate,
      }),
    [data, selectedTouristId, selectedTripId, fromDate, toDate]
  );
  const filteredPoints = movementRecords.map((record) => record.point);
  const allDashboardPoints = data.points;
  const aiEvaluation = useMemo(() => evaluateAiOutput(data), [data]);
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data]);
  const movementAlerts = useMemo(() => calculateMovementAlerts(data), [data]);
  const upcomingFestivals = useMemo(() => getUpcomingFestivals(malaysiaFestivalEvents), []);
  const geofenceActivity = useMemo(() => calculateGeofenceActivity(data), [data]);
  const activeGeofenceCount = geofenceActivity.filter((row) => row.pointCount > 0).length;
  const demoDatasetLoaded = isPreparedDemoDatasetLoaded(data);
  const touristManagementRows = useMemo(() => getTouristManagementRows(data), [data]);
  const filteredTouristManagementRows = useMemo(() => {
    const search = touristSearch.trim().toLowerCase();

    return touristManagementRows.filter((row) => {
      const matchesSearch =
        !search ||
        row.tourist.name.toLowerCase().includes(search) ||
        row.tourist.email.toLowerCase().includes(search) ||
        (row.tourist.nationality ?? "").toLowerCase().includes(search) ||
        (row.tourist.passportNumber ?? "").toLowerCase().includes(search);
      const matchesProfile =
        touristProfileFilter === "all" ||
        (touristProfileFilter === "incomplete" ? !row.tourist.profileCompletedAt && !row.tourist.travelPreferences?.length : row.profile === touristProfileFilter);

      return matchesSearch && matchesProfile;
    });
  }, [touristManagementRows, touristProfileFilter, touristSearch]);
  const travelPlan = useMemo(
    () =>
      createMovementBasedTravelPlan(data, {
        audience: planAudience,
        city: planCity,
        maxStops: planMaxStops,
        minimumTier: planMinimumTier,
        diversifyCategories: planDiversifyCategories,
      }),
    [data, planAudience, planCity, planMaxStops, planMinimumTier, planDiversifyCategories]
  );
  const cityOptions = useMemo(() => Array.from(new Set(data.destinations.map((destination) => destination.city))).sort(), [data.destinations]);
  const filteredTouristCount = new Set(movementTripRecords.map((record) => record.trip.userId)).size;
  const filteredTripCount = movementTripRecords.length;
  const hasRecordFilters = selectedTouristId !== "all" || selectedTripId !== "all" || Boolean(fromDate) || Boolean(toDate);
  const [selectedRecordTripId, setSelectedRecordTripId] = useState<string | null>(null);
  const selectedRecord = movementTripRecords.find((record) => record.trip.id === selectedRecordTripId) ?? movementTripRecords[0] ?? null;
  const analysisRows = useMemo(
    () => [...data.analyses].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()),
    [data.analyses]
  );
  const selectedAnalysis = analysisRows.find((analysis) => analysisKey(analysis) === selectedAnalysisKey) ?? analysisRows[0] ?? null;
  const selectedAnalysisUser = selectedAnalysis ? data.users.find((candidate) => candidate.id === selectedAnalysis.userId) ?? null : null;
  const selectedAnalysisTrip = selectedAnalysis ? data.trips.find((candidate) => candidate.id === selectedAnalysis.tripId) ?? null : null;
  const selectedAnalysisRecommendations = selectedAnalysis ? data.recommendations.filter((recommendation) => recommendation.userId === selectedAnalysis.userId).slice(0, 3) : [];
  const safetyRecords = useMemo(
    () =>
      [
        ...data.sosAlerts.map((alert) => ({
          id: alert.id,
          kind: "sos" as const,
          userId: alert.userId,
          status: alert.status,
          title: "SOS assistance request",
          detail: alert.message,
          locationNote: alert.latitude !== undefined && alert.longitude !== undefined ? "Approximate location was saved from the latest trip point." : "No recent location point was available.",
          adminNote: alert.adminNote,
          createdAt: alert.createdAt,
          updatedAt: alert.updatedAt,
        })),
        ...data.incidentReports.map((report) => ({
          id: report.id,
          kind: "incident" as const,
          userId: report.userId,
          status: report.status,
          title: getIncidentTypeLabel(report.type, (key) => translate("en", key)),
          detail: report.description,
          locationNote: report.locationNote || (report.latitude !== undefined && report.longitude !== undefined ? "Approximate location was saved from the latest trip point." : "No location note was provided."),
          adminNote: report.adminNote,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data.incidentReports, data.sosAlerts]
  );
  const openSosCount = data.sosAlerts.filter((alert) => alert.status !== "resolved").length;
  const openIncidentCount = data.incidentReports.filter((report) => report.status !== "resolved").length;
  const openSafetyRecordCount = getOpenSafetyCount(data);
  const resolvedSafetyRecordCount = safetyRecords.filter((record) => record.status === "resolved").length;
  const selectedManagedTourist = filteredTouristManagementRows.find((row) => row.tourist.id === selectedManagedTouristId) ?? filteredTouristManagementRows[0] ?? null;
  const visibleTouristManagementRows = showAllAdminTourists ? filteredTouristManagementRows : filteredTouristManagementRows.slice(0, adminTouristPreviewLimit);
  const hiddenTouristManagementCount = filteredTouristManagementRows.length - visibleTouristManagementRows.length;
  const visibleMovementTripRecords = showAllMovementRecords ? movementTripRecords : movementTripRecords.slice(0, adminMovementPreviewLimit);
  const hiddenMovementRecordCount = movementTripRecords.length - visibleMovementTripRecords.length;
  const visibleSafetyRecords = showAllSafetyCases ? safetyRecords : safetyRecords.slice(0, adminSafetyPreviewLimit);
  const hiddenSafetyRecordCount = safetyRecords.length - visibleSafetyRecords.length;
  const visibleAnalysisRows = showAllAiResults ? analysisRows : analysisRows.slice(0, adminAiPreviewLimit);
  const hiddenAnalysisCount = analysisRows.length - visibleAnalysisRows.length;
  const selectedKValue = aiEvaluation.validClusteredRecordCount > 0 ? Math.min(3, aiEvaluation.validClusteredRecordCount) : 0;
  const selectedClusterSize = selectedAnalysis ? analysisRows.filter((analysis) => analysis.cluster === selectedAnalysis.cluster).length : 0;
  const clusterSummaries = useMemo(
    () =>
      Array.from(new Set(analysisRows.map((analysis) => analysis.cluster)))
        .sort((a, b) => a - b)
        .map((cluster) => {
          const records = analysisRows.filter((analysis) => analysis.cluster === cluster);
          const profileCounts = records.reduce<Record<string, number>>((totals, analysis) => {
            totals[analysis.profile] = (totals[analysis.profile] ?? 0) + 1;
            return totals;
          }, {});
          const dominantProfile = Object.entries(profileCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed";

          return {
            cluster,
            size: records.length,
            label: records[0]?.clusterLabel ?? "Unlabelled cluster",
            dominantProfile,
            averageSilhouette: records.length ? Number((records.reduce((total, analysis) => total + analysis.silhouetteScore, 0) / records.length).toFixed(2)) : 0,
          };
        }),
    [analysisRows]
  );

  useEffect(() => {
    if (selectedTripId !== "all" && !tripOptions.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId("all");
    }
  }, [selectedTripId, tripOptions]);

  useEffect(() => {
    setShowAllMovementRecords(false);
  }, [fromDate, selectedTouristId, selectedTripId, toDate]);

  useEffect(() => {
    setShowAllAdminTourists(false);
  }, [touristProfileFilter, touristSearch]);

  useEffect(() => {
    setShowAllAiResults(false);
  }, [adminTab]);

  useEffect(() => {
    if (selectedRecordTripId && !movementTripRecords.some((record) => record.trip.id === selectedRecordTripId)) {
      setSelectedRecordTripId(null);
    }
  }, [movementTripRecords, selectedRecordTripId]);

  useEffect(() => {
    if (selectedAnalysisKey && !analysisRows.some((analysis) => analysisKey(analysis) === selectedAnalysisKey)) {
      setSelectedAnalysisKey(null);
    }
  }, [analysisRows, selectedAnalysisKey]);

  useEffect(() => {
    if (selectedManagedTouristId && !filteredTouristManagementRows.some((row) => row.tourist.id === selectedManagedTouristId)) {
      setSelectedManagedTouristId(null);
    }
  }, [filteredTouristManagementRows, selectedManagedTouristId]);

  useEffect(() => {
    setSafetyAdminNotes((current) => {
      const next = { ...current };
      safetyRecords.forEach((record) => {
        const key = `${record.kind}:${record.id}`;
        if (next[key] === undefined) {
          next[key] = record.adminNote ?? "";
        }
      });
      return next;
    });
  }, [safetyRecords]);

  const recomputeAi = () => {
    onDataChange(refreshAllRecommendations(data));
    notify({ tone: "success", title: adminText("notify.aiTitle"), message: adminText("notify.aiMessage") });
  };

  const seedDemoTourists = () => {
    if (demoDatasetLoaded) {
      notify({
        tone: "info",
        title: t("admin.demo.alreadyLoadedTitle"),
        message: t("admin.demo.alreadyLoadedMessage"),
      });
      return;
    }

    const refreshed = refreshAllRecommendations(mergePreparedDemoDataset(data));
    onDataChange(refreshed, null, { localOnlyStatus: DEMO_DATASET_LOCAL_ONLY_STATUS });
    notify({
      tone: "success",
      title: t("admin.demo.loadedTitle"),
      message: t("admin.demo.loadedMessage"),
    });
  };

  const clearDemoTourists = () => {
    const cleaned = refreshAllRecommendations(removeGeneratedDemoDataset(data));
    onDataChange(cleaned, null, { localOnlyStatus: "Generated demo dataset removed locally; Firestore sync skipped" });
    notify({
      tone: "info",
      title: t("admin.demo.removedTitle"),
      message: t("admin.demo.removedMessage"),
    });
  };

  const resetRecordFilters = () => {
    setSelectedTouristId("all");
    setSelectedTripId("all");
    setFromDate("");
    setToDate("");
  };

  const exportFilteredRecords = () => {
    const blob = new Blob([buildMovementRecordsCsv(movementRecords)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movement-records-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTravelPlan = () => {
    const blob = new Blob([buildTravelPlanCsv(travelPlan, data)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movement-travel-plan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportMovementAlerts = () => {
    const blob = new Blob([buildMovementAlertsCsv(movementAlerts, data)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movement-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateSafetyCase = (kind: "sos" | "incident", recordId: string, status: SafetyStatus, adminNote?: string) => {
    const nextData = kind === "sos" ? updateSosStatus(data, recordId, status, adminNote) : updateIncidentStatus(data, recordId, status, adminNote);
    onDataChange(nextData);
    notify({
      tone: "success",
      title: "Safety case updated",
      message: adminNote?.trim() ? "The case status and admin response were saved." : status === "resolved" ? "The case is marked as resolved." : "The case status was saved.",
    });
  };

  const touristManagementPanel = (
    <div className="admin-tab-panel">
      <div className="admin-tab-heading">
        <div>
          <h2>{adminText("tourists.title")}</h2>
          <p>{adminText("tourists.description")}</p>
        </div>
        <strong>{adminText("common.shown", { count: filteredTouristManagementRows.length })}</strong>
      </div>
      <div className="filter-toolbar admin-filter-toolbar">
        <input className="toolbar-input" value={touristSearch} onChange={(event) => setTouristSearch(event.target.value)} placeholder={adminText("tourists.search")} aria-label={adminText("tourists.search")} />
        <select className="toolbar-select" value={touristProfileFilter} onChange={(event) => setTouristProfileFilter(event.target.value as TouristProfile | "all" | "incomplete")}>
          <option value="all">{adminText("tourists.allProfiles")}</option>
          <option value="cultural">{adminText("tourists.cultural")}</option>
          <option value="nature">{adminText("tourists.nature")}</option>
          <option value="urban">{adminText("tourists.urban")}</option>
          <option value="mixed">{adminText("tourists.mixed")}</option>
          <option value="incomplete">{adminText("tourists.incomplete")}</option>
        </select>
      </div>
      <MetricGrid
        items={[
          [adminText("tourists.registered"), tourists.length.toString()],
          [adminText("tourists.withPassport"), tourists.filter((tourist) => tourist.passportNumber).length.toString()],
          [adminText("tourists.activeTrips"), summary.activeTripCount.toString()],
          [adminText("tourists.openSafety"), openSafetyRecordCount.toString()],
        ]}
      />
      <section className="tourist-management-layout">
        <div className="list-panel tourist-management-list">
          {visibleTouristManagementRows.map((row) => (
            <button className={selectedManagedTourist?.tourist.id === row.tourist.id ? "tourist-management-card active" : "tourist-management-card"} key={row.tourist.id} type="button" onClick={() => setSelectedManagedTouristId(row.tourist.id)}>
              <div>
                <strong>{row.tourist.name}</strong>
                <span>{row.profile ? `${row.profile} tourist` : adminText("tourists.profilePending")}</span>
              </div>
              <p>{row.tourist.nationality ?? adminText("common.notProvided")} · {row.consentGranted ? adminText("tourists.locationConsentActive") : adminText("tourists.noActiveConsent")}</p>
              <div className="record-metrics">
                <span>{row.completedTrips} {adminText("common.trips")}</span>
                <span>{row.movementPoints} {adminText("common.points")}</span>
                <span>{row.checkIns} {adminText("tourists.checkIns")}</span>
                <span>{row.openSafetyCases} {adminText("tourists.safety")}</span>
              </div>
            </button>
          ))}
          <ListLimitFooter hiddenCount={hiddenTouristManagementCount} isExpanded={showAllAdminTourists} itemLabel="tourist record" pluralLabel="tourist records" onToggle={() => setShowAllAdminTourists((value) => !value)} />
          {filteredTouristManagementRows.length === 0 && <EmptyState text={adminText("tourists.empty")} />}
        </div>

        {selectedManagedTourist && (
          <aside className="tourist-management-detail">
            <span>{adminText("tourists.selected")}</span>
            <h2>{selectedManagedTourist.tourist.name}</h2>
            <p>{selectedManagedTourist.latestActivityAt ? adminText("tourists.latestActivity", { date: formatDateTime(selectedManagedTourist.latestActivityAt) }) : adminText("tourists.noActivity")}</p>
            <dl>
              <div>
                <dt>{adminText("tourists.email")}</dt>
                <dd>{selectedManagedTourist.tourist.email}</dd>
              </div>
              <div>
                <dt>{adminText("tourists.nationality")}</dt>
                <dd>{selectedManagedTourist.tourist.nationality ?? adminText("common.notProvided")}</dd>
              </div>
              <div>
                <dt>{adminText("tourists.passport")}</dt>
                <dd>{selectedManagedTourist.tourist.passportNumber ?? adminText("common.notProvided")}</dd>
              </div>
              <div>
                <dt>{adminText("tourists.travelStyle")}</dt>
                <dd>{formatTravelPreferenceList(selectedManagedTourist.tourist.travelPreferences, "en")}</dd>
              </div>
              <div>
                <dt>{adminText("tourists.emergencyContact")}</dt>
                <dd>
                  {selectedManagedTourist.tourist.emergencyContactPhone
                    ? `${selectedManagedTourist.tourist.emergencyContactName || adminText("tourists.savedContact")} · ${selectedManagedTourist.tourist.emergencyContactPhone}`
                    : adminText("common.notProvided")}
                </dd>
              </div>
              <div>
                <dt>{adminText("tourists.recentPlaces")}</dt>
                <dd>{selectedManagedTourist.latestDestinationNames.length > 0 ? selectedManagedTourist.latestDestinationNames.join(", ") : adminText("tourists.noRecognisedPlaces")}</dd>
              </div>
            </dl>
            <div className="tourist-detail-actions">
              <button className="secondary-action" type="button" onClick={() => {
                setSelectedTouristId(selectedManagedTourist.tourist.id);
                setAdminTab("records");
              }}>
                {adminText("tourists.viewMovement")}
              </button>
              <button className="secondary-action" type="button" onClick={() => setAdminTab("safety")}>
                {adminText("tourists.viewSafety")}
              </button>
            </div>
          </aside>
        )}
      </section>
    </div>
  );

  const movementRecordsPanel = (
    <div className="admin-tab-panel">
      <div className="filter-toolbar admin-filter-toolbar">
        <select
          className="toolbar-select"
          value={selectedTouristId}
          onChange={(event) => {
            setSelectedTouristId(event.target.value);
            setSelectedTripId("all");
          }}
        >
          <option value="all">{adminText("records.allTourists")}</option>
          {tourists.map((tourist) => (
            <option key={tourist.id} value={tourist.id}>
              {tourist.name}
            </option>
          ))}
        </select>
        <select className="toolbar-select" value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>
          <option value="all">{adminText("records.allTrips")}</option>
          {tripOptions.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {formatDateTime(trip.startedAt)} - {trip.status}
            </option>
          ))}
        </select>
        <input className="toolbar-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" />
        <input className="toolbar-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" />
        <button className="secondary-action" onClick={resetRecordFilters} disabled={!hasRecordFilters}>
          <RotateCcw size={18} />
          {adminText("common.reset")}
        </button>
        <button className="secondary-action" onClick={exportFilteredRecords} disabled={movementRecords.length === 0}>
          <Download size={18} />
          {adminText("common.csv")}
        </button>
      </div>
      <MetricGrid
        items={[
          [adminText("records.filteredRecords"), movementRecords.length.toString()],
          [adminText("records.tripsMatched"), filteredTripCount.toString()],
          [adminText("records.touristsShown"), filteredTouristCount.toString()],
          [adminText("records.dateRange"), fromDate || toDate ? adminText("records.custom") : adminText("records.all")],
        ]}
      />
      <div className="two-column">
        <MovementMap points={selectedRecord?.points.length ? selectedRecord.points : filteredPoints} destinations={data.destinations} locale={locale} />
        <section className="admin-records-layout">
          <div className="list-panel">
            {visibleMovementTripRecords.map((record) => {
              const profile = record.analysis ? `${record.analysis.profile} Tourist` : adminText("common.pending");
              const destinationText = record.destinationNames.length > 0 ? record.destinationNames.join(", ") : adminText("records.noRecognised");

              return (
                <button
                  className={selectedRecord?.trip.id === record.trip.id ? "record-card movement-trip-card selectable active" : "record-card movement-trip-card selectable"}
                  key={record.trip.id}
                  onClick={() => setSelectedRecordTripId(record.trip.id)}
                  type="button"
                >
                  <div>
                    <strong>{record.tourist?.name ?? adminText("common.unknownTourist")}</strong>
                    <span>{record.trip.status}</span>
                  </div>
                  <small className="mono-text">{record.trip.id}</small>
                  <p>{destinationText}</p>
                  <div className="record-metrics">
                    <span>{formatDateTime(record.trip.startedAt)}</span>
                    <span>{record.summary.durationMinutes} min</span>
                    <span>{record.summary.pointCount} {adminText("common.points")}</span>
                    <span>{record.summary.visitedDestinationCount} stops</span>
                    <span>{record.analysis ? `${adminText("ai.cluster")} ${record.analysis.cluster + 1}` : adminText("records.clusterPending")}</span>
                    <span>{profile}</span>
                  </div>
                </button>
              );
            })}
            <ListLimitFooter hiddenCount={hiddenMovementRecordCount} isExpanded={showAllMovementRecords} itemLabel="movement record" pluralLabel="movement records" onToggle={() => setShowAllMovementRecords((value) => !value)} />
            {movementTripRecords.length === 0 && <EmptyState text={adminText("records.empty")} />}
          </div>

          {selectedRecord && (
            <aside className="record-detail-panel">
              <span>{adminText("records.selected")}</span>
              <h2>{selectedRecord.tourist?.name ?? adminText("common.unknownTourist")}</h2>
              <dl>
                <div>
                  <dt>{adminText("records.tripId")}</dt>
                  <dd className="mono-text">{selectedRecord.trip.id}</dd>
                </div>
                <div>
                  <dt>{adminText("records.date")}</dt>
                  <dd>{formatDateTime(selectedRecord.trip.startedAt)}</dd>
                </div>
                <div>
                  <dt>{adminText("records.duration")}</dt>
                  <dd>{selectedRecord.summary.durationMinutes} {adminText("common.minutes")}</dd>
                </div>
                <div>
                  <dt>{adminText("overview.movementPoints")}</dt>
                  <dd>{selectedRecord.summary.pointCount}</dd>
                </div>
                <div>
                  <dt>{adminText("records.destinationsVisited")}</dt>
                  <dd>{selectedRecord.destinationNames.length > 0 ? selectedRecord.destinationNames.join(", ") : adminText("records.noRecognised")}</dd>
                </div>
                <div>
                  <dt>{adminText("records.clusterId")}</dt>
                  <dd>{selectedRecord.analysis ? `${adminText("ai.cluster")} ${selectedRecord.analysis.cluster + 1}` : adminText("common.pending")}</dd>
                </div>
                <div>
                  <dt>{adminText("records.touristCategory")}</dt>
                  <dd>{selectedRecord.analysis ? `${selectedRecord.analysis.profile} Tourist` : adminText("common.pending")}</dd>
                </div>
                <div>
                  <dt>{adminText("records.analysisStatus")}</dt>
                  <dd>{selectedRecord.analysis ? `${selectedRecord.analysis.classifier} generated ${formatDateTime(selectedRecord.analysis.generatedAt)}` : adminText("common.pending")}</dd>
                </div>
              </dl>
              <p>{adminText("records.readOnly")}</p>
            </aside>
          )}
        </section>
      </div>
    </div>
  );

  if (view === "destinations") {
    return (
      <Page title="Destination Management" eyebrow="Administrator workspace">
        <DestinationManager destinations={data.destinations} onChange={(destinations) => onDataChange(refreshAllRecommendations({ ...data, destinations }))} notify={notify} />
      </Page>
    );
  }

  const safetyPanel = (
    <div className="admin-tab-panel">
      <div className="admin-tab-heading">
        <div>
          <h2>{adminText("safety.title")}</h2>
          <p>{adminText("safety.description")}</p>
        </div>
        <strong>{adminText("safety.openCases", { count: openSafetyRecordCount })}</strong>
      </div>
      <MetricGrid
        items={[
          [adminText("safety.openSos"), openSosCount.toString()],
          [adminText("safety.openIncidents"), openIncidentCount.toString()],
          [adminText("safety.resolved"), resolvedSafetyRecordCount.toString()],
          [adminText("safety.emergencyContacts"), tourists.filter((tourist) => tourist.emergencyContactPhone).length.toString()],
        ]}
      />
      <section className="list-panel safety-admin-list">
        {visibleSafetyRecords.map((record) => {
          const tourist = data.users.find((candidate) => candidate.id === record.userId);
          const caseKey = `${record.kind}:${record.id}`;
          const noteDraft = safetyAdminNotes[caseKey] ?? record.adminNote ?? "";
          const contactLine = tourist?.emergencyContactPhone
            ? `${tourist.emergencyContactName || adminText("tourists.emergencyContact")} · ${tourist.emergencyContactPhone}${tourist.emergencyContactRelation ? ` · ${tourist.emergencyContactRelation}` : ""}`
            : adminText("common.notProvided");

          return (
            <article className={record.kind === "sos" ? "safety-admin-card urgent" : "safety-admin-card"} key={`${record.kind}-${record.id}`}>
              <div className="safety-admin-heading">
                <div>
                  <span>{record.kind === "sos" ? adminText("safety.sos") : adminText("safety.incident")}</span>
                  <h3>{record.title}</h3>
                  <p>{record.detail}</p>
                </div>
                <select className="safety-status-select" value={record.status} onChange={(event) => updateSafetyCase(record.kind, record.id, event.target.value as SafetyStatus, noteDraft)} aria-label={adminText("safety.status")}>
                  <option value="open">{adminText("safety.open")}</option>
                  <option value="reviewing">{adminText("safety.reviewing")}</option>
                  <option value="resolved">{adminText("safety.resolved")}</option>
                </select>
              </div>
              <dl className="safety-admin-meta">
                <div>
                  <dt>{t("common.tourist")}</dt>
                  <dd>{tourist?.name ?? adminText("common.unknownTourist")}</dd>
                </div>
                <div>
                  <dt>{adminText("tourists.nationality")}</dt>
                  <dd>{tourist?.nationality ?? adminText("common.notProvided")}</dd>
                </div>
                <div>
                  <dt>{adminText("tourists.passport")}</dt>
                  <dd>{tourist?.passportNumber ?? adminText("common.notProvided")}</dd>
                </div>
                <div>
                  <dt>{adminText("tourists.emergencyContact")}</dt>
                  <dd>{contactLine}</dd>
                </div>
                <div>
                  <dt>{adminText("safety.location")}</dt>
                  <dd>{record.locationNote}</dd>
                </div>
                <div>
                  <dt>{adminText("safety.submitted")}</dt>
                  <dd>{formatDateTime(record.createdAt)}</dd>
                </div>
              </dl>
              <div className="safety-admin-response">
                <label>
                  {adminText("safety.responseLabel")}
                  <textarea
                    value={noteDraft}
                    onChange={(event) => setSafetyAdminNotes((current) => ({ ...current, [caseKey]: event.target.value }))}
                    placeholder={adminText("safety.responsePlaceholder")}
                  />
                </label>
                <button className="secondary-action compact-action" type="button" onClick={() => updateSafetyCase(record.kind, record.id, record.status, noteDraft)}>
                  {adminText("safety.saveResponse")}
                </button>
              </div>
            </article>
          );
        })}
        <ListLimitFooter hiddenCount={hiddenSafetyRecordCount} isExpanded={showAllSafetyCases} itemLabel="safety case" pluralLabel="safety cases" onToggle={() => setShowAllSafetyCases((value) => !value)} />
        {safetyRecords.length === 0 && <EmptyState text={adminText("safety.empty")} />}
      </section>
    </div>
  );

  const aiResultsPanel = (
    <div className="admin-tab-panel">
      <div className="admin-tab-heading">
        <div>
          <h2>{adminText("ai.title")}</h2>
          <p>{adminText("ai.description")}</p>
        </div>
        <button className="secondary-action" onClick={recomputeAi}>
          <RotateCcw size={18} />
          {adminText("common.recompute")}
        </button>
      </div>
      <MetricGrid
        items={[
          [adminText("ai.clusteredRecords"), aiEvaluation.validClusteredRecordCount.toString()],
          [adminText("ai.labelledRecords"), aiEvaluation.labelledRecordCount.toString()],
          [adminText("ai.decisionAccuracy"), `${Math.round(aiEvaluation.classificationAccuracy * 100)}%`],
          [adminText("ai.selectedK"), selectedKValue.toString()],
        ]}
      />
      <div className="ai-results-layout">
        <section className="panel ai-cluster-panel">
          <div className="section-heading">
            <h2>{adminText("ai.clusterSummary")}</h2>
            <span>K = {selectedKValue}</span>
          </div>
          <div className="cluster-summary-grid">
            {clusterSummaries.map((summary) => (
              <article key={summary.cluster}>
                <strong>{adminText("ai.cluster")} {summary.cluster + 1}</strong>
                <span>{adminText("ai.tripCount", { count: summary.size })}</span>
                <p>{summary.label}</p>
                <small>
                  {adminText("ai.dominantCategory")}: {summary.dominantProfile} | {adminText("ai.avgSilhouette")} {summary.averageSilhouette}
                </small>
              </article>
            ))}
            {clusterSummaries.length === 0 && <EmptyState text={adminText("ai.noClusters")} />}
          </div>
          <h2>{adminText("ai.categoryDistribution")}</h2>
          <CategoryBars values={profileDistribution} />
        </section>

        <section className="list-panel ai-analysis-list">
          {visibleAnalysisRows.map((analysis) => {
            const user = data.users.find((candidate) => candidate.id === analysis.userId);
            const active = selectedAnalysis ? analysisKey(selectedAnalysis) === analysisKey(analysis) : false;

            return (
              <button className={active ? "record-card selectable active" : "record-card selectable"} key={analysisKey(analysis)} onClick={() => setSelectedAnalysisKey(analysisKey(analysis))} type="button">
                <div>
                  <strong>{user?.name ?? adminText("common.unknownTourist")}</strong>
                  <span>{adminText("ai.cluster")} {analysis.cluster + 1}</span>
                </div>
                <p>{analysis.clusterLabel}</p>
                <div className="record-metrics">
                  <span>{analysis.profile} Tourist</span>
                  <span>{analysis.dataPointCount} {adminText("common.points")}</span>
                  <span>{Math.round(analysis.classificationConfidence * 100)}% {adminText("ai.confidence")}</span>
                </div>
              </button>
            );
          })}
          <ListLimitFooter hiddenCount={hiddenAnalysisCount} isExpanded={showAllAiResults} itemLabel={adminText("ai.resultLabel")} pluralLabel="AI results" onToggle={() => setShowAllAiResults((value) => !value)} />
          {analysisRows.length === 0 && <EmptyState text={adminText("ai.empty")} />}
        </section>

        {selectedAnalysis && (
          <aside className="ai-detail-panel">
            <span>{adminText("ai.selectedResult")}</span>
            <h2>{selectedAnalysisUser?.name ?? adminText("common.unknownTourist")}</h2>
            <dl>
              <div>
                <dt>{adminText("records.tripId")}</dt>
                <dd className="mono-text">{selectedAnalysis.tripId}</dd>
              </div>
              <div>
                <dt>{adminText("ai.tripDate")}</dt>
                <dd>{selectedAnalysisTrip ? formatDateTime(selectedAnalysisTrip.startedAt) : adminText("common.unknown")}</dd>
              </div>
              <div>
                <dt>{adminText("ai.kMeansResult")}</dt>
                <dd>
                  {adminText("ai.cluster")} {selectedAnalysis.cluster + 1} of K={selectedKValue} ({adminText("ai.tripCount", { count: selectedClusterSize })})
                </dd>
              </div>
              <div>
                <dt>{adminText("ai.dominantPattern")}</dt>
                <dd>{selectedAnalysis.clusterLabel}</dd>
              </div>
              <div>
                <dt>{adminText("ai.clusterDescriptionLabel")}</dt>
                <dd>
                  {adminText("ai.clusterDescription", {
                    cultural: selectedAnalysis.kMeansCentroid.culturalProportion,
                    nature: selectedAnalysis.kMeansCentroid.natureProportion,
                    urban: selectedAnalysis.kMeansCentroid.urbanProportion,
                    unique: selectedAnalysis.kMeansCentroid.uniqueDestinations,
                  })}
                </dd>
              </div>
              <div>
                <dt>{adminText("ai.decisionOutput")}</dt>
                <dd>
                  {selectedAnalysis.profile} Tourist, {Math.round(selectedAnalysis.classificationConfidence * 100)}% {adminText("ai.confidence")}
                </dd>
              </div>
              <div>
                <dt>{adminText("ai.generated")}</dt>
                <dd>{formatDateTime(selectedAnalysis.generatedAt)}</dd>
              </div>
            </dl>
            <div className="tree-metrics">
              <span>Silhouette {selectedAnalysis.silhouetteScore}</span>
              <span>Depth {selectedAnalysis.decisionTreeDepth}</span>
              <span>{selectedAnalysis.decisionRuleCount} rules</span>
            </div>
            <section className="ai-detail-section">
              <h3>{adminText("ai.decisionPath")}</h3>
              <ul className="decision-path">
                {selectedAnalysis.decisionPath.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
            <section className="ai-detail-section">
              <h3>{adminText("ai.inputPattern")}</h3>
              <KMeansFeatureBars features={selectedAnalysis.kMeansInput} />
            </section>
            <section className="ai-detail-section">
              <h3>{adminText("ai.clusterCentroid")}</h3>
              <KMeansFeatureBars features={selectedAnalysis.kMeansCentroid} />
            </section>
            <section className="ai-detail-section">
              <h3>{adminText("ai.recommendationResult")}</h3>
              {selectedAnalysisRecommendations.length > 0 ? (
                <div className="ai-recommendation-result">
                  {selectedAnalysisRecommendations.map((recommendation) => {
                    const destination = data.destinations.find((candidate) => candidate.id === recommendation.destinationId);

                    return destination ? (
                      <span key={recommendation.id}>
                        {destination.name}
                        <small>
                          {destination.city} | score {recommendation.score}
                        </small>
                      </span>
                    ) : null;
                  })}
                </div>
              ) : (
                <p>{adminText("ai.noRecommendation")}</p>
              )}
            </section>
          </aside>
        )}
      </div>
      {aiEvaluation.labelledRecordCount > 0 && <ConfusionMatrix values={aiEvaluation.confusionMatrix} />}
    </div>
  );

  return (
    <Page
      title={t("admin.dashboard.title")}
      eyebrow={t("admin.dashboard.eyebrow")}
      actions={
        <div className="page-action-row">
          <button className="secondary-action" onClick={seedDemoTourists} disabled={demoDatasetLoaded}>
            <UserRound size={18} />
            {demoDatasetLoaded ? t("admin.demo.loadedButton") : t("admin.demo.loadButton")}
          </button>
          {demoDatasetLoaded && (
            <button className="secondary-action" onClick={clearDemoTourists}>
              <Trash2 size={18} />
              {t("admin.demo.removeButton")}
            </button>
          )}
          <button className="secondary-action" onClick={recomputeAi}>
            <RotateCcw size={18} />
            {t("admin.dashboard.refreshAi")}
          </button>
        </div>
      }
    >
      <div className="segmented-control admin-tabs" aria-label={t("admin.dashboard.tabsLabel")}>
        <button className={adminTab === "overview" ? "active" : ""} type="button" onClick={() => setAdminTab("overview")}>
          {t("admin.tabs.overview")}
        </button>
        <button className={adminTab === "tourists" ? "active" : ""} type="button" onClick={() => setAdminTab("tourists")}>
          {t("admin.tabs.tourists")}
        </button>
        <button className={adminTab === "records" ? "active" : ""} type="button" onClick={() => setAdminTab("records")}>
          {t("admin.tabs.records")}
        </button>
        <button className={adminTab === "safety" ? "active" : ""} type="button" onClick={() => setAdminTab("safety")}>
          {t("admin.tabs.safety")}
        </button>
        <button className={adminTab === "ai" ? "active" : ""} type="button" onClick={() => setAdminTab("ai")}>
          {t("admin.tabs.ai")}
        </button>
      </div>

      {adminTab === "overview" && (
        <div className="admin-tab-panel">
          <MovementPulseHero
            mode="admin"
            demand={destinationDemand}
            destinations={data.destinations}
            profile={`${tourists.length} ${adminText("overview.touristProfiles")}`}
            pointCount={summary.movementPointCount}
            plan={travelPlan}
          />
          <MetricGrid
            items={[
              [t("common.tourist"), tourists.length.toString()],
              [adminText("overview.completedTrips"), summary.completedTripCount.toString()],
              [adminText("overview.movementPoints"), summary.movementPointCount.toString()],
              [adminText("overview.movementAlerts"), movementAlerts.length.toString()],
              [adminText("overview.safetyCases"), openSafetyRecordCount.toString()],
              [adminText("overview.activeZones"), activeGeofenceCount.toString()],
            ]}
          />
          <section className="admin-overview-layout">
            <div className="admin-overview-map">
              <MovementMap points={allDashboardPoints} destinations={data.destinations} displayMode="signals" locale={locale} />
            </div>
            <aside className="admin-command-panel">
              {!movementDataStatus.hasMovementData && <EmptyState text={movementDataStatus.message} />}

              <details className="admin-overview-section" open>
                <summary>
                  <span>{adminText("overview.movementAlertsTitle")}</span>
                  <strong>{adminText("overview.alertCount", { count: movementAlerts.length })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <MovementAlertList alerts={movementAlerts} destinations={data.destinations} onExport={exportMovementAlerts} />
                </div>
              </details>

              <details className="admin-overview-section">
                <summary>
                  <span>{adminText("overview.geofenceActivity")}</span>
                  <strong>{adminText("overview.activeCount", { count: activeGeofenceCount })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <div className="geofence-admin-list">
                    {geofenceActivity.slice(0, 5).map((row) => (
                      <article className={`geofence-admin-card ${row.geofence.type}`} key={row.geofence.id}>
                        <div>
                          <strong>{row.geofence.name}</strong>
                          <span>{row.geofence.type}</span>
                        </div>
                        <p>{row.geofence.message}</p>
                        <small>
                          {row.pointCount} movement point(s), {row.touristCount} tourist(s)
                          {row.latestRecordedAt ? ` · latest ${formatDateTime(row.latestRecordedAt)}` : ""}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              </details>

              <details className="admin-overview-section">
                <summary>
                  <span>{adminText("overview.demandEvents")}</span>
                  <strong>{adminText("overview.eventCount", { count: upcomingFestivals.length })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <h2>{adminText("overview.movementTrend")}</h2>
                  <CategoryBars values={movementTrend} />
                  <MovementDemandList title={adminText("overview.topTouristFlow")} demand={destinationDemand.slice(0, 4)} destinations={data.destinations} compact />
                  <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} compact />
                </div>
              </details>

              <details className="admin-overview-section">
                <summary>
                  <span>{adminText("overview.travelPlanSignal")}</span>
                  <strong>{adminText("overview.stopCount", { count: travelPlan.stops.length })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <div className="section-heading">
                    <h2>{adminText("overview.travelPlanSignal")}</h2>
                    <button className="secondary-action compact-action" onClick={exportTravelPlan} disabled={travelPlan.stops.length === 0}>
                      <Download size={18} />
                      {adminText("common.csv")}
                    </button>
                  </div>
                  <div className="plan-builder" aria-label={adminText("overview.travelPlanControls")}>
                    <label>
                      {adminText("overview.audience")}
                      <select value={planAudience} onChange={(event) => setPlanAudience(event.target.value as PlanAudience)}>
                        <option value="movement">{adminText("overview.overallMovement")}</option>
                        <option value="mixed">{adminText("tourists.mixed")}</option>
                        <option value="cultural">{adminText("tourists.cultural")}</option>
                        <option value="nature">{adminText("tourists.nature")}</option>
                        <option value="urban">{adminText("tourists.urban")}</option>
                      </select>
                    </label>
                    <label>
                      {adminText("overview.city")}
                      <select value={planCity} onChange={(event) => setPlanCity(event.target.value)}>
                        <option value="all">{adminText("overview.allCities")}</option>
                        {cityOptions.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {adminText("overview.stops")}
                      <input type="number" min={1} max={8} value={planMaxStops} onChange={(event) => setPlanMaxStops(Number(event.target.value))} />
                    </label>
                    <label>
                      {adminText("overview.demand")}
                      <select value={planMinimumTier} onChange={(event) => setPlanMinimumTier(event.target.value as PlanTier)}>
                        <option value="low">{adminText("overview.lowPlus")}</option>
                        <option value="emerging">{adminText("overview.emergingPlus")}</option>
                        <option value="medium">{adminText("overview.mediumPlus")}</option>
                        <option value="high">{adminText("overview.highOnly")}</option>
                      </select>
                    </label>
                    <label className="checkbox-field">
                      <input type="checkbox" checked={planDiversifyCategories} onChange={(event) => setPlanDiversifyCategories(event.target.checked)} />
                      {adminText("overview.diverseCategories")}
                    </label>
                  </div>
                  <TravelPlanPanel plan={travelPlan} destinations={data.destinations} />
                </div>
              </details>

              <details className="admin-overview-section">
                <summary>
                  <span>{adminText("overview.recentRecommendations")}</span>
                  <strong>{adminText("overview.resultCount", { count: data.recommendations.length })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <RecommendationList recommendations={data.recommendations.slice(0, 3)} destinations={data.destinations} compact />
                </div>
              </details>
            </aside>
          </section>
        </div>
      )}
      {adminTab === "tourists" && touristManagementPanel}
      {adminTab === "records" && movementRecordsPanel}
      {adminTab === "safety" && safetyPanel}
      {adminTab === "ai" && aiResultsPanel}
    </Page>
  );
}

export default App;
