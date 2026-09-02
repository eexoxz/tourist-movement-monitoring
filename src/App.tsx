import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Compass,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  MapPinned,
  Navigation,
  Pencil,
  RotateCcw,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type {
  AnalysisResult,
  AppData,
  AppView,
  Destination,
  DestinationCategory,
  DestinationDemand,
  KMeansFeatureVector,
  FestivalEvent,
  MalaysianState,
  MovementAlert,
  MovementPoint,
  Recommendation,
  IncidentType,
  SafetyStatus,
  TouristProfile,
  TravelPlan,
  TravelPlanOptions,
  TripSession,
  TripSummary,
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
import { distanceKm, formatDateTime, nearestDestination } from "./services/geo";
import {
  buildMovementAlertsCsv,
  buildTravelPlanCsv,
  calculateDestinationDemand,
  calculateMovementAlerts,
  createMovementBasedTravelPlan,
  evaluateAiOutput,
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
import { addDestinationRecord, deleteDestinationRecord, destinationCategories, updateDestinationRecord } from "./services/destinationManagement";
import { allMalaysianStates, malaysiaFestivalEvents } from "./data/festivals";
import { nationalityOptions } from "./data/nationalities";
import { isLocale, loadLocale, localeOptions, saveLocale, translate, type Locale, type TranslationKey } from "./services/i18n";
import { formatFestivalDate, formatFestivalScope, formatFestivalStateSummaryLabel, getFestivalDestinationMatches, getFestivalPlanningSummary, getFestivalsForState, getUpcomingFestivals } from "./services/festivals";
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
  createSampleTripForUser,
  deleteTouristMovementData,
  getActiveTrip,
  getGrantedConsent,
  getUserTrips,
  getVisitedDestinationIds,
  grantLocationConsent,
  revokeLocationConsent,
  startTripSession,
  stopActiveTrip,
  summarizeTrip,
  summarizeUserTrips,
} from "./services/movement";
import { checkOutFromAttraction, createAttractionCheckIn, getActiveCheckIn, getCheckInDurationMinutes } from "./services/checkIns";
import { calculateGeofenceActivity, getActiveGeofenceWarnings } from "./services/geofencing";
import { createIncidentReport, createSosAlert, getOpenSafetyCount, updateIncidentStatus, updateSosStatus } from "./services/safety";
import { getTouristManagementRows } from "./services/touristManagement";

const MapView = lazy(() => import("./components/MapView").then((module) => ({ default: module.MapView })));
type PlanAudience = NonNullable<TravelPlanOptions["audience"]>;
type PlanTier = NonNullable<TravelPlanOptions["minimumTier"]>;
type AdminDashboardTab = "overview" | "tourists" | "records" | "safety" | "ai";
type AuthResult = { error?: string; message?: string };
type PlaceDiscoveryMode = "recommended" | "trending" | "nearby" | "events" | "hidden";
type TouristRegistrationDraft = {
  name: string;
  email: string;
  password: string;
  nationality: string;
  passportNumber: string;
  termsAccepted: boolean;
};
type NotificationTone = "success" | "error" | "info" | "warning";
type AppNotification = {
  id: string;
  tone: NotificationTone;
  title: string;
  message?: string;
};
type NotifyFn = (notification: Omit<AppNotification, "id">) => void;
type RememberedLogin = { email: string; password: string };
const REMEMBER_LOGIN_KEY = "tourist-movement-monitoring:remember-login";
const PROFILE_SKIP_KEY_PREFIX = "tourist-movement-monitoring:profile-skip:";
const placeDiscoveryModes: Array<{ value: PlaceDiscoveryMode; label: string }> = [
  { value: "recommended", label: "Best match" },
  { value: "trending", label: "Trending" },
  { value: "nearby", label: "Near me" },
  { value: "events", label: "Event-linked" },
  { value: "hidden", label: "Quieter picks" },
];
const demoCredentialEmails = new Set(["tourist@example.com", "nature@example.com", "culture@example.com", "urban@example.com", "admin@tourism.local"]);
const preferenceOptions: Array<{ value: DestinationCategory; label: string }> = [
  { value: "cultural", label: "Culture" },
  { value: "nature", label: "Nature" },
  { value: "urban", label: "City spots" },
  { value: "heritage", label: "Heritage" },
  { value: "food", label: "Food" },
  { value: "coastal", label: "Coastal" },
];
const incidentTypeOptions: Array<{ value: IncidentType; label: string }> = [
  { value: "lost-item", label: "Lost item" },
  { value: "accident", label: "Accident" },
  { value: "suspicious-activity", label: "Suspicious activity" },
  { value: "medical", label: "Medical help" },
  { value: "other", label: "Other help" },
];


const demoRoute = [
  [3.142, 101.6894],
  [3.1457, 101.6954],
  [3.1478, 101.6937],
  [3.1556, 101.7139],
  [3.1579, 101.7116],
] as const;

function analysisKey(analysis: AnalysisResult) {
  return `${analysis.tripId}:${analysis.generatedAt}`;
}

function getRecognizedDestinationNames(points: MovementPoint[], destinations: Destination[]) {
  const names = points
    .map((point) => {
      const nearest = nearestDestination(point, destinations);
      return nearest && nearest.distance <= 1.2 ? nearest.destination.name : null;
    })
    .filter((name): name is string => Boolean(name));

  return Array.from(new Set(names));
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

function loadRememberedLogin(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) {
      return null;
    }

    const login = JSON.parse(raw) as RememberedLogin;
    if (demoCredentialEmails.has(login.email.trim().toLowerCase())) {
      clearRememberedLogin();
      return null;
    }

    return login;
  } catch {
    return null;
  }
}

function saveRememberedLogin(email: string, password: string) {
  localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ email, password }));
}

function clearRememberedLogin() {
  localStorage.removeItem(REMEMBER_LOGIN_KEY);
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

function getDisplayName(user: User) {
  const name = user.name.trim();
  return name && name !== user.email && !name.includes("@") ? name : "";
}

function formatTripTitle(trip: TripSession, destinationNames: string[]) {
  const routeLabel = destinationNames.slice(0, 2).join(" to ");

  if (routeLabel) {
    return `${routeLabel} trip`;
  }

  return trip.status === "active" ? "Current trip" : "Malaysia trip";
}

function getTripDiaryInsight(summary: TripSummary, destinationNames: string[]) {
  if (summary.pointCount < 2) {
    return "Keep this trip recording while you move around. Once there is a little more activity, the app can suggest places that better fit your route.";
  }

  if (destinationNames.length > 0) {
    return `You spent time around ${destinationNames.slice(0, 3).join(", ")}. Use this trip to find similar places nearby and compare where visitor movement is forming next.`;
  }

  return "Your route is saved. Recommendations will become more useful as your trip gets closer to known Malaysian attractions and active visitor areas.";
}

function getTripSuggestionStatus(summary: TripSummary, analysis: AnalysisResult | null) {
  if (summary.pointCount < 2) {
    return "Keep recording";
  }

  return analysis ? "Ready" : "Refresh";
}

function inferExpectedProfileFromPreferences(preferences: DestinationCategory[]): NonNullable<User["expectedProfile"]> {
  const culturalScore = preferences.filter((category) => category === "cultural" || category === "heritage").length;
  const natureScore = preferences.filter((category) => category === "nature" || category === "coastal").length;
  const urbanScore = preferences.filter((category) => category === "urban" || category === "food").length;
  const scores = [
    ["cultural", culturalScore],
    ["nature", natureScore],
    ["urban", urbanScore],
  ] as const;
  const ranked = [...scores].sort((a, b) => b[1] - a[1]);

  return ranked[0][1] > 0 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : "mixed";
}

function formatTravelPreferenceList(preferences?: DestinationCategory[]) {
  if (!preferences || preferences.length === 0) {
    return "Not set yet";
  }

  const labels = new Map(preferenceOptions.map((option) => [option.value, option.label]));
  return preferences.map((preference) => labels.get(preference) ?? preference).join(", ");
}

function getCategoryLabel(category: DestinationCategory) {
  return preferenceOptions.find((option) => option.value === category)?.label ?? category;
}

function formatDistance(distance?: number) {
  if (distance === undefined) {
    return "Location not active";
  }

  return distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`;
}

function categoryFitsProfile(category: DestinationCategory, profile?: TouristProfile) {
  if (!profile || profile === "mixed") {
    return true;
  }

  if (profile === "cultural") {
    return category === "cultural" || category === "heritage";
  }

  if (profile === "nature") {
    return category === "nature" || category === "coastal";
  }

  return category === "urban" || category === "food";
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

function LanguageSelector({ locale, onLocaleChange }: { locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const label = translate(locale, "language.label");

  return (
    <label className="language-selector">
      <span>{label}</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (isLocale(nextLocale)) {
            onLocaleChange(nextLocale);
          }
        }}
        aria-label={label}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {translate(locale, option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
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

  const commitData = (nextData: AppData, actor: User | null = currentUser) => {
    setData(nextData);
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
          <AdminWorkspace data={data} view={safeView} onDataChange={commitData} notify={notify} />
        ) : (
          <TouristWorkspace data={data} view={safeView} user={currentUser} locale={locale} onDataChange={commitData} onViewChange={goToView} watchId={watchId} notify={notify} />
        )}
      </main>
      <ToastViewport notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

function AuthScreen({
  mode,
  locale,
  onLocaleChange,
  onModeChange,
  onLogin,
  onRegister,
  onResendVerification,
  onPasswordReset,
  notify,
}: {
  mode: AuthMode;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (email: string, password: string) => Promise<AuthResult>;
  onRegister: (draft: TouristRegistrationDraft) => Promise<AuthResult>;
  onResendVerification: (email: string, password: string) => Promise<AuthResult>;
  onPasswordReset: (email: string) => Promise<AuthResult>;
  notify: NotifyFn;
}) {
  const [rememberedLogin] = useState(() => loadRememberedLogin());
  const [roleHint, setRoleHint] = useState<UserRole | "nature" | "culture" | "urban">("tourist");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(rememberedLogin?.email ?? "");
  const [password, setPassword] = useState(rememberedLogin?.password ?? "");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(Boolean(rememberedLogin));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firebaseMode = hasConfiguredAuth();
  const t = (key: TranslationKey) => translate(locale, key);

  const setDemoRole = (role: UserRole | "nature" | "culture" | "urban") => {
    setRoleHint(role);
    if (role === "admin") {
      setEmail("admin@tourism.local");
      setPassword("admin123");
    } else if (role === "nature") {
      setEmail("nature@example.com");
      setPassword("nature123");
    } else if (role === "culture") {
      setEmail("culture@example.com");
      setPassword("culture123");
    } else if (role === "urban") {
      setEmail("urban@example.com");
      setPassword("urban123");
    } else {
      setEmail("tourist@example.com");
      setPassword("tourist123");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      setMessage(null);
      notify({ tone: "error", title: "Email does not look right", message: "Use a real email address, for example name@example.com." });
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setMessage(null);
      notify({ tone: "error", title: "Password is too short", message: "Use at least 6 characters before continuing." });
      return;
    }

    if (mode === "register" && name.trim().length < 2) {
      setError("Enter a name with at least two characters.");
      setMessage(null);
      notify({ tone: "error", title: "Name is missing", message: "Enter at least two characters for the tourist profile name." });
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setMessage(null);
      notify({ tone: "error", title: "Passwords do not match", message: "Retype the same password in both password fields." });
      return;
    }

    if (mode === "register" && !(nationalityOptions as readonly string[]).includes(nationality.trim())) {
      setError("Choose your nationality from the list.");
      setMessage(null);
      notify({ tone: "error", title: "Nationality missing", message: "Choose the nationality shown on your travel document." });
      return;
    }

    if (mode === "register" && !/^[A-Za-z0-9 ]{5,20}$/.test(passportNumber.trim())) {
      setError("Enter a valid passport number using letters or numbers.");
      setMessage(null);
      notify({ tone: "error", title: "Passport number missing", message: "Use 5 to 20 letters or numbers from the passport." });
      return;
    }

    if (mode === "register" && !termsAccepted) {
      setError("Accept the data privacy and tourist safety terms before creating an account.");
      setMessage(null);
      notify({ tone: "error", title: "Consent required", message: "Read and accept the data privacy notice before registering." });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    const result =
      mode === "login"
        ? await onLogin(normalizedEmail, password)
        : await onRegister({
            name,
            email: normalizedEmail,
            password,
            nationality,
            passportNumber,
            termsAccepted,
          });
    setError(result.error ?? null);
    setMessage(result.message ?? null);
    if (result.error) {
      notify({ tone: "error", title: mode === "login" ? "Login failed" : "Registration failed", message: result.error });
    } else if (result.message) {
      notify({ tone: "success", title: mode === "login" ? "Login ready" : "Account created", message: result.message });
    } else {
      notify({ tone: "success", title: mode === "login" ? "Logged in" : "Account created", message: "You can continue using the app." });
    }
    if (!result.error) {
      if (rememberLogin) {
        saveRememberedLogin(normalizedEmail, password);
      } else {
        clearRememberedLogin();
      }
    }
    setIsSubmitting(false);
  };

  const switchAuthMode = (nextMode: AuthMode) => {
    setError(null);
    setMessage(null);
    onModeChange(nextMode);
  };

  const resendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address before resending verification.");
      setMessage(null);
      notify({ tone: "error", title: "Email does not look right", message: "Enter the email address used for this Firebase account." });
      return;
    }

    if (password.length < 6) {
      setError("Enter the password for this account before resending verification.");
      setMessage(null);
      notify({ tone: "error", title: "Password required", message: "Enter this account password before requesting another verification email." });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await onResendVerification(normalizedEmail, password);
    setError(result.error ?? null);
    setMessage(result.message ?? null);
    notify({
      tone: result.error ? "error" : "success",
      title: result.error ? "Verification failed" : "Verification email sent",
      message: result.error ?? result.message,
    });
    setIsSubmitting(false);
  };

  const requestPasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address before requesting a password reset.");
      setMessage(null);
      notify({ tone: "error", title: "Email does not look right", message: "Enter the email address for the Firebase account." });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await onPasswordReset(normalizedEmail);
    setError(result.error ?? null);
    setMessage(result.message ?? null);
    notify({
      tone: result.error ? "error" : "success",
      title: result.error ? "Reset failed" : "Password reset sent",
      message: result.error ?? result.message,
    });
    setIsSubmitting(false);
  };

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-copy">
          <MapPinned size={34} />
          <h1>{t("auth.title")}</h1>
          <p>{t("auth.description")}</p>
          <LanguageSelector locale={locale} onLocaleChange={onLocaleChange} />
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="segmented-control" role="tablist" aria-label={t("auth.mode")}>
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => switchAuthMode("login")}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => switchAuthMode("register")}
            >
              {t("auth.register")}
            </button>
          </div>

          {mode === "login" && !firebaseMode && (
            <div className="segmented-control role-switch profile-switch" aria-label={t("auth.demoRole")}>
              <button type="button" className={roleHint === "tourist" ? "active" : ""} onClick={() => setDemoRole("tourist")}>
                Mixed
              </button>
              <button type="button" className={roleHint === "nature" ? "active" : ""} onClick={() => setDemoRole("nature")}>
                Nature
              </button>
              <button type="button" className={roleHint === "culture" ? "active" : ""} onClick={() => setDemoRole("culture")}>
                Culture
              </button>
              <button type="button" className={roleHint === "urban" ? "active" : ""} onClick={() => setDemoRole("urban")}>
                Urban
              </button>
              <button type="button" className={roleHint === "admin" ? "active" : ""} onClick={() => setDemoRole("admin")}>
                Admin
              </button>
            </div>
          )}
          {firebaseMode && (
            <p className="form-hint">{t("auth.firebaseMode")}</p>
          )}

          {mode === "register" && (
            <label>
              {t("auth.name")}
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          )}

          <label>
            {t("auth.email")}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>

          <label>
            {t("auth.password")}
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {mode === "register" && (
            <label>
              {t("auth.confirmPassword")}
              <span className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          )}

          {mode === "register" && (
            <div className="field-pair auth-identity-fields">
              <label>
                {t("auth.nationality")}
                <select value={nationality} onChange={(event) => setNationality(event.target.value)} autoComplete="country-name" required>
                  <option value="">{t("auth.selectNationality")}</option>
                  {nationalityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("auth.passportNumber")}
                <input value={passportNumber} onChange={(event) => setPassportNumber(event.target.value)} autoComplete="off" placeholder="Example: A12345678" required />
                <small className="field-hint">{t("auth.passportHint")}</small>
              </label>
            </div>
          )}

          {mode === "register" && (
            <section className="auth-terms-panel">
              <strong>{t("auth.privacyTitle")}</strong>
              <p>{t("auth.privacyBody")}</p>
              <label className="checkbox-field remember-login">
                <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required />
                {t("auth.privacyAgreement")}
              </label>
            </section>
          )}

          <label className="checkbox-field remember-login">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(event) => {
                setRememberLogin(event.target.checked);
                if (!event.target.checked) {
                  clearRememberedLogin();
                }
              }}
            />
            {t("auth.rememberLogin")}
          </label>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <button className="primary-action" type="submit" disabled={isSubmitting}>
            <ShieldCheck size={18} />
            {isSubmitting ? t("auth.checkingAccess") : mode === "login" ? t("auth.enterSystem") : t("auth.createAccount")}
          </button>

          {firebaseMode && mode === "login" && (
            <div className="auth-secondary-actions">
              <button className="secondary-action" type="button" onClick={resendVerification} disabled={isSubmitting}>
                <RotateCcw size={18} />
                {t("auth.resendVerification")}
              </button>
              <button className="secondary-action" type="button" onClick={requestPasswordReset} disabled={isSubmitting}>
                <KeyRound size={18} />
                {t("auth.forgotPassword")}
              </button>
            </div>
          )}

          <button className="auth-mode-link" type="button" onClick={() => switchAuthMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? t("auth.createTouristAccount") : t("auth.alreadyHaveAccount")}
          </button>
        </form>
      </section>
    </main>
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
  const recommendations = data.recommendations.filter((recommendation) => recommendation.userId === user.id);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [locationRetryAvailable, setLocationRetryAvailable] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>(userTrips[0]?.id ?? "");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
  const [manualLocation, setManualLocation] = useState({ latitude: "3.1478", longitude: "101.6937", accuracyMeters: "25" });
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
  const selectedTripRecommendations = recommendations.slice(0, 3);
  const latestCompletedTrip = recentTrips.find((trip) => trip.status === "completed") ?? null;
  const latestCompletedTripPoints = latestCompletedTrip ? data.points.filter((point) => point.tripId === latestCompletedTrip.id) : [];
  const latestCompletedTripSummary = latestCompletedTrip ? summarizeTrip(data, latestCompletedTrip.id) : null;
  const latestCompletedTripAnalysis = latestCompletedTrip
    ? data.analyses.find((analysis) => analysis.tripId === latestCompletedTrip.id && analysis.userId === user.id) ?? null
    : null;
  const latestCompletedTripDestinationNames = useMemo(() => {
    return getRecognizedDestinationNames(latestCompletedTripPoints, data.destinations);
  }, [latestCompletedTripPoints, data.destinations]);
  const tripStateLabel = activeTrip ? "Active" : latestCompletedTrip ? "Completed" : "Not Started";
  const recentTrip = recentTrips[0];
  const recentTripSummary = recentTrip ? tripSummaries.find((summary) => summary.tripId === recentTrip.id) : null;
  const selectedDestination = data.destinations.find((destination) => destination.id === selectedDestinationId) ?? data.destinations[0];
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data]);
  const upcomingFestivals = useMemo(() => getUpcomingFestivals(malaysiaFestivalEvents), []);
  const visitedDestinationIds = useMemo(() => getVisitedDestinationIds(data, user.id), [data, user.id]);
  const latestKnownPoint = activePoints.at(-1) ?? tripPoints.at(-1);
  const userSosAlerts = data.sosAlerts.filter((alert) => alert.userId === user.id);
  const userIncidentReports = data.incidentReports.filter((report) => report.userId === user.id);
  const openSafetyCount = [...userSosAlerts, ...userIncidentReports].filter((record) => record.status !== "resolved").length;
  const activeCheckIn = getActiveCheckIn(data, user.id);
  const activeCheckInDestination = activeCheckIn ? data.destinations.find((destination) => destination.id === activeCheckIn.destinationId) ?? null : null;
  const recentCheckIns = data.checkIns.filter((checkIn) => checkIn.userId === user.id).slice(0, 3);
  const recommendedCheckIn = latestKnownPoint ? nearestDestination(latestKnownPoint, data.destinations)?.destination : null;
  const geofenceWarnings = useMemo(() => getActiveGeofenceWarnings(latestKnownPoint, data.geofences), [data.geofences, latestKnownPoint]);
  const displayName = getDisplayName(user);
  const showProfileSetup = !user.profileCompletedAt && !profileSetupSkipped;
  const hasPersonalizedRecommendations = Boolean(latestAnalysis);
  const recommendationHeading = hasPersonalizedRecommendations ? "Recommended For You" : "Basic Suggestions";
  const recommendationSupportText = hasPersonalizedRecommendations
    ? "These places use your latest movement pattern, tourist category and unvisited destination list."
    : "These are general suggestions from destination demand and your current location until a completed trip creates an AI result.";
  const t = (key: TranslationKey) => translate(locale, key);

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

  const grantConsent = () => {
    onDataChange(grantLocationConsent(data, user.id));
    notify({ tone: "success", title: "Location consent saved", message: "You can start a tracked trip when you are ready." });
  };

  const appendPoint = (tripId: string, latitude: number, longitude: number, accuracyMeters: number, source: "browser" | "demo") => {
    const result = appendMovementPoint(loadData(), {
      tripId,
      latitude,
      longitude,
      accuracyMeters,
      source,
    });

    if (result.error || !result.data) {
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

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        appendPoint(tripId, position.coords.latitude, position.coords.longitude, position.coords.accuracy, "browser");
        setTrackingMessage("Live movement point recorded.");
        setLocationRetryAvailable(false);
      },
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

    const currentPoints = data.points.filter((point) => point.tripId === activeTrip.id);
    const [latitude, longitude] = demoRoute[currentPoints.length % demoRoute.length];
    if (appendPoint(activeTrip.id, latitude, longitude, 32, "demo")) {
      showTrackingNotice("success", "Demo point added", "Demo movement point added to the active trip.");
    }
  };

  const createSampleRoute = () => {
    if (activeTrip) {
      showTrackingNotice("warning", "Finish active trip first", "Finish the current trip before adding a completed sample route.");
      return;
    }

    const result = createSampleTripForUser(data, user.id);
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
        <TouristProfileForm
          user={user}
          title={t("tourist.profile.formTitle")}
          description={t("tourist.profile.formDescription")}
          primaryLabel={t("tourist.profile.saveProfile")}
          onSave={saveProfile}
        />
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
              Add demo movement point
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

          <MovementMap points={activePoints.length ? activePoints : tripPoints} destinations={data.destinations} mode="tourist" />
        </div>
      </Page>
    );
  }

  if (view === "history") {
    const completedTripCount = userTrips.filter((trip) => trip.status === "completed").length;
    const totalDistanceKm = Number(tripSummaries.reduce((sum, summary) => sum + summary.distanceKm, 0).toFixed(1));
    const totalRecognizedStops = tripSummaries.reduce((sum, summary) => sum + summary.visitedDestinationCount, 0);
    const selectedTripTitle = selectedTrip ? formatTripTitle(selectedTrip, selectedTripDestinationNames) : "No trip selected";
    const selectedTripInsight = selectedTripSummary ? getTripDiaryInsight(selectedTripSummary, selectedTripDestinationNames) : "";
    const selectedTripSuggestionStatus = selectedTripSummary ? getTripSuggestionStatus(selectedTripSummary, selectedTripAnalysis) : "Waiting";

    return (
      <Page title="Trip Diary" eyebrow="Tourist">
        <section className="trip-diary-page">
          <section className="trip-diary-hero">
            <div>
              <span>Route history</span>
              <h2>See what each trip taught the app.</h2>
              <p>Your saved movement becomes a simple route story, recognised stops and recommendation learning instead of raw tracking records.</p>
            </div>
            <div className="trip-diary-stats" aria-label="Trip diary totals">
              <span>
                <strong>{completedTripCount}</strong>
                Completed
              </span>
              <span>
                <strong>{totalDistanceKm}</strong>
                km recorded
              </span>
              <span>
                <strong>{totalRecognizedStops}</strong>
                Stops found
              </span>
            </div>
          </section>

          <section className="trip-diary-layout">
            <div className="trip-diary-main">
              <MovementMap points={selectedTripPoints.length ? selectedTripPoints : tripPoints} destinations={data.destinations} mode="tourist" />

              {selectedTrip && selectedTripSummary ? (
                <section className="trip-story-panel">
                  <div className="section-heading">
                    <div>
                      <span>Selected route</span>
                      <h2>{selectedTripTitle}</h2>
                      <p>{formatDateTime(selectedTrip.startedAt)}</p>
                    </div>
                    <strong className="trip-status-badge">{selectedTrip.status === "completed" ? "Completed" : "Active"}</strong>
                  </div>

                  <div className="trip-story-metrics">
                    <span>
                      <strong>{selectedTripSummary.distanceKm}</strong>
                      km travelled
                    </span>
                    <span>
                      <strong>{selectedTripSummary.durationMinutes}</strong>
                      min spent
                    </span>
                    <span>
                      <strong>{selectedTripSummary.visitedDestinationCount}</strong>
                      places noticed
                    </span>
                    <span>
                      <strong>{selectedTripSuggestionStatus}</strong>
                      suggestions
                    </span>
                  </div>

                  <p className="trip-insight">{selectedTripInsight}</p>

                  <div className="trip-stop-strip" aria-label="Recognised trip stops">
                    {selectedTripDestinationNames.length > 0 ? (
                      selectedTripDestinationNames.map((name) => <span key={name}>{name}</span>)
                    ) : (
                      <small>No saved destination was close enough to this route yet.</small>
                    )}
                  </div>

                  <section className="trip-guidance-panel">
                    <div>
                      <strong>What this trip is useful for</strong>
                      <p>It helps the app compare real visitor movement around Malaysia, then turn that activity into place suggestions instead of relying only on ratings.</p>
                    </div>
                    <button className="secondary-action" type="button" onClick={() => onViewChange("recommendations")}>
                      <Sparkles size={18} />
                      Find places from this trip
                    </button>
                  </section>

                  <div className="trip-detail-recommendations">
                    <strong>{hasPersonalizedRecommendations ? "Places you may want next" : "Places to try next"}</strong>
                    {selectedTripRecommendations.length > 0 ? (
                      selectedTripRecommendations.map((recommendation) => {
                        const destination = data.destinations.find((candidate) => candidate.id === recommendation.destinationId);

                        return destination ? (
                          <button className="trip-recommendation-link" type="button" key={recommendation.id} onClick={() => onViewChange("recommendations")}>
                            <span>
                              {destination.name} <small>{destination.city}</small>
                            </span>
                          </button>
                        ) : null;
                      })
                    ) : (
                      <p>Complete a trip with enough movement data to generate recommendations.</p>
                    )}
                  </div>
                </section>
              ) : (
                <section className="trip-story-panel">
                  <EmptyState text="Your saved trips will appear here after you start tracking." />
                </section>
              )}
            </div>

            <aside className="trip-timeline-panel">
              <div className="section-heading">
                <div>
                  <span>Saved trips</span>
                  <h2>Pick a route</h2>
                  <p>Select a trip to inspect its map, stops and recommendation learning.</p>
                </div>
              </div>

              {recentTrips.map((trip) => {
                const summary = tripSummaries.find((row) => row.tripId === trip.id);
                const points = data.points.filter((point) => point.tripId === trip.id);
                const destinationNames = getRecognizedDestinationNames(points, data.destinations);

                return (
                  <button className={selectedTrip?.id === trip.id ? "trip-timeline-card active" : "trip-timeline-card"} key={trip.id} type="button" onClick={() => setSelectedTripId(trip.id)}>
                    <span>{trip.status === "completed" ? "Completed trip" : "Active trip"}</span>
                    <strong>{formatTripTitle(trip, destinationNames)}</strong>
                    <small>{trip.endedAt ? formatDateTime(trip.endedAt) : "Trip still active"}</small>
                    <p>
                      {summary?.distanceKm ?? 0} km, {summary?.durationMinutes ?? 0} min, {destinationNames.length || 0} recognised stop(s)
                    </p>
                  </button>
                );
              })}
              {userTrips.length === 0 && <EmptyState text="Start tracking or add a sample Malaysia route to create your first trip diary entry." />}
            </aside>
          </section>
        </section>
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
          referencePoint={activePoints.at(-1) ?? tripPoints.at(-1)}
          selectedDestinationId={selectedDestinationId}
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
              <span>Planning window</span>
              <strong>Next 12 months</strong>
            </div>
            <div>
              <span>Malaysia focus</span>
              <strong>{upcomingFestivals.length} event signals</strong>
            </div>
            <p>
              Use these public holidays and tourism events as context for where tourist movement may increase. Past one-time events are hidden automatically, and annual dates roll forward from the day you open the app.
            </p>
          </section>
          <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} />
        </section>
      </Page>
    );
  }

  return (
    <Page title={displayName ? `${t("tourist.home.welcomeBack")}, ${displayName}` : t("tourist.home.planTitle")} eyebrow={t("common.tourist")}>
      <section className="tourist-home-flow">
        <div className="tracking-status-card">
          <span>{tripStateLabel}</span>
          <div>
            <h2>{activeTrip ? t("tourist.home.activeTripTitle") : recentTrip ? t("tourist.home.readyNextTripTitle") : t("tourist.home.firstTripTitle")}</h2>
            <p>
              {activeTrip
                ? t("tourist.home.activeTripDescription")
                : recentTrip
                  ? t("tourist.home.readyNextTripDescription")
                  : t("tourist.home.firstTripDescription")}
            </p>
          </div>
        </div>

        <MovementMap points={activePoints.length ? activePoints : tripPoints} destinations={data.destinations} activePoint={activePoints.at(-1) ?? tripPoints.at(-1)} mode="tourist" />

        {geofenceWarnings.length > 0 && (
          <section className="tourist-section geofence-warning-panel">
            <div className="section-heading">
              <div>
                <span>{t("tourist.geofence.eyebrow")}</span>
                <h2>{t("tourist.geofence.title")}</h2>
                <p>{t("tourist.geofence.description")}</p>
              </div>
            </div>
            <div className="geofence-warning-list">
              {geofenceWarnings.map((warning) => (
                <article className={`geofence-warning-card ${warning.geofence.type}`} key={warning.geofence.id}>
                  <div>
                    <strong>{warning.geofence.name}</strong>
                    <span>{warning.distanceMeters} m away</span>
                  </div>
                  <p>{warning.geofence.message}</p>
                  <small>{warning.geofence.recommendedAction}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mobile-trip-controls">
          <div className="consent-box">
            <ShieldCheck size={22} />
            <div>
              <strong>{currentConsent ? t("tourist.home.locationAllowed") : t("tourist.home.allowLocation")}</strong>
              <p>{currentConsent ? t("tourist.home.locationAllowedText") : t("tourist.home.locationNeededText")}</p>
            </div>
          </div>

          {!currentConsent && (
            <button className="primary-action wide" onClick={grantConsent}>
              <ShieldCheck size={18} />
              {t("tourist.home.allowLocation")}
            </button>
          )}

          {currentConsent && (
            <div className="mobile-action-row">
              <button className="primary-action" onClick={startTrip} disabled={Boolean(activeTrip)}>
                <Play size={18} />
                {t("tourist.home.startTrip")}
              </button>
              <button className="secondary-action" onClick={stopTrip} disabled={!activeTrip}>
                <Square size={18} />
                {t("tourist.home.stopTrip")}
              </button>
            </div>
          )}

          {activeTrip && !isLiveTracking && (
            <button className="secondary-action wide" onClick={resumeLiveTracking}>
              <Navigation size={18} />
              {t("tourist.home.resumeTracking")}
            </button>
          )}

          {activeTrip && (
            <button className="secondary-action wide" onClick={addDemoPoint}>
              {t("tourist.home.addDemoPoint")}
            </button>
          )}

          <button className="secondary-action wide" onClick={createSampleRoute} disabled={Boolean(activeTrip)}>
            <Compass size={18} />
            {t("tourist.home.addSampleRoute")}
          </button>

          {trackingMessage && <p className="status-message">{trackingMessage}</p>}

          {locationRetryAvailable && activeTrip && (
            <button className="secondary-action wide" type="button" onClick={resumeLiveTracking}>
              <RotateCcw size={18} />
              {t("tourist.home.tryLocationAgain")}
            </button>
          )}

          {userTrips.length === 0 && (
            <section className="new-user-guide">
              <strong>{t("tourist.home.howItWorks")}</strong>
              <ol>
                <li>{t("tourist.home.stepAllowLocation")}</li>
                <li>{t("tourist.home.stepStartTrip")}</li>
                <li>{t("tourist.home.stepStopTrip")}</li>
              </ol>
            </section>
          )}
        </section>

        <section className="tourist-section check-in-panel">
          <div className="section-heading">
            <div>
              <span>{t("tourist.checkin.eyebrow")}</span>
              <h2>{activeCheckInDestination ? `${t("tourist.checkin.activeTitlePrefix")} ${activeCheckInDestination.name}` : t("tourist.checkin.emptyTitle")}</h2>
              <p>{activeCheckIn ? t("tourist.checkin.activeDescription") : t("tourist.checkin.emptyDescription")}</p>
            </div>
            {activeCheckIn && <strong>{getCheckInDurationMinutes(activeCheckIn)} min</strong>}
          </div>

          {!activeCheckIn && (
            <div className="check-in-control">
              <label>
                {t("tourist.checkin.attraction")}
                <select value={checkInDestinationId} onChange={(event) => setCheckInDestinationId(event.target.value)}>
                  {data.destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name} · {destination.city}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-action" type="button" onClick={startAttractionCheckIn}>
                <MapPinned size={18} />
                {t("tourist.checkin.checkIn")}
              </button>
            </div>
          )}

          {recommendedCheckIn && !activeCheckIn && (
            <button className="secondary-action wide" type="button" onClick={() => setCheckInDestinationId(recommendedCheckIn.id)}>
              {t("tourist.checkin.useNearest")}: {recommendedCheckIn.name}
            </button>
          )}

          {activeCheckIn && (
            <button className="secondary-action wide" type="button" onClick={finishAttractionCheckIn}>
              <Square size={18} />
              {t("tourist.checkin.checkOut")}
            </button>
          )}

          <div className="check-in-history">
            {recentCheckIns.map((checkIn) => {
              const destination = data.destinations.find((candidate) => candidate.id === checkIn.destinationId);

              return (
                <span key={checkIn.id}>
                  <strong>{destination?.name ?? t("tourist.checkin.unknownAttraction")}</strong>
                  {checkIn.status === "checked-out" ? `${getCheckInDurationMinutes(checkIn)} ${t("tourist.checkin.minVisit")}` : t("tourist.checkin.currentlyCheckedIn")}
                </span>
              );
            })}
            {recentCheckIns.length === 0 && <small>{t("tourist.checkin.emptyHistory")}</small>}
          </div>
        </section>

        <section className="tourist-section safety-panel">
          <div className="section-heading">
            <div>
              <span>{t("tourist.safety.eyebrow")}</span>
              <h2>{t("tourist.safety.title")}</h2>
              <p>{t("tourist.safety.description")}</p>
            </div>
            <strong>{openSafetyCount} {t("tourist.safety.open")}</strong>
          </div>

          <div className="safety-contact-strip">
            <div>
              <small>{t("tourist.safety.emergencyContact")}</small>
              <strong>{user.emergencyContactName || t("tourist.safety.notAdded")}</strong>
              <span>{user.emergencyContactPhone || t("tourist.safety.addInProfile")}</span>
            </div>
            <button className="secondary-action compact-action" type="button" onClick={() => onViewChange("profile")}>
              <UserRound size={16} />
              {t("tourist.safety.editContact")}
            </button>
          </div>

          <button className="primary-action danger wide" type="button" onClick={sendSosAlert}>
            <ShieldCheck size={18} />
            {t("tourist.safety.sos")}
          </button>
          <p className="safety-disclaimer">{t("tourist.safety.prototypeNote")}</p>

          <form className="incident-form" onSubmit={submitIncidentReport}>
            <div className="field-pair">
              <label>
                {t("tourist.safety.incidentType")}
                <select value={incidentType} onChange={(event) => setIncidentType(event.target.value as IncidentType)}>
                  {incidentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("tourist.safety.locationNote")}
                <input value={incidentLocationNote} onChange={(event) => setIncidentLocationNote(event.target.value)} placeholder={t("tourist.safety.locationPlaceholder")} />
              </label>
            </div>
            <label>
              {t("tourist.safety.whatHappened")}
              <textarea value={incidentDescription} onChange={(event) => setIncidentDescription(event.target.value)} placeholder={t("tourist.safety.descriptionPlaceholder")} required />
            </label>
            <button className="secondary-action wide" type="submit">
              <Save size={18} />
              {t("tourist.safety.submitIncident")}
            </button>
          </form>

          <div className="safety-record-list">
            {userSosAlerts.slice(0, 2).map((alert) => (
              <span key={alert.id}>
                SOS {alert.status} · {formatDateTime(alert.createdAt)}
              </span>
            ))}
            {userIncidentReports.slice(0, 2).map((report) => (
              <span key={report.id}>
                {incidentTypeOptions.find((option) => option.value === report.type)?.label ?? "Incident"} {report.status} · {formatDateTime(report.createdAt)}
              </span>
            ))}
            {userSosAlerts.length === 0 && userIncidentReports.length === 0 && <small>{t("tourist.safety.noRequests")}</small>}
          </div>
        </section>

        <MetricGrid
          items={[
            [t("tourist.metrics.tripStatus"), tripStateLabel],
            [t("tourist.metrics.savedPoints"), (activeTrip ? activePoints.length : tripPoints.length).toString()],
            [t("tourist.metrics.latestCategory"), latestAnalysis?.profile ?? "Learning"],
            [t("tourist.metrics.distance"), `${activeTripSummary?.distanceKm ?? recentTripSummary?.distanceKm ?? 0} km`],
          ]}
        />

        <section className="tourist-section profile-summary-card">
          <div className="section-heading">
            <div>
              <h2>{t("tourist.profile.summaryTitle")}</h2>
              <p>{t("tourist.profile.summaryDescription")}</p>
            </div>
            <button className="secondary-action compact-action" onClick={() => onViewChange("profile")}>
              <UserRound size={16} />
              {user.profileCompletedAt ? t("common.edit") : t("common.complete")}
            </button>
          </div>
          <div className="profile-summary-grid">
            <div>
              <small>{t("tourist.profile.name")}</small>
              <strong>{displayName || t("tourist.profile.notSetYet")}</strong>
            </div>
            <div>
              <small>{t("tourist.profile.interests")}</small>
              <strong>{formatTravelPreferenceList(user.travelPreferences)}</strong>
            </div>
            <div>
              <small>{t("tourist.profile.pace")}</small>
              <strong>{user.tripPace ?? "balanced"}</strong>
            </div>
            <div>
              <small>{t("tourist.profile.emergencyContact")}</small>
              <strong>{user.emergencyContactName || t("tourist.profile.notSetYet")}</strong>
            </div>
          </div>
        </section>

        {latestCompletedTrip && latestCompletedTripSummary && (
          <CompletedTripSummary
            trip={latestCompletedTrip}
            summary={latestCompletedTripSummary}
            destinationNames={latestCompletedTripDestinationNames}
            analysis={latestCompletedTripAnalysis}
            onViewHistory={() => {
              setSelectedTripId(latestCompletedTrip.id);
              onViewChange("history");
            }}
            onViewRecommendations={() => onViewChange("recommendations")}
          />
        )}

        <section className="tourist-section">
          <div className="section-heading">
            <div>
              <h2>{recommendationHeading}</h2>
              <p>{recommendationSupportText}</p>
            </div>
            <button className="secondary-action compact-action" onClick={() => onViewChange("recommendations")}>
              <Sparkles size={16} />
              View all
            </button>
          </div>
          <RecommendationList recommendations={recommendations.slice(0, 3)} destinations={data.destinations} demand={destinationDemand} personalized={hasPersonalizedRecommendations} compact />
        </section>

        {recentTrip ? (
          <section className="tourist-section recent-trip-card">
            <div className="section-heading">
              <h2>Recent Trip</h2>
              <button className="secondary-action compact-action" onClick={() => onViewChange("history")}>
                <MapPinned size={16} />
                View trips
              </button>
            </div>
            <p>{formatDateTime(recentTrip.startedAt)}</p>
            <div className="trip-preview-stats">
              <span>{recentTrip.status}</span>
              <span>{recentTripSummary?.durationMinutes ?? 0} min</span>
              <span>{recentTripSummary?.pointCount ?? 0} points</span>
              <span>{recentTripSummary?.visitedDestinationCount ?? 0} stops</span>
            </div>
          </section>
        ) : null}

        <MovementDemandList title="Popular Right Now" demand={destinationDemand.slice(0, 5)} destinations={data.destinations} compact />

        <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} compact onOpenCalendar={() => onViewChange("events")} />

        <section className="tourist-section">
          <div className="section-heading">
            <h2>Destination Info</h2>
          </div>
          <DestinationPanel
            destinations={data.destinations.slice(0, 6)}
            demand={destinationDemand}
            selectedId={selectedDestination?.id}
            visitedIds={visitedDestinationIds}
            onSelect={setSelectedDestinationId}
          />
          {selectedDestination && <DestinationDetail destination={selectedDestination} demand={destinationDemand.find((row) => row.destinationId === selectedDestination.id)} />}
        </section>
      </section>
    </Page>
  );
}

function TouristProfileForm({
  user,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onSave,
  onSkip,
}: {
  user: User;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onSave: (user: User) => void;
  onSkip?: () => void;
}) {
  const [name, setName] = useState(getDisplayName(user));
  const [preferences, setPreferences] = useState<DestinationCategory[]>(user.travelPreferences ?? []);
  const [tripPace, setTripPace] = useState<User["tripPace"]>(user.tripPace ?? "balanced");
  const [travelGroup, setTravelGroup] = useState<User["travelGroup"]>(user.travelGroup ?? "solo");
  const [accessibilityPreference, setAccessibilityPreference] = useState<User["accessibilityPreference"]>(user.accessibilityPreference ?? "none");
  const [emergencyContactName, setEmergencyContactName] = useState(user.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user.emergencyContactPhone ?? "");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(user.emergencyContactRelation ?? "");

  const togglePreference = (preference: DestinationCategory) => {
    setPreferences((current) =>
      current.includes(preference) ? current.filter((candidate) => candidate !== preference) : [...current, preference]
    );
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...user,
      name: name.trim() || user.name,
      expectedProfile: inferExpectedProfileFromPreferences(preferences),
      travelPreferences: preferences,
      tripPace,
      travelGroup,
      accessibilityPreference,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      emergencyContactRelation: emergencyContactRelation.trim() || undefined,
      profileCompletedAt: new Date().toISOString(),
    });
  };

  return (
    <form className="profile-setup" onSubmit={saveProfile}>
      <section className="profile-setup-card">
        <div className="profile-setup-copy">
          <span>Personal setup</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="profile-form-grid">
          <label>
            Preferred name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should the app call you?" />
          </label>

          <fieldset>
            <legend>What kind of places do you like?</legend>
            <div className="preference-grid">
              {preferenceOptions.map((option) => (
                <label className={preferences.includes(option.value) ? "preference-chip active" : "preference-chip"} key={option.value}>
                  <input type="checkbox" checked={preferences.includes(option.value)} onChange={() => togglePreference(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field-pair">
            <label>
              Travel pace
              <select value={tripPace} onChange={(event) => setTripPace(event.target.value as User["tripPace"])}>
                <option value="relaxed">Relaxed</option>
                <option value="balanced">Balanced</option>
                <option value="packed">Packed schedule</option>
              </select>
            </label>
            <label>
              Travelling with
              <select value={travelGroup} onChange={(event) => setTravelGroup(event.target.value as User["travelGroup"])}>
                <option value="solo">Solo</option>
                <option value="couple">Partner</option>
                <option value="family">Family</option>
                <option value="friends">Friends</option>
              </select>
            </label>
          </div>

          <label>
            Walking preference
            <select value={accessibilityPreference} onChange={(event) => setAccessibilityPreference(event.target.value as User["accessibilityPreference"])}>
              <option value="none">No special preference</option>
              <option value="low-walking">Prefer less walking</option>
              <option value="wheelchair-friendly">Prefer wheelchair-friendly places</option>
            </select>
          </label>

          <section className="profile-emergency-fields">
            <div>
              <span>Emergency contact</span>
              <p>Optional, but useful if the tourist submits an SOS or incident report.</p>
            </div>
            <div className="field-pair">
              <label>
                Contact name
                <input value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} placeholder="Example: Nur Aisyah" />
              </label>
              <label>
                Contact phone
                <input value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} placeholder="Example: +60123456789" />
              </label>
            </div>
            <label>
              Relationship
              <input value={emergencyContactRelation} onChange={(event) => setEmergencyContactRelation(event.target.value)} placeholder="Example: Parent, spouse, friend" />
            </label>
          </section>
        </div>

        <div className="profile-actions">
          <button className="primary-action" type="submit">
            <Save size={18} />
            {primaryLabel}
          </button>
          {onSkip && (
            <button className="secondary-action" type="button" onClick={onSkip}>
              {secondaryLabel ?? "Skip"}
            </button>
          )}
        </div>
      </section>
    </form>
  );
}

function ToastViewport({ notifications, onDismiss }: { notifications: AppNotification[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      onDismiss(notifications[0].id);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [notifications, onDismiss]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="toast-stack" aria-live="polite" aria-label="Application notifications">
      {notifications.map((notification) => (
        <article className={`toast toast-${notification.tone}`} key={notification.id}>
          <div>
            <strong>{notification.title}</strong>
            {notification.message && <p>{notification.message}</p>}
          </div>
          <button type="button" onClick={() => onDismiss(notification.id)} title="Dismiss notification">
            <X size={16} />
          </button>
        </article>
      ))}
    </section>
  );
}

function AdminWorkspace({
  data,
  view,
  onDataChange,
  notify,
}: {
  data: AppData;
  view: AppView;
  onDataChange: (data: AppData) => void;
  notify: NotifyFn;
}) {
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
          createdAt: alert.createdAt,
          updatedAt: alert.updatedAt,
        })),
        ...data.incidentReports.map((report) => ({
          id: report.id,
          kind: "incident" as const,
          userId: report.userId,
          status: report.status,
          title: incidentTypeOptions.find((option) => option.value === report.type)?.label ?? "Incident report",
          detail: report.description,
          locationNote: report.locationNote || (report.latitude !== undefined && report.longitude !== undefined ? "Approximate location was saved from the latest trip point." : "No location note was provided."),
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

  const recomputeAi = () => {
    onDataChange(refreshAllRecommendations(data));
    notify({ tone: "success", title: "AI analysis refreshed", message: "K-Means, Decision Tree output and recommendations were recalculated." });
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

  const updateSafetyStatus = (kind: "sos" | "incident", recordId: string, status: SafetyStatus) => {
    const nextData = kind === "sos" ? updateSosStatus(data, recordId, status) : updateIncidentStatus(data, recordId, status);
    onDataChange(nextData);
    notify({
      tone: "success",
      title: "Safety case updated",
      message: status === "resolved" ? "The case is marked as resolved." : "The case status was saved.",
    });
  };

  const touristManagementPanel = (
    <div className="admin-tab-panel">
      <div className="admin-tab-heading">
        <div>
          <h2>Tourist Management</h2>
          <p>Review registered tourists, travel profiles, consent state, movement activity, and support needs.</p>
        </div>
        <strong>{filteredTouristManagementRows.length} shown</strong>
      </div>
      <div className="filter-toolbar admin-filter-toolbar">
        <input className="toolbar-input" value={touristSearch} onChange={(event) => setTouristSearch(event.target.value)} placeholder="Search name, email, nationality, passport" aria-label="Search tourists" />
        <select className="toolbar-select" value={touristProfileFilter} onChange={(event) => setTouristProfileFilter(event.target.value as TouristProfile | "all" | "incomplete")}>
          <option value="all">All profiles</option>
          <option value="cultural">Cultural tourists</option>
          <option value="nature">Nature tourists</option>
          <option value="urban">Urban tourists</option>
          <option value="mixed">Mixed tourists</option>
          <option value="incomplete">Incomplete profile</option>
        </select>
      </div>
      <MetricGrid
        items={[
          ["Registered tourists", tourists.length.toString()],
          ["With passport", tourists.filter((tourist) => tourist.passportNumber).length.toString()],
          ["Active trips", summary.activeTripCount.toString()],
          ["Open safety cases", openSafetyRecordCount.toString()],
        ]}
      />
      <section className="tourist-management-layout">
        <div className="list-panel tourist-management-list">
          {filteredTouristManagementRows.map((row) => (
            <button className={selectedManagedTourist?.tourist.id === row.tourist.id ? "tourist-management-card active" : "tourist-management-card"} key={row.tourist.id} type="button" onClick={() => setSelectedManagedTouristId(row.tourist.id)}>
              <div>
                <strong>{row.tourist.name}</strong>
                <span>{row.profile ? `${row.profile} tourist` : "Profile pending"}</span>
              </div>
              <p>{row.tourist.nationality ?? "Nationality not provided"} · {row.consentGranted ? "Location consent active" : "No active consent"}</p>
              <div className="record-metrics">
                <span>{row.completedTrips} trips</span>
                <span>{row.movementPoints} points</span>
                <span>{row.checkIns} check-ins</span>
                <span>{row.openSafetyCases} safety</span>
              </div>
            </button>
          ))}
          {filteredTouristManagementRows.length === 0 && <EmptyState text="No tourists match the current search or profile filter." />}
        </div>

        {selectedManagedTourist && (
          <aside className="tourist-management-detail">
            <span>Selected tourist</span>
            <h2>{selectedManagedTourist.tourist.name}</h2>
            <p>{selectedManagedTourist.latestActivityAt ? `Latest activity: ${formatDateTime(selectedManagedTourist.latestActivityAt)}` : "No movement activity has been recorded yet."}</p>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{selectedManagedTourist.tourist.email}</dd>
              </div>
              <div>
                <dt>Nationality</dt>
                <dd>{selectedManagedTourist.tourist.nationality ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>Passport</dt>
                <dd>{selectedManagedTourist.tourist.passportNumber ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>Travel style</dt>
                <dd>{formatTravelPreferenceList(selectedManagedTourist.tourist.travelPreferences)}</dd>
              </div>
              <div>
                <dt>Emergency contact</dt>
                <dd>
                  {selectedManagedTourist.tourist.emergencyContactPhone
                    ? `${selectedManagedTourist.tourist.emergencyContactName || "Saved contact"} · ${selectedManagedTourist.tourist.emergencyContactPhone}`
                    : "Not provided"}
                </dd>
              </div>
              <div>
                <dt>Recent places</dt>
                <dd>{selectedManagedTourist.latestDestinationNames.length > 0 ? selectedManagedTourist.latestDestinationNames.join(", ") : "No recognised places yet"}</dd>
              </div>
            </dl>
            <div className="tourist-detail-actions">
              <button className="secondary-action" type="button" onClick={() => {
                setSelectedTouristId(selectedManagedTourist.tourist.id);
                setAdminTab("records");
              }}>
                View movement records
              </button>
              <button className="secondary-action" type="button" onClick={() => setAdminTab("safety")}>
                View safety cases
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
          <option value="all">All tourists</option>
          {tourists.map((tourist) => (
            <option key={tourist.id} value={tourist.id}>
              {tourist.name}
            </option>
          ))}
        </select>
        <select className="toolbar-select" value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>
          <option value="all">All trips</option>
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
          Reset
        </button>
        <button className="secondary-action" onClick={exportFilteredRecords} disabled={movementRecords.length === 0}>
          <Download size={18} />
          CSV
        </button>
      </div>
      <MetricGrid
        items={[
          ["Filtered records", movementRecords.length.toString()],
          ["Trips matched", filteredTripCount.toString()],
          ["Tourists shown", filteredTouristCount.toString()],
          ["Date range", fromDate || toDate ? "Custom" : "All"],
        ]}
      />
      <div className="two-column">
        <MovementMap points={selectedRecord?.points.length ? selectedRecord.points : filteredPoints} destinations={data.destinations} />
        <section className="admin-records-layout">
          <div className="list-panel">
            {movementTripRecords.map((record) => {
              const profile = record.analysis ? `${record.analysis.profile} Tourist` : "Pending";
              const destinationText = record.destinationNames.length > 0 ? record.destinationNames.join(", ") : "No recognised destination yet";

              return (
                <button
                  className={selectedRecord?.trip.id === record.trip.id ? "record-card movement-trip-card selectable active" : "record-card movement-trip-card selectable"}
                  key={record.trip.id}
                  onClick={() => setSelectedRecordTripId(record.trip.id)}
                  type="button"
                >
                  <div>
                    <strong>{record.tourist?.name ?? "Unknown tourist"}</strong>
                    <span>{record.trip.status}</span>
                  </div>
                  <small className="mono-text">{record.trip.id}</small>
                  <p>{destinationText}</p>
                  <div className="record-metrics">
                    <span>{formatDateTime(record.trip.startedAt)}</span>
                    <span>{record.summary.durationMinutes} min</span>
                    <span>{record.summary.pointCount} points</span>
                    <span>{record.summary.visitedDestinationCount} stops</span>
                    <span>{record.analysis ? `Cluster ${record.analysis.cluster + 1}` : "Cluster pending"}</span>
                    <span>{profile}</span>
                  </div>
                </button>
              );
            })}
            {movementTripRecords.length === 0 && <EmptyState text="No movement records match this filter." />}
          </div>

          {selectedRecord && (
            <aside className="record-detail-panel">
              <span>Selected Movement Record</span>
              <h2>{selectedRecord.tourist?.name ?? "Unknown tourist"}</h2>
              <dl>
                <div>
                  <dt>Trip ID</dt>
                  <dd className="mono-text">{selectedRecord.trip.id}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatDateTime(selectedRecord.trip.startedAt)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{selectedRecord.summary.durationMinutes} minutes</dd>
                </div>
                <div>
                  <dt>Movement points</dt>
                  <dd>{selectedRecord.summary.pointCount}</dd>
                </div>
                <div>
                  <dt>Destinations visited</dt>
                  <dd>{selectedRecord.destinationNames.length > 0 ? selectedRecord.destinationNames.join(", ") : "Not recognised yet"}</dd>
                </div>
                <div>
                  <dt>Cluster ID</dt>
                  <dd>{selectedRecord.analysis ? `Cluster ${selectedRecord.analysis.cluster + 1}` : "Pending"}</dd>
                </div>
                <div>
                  <dt>Tourist Category</dt>
                  <dd>{selectedRecord.analysis ? `${selectedRecord.analysis.profile} Tourist` : "Pending analysis"}</dd>
                </div>
                <div>
                  <dt>Analysis status</dt>
                  <dd>{selectedRecord.analysis ? `${selectedRecord.analysis.classifier} generated ${formatDateTime(selectedRecord.analysis.generatedAt)}` : "Waiting for enough trip data"}</dd>
                </div>
              </dl>
              <p>Administrators can review movement records, but individual coordinates are read-only.</p>
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
          <h2>Safety Monitoring</h2>
          <p>Review SOS requests and tourist incident reports submitted from the mobile tourist flow.</p>
        </div>
        <strong>{openSafetyRecordCount} open case(s)</strong>
      </div>
      <MetricGrid
        items={[
          ["Open SOS", openSosCount.toString()],
          ["Open incidents", openIncidentCount.toString()],
          ["Resolved", resolvedSafetyRecordCount.toString()],
          ["Emergency contacts", tourists.filter((tourist) => tourist.emergencyContactPhone).length.toString()],
        ]}
      />
      <section className="list-panel safety-admin-list">
        {safetyRecords.map((record) => {
          const tourist = data.users.find((candidate) => candidate.id === record.userId);
          const contactLine = tourist?.emergencyContactPhone
            ? `${tourist.emergencyContactName || "Emergency contact"} · ${tourist.emergencyContactPhone}${tourist.emergencyContactRelation ? ` · ${tourist.emergencyContactRelation}` : ""}`
            : "No emergency contact saved";

          return (
            <article className={record.kind === "sos" ? "safety-admin-card urgent" : "safety-admin-card"} key={`${record.kind}-${record.id}`}>
              <div className="safety-admin-heading">
                <div>
                  <span>{record.kind === "sos" ? "SOS" : "Incident"}</span>
                  <h3>{record.title}</h3>
                  <p>{record.detail}</p>
                </div>
                <select className="safety-status-select" value={record.status} onChange={(event) => updateSafetyStatus(record.kind, record.id, event.target.value as SafetyStatus)} aria-label="Safety case status">
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <dl className="safety-admin-meta">
                <div>
                  <dt>Tourist</dt>
                  <dd>{tourist?.name ?? "Unknown tourist"}</dd>
                </div>
                <div>
                  <dt>Nationality</dt>
                  <dd>{tourist?.nationality ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt>Passport</dt>
                  <dd>{tourist?.passportNumber ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{contactLine}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{record.locationNote}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDateTime(record.createdAt)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
        {safetyRecords.length === 0 && <EmptyState text="No SOS requests or incident reports have been submitted yet." />}
      </section>
    </div>
  );

  const aiResultsPanel = (
    <div className="admin-tab-panel">
      <div className="admin-tab-heading">
        <div>
          <h2>AI Results</h2>
          <p>K-Means groups similar movement patterns, then the Decision Tree explains the tourist category used for recommendations.</p>
        </div>
        <button className="secondary-action" onClick={recomputeAi}>
          <RotateCcw size={18} />
          Recompute
        </button>
      </div>
      <MetricGrid
        items={[
          ["Clustered records", aiEvaluation.validClusteredRecordCount.toString()],
          ["Labelled records", aiEvaluation.labelledRecordCount.toString()],
          ["Decision accuracy", `${Math.round(aiEvaluation.classificationAccuracy * 100)}%`],
          ["Selected K", selectedKValue.toString()],
        ]}
      />
      <div className="ai-results-layout">
        <section className="panel ai-cluster-panel">
          <div className="section-heading">
            <h2>K-Means Cluster Summary</h2>
            <span>K = {selectedKValue}</span>
          </div>
          <div className="cluster-summary-grid">
            {clusterSummaries.map((summary) => (
              <article key={summary.cluster}>
                <strong>Cluster {summary.cluster + 1}</strong>
                <span>{summary.size} trip(s)</span>
                <p>{summary.label}</p>
                <small>
                  Dominant category: {summary.dominantProfile} | Avg silhouette {summary.averageSilhouette}
                </small>
              </article>
            ))}
            {clusterSummaries.length === 0 && <EmptyState text="K-Means results appear after completed trips contain enough movement points." />}
          </div>
          <h2>Tourist Category Distribution</h2>
          <CategoryBars values={profileDistribution} />
        </section>

        <section className="list-panel ai-analysis-list">
          {analysisRows.map((analysis) => {
            const user = data.users.find((candidate) => candidate.id === analysis.userId);
            const active = selectedAnalysis ? analysisKey(selectedAnalysis) === analysisKey(analysis) : false;

            return (
              <button className={active ? "record-card selectable active" : "record-card selectable"} key={analysisKey(analysis)} onClick={() => setSelectedAnalysisKey(analysisKey(analysis))} type="button">
                <div>
                  <strong>{user?.name ?? "Unknown tourist"}</strong>
                  <span>Cluster {analysis.cluster + 1}</span>
                </div>
                <p>{analysis.clusterLabel}</p>
                <div className="record-metrics">
                  <span>{analysis.profile} Tourist</span>
                  <span>{analysis.dataPointCount} points</span>
                  <span>{Math.round(analysis.classificationConfidence * 100)}% confidence</span>
                </div>
              </button>
            );
          })}
          {analysisRows.length === 0 && <EmptyState text="AI analysis appears after a tourist completes a trip with at least two movement points." />}
        </section>

        {selectedAnalysis && (
          <aside className="ai-detail-panel">
            <span>Selected AI Result</span>
            <h2>{selectedAnalysisUser?.name ?? "Unknown tourist"}</h2>
            <dl>
              <div>
                <dt>Trip ID</dt>
                <dd className="mono-text">{selectedAnalysis.tripId}</dd>
              </div>
              <div>
                <dt>Trip date</dt>
                <dd>{selectedAnalysisTrip ? formatDateTime(selectedAnalysisTrip.startedAt) : "Unknown"}</dd>
              </div>
              <div>
                <dt>K-Means result</dt>
                <dd>
                  Cluster {selectedAnalysis.cluster + 1} of K={selectedKValue} ({selectedClusterSize} trip(s))
                </dd>
              </div>
              <div>
                <dt>Dominant pattern</dt>
                <dd>{selectedAnalysis.clusterLabel}</dd>
              </div>
              <div>
                <dt>Cluster description</dt>
                <dd>
                  The route is closest to a centroid with {selectedAnalysis.kMeansCentroid.culturalProportion}% cultural, {selectedAnalysis.kMeansCentroid.natureProportion}% nature,{" "}
                  {selectedAnalysis.kMeansCentroid.urbanProportion}% urban, and about {selectedAnalysis.kMeansCentroid.uniqueDestinations} unique destination(s).
                </dd>
              </div>
              <div>
                <dt>Decision Tree output</dt>
                <dd>
                  {selectedAnalysis.profile} Tourist, {Math.round(selectedAnalysis.classificationConfidence * 100)}% confidence
                </dd>
              </div>
              <div>
                <dt>Generated</dt>
                <dd>{formatDateTime(selectedAnalysis.generatedAt)}</dd>
              </div>
            </dl>
            <div className="tree-metrics">
              <span>Silhouette {selectedAnalysis.silhouetteScore}</span>
              <span>Depth {selectedAnalysis.decisionTreeDepth}</span>
              <span>{selectedAnalysis.decisionRuleCount} rules</span>
            </div>
            <section className="ai-detail-section">
              <h3>Decision Path</h3>
              <ul className="decision-path">
                {selectedAnalysis.decisionPath.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
            <section className="ai-detail-section">
              <h3>K-Means Input Pattern</h3>
              <KMeansFeatureBars features={selectedAnalysis.kMeansInput} />
            </section>
            <section className="ai-detail-section">
              <h3>K-Means Cluster Centroid</h3>
              <KMeansFeatureBars features={selectedAnalysis.kMeansCentroid} />
            </section>
            <section className="ai-detail-section">
              <h3>Recommendation Result</h3>
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
                <p>No recommendation result is currently available for this tourist.</p>
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
      title="Administrator Dashboard"
      eyebrow="Administrator workspace"
      actions={
        <button className="secondary-action" onClick={recomputeAi}>
          <RotateCcw size={18} />
          Refresh AI
        </button>
      }
    >
      <div className="segmented-control admin-tabs" aria-label="Administrator dashboard sections">
        <button className={adminTab === "overview" ? "active" : ""} type="button" onClick={() => setAdminTab("overview")}>
          Overview
        </button>
        <button className={adminTab === "tourists" ? "active" : ""} type="button" onClick={() => setAdminTab("tourists")}>
          Tourists
        </button>
        <button className={adminTab === "records" ? "active" : ""} type="button" onClick={() => setAdminTab("records")}>
          Movement Records
        </button>
        <button className={adminTab === "safety" ? "active" : ""} type="button" onClick={() => setAdminTab("safety")}>
          Safety
        </button>
        <button className={adminTab === "ai" ? "active" : ""} type="button" onClick={() => setAdminTab("ai")}>
          AI Results
        </button>
      </div>

      {adminTab === "overview" && (
        <div className="admin-tab-panel">
          <MovementPulseHero
            mode="admin"
            demand={destinationDemand}
            destinations={data.destinations}
            profile={`${tourists.length} tourist profiles`}
            pointCount={summary.movementPointCount}
            plan={travelPlan}
          />
          <MetricGrid
            items={[
              ["Tourists", tourists.length.toString()],
              ["Consented", summary.consentedTouristCount.toString()],
              ["Completed trips", summary.completedTripCount.toString()],
              ["Movement points", summary.movementPointCount.toString()],
              ["Destinations", summary.destinationCount.toString()],
              ["Movement alerts", movementAlerts.length.toString()],
              ["Safety cases", openSafetyRecordCount.toString()],
              ["Check-ins", data.checkIns.length.toString()],
              ["Active zones", activeGeofenceCount.toString()],
            ]}
          />
          <div className="two-column">
            <MovementMap points={allDashboardPoints} destinations={data.destinations} />
            <section className="panel">
              {!movementDataStatus.hasMovementData && <EmptyState text={movementDataStatus.message} />}
              <MovementAlertList alerts={movementAlerts} destinations={data.destinations} onExport={exportMovementAlerts} />
              <section className="geofence-admin-panel">
                <div className="section-heading">
                  <h2>Geofence Activity</h2>
                  <span>{activeGeofenceCount} active</span>
                </div>
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
              </section>
              <h2>Movement Trend</h2>
              <CategoryBars values={movementTrend} />
              <h2>Movement Demand</h2>
              <MovementDemandList title="Top Tourist Flow" demand={destinationDemand.slice(0, 4)} destinations={data.destinations} compact />
              <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} compact />
              <div className="section-heading">
                <h2>Travel Plan Signal</h2>
                <button className="secondary-action compact-action" onClick={exportTravelPlan} disabled={travelPlan.stops.length === 0}>
                  <Download size={18} />
                  CSV
                </button>
              </div>
              <div className="plan-builder" aria-label="Travel plan controls">
                <label>
                  Audience
                  <select value={planAudience} onChange={(event) => setPlanAudience(event.target.value as PlanAudience)}>
                    <option value="movement">Overall movement</option>
                    <option value="mixed">Mixed tourists</option>
                    <option value="cultural">Cultural tourists</option>
                    <option value="nature">Nature tourists</option>
                    <option value="urban">Urban tourists</option>
                  </select>
                </label>
                <label>
                  City
                  <select value={planCity} onChange={(event) => setPlanCity(event.target.value)}>
                    <option value="all">All cities</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Stops
                  <input type="number" min={1} max={8} value={planMaxStops} onChange={(event) => setPlanMaxStops(Number(event.target.value))} />
                </label>
                <label>
                  Demand
                  <select value={planMinimumTier} onChange={(event) => setPlanMinimumTier(event.target.value as PlanTier)}>
                    <option value="low">Low+</option>
                    <option value="emerging">Emerging+</option>
                    <option value="medium">Medium+</option>
                    <option value="high">High only</option>
                  </select>
                </label>
                <label className="checkbox-field">
                  <input type="checkbox" checked={planDiversifyCategories} onChange={(event) => setPlanDiversifyCategories(event.target.checked)} />
                  Diverse categories
                </label>
              </div>
              <TravelPlanPanel plan={travelPlan} destinations={data.destinations} />
              <h2>Recent Recommendation Output</h2>
              <RecommendationList recommendations={data.recommendations.slice(0, 3)} destinations={data.destinations} compact />
            </section>
          </div>
        </div>
      )}
      {adminTab === "tourists" && touristManagementPanel}
      {adminTab === "records" && movementRecordsPanel}
      {adminTab === "safety" && safetyPanel}
      {adminTab === "ai" && aiResultsPanel}
    </Page>
  );
}

function Page({ title, eyebrow, actions, children }: { title: string; eyebrow: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

function MovementMap({
  points,
  destinations,
  activePoint,
  mode = "admin",
}: {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
}) {
  return (
    <Suspense
      fallback={
        <div className="map-frame">
          <div className="map-view map-view-placeholder" />
          <div className="map-status">Loading map</div>
        </div>
      }
    >
      <MapView points={points} destinations={destinations} activePoint={activePoint} mode={mode} />
    </Suspense>
  );
}

function MovementPulseHero({
  mode,
  demand,
  destinations,
  profile,
  pointCount,
  plan,
}: {
  mode: "tourist" | "admin";
  demand: DestinationDemand[];
  destinations: Destination[];
  profile: string;
  pointCount: number;
  plan?: TravelPlan;
}) {
  const topDemand = demand.find((row) => row.popularityScore > 0);
  const topDestination = topDemand ? destinations.find((destination) => destination.id === topDemand.destinationId) : null;

  return (
    <section className="movement-hero">
      <div className="movement-hero-copy">
        <span>{mode === "tourist" ? "Live Travel Signal" : "Tourism Planning Signal"}</span>
        <h2>{topDestination ? topDestination.name : "Movement data is ready to grow"}</h2>
        <p>
          {mode === "tourist"
            ? "Recommendations combine your travel profile with places other tourists are actually moving toward."
            : plan?.summary ?? "Administrator planning uses tourist movement demand to highlight routes worth promoting."}
        </p>
      </div>
      <div className="movement-hero-stats">
        <div>
          <small>Current signal</small>
          <strong>{topDemand ? `${topDemand.popularityScore}%` : "0%"}</strong>
        </div>
        <div>
          <small>{mode === "tourist" ? "Your profile" : "Tracked volume"}</small>
          <strong>{mode === "tourist" ? profile : pointCount}</strong>
        </div>
        <div>
          <small>Movement tier</small>
          <strong>{topDemand?.tier ?? "pending"}</strong>
        </div>
      </div>
    </section>
  );
}

function MetricGrid({ items }: { items: [string, string][] }) {
  return (
    <section className="metric-grid">
      {items.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function CompletedTripSummary({
  trip,
  summary,
  destinationNames,
  analysis,
  onViewHistory,
  onViewRecommendations,
}: {
  trip: { id: string; startedAt: string; endedAt?: string };
  summary: TripSummary;
  destinationNames: string[];
  analysis: AnalysisResult | null;
  onViewHistory: () => void;
  onViewRecommendations: () => void;
}) {
  const analysisStatus = analysis ? "Complete" : summary.pointCount >= 2 ? "Ready to refresh" : "Needs at least 2 movement points";

  return (
    <section className="completed-trip-card">
      <div className="section-heading">
        <div>
          <span>Completed Trip</span>
          <h2>{formatDateTime(trip.startedAt)}</h2>
        </div>
      </div>
      <div className="completed-trip-grid">
        <div>
          <small>Started</small>
          <strong>{formatDateTime(trip.startedAt)}</strong>
        </div>
        <div>
          <small>Ended</small>
          <strong>{trip.endedAt ? formatDateTime(trip.endedAt) : "Just now"}</strong>
        </div>
        <div>
          <small>Duration</small>
          <strong>{summary.durationMinutes} min</strong>
        </div>
        <div>
          <small>Movement points</small>
          <strong>{summary.pointCount}</strong>
        </div>
        <div>
          <small>Recognised stops</small>
          <strong>{summary.visitedDestinationCount}</strong>
        </div>
        <div>
          <small>Analysis status</small>
          <strong>{analysisStatus}</strong>
        </div>
      </div>
      <p>{destinationNames.length > 0 ? destinationNames.join(", ") : "No nearby saved destination was recognised for this trip yet."}</p>
      <div className="completed-trip-actions">
        <button className="secondary-action" type="button" onClick={onViewHistory}>
          <MapPinned size={18} />
          View Trip History
        </button>
        <button className="primary-action" type="button" onClick={onViewRecommendations}>
          <Sparkles size={18} />
          View Recommendations
        </button>
      </div>
    </section>
  );
}

function TripSummaryPanel({ summary }: { summary: TripSummary }) {
  return (
    <section className="trip-summary">
      <h2>Selected Trip Summary</h2>
      <div>
        <span>
          <strong>{summary.distanceKm}</strong>
          km
        </span>
        <span>
          <strong>{summary.durationMinutes}</strong>
          min
        </span>
        <span>
          <strong>{summary.pointCount}</strong>
          points
        </span>
        <span>
          <strong>{summary.visitedDestinationCount}</strong>
          stops
        </span>
        <span>
          <strong>{summary.averageAccuracyMeters}</strong>
          m accuracy
        </span>
      </div>
    </section>
  );
}

function DestinationPanel({
  destinations,
  demand = [],
  selectedId,
  visitedIds,
  onSelect,
}: {
  destinations: Destination[];
  demand?: DestinationDemand[];
  selectedId?: string;
  visitedIds?: Set<string>;
  onSelect?: (id: string) => void;
}) {
  return (
    <section className="list-panel">
      {destinations.map((destination) => {
        const visited = visitedIds?.has(destination.id);
        const demandRow = demand.find((row) => row.destinationId === destination.id);

        return (
          <button
            className={selectedId === destination.id ? "destination-card selectable active" : "destination-card selectable"}
            key={destination.id}
            onClick={() => onSelect?.(destination.id)}
            type="button"
          >
            <div>
              <strong>{destination.name}</strong>
              <span>{destination.city}</span>
            </div>
            <p>{destination.description}</p>
            <div className="tag-row">
              <small>{destination.category}</small>
              {demandRow && demandRow.popularityScore > 0 && <small className="demand-tag">{demandRow.tier} demand</small>}
              {visited && <small className="visited-tag">Visited</small>}
            </div>
          </button>
        );
      })}
    </section>
  );
}

function DestinationDetail({ destination, demand }: { destination: Destination; demand?: DestinationDemand }) {
  return (
    <section className="panel detail-panel">
      <h2>{destination.name}</h2>
      <p>{destination.description}</p>
      {demand && (
        <div className="destination-signal">
          <div>
            <span>Movement Score</span>
            <strong>{demand.popularityScore}%</strong>
          </div>
          <div>
            <span>Demand Tier</span>
            <strong>{demand.tier}</strong>
          </div>
          <div>
            <span>Tourists</span>
            <strong>{Math.max(demand.uniqueTouristCount, demand.approachingTouristCount)}</strong>
          </div>
        </div>
      )}
      <dl>
        <div>
          <dt>City</dt>
          <dd>{destination.city}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{destination.category}</dd>
        </div>
        <div>
          <dt>Average visit</dt>
          <dd>{destination.averageVisitMinutes} minutes</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{destination.address ?? `${destination.city}, Malaysia`}</dd>
        </div>
        <div>
          <dt>Opening hours</dt>
          <dd>{destination.openingHours ?? "Check locally before visiting."}</dd>
        </div>
        <div>
          <dt>Fee note</dt>
          <dd>{destination.feeNote ?? "Fee information may vary."}</dd>
        </div>
        {demand && (
          <>
            <div>
              <dt>Nearby movement</dt>
              <dd>{demand.movementPointCount} points</dd>
            </div>
            <div>
              <dt>Approach signals</dt>
              <dd>{demand.approachSignalCount}</dd>
            </div>
          </>
        )}
      </dl>
      {destination.visitTips && destination.visitTips.length > 0 && (
        <section className="visit-tips-panel">
          <strong>Visit tips</strong>
          <ul>
            {destination.visitTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function DestinationModal({
  recommendation,
  destination,
  demand,
  onClose,
}: {
  recommendation: Recommendation;
  destination: Destination | null;
  demand?: DestinationDemand;
  onClose: () => void;
}) {
  if (!destination) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`${destination.name} details`}>
      <section className="modal-card destination-modal">
        <div className="modal-heading">
          <div>
            <span>{destination.category}</span>
            <h2>{destination.name}</h2>
          </div>
          <button className="secondary-action icon-action" type="button" onClick={onClose} title="Close destination details">
            <X size={18} />
          </button>
        </div>
        <p>{destination.description}</p>
        <MovementMap points={[]} destinations={[destination]} mode="tourist" />
        <dl>
          <div>
            <dt>Address</dt>
            <dd>{destination.address ?? `${destination.city}, Malaysia`}</dd>
          </div>
          <div>
            <dt>Recommendation score</dt>
            <dd>{recommendation.score}</dd>
          </div>
          <div>
            <dt>Movement demand</dt>
            <dd>{demand ? `${demand.tier} (${demand.popularityScore}%)` : "No signal yet"}</dd>
          </div>
          <div>
            <dt>Opening hours</dt>
            <dd>{destination.openingHours ?? "Check locally before visiting."}</dd>
          </div>
          <div>
            <dt>Fee note</dt>
            <dd>{destination.feeNote ?? "Fee information may vary."}</dd>
          </div>
        </dl>
        {destination.visitTips && destination.visitTips.length > 0 && (
          <section className="visit-tips-panel">
            <strong>Visit tips</strong>
            <ul>
              {destination.visitTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="recommendation-reason">
          <strong>Why this place?</strong>
          <p>{recommendation.reason}</p>
        </section>
      </section>
    </div>
  );
}

function FestivalCalendarPanel({
  events,
  destinations,
  compact = false,
  onOpenCalendar,
}: {
  events: FestivalEvent[];
  destinations: Destination[];
  compact?: boolean;
  onOpenCalendar?: () => void;
}) {
  const [stateFilter, setStateFilter] = useState<MalaysianState | "all">("all");
  const [showFullCalendar, setShowFullCalendar] = useState(!compact);
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  const filteredEvents = getFestivalsForState(events, stateFilter);
  const visibleLimit = compact && !showFullCalendar ? 5 : filteredEvents.length;
  const visibleEvents = filteredEvents.slice(0, visibleLimit);
  const hiddenEventCount = filteredEvents.length - visibleEvents.length;
  const toggleEventStates = (eventId: string) => {
    setExpandedEventIds((currentIds) => (currentIds.includes(eventId) ? currentIds.filter((id) => id !== eventId) : [...currentIds, eventId]));
  };

  return (
    <section className={compact ? "festival-calendar compact" : "festival-calendar"}>
      <div className="section-heading">
        <div>
          <h2>Malaysia Festival Calendar</h2>
          <p>
            {filteredEvents.length} upcoming signal(s) for {stateFilter === "all" ? "Malaysia" : stateFilter} across the next 12 months.
          </p>
        </div>
        <label className="festival-filter">
          State
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as MalaysianState | "all")}>
            <option value="all">All Malaysia</option>
            {allMalaysianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="festival-list">
        {visibleEvents.map((event) => {
          const matchedDestinations = getFestivalDestinationMatches(event, destinations).slice(0, 3);
          const statesExpanded = expandedEventIds.includes(event.id);

          return (
            <article className={`festival-card festival-card-${event.category}`} key={event.id}>
              <div className="festival-date-rail">
                <CalendarDays size={17} />
                <strong>{formatFestivalDate(event)}</strong>
                <span>{event.category}</span>
              </div>
              <div className="festival-card-main">
                <div className="festival-card-heading">
                  <h3>{event.name}</h3>
                </div>
                {event.venue && <small className="festival-venue">{event.venue}</small>}
                <p>{event.description}</p>
                <div className="festival-state-details">
                  <button type="button" onClick={() => toggleEventStates(event.id)} aria-expanded={statesExpanded}>
                    {formatFestivalStateSummaryLabel(event)}
                  </button>
                  {statesExpanded && (
                    <div>
                      <span>{formatFestivalScope(event)}</span>
                    </div>
                  )}
                </div>
                <div className="festival-insight-row">
                  <small className="festival-planning-note">{getFestivalPlanningSummary(event, destinations)}</small>
                  {matchedDestinations.length > 0 && (
                    <div className="festival-destinations">
                      {matchedDestinations.map((destination) => (
                        <span key={destination.id}>{destination.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {hiddenEventCount > 0 && (
        <button className="festival-more-button" type="button" onClick={onOpenCalendar ?? (() => setShowFullCalendar(true))}>
          Show full 12-month calendar ({hiddenEventCount} more)
        </button>
      )}
      {compact && showFullCalendar && !onOpenCalendar && (
        <button className="festival-more-button secondary" type="button" onClick={() => setShowFullCalendar(false)}>
          Show fewer events
        </button>
      )}
      {visibleEvents.length === 0 && <EmptyState text="No festival planning signals match this state inside the current date range." />}
    </section>
  );
}

function MovementDemandList({
  title,
  demand,
  destinations,
  compact = false,
}: {
  title: string;
  demand: DestinationDemand[];
  destinations: Destination[];
  compact?: boolean;
}) {
  const visibleDemand = demand.filter((row) => row.popularityScore > 0);

  return (
    <section className={compact ? "movement-demand compact" : "movement-demand"}>
      <h2>{title}</h2>
      {visibleDemand.map((row, index) => {
        const destination = destinations.find((candidate) => candidate.id === row.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="demand-card" key={row.destinationId}>
            <span className="rank-badge">{index + 1}</span>
            <div>
              <strong>{destination.name}</strong>
              <p>
                {row.uniqueTouristCount} tourist profile(s), {row.movementPointCount} nearby points, {row.approachSignalCount} approach signals
              </p>
              <div className="demand-meter">
                <i style={{ width: `${Math.max(8, row.popularityScore)}%` }} />
              </div>
            </div>
            <small>{row.tier}</small>
          </article>
        );
      })}
      {visibleDemand.length === 0 && <EmptyState text="Movement popularity appears after tourists record routes near destinations." />}
    </section>
  );
}

function MovementAlertList({ alerts, destinations, onExport }: { alerts: MovementAlert[]; destinations: Destination[]; onExport: () => void }) {
  return (
    <section className="movement-alerts">
      <div className="section-heading">
        <h2>Movement Alerts</h2>
        <button className="secondary-action compact-action" onClick={onExport} disabled={alerts.length === 0}>
          <Download size={18} />
          CSV
        </button>
      </div>
      {alerts.map((alert) => {
        const destination = destinations.find((candidate) => candidate.id === alert.destinationId);

        return (
          <article className={`alert-card ${alert.severity}`} key={alert.id}>
            <span>{alert.severity}</span>
            <div>
              <strong>{destination?.name ?? alert.title}</strong>
              <p>{alert.message}</p>
              <small>{alert.recommendedAction}</small>
            </div>
          </article>
        );
      })}
      {alerts.length === 0 && <EmptyState text="Movement alerts appear when tourist flow creates a destination signal." />}
    </section>
  );
}

function TravelPlanPanel({ plan, destinations }: { plan: TravelPlan; destinations: Destination[] }) {
  return (
    <section className="travel-plan">
      <p>{plan.summary}</p>
      <div className="plan-criteria">
        <span>{plan.criteria.audience === "movement" ? "Movement demand" : `${plan.criteria.audience} profile`}</span>
        <span>{plan.criteria.city === "all" ? "All cities" : plan.criteria.city}</span>
        <span>{plan.criteria.minimumTier}+ demand</span>
        <span>{plan.criteria.maxStops} stop limit</span>
      </div>
      {plan.stops.map((stop) => {
        const destination = destinations.find((candidate) => candidate.id === stop.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="plan-stop" key={stop.destinationId}>
            <span>{stop.order}</span>
            <div>
              <strong>{destination.name}</strong>
              <p>{stop.reason}</p>
            </div>
            <small>{stop.suggestedMinutes} min</small>
          </article>
        );
      })}
    </section>
  );
}

type DestinationFormState = {
  name: string;
  city: string;
  address: string;
  category: DestinationCategory;
  latitude: string;
  longitude: string;
  averageVisitMinutes: string;
  openingHours: string;
  feeNote: string;
  visitTips: string;
  description: string;
};

function createDestinationForm(destination?: Destination): DestinationFormState {
  return {
    name: destination?.name ?? "",
    city: destination?.city ?? "",
    address: destination?.address ?? "",
    category: destination?.category ?? "cultural",
    latitude: destination ? String(destination.latitude) : "3.1478",
    longitude: destination ? String(destination.longitude) : "101.6937",
    averageVisitMinutes: destination ? String(destination.averageVisitMinutes) : "60",
    openingHours: destination?.openingHours ?? "",
    feeNote: destination?.feeNote ?? "",
    visitTips: destination?.visitTips?.join("\n") ?? "",
    description: destination?.description ?? "",
  };
}

function DestinationManager({ destinations, onChange, notify }: { destinations: Destination[]; onChange: (destinations: Destination[]) => void; notify: NotifyFn }) {
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationFormState>(() => createDestinationForm());
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [savingAction, setSavingAction] = useState<"add" | "edit" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DestinationCategory | "all">("all");

  const filteredDestinations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return destinations.filter((destination) => {
      const matchesCategory = categoryFilter === "all" || destination.category === categoryFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [destination.name, destination.city, destination.address ?? "", destination.description, destination.category].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, destinations, searchTerm]);

  const resetDestinationFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
  };

  const openAddModal = () => {
    setForm(createDestinationForm());
    setEditingId(null);
    setModalMode("add");
    setMessage(null);
  };

  const startEdit = (destination: Destination) => {
    setEditingId(destination.id);
    setForm(createDestinationForm(destination));
    setModalMode("edit");
    setMessage(null);
  };

  const closeFormModal = () => {
    if (savingAction) {
      return;
    }

    setModalMode(null);
    setEditingId(null);
    setForm(createDestinationForm());
  };

  const saveDestination = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const action = modalMode;
    if (!action) {
      return;
    }

    setSavingAction(action);
    const result =
      action === "add"
        ? addDestinationRecord(destinations, form)
        : updateDestinationRecord(destinations, {
            ...form,
            id: editingId ?? "",
          });

    if (result.error || !result.destinations) {
      const message = result.error ?? (action === "add" ? "Destination could not be saved." : "Destination could not be updated.");
      setMessage(message);
      setSavingAction(null);
      notify({ tone: "error", title: action === "add" ? "Destination not saved" : "Destination not updated", message });
      return;
    }

    onChange(result.destinations);
    setMessage(action === "add" ? "Destination saved." : "Destination updated.");
    setSavingAction(null);
    setModalMode(null);
    setEditingId(null);
    setForm(createDestinationForm());
    notify({
      tone: "success",
      title: action === "add" ? "Destination saved" : "Destination updated",
      message: `${form.name.trim()} was ${action === "add" ? "added to" : "updated in"} the destination list.`,
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setSavingAction("delete");
    const result = deleteDestinationRecord(destinations, deleteTarget.id);
    if (result.error || !result.destinations) {
      const message = result.error ?? "Destination could not be deleted.";
      setMessage(message);
      setSavingAction(null);
      notify({ tone: "error", title: "Destination not deleted", message });
      return;
    }

    onChange(result.destinations);
    setMessage("Destination deleted.");
    setSavingAction(null);
    notify({ tone: "success", title: "Destination deleted", message: `${deleteTarget.name} was removed from the destination list.` });
    if (editingId === deleteTarget.id) {
      setEditingId(null);
      setModalMode(null);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <section className="destination-management-panel">
        <div className="section-heading">
          <div>
            <h2>Destinations</h2>
            <p>{destinations.length} Malaysian tourist destination records available for recommendation and movement analysis.</p>
          </div>
          <button className="primary-action compact-action" type="button" onClick={openAddModal}>
            <MapPinned size={17} />
            Add
          </button>
        </div>

        {message && <p className="status-message">{message}</p>}

        <div className="destination-filter-toolbar">
          <label>
            Find destination
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search name, city or category" />
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as DestinationCategory | "all")}>
              <option value="all">All categories</option>
              {destinationCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-action compact-action" type="button" onClick={resetDestinationFilters} disabled={!searchTerm && categoryFilter === "all"}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <section className="destination-admin-grid">
          {filteredDestinations.map((destination) => (
            <article className="destination-card editable" key={destination.id}>
              <div>
                <strong>{destination.name}</strong>
                <span>{destination.city}</span>
              </div>
              <p>{destination.description}</p>
              <div className="tag-row">
                <small>{destination.category}</small>
                <small>{destination.averageVisitMinutes} min visit</small>
                {destination.openingHours && <small>visit info</small>}
              </div>
              <div className="card-actions">
                <button className="secondary-action icon-action" onClick={() => startEdit(destination)} type="button" title="Edit destination">
                  <Pencil size={16} />
                </button>
                <button
                  className="secondary-action icon-action danger"
                  onClick={() => setDeleteTarget(destination)}
                  type="button"
                  title="Delete destination"
                  disabled={destinations.length <= 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {filteredDestinations.length === 0 && <EmptyState text="No destination records match the current search and category filter." />}
        </section>
      </section>

      {modalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={modalMode === "add" ? "Add destination" : "Edit destination"}>
          <form className="modal-card destination-modal destination-form-modal" onSubmit={saveDestination}>
            <div className="modal-heading">
              <div>
                <span>Destination Management</span>
                <h2>{modalMode === "add" ? "Add Destination" : "Edit Destination"}</h2>
              </div>
              <button className="secondary-action icon-action" type="button" onClick={closeFormModal} title="Close destination form" disabled={Boolean(savingAction)}>
                <X size={18} />
              </button>
            </div>

          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            City
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
          </label>
          <label>
            Address
            <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Example: Concubine Lane, Lorong Panglima, 30000 Ipoh, Perak" />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DestinationCategory })}>
              {destinationCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <div className="field-pair">
            <label>
              Latitude
              <input type="number" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required />
            </label>
            <label>
              Longitude
              <input type="number" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required />
            </label>
          </div>
          <label>
            Average visit minutes
            <input type="number" min="1" value={form.averageVisitMinutes} onChange={(event) => setForm({ ...form, averageVisitMinutes: event.target.value })} required />
          </label>
          <label>
            Opening hours
            <input value={form.openingHours} onChange={(event) => setForm({ ...form, openingHours: event.target.value })} placeholder="Example: Usually daily; check public holiday hours" />
          </label>
          <label>
            Fee note
            <input value={form.feeNote} onChange={(event) => setForm({ ...form, feeNote: event.target.value })} placeholder="Example: Entry is normally free; activities may vary" />
          </label>
          <label>
            Visit tips
            <textarea value={form.visitTips} onChange={(event) => setForm({ ...form, visitTips: event.target.value })} placeholder="Add one tip per line" />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </label>
          <button className="primary-action" type="submit">
            <Save size={18} />
            {savingAction ? "Saving" : modalMode === "add" ? "Save destination" : "Save changes"}
          </button>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Delete ${deleteTarget.name}`}>
          <section className="modal-card destination-modal confirm-modal">
            <div className="modal-heading">
              <div>
                <span>Delete Destination</span>
                <h2>{deleteTarget.name}</h2>
              </div>
              <button className="secondary-action icon-action" type="button" onClick={() => setDeleteTarget(null)} title="Cancel delete" disabled={Boolean(savingAction)}>
                <X size={18} />
              </button>
            </div>
            <p>This will remove {deleteTarget.name} from the destination list and refresh recommendation results that depend on destination data.</p>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(savingAction)}>
                Cancel
              </button>
              <button className="primary-action danger" type="button" onClick={confirmDelete} disabled={Boolean(savingAction)}>
                <Trash2 size={18} />
                {savingAction === "delete" ? "Deleting" : "Delete destination"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function PlaceDiscovery({
  destinations,
  demand,
  festivals,
  recommendations,
  user,
  latestAnalysis,
  visitedIds,
  referencePoint,
  selectedDestinationId,
  onSelectDestination,
  onOpenEvents,
}: {
  destinations: Destination[];
  demand: DestinationDemand[];
  festivals: FestivalEvent[];
  recommendations: Recommendation[];
  user: User;
  latestAnalysis: AnalysisResult | undefined;
  visitedIds: Set<string>;
  referencePoint?: MovementPoint;
  selectedDestinationId?: string;
  onSelectDestination: (id: string) => void;
  onOpenEvents: () => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DestinationCategory | "all">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [mode, setMode] = useState<PlaceDiscoveryMode>("recommended");
  const cityOptions = useMemo(() => Array.from(new Set(destinations.map((destination) => destination.city))).sort(), [destinations]);
  const festivalDestinationIds = useMemo(() => new Set(festivals.flatMap((festival) => festival.destinationIds)), [festivals]);
  const recommendationByDestinationId = useMemo(() => new Map(recommendations.map((recommendation) => [recommendation.destinationId, recommendation])), [recommendations]);
  const demandByDestinationId = useMemo(() => new Map(demand.map((row) => [row.destinationId, row])), [demand]);
  const normalizedSearch = search.trim().toLowerCase();

  const rows = useMemo(() => {
    return destinations
      .map((destination) => {
        const recommendation = recommendationByDestinationId.get(destination.id);
        const demandRow = demandByDestinationId.get(destination.id);
        const visited = visitedIds.has(destination.id);
        const preferenceMatch = user.travelPreferences?.includes(destination.category) || categoryFitsProfile(destination.category, latestAnalysis?.profile ?? user.expectedProfile);
        const festivalBoosted = festivalDestinationIds.has(destination.id);
        const distance = referencePoint ? distanceKm(referencePoint, destination) : undefined;
        const demandScore = demandRow?.popularityScore ?? 0;
        const recommendationScore = recommendation?.score ?? 42;
        const score = Math.round(Math.min(100, recommendationScore * 0.45 + demandScore * 0.32 + (preferenceMatch ? 14 : 0) + (festivalBoosted ? 10 : 0) + (visited ? 0 : 8)));
        const insight = getPlaceDiscoveryInsight({ recommendation, demandRow, festivalBoosted, preferenceMatch, visited });

        return {
          destination,
          recommendation,
          demandRow,
          visited,
          preferenceMatch,
          festivalBoosted,
          distance,
          score,
          insight,
        };
      })
      .filter((row) => {
        if (categoryFilter !== "all" && row.destination.category !== categoryFilter) {
          return false;
        }

        if (cityFilter !== "all" && row.destination.city !== cityFilter) {
          return false;
        }

        if (mode === "events" && !row.festivalBoosted) {
          return false;
        }

        if (mode === "hidden" && (row.demandRow?.tier === "high" || row.visited)) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [row.destination.name, row.destination.city, row.destination.category, row.destination.address ?? "", row.destination.description].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        if (mode === "trending") {
          return (b.demandRow?.popularityScore ?? 0) - (a.demandRow?.popularityScore ?? 0) || b.score - a.score;
        }

        if (mode === "nearby") {
          return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || b.score - a.score;
        }

        if (mode === "events") {
          return Number(b.festivalBoosted) - Number(a.festivalBoosted) || b.score - a.score;
        }

        if (mode === "hidden") {
          return (a.demandRow?.popularityScore ?? 0) - (b.demandRow?.popularityScore ?? 0) || b.score - a.score;
        }

        return b.score - a.score;
      });
  }, [
    categoryFilter,
    cityFilter,
    demandByDestinationId,
    destinations,
    festivalDestinationIds,
    latestAnalysis?.profile,
    mode,
    normalizedSearch,
    recommendationByDestinationId,
    referencePoint,
    user.expectedProfile,
    user.travelPreferences,
    visitedIds,
  ]);

  const selectedRow = rows.find((row) => row.destination.id === selectedDestinationId) ?? rows[0];
  const personalized = Boolean(latestAnalysis);

  return (
    <section className="places-page">
      <section className="places-hero">
        <div>
          <span>{latestAnalysis ? `${latestAnalysis.profile} traveller` : "Discovery mode"}</span>
          <h2>Find places that match your trip right now.</h2>
          <p>Browse destinations using movement demand, your travel style, event timing and your latest route instead of only static ratings.</p>
        </div>
        <div className="places-hero-stats">
          <span>
            <strong>{rows.length}</strong>
            places shown
          </span>
          <span>
            <strong>{demand.filter((row) => row.popularityScore > 0).length}</strong>
            with demand
          </span>
          <span>
            <strong>{festivals.length}</strong>
            event signals
          </span>
        </div>
      </section>

      {!personalized && (
        <section className="recommendation-mode-notice">
          <strong>Basic suggestion mode</strong>
          <p>Complete a tracked trip to unlock AI personalisation. Until then, Places still uses demand, profile preferences and event signals for browsing.</p>
        </section>
      )}

      <section className="places-controls" aria-label="Place discovery filters">
        <label>
          Search places
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by place, state, address or interest" />
        </label>
        <label>
          Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as DestinationCategory | "all")}>
            <option value="all">All categories</option>
            {destinationCategories.map((category) => (
              <option key={category} value={category}>
                {getCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
            <option value="all">All Malaysia</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="places-mode-row" aria-label="Place discovery mode">
        {placeDiscoveryModes.map((option) => (
          <button key={option.value} className={mode === option.value ? "active" : ""} type="button" onClick={() => setMode(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <section className="places-discovery-layout">
        <div className="places-results">
          {rows.map((row) => (
            <button
              className={selectedRow?.destination.id === row.destination.id ? "place-discovery-card active" : "place-discovery-card"}
              type="button"
              key={row.destination.id}
              onClick={() => onSelectDestination(row.destination.id)}
            >
              <div className="place-card-heading">
                <div>
                  <span>{getCategoryLabel(row.destination.category)}</span>
                  <strong>{row.destination.name}</strong>
                </div>
                <small>{row.score}% fit</small>
              </div>
              <p>{row.insight}</p>
              <div className="place-card-meta">
                <span>{row.destination.city}</span>
                <span>{row.demandRow ? `${row.demandRow.tier} demand` : "quiet signal"}</span>
                <span>{formatDistance(row.distance)}</span>
                {row.festivalBoosted && <span>event-linked</span>}
                {row.visited ? <span>visited</span> : <span>new to you</span>}
              </div>
            </button>
          ))}
          {rows.length === 0 && <EmptyState text="No places match these filters yet. Try another category, area or discovery mode." />}
        </div>

        {selectedRow && (
          <aside className="place-detail-card">
            <span>{getCategoryLabel(selectedRow.destination.category)}</span>
            <h2>{selectedRow.destination.name}</h2>
            <p>{selectedRow.destination.description}</p>
            <dl>
              <div>
                <dt>Address</dt>
                <dd>{selectedRow.destination.address ?? `${selectedRow.destination.city}, Malaysia`}</dd>
              </div>
              <div>
                <dt>Demand</dt>
                <dd>{selectedRow.demandRow ? `${selectedRow.demandRow.tier} (${selectedRow.demandRow.popularityScore}%)` : "No demand signal yet"}</dd>
              </div>
              <div>
                <dt>Trip fit</dt>
                <dd>{selectedRow.preferenceMatch ? "Matches your profile" : "Different from your usual style"}</dd>
              </div>
              <div>
                <dt>Event relevance</dt>
                <dd>{selectedRow.festivalBoosted ? "Linked to upcoming calendar signals" : "No current event link"}</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{formatDistance(selectedRow.distance)}</dd>
              </div>
              <div>
                <dt>Average visit</dt>
                <dd>{selectedRow.destination.averageVisitMinutes} minutes</dd>
              </div>
              <div>
                <dt>Opening hours</dt>
                <dd>{selectedRow.destination.openingHours ?? "Check locally before visiting."}</dd>
              </div>
              <div>
                <dt>Fee note</dt>
                <dd>{selectedRow.destination.feeNote ?? "Fee information may vary."}</dd>
              </div>
            </dl>
            {selectedRow.destination.visitTips && selectedRow.destination.visitTips.length > 0 && (
              <section className="visit-tips-panel compact">
                <strong>Before you go</strong>
                <ul>
                  {selectedRow.destination.visitTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
            <div className="place-detail-actions">
              <button className="secondary-action" type="button" onClick={onOpenEvents}>
                <CalendarDays size={18} />
                Check events
              </button>
            </div>
          </aside>
        )}
      </section>
    </section>
  );
}

function getPlaceDiscoveryInsight({
  recommendation,
  demandRow,
  festivalBoosted,
  preferenceMatch,
  visited,
}: {
  recommendation?: Recommendation;
  demandRow?: DestinationDemand;
  festivalBoosted: boolean;
  preferenceMatch: boolean;
  visited: boolean;
}) {
  if (recommendation) {
    return recommendation.reason;
  }

  if (festivalBoosted && demandRow && demandRow.popularityScore > 0) {
    return "Upcoming event signals and current tourist movement both point toward this area.";
  }

  if (festivalBoosted) {
    return "Upcoming calendar events may bring more visitors to this place or nearby routes.";
  }

  if (demandRow && demandRow.tier !== "low") {
    return "Tourist movement is already forming around this destination, so it is useful for route planning.";
  }

  if (preferenceMatch && !visited) {
    return "This matches your travel style and gives you a new place to explore.";
  }

  if (visited) {
    return "You have visited this before, so it is better for revisits or comparing with nearby alternatives.";
  }

  return "A quieter option that can help balance the trip if busy places feel too crowded.";
}

function RecommendationList({
  recommendations,
  destinations,
  demand = [],
  personalized = true,
  compact = false,
  onSelect,
}: {
  recommendations: Recommendation[];
  destinations: Destination[];
  demand?: DestinationDemand[];
  personalized?: boolean;
  compact?: boolean;
  onSelect?: (recommendationId: string) => void;
}) {
  if (recommendations.length === 0) {
    return <EmptyState text={personalized ? "Complete another trip to unlock stronger personalised recommendations." : "No basic suggestions are available yet."} />;
  }

  return (
    <section className={compact ? "recommendation-list compact" : "recommendation-list"}>
      {recommendations.map((recommendation) => {
        const destination = destinations.find((candidate) => candidate.id === recommendation.destinationId);
        if (!destination) {
          return null;
        }
        const demandRow = demand.find((row) => row.destinationId === destination.id);

        return (
          <article className="recommendation-card" key={recommendation.id}>
            <div>
              <strong>{destination.name}</strong>
              <span>{destination.city}</span>
            </div>
            <div className="recommendation-meta">
              {!personalized && <span className="basic-suggestion-tag">Basic suggestion</span>}
              <span>{destination.category}</span>
              <span>{demandRow ? `${demandRow.tier} demand` : "No demand signal"}</span>
              <span>{demandRow ? `${demandRow.popularityScore}% movement score` : "0% movement score"}</span>
            </div>
            <p>{recommendation.reason}</p>
            <div className="score-breakdown" aria-label={`Score breakdown for ${destination.name}`}>
              <span>{personalized ? "Profile" : "Basic fit"} {recommendation.scoreBreakdown.profileFit}</span>
              <span>{personalized ? `Cluster ${recommendation.scoreBreakdown.clusterPattern}` : "AI cluster pending"}</span>
              <span>New {recommendation.scoreBreakdown.unvisited}</span>
            </div>
            <meter value={recommendation.score} min={0} max={100} />
            <div className="recommendation-card-footer">
              <small>Score {recommendation.score}</small>
              {onSelect && (
                <button className="secondary-action compact-action" type="button" onClick={() => onSelect(recommendation.id)}>
                  View Destination
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CategoryBars({ values }: { values: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(values));

  return (
    <div className="category-bars">
      {Object.entries(values).map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function KMeansFeatureBars({ features }: { features: KMeansFeatureVector }) {
  const rows = [
    { label: "Cultural proportion", value: features.culturalProportion, width: features.culturalProportion, suffix: "%" },
    { label: "Nature proportion", value: features.natureProportion, width: features.natureProportion, suffix: "%" },
    { label: "Urban proportion", value: features.urbanProportion, width: features.urbanProportion, suffix: "%" },
    { label: "Unique destinations", value: features.uniqueDestinations, width: Math.min(100, (features.uniqueDestinations / 10) * 100), suffix: "" },
  ];

  return (
    <div className="kmeans-feature-bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${Math.max(8, row.width)}%` }} />
          </div>
          <strong>
            {row.value}
            {row.suffix}
          </strong>
        </div>
      ))}
    </div>
  );
}

function ConfusionMatrix({ values }: { values: Record<string, Record<string, number>> }) {
  const profiles = ["cultural", "nature", "urban", "mixed"];

  return (
    <section className="panel">
      <h2>Decision Tree Test Matrix</h2>
      <div className="matrix-table" role="table" aria-label="Decision Tree confusion matrix">
        <span />
        {profiles.map((profile) => (
          <strong key={profile}>Predicted {profile}</strong>
        ))}
        {profiles.map((actual) => (
          <Fragment key={actual}>
            <strong key={`${actual}-label`}>Actual {actual}</strong>
            {profiles.map((predicted) => (
              <span key={`${actual}-${predicted}`}>{values[actual]?.[predicted] ?? 0}</span>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <section className="empty-state">
      <Sparkles size={22} />
      <p>{text}</p>
    </section>
  );
}

export default App;
