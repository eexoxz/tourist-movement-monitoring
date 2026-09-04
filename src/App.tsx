import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  KMeansFeatureVector,
  IncidentType,
  SafetyStatus,
  TouristProfile,
  TravelPlanOptions,
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
import { malaysiaFestivalEvents } from "./data/festivals";
import { nationalityOptions } from "./data/nationalities";
import { isLocale, loadLocale, localeOptions, saveLocale, translate, type Locale, type TranslationKey } from "./services/i18n";
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
import { checkOutFromAttraction, createAttractionCheckIn, getActiveCheckIn } from "./services/checkIns";
import { calculateGeofenceActivity, getActiveGeofenceWarnings } from "./services/geofencing";
import { createIncidentReport, createSosAlert, getOpenSafetyCount, updateIncidentStatus, updateSosStatus } from "./services/safety";
import { getTouristManagementRows } from "./services/touristManagement";
import { formatTripTitle, getRecognizedDestinationNames, getTripDiaryInsight, getTripSuggestionStatus } from "./services/tripPresentation";
import { MovementAlertList, MovementDemandList, TravelPlanPanel } from "./components/AdminPlanningPanels";
import { CompletedTripSummary, EmptyState, MetricGrid } from "./components/SummaryCards";
import { ToastViewport, type AppNotification, type NotificationTone, type NotifyFn } from "./components/ToastViewport";
import { FestivalCalendarPanel } from "./components/FestivalCalendarPanel";
import { MovementMap } from "./components/MovementMap";
import { MovementPulseHero } from "./components/MovementPulseHero";
import { Page } from "./components/Page";
import { PlaceDiscovery } from "./components/PlaceDiscovery";
import { RecommendationList } from "./components/RecommendationList";
import { TouristHome } from "./components/TouristHome";
import { TouristProfileForm } from "./components/TouristProfileForm";
import { TripDiary } from "./components/TripDiary";
import { formatTravelPreferenceList, getDisplayName } from "./services/profile";

type PlanAudience = NonNullable<TravelPlanOptions["audience"]>;
type PlanTier = NonNullable<TravelPlanOptions["minimumTier"]>;
type AdminDashboardTab = "overview" | "tourists" | "records" | "safety" | "ai";
type AuthResult = { error?: string; message?: string };
type TouristRegistrationDraft = {
  name: string;
  email: string;
  password: string;
  nationality: string;
  passportNumber: string;
  termsAccepted: boolean;
};
type RememberedLogin = { email: string; password: string };
const REMEMBER_LOGIN_KEY = "tourist-movement-monitoring:remember-login";
const PROFILE_SKIP_KEY_PREFIX = "tourist-movement-monitoring:profile-skip:";
const demoCredentialEmails = new Set(["tourist@example.com", "nature@example.com", "culture@example.com", "urban@example.com", "admin@tourism.local"]);
const incidentTypeOptions: Array<{ value: IncidentType; labelKey: TranslationKey }> = [
  { value: "lost-item", labelKey: "tourist.safety.incidentLostItem" },
  { value: "accident", labelKey: "tourist.safety.incidentAccident" },
  { value: "suspicious-activity", labelKey: "tourist.safety.incidentSuspicious" },
  { value: "medical", labelKey: "tourist.safety.incidentMedical" },
  { value: "other", labelKey: "tourist.safety.incidentOther" },
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

function getIncidentTypeLabel(type: IncidentType, t: (key: TranslationKey) => string) {
  const option = incidentTypeOptions.find((candidate) => candidate.value === type);
  return option ? t(option.labelKey) : t("tourist.safety.incidentFallback");
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
          <AdminWorkspace data={data} view={safeView} locale={locale} onDataChange={commitData} notify={notify} />
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
  const recentTrip = recentTrips[0];
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
  const t = (key: TranslationKey) => translate(locale, key);
  const showProfileSetup = !user.profileCompletedAt && !profileSetupSkipped;
  const hasPersonalizedRecommendations = Boolean(latestAnalysis);
  const tripStateLabel = activeTrip ? t("common.active") : latestCompletedTrip ? t("common.completed") : t("common.notStarted");
  const recommendationHeading = hasPersonalizedRecommendations ? t("tourist.home.recommendationsPersonalized") : t("tourist.home.recommendationsBasic");
  const recommendationSupportText = hasPersonalizedRecommendations
    ? t("tourist.home.recommendationsPersonalizedText")
    : t("tourist.home.recommendationsBasicText");
  const activeJourneyPoints = activePoints.length ? activePoints : tripPoints;
  const activeJourneyPoint = activePoints.at(-1) ?? tripPoints.at(-1);
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
          locale={locale}
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

          <MovementMap points={activePoints.length ? activePoints : tripPoints} destinations={data.destinations} mode="tourist" locale={locale} />
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
          referencePoint={activePoints.at(-1) ?? tripPoints.at(-1)}
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
          title: getIncidentTypeLabel(report.type, (key) => translate("en", key)),
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
                <dd>{formatTravelPreferenceList(selectedManagedTourist.tourist.travelPreferences, "en")}</dd>
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
        <MovementMap points={selectedRecord?.points.length ? selectedRecord.points : filteredPoints} destinations={data.destinations} locale={locale} />
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
            <MovementMap points={allDashboardPoints} destinations={data.destinations} locale={locale} />
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

export default App;
