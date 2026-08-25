import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
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
  MovementAlert,
  MovementPoint,
  Recommendation,
  TravelPlan,
  TravelPlanOptions,
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
import { clearSession, createId, getStorageMode, loadCloudData, loadData, loadSession, resetData, saveData, saveSession } from "./services/storage";
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

const MapView = lazy(() => import("./components/MapView").then((module) => ({ default: module.MapView })));
type PlanAudience = NonNullable<TravelPlanOptions["audience"]>;
type PlanTier = NonNullable<TravelPlanOptions["minimumTier"]>;
type AdminDashboardTab = "overview" | "records" | "ai";
type AuthResult = { error?: string; message?: string };
type TouristRegistrationDraft = {
  name: string;
  email: string;
  password: string;
  travelPreferences: DestinationCategory[];
  tripPace: User["tripPace"];
  travelGroup: User["travelGroup"];
  accessibilityPreference: User["accessibilityPreference"];
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
const demoCredentialEmails = new Set(["tourist@example.com", "nature@example.com", "culture@example.com", "urban@example.com", "admin@tourism.local"]);
const preferenceOptions: Array<{ value: DestinationCategory; label: string }> = [
  { value: "cultural", label: "Culture" },
  { value: "nature", label: "Nature" },
  { value: "urban", label: "City spots" },
  { value: "heritage", label: "Heritage" },
  { value: "food", label: "Food" },
  { value: "coastal", label: "Coastal" },
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
  const safeView = currentUser ? coerceViewForRole(currentUser.role, view) : view;
  const [syncStatus, setSyncStatus] = useState(getStorageMode());
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const watchId = useRef<number | null>(null);
  const lastSyncWarningAt = useRef(0);

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
    let authUid: string | undefined;
    let firebaseStoredUser: User | null = null;
    const firebaseMode = hasConfiguredAuth();

    if (firebaseMode) {
      try {
        const firebaseUser = await signInWithConfiguredProvider(email, password);
        authUid = firebaseUser?.uid;
        firebaseStoredUser = authUid ? await getConfiguredUserRecord(authUid).catch(() => null) : null;
        const storedUser = firebaseStoredUser ?? findUserByEmail(data, email);
        if (firebaseUser && !firebaseUser.emailVerified && storedUser?.role !== "admin") {
          await sendVerificationEmail(firebaseUser).catch(() => undefined);
          await signOutConfiguredProvider().catch(() => undefined);
          return { error: "Verify your email first. A fresh verification email has been sent." };
        }
      } catch (error) {
        return { error: friendlyAuthError(error, "Firebase login failed.") };
      }
    } else {
      const localUser = authenticateLocalUser(data, email, password);
      if (!localUser) {
        return { error: "Invalid email or password." };
      }
      saveSession(localUser.id);
      setSessionUserId(localUser.id);
      setView(getDefaultViewForRole(localUser.role));
      replaceBrowserPath(getPathForView(localUser.role, getDefaultViewForRole(localUser.role)));
      return {};
    }

    let user = authUid ? firebaseStoredUser ?? data.users.find((candidate) => candidate.id === authUid || candidate.authUid === authUid) ?? findUserByEmail(data, email) : null;
    if (!user && authUid) {
      user = {
        id: authUid,
        authUid,
        name: email.split("@")[0],
        email,
        password: "",
        role: "tourist",
        createdAt: new Date().toISOString(),
      };
      commitData({ ...data, users: [...data.users, user] }, user);
    } else if (user && authUid && (user.authUid !== authUid || !data.users.some((candidate) => candidate.id === user?.id))) {
      user = { ...user, authUid };
      setData(mergeUserRecord(data, user));
    }

    if (!user) {
      return { error: "Invalid email or password." };
    }

    saveSession(authUid ?? user.id);
    setSessionUserId(authUid ?? user.id);
    setView(getDefaultViewForRole(user.role));
    replaceBrowserPath(getPathForView(user.role, getDefaultViewForRole(user.role)));
    return {};
  };

  const register = async (draft: TouristRegistrationDraft): Promise<AuthResult> => {
    const expectedProfile = inferExpectedProfileFromPreferences(draft.travelPreferences);
    const precheck = validateTouristAccount(data, { name: draft.name, email: draft.email, password: draft.password });
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
      travelPreferences: draft.travelPreferences,
      expectedProfile,
      tripPace: draft.tripPace,
      travelGroup: draft.travelGroup,
      accessibilityPreference: draft.accessibilityPreference,
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
          ["dashboard", "Dashboard", BarChart3],
          ["destinations", "Destinations", MapPinned],
        ] as const)
      : ([
          ["overview", "Home", Compass],
          ["history", "Trips", MapPinned],
          ["recommendations", "Places", Sparkles],
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
            <strong>Tourist Movement</strong>
            <span>Monitoring</span>
          </div>
        </div>

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
              <span>Travel profile</span>
            </div>
          </button>
        ) : (
          <div className="account-strip">
            <UserRound size={18} />
            <div>
              <strong>{currentUser.name}</strong>
              <span>Tourism Administrator</span>
            </div>
          </div>
        )}

        <div className="status-pill">
          <span>{authProviderName()}</span>
          <strong>{syncStatus}</strong>
          {hasConfiguredAuth() && (
            <button className="status-retry-button" type="button" onClick={retryCloudSync} disabled={isRetryingSync}>
              <RotateCcw size={15} />
              {isRetryingSync ? "Retrying" : "Retry sync"}
            </button>
          )}
        </div>

        <div className="sidebar-tools">
          <button className="nav-item utility" onClick={exportData} title="Export prototype data">
            <Download size={18} />
            Export data
          </button>
          <button className="nav-item utility danger" onClick={resetPrototype} title="Reset prototype data">
            <RotateCcw size={18} />
            Reset demo
          </button>
        </div>

        <button className="nav-item logout" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="content">
        {currentUser.role === "admin" ? (
          <AdminWorkspace data={data} view={safeView} onDataChange={commitData} notify={notify} />
        ) : (
          <TouristWorkspace data={data} view={safeView} user={currentUser} onDataChange={commitData} onViewChange={goToView} watchId={watchId} notify={notify} />
        )}
      </main>
      <ToastViewport notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

function AuthScreen({
  mode,
  onModeChange,
  onLogin,
  onRegister,
  onResendVerification,
  onPasswordReset,
  notify,
}: {
  mode: AuthMode;
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
  const [registrationPreferences, setRegistrationPreferences] = useState<DestinationCategory[]>(["cultural", "nature"]);
  const [registrationPace, setRegistrationPace] = useState<User["tripPace"]>("balanced");
  const [registrationGroup, setRegistrationGroup] = useState<User["travelGroup"]>("solo");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(Boolean(rememberedLogin));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firebaseMode = hasConfiguredAuth();

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

    if (mode === "register" && registrationPreferences.length === 0) {
      setError("Choose at least one travel preference.");
      setMessage(null);
      notify({ tone: "error", title: "Travel preference missing", message: "Choose at least one place type so the tourist profile has a useful starting point." });
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
            travelPreferences: registrationPreferences,
            tripPace: registrationPace,
            travelGroup: registrationGroup,
            accessibilityPreference: "none",
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

  const toggleRegistrationPreference = (preference: DestinationCategory) => {
    setRegistrationPreferences((current) =>
      current.includes(preference) ? current.filter((candidate) => candidate !== preference) : [...current, preference]
    );
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
          <h1>Smart Tourist Movement Monitoring</h1>
          <p>Consent-based trip tracking, route visualization, dashboard monitoring, and explainable destination recommendations for selected Malaysian tourist locations.</p>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="segmented-control" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => switchAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => switchAuthMode("register")}
            >
              Register
            </button>
          </div>

          {mode === "login" && !firebaseMode && (
            <div className="segmented-control role-switch profile-switch" aria-label="Demo role">
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
            <p className="form-hint">Firebase mode is active. Use a registered and verified Firebase account.</p>
          )}

          {mode === "register" && (
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          )}

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>

          <label>
            Password
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {mode === "register" && (
            <label>
              Confirm Password
              <span className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          )}

          {mode === "register" && (
            <fieldset className="auth-preference-panel">
              <legend>Start with your travel style</legend>
              <div className="preference-grid">
                {preferenceOptions.map((option) => (
                  <label className={registrationPreferences.includes(option.value) ? "preference-chip active" : "preference-chip"} key={option.value}>
                    <input type="checkbox" checked={registrationPreferences.includes(option.value)} onChange={() => toggleRegistrationPreference(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="field-pair">
                <label>
                  Travel pace
                  <select value={registrationPace} onChange={(event) => setRegistrationPace(event.target.value as User["tripPace"])}>
                    <option value="relaxed">Relaxed</option>
                    <option value="balanced">Balanced</option>
                    <option value="packed">Packed schedule</option>
                  </select>
                </label>
                <label>
                  Travelling with
                  <select value={registrationGroup} onChange={(event) => setRegistrationGroup(event.target.value as User["travelGroup"])}>
                    <option value="solo">Solo</option>
                    <option value="couple">Partner</option>
                    <option value="family">Family</option>
                    <option value="friends">Friends</option>
                  </select>
                </label>
              </div>
            </fieldset>
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
            Remember login on this device
          </label>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <button className="primary-action" type="submit" disabled={isSubmitting}>
            <ShieldCheck size={18} />
            {isSubmitting ? "Checking access" : mode === "login" ? "Enter system" : "Create tourist account"}
          </button>

          {firebaseMode && mode === "login" && (
            <div className="auth-secondary-actions">
              <button className="secondary-action" type="button" onClick={resendVerification} disabled={isSubmitting}>
                <RotateCcw size={18} />
                Resend verification email
              </button>
              <button className="secondary-action" type="button" onClick={requestPasswordReset} disabled={isSubmitting}>
                <KeyRound size={18} />
                Forgot password
              </button>
            </div>
          )}

          <button className="auth-mode-link" type="button" onClick={() => switchAuthMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create Tourist Account" : "Already have an account? Login"}
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
  onDataChange,
  onViewChange,
  watchId,
  notify,
}: {
  data: AppData;
  view: AppView;
  user: User;
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
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState({ latitude: "3.1478", longitude: "101.6937", accuracyMeters: "25" });
  const [profileSetupSkipped, setProfileSetupSkipped] = useState(() => localStorage.getItem(getProfileSkipKey(user.id)) === "true");
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
  const selectedRecommendation = recommendations.find((recommendation) => recommendation.id === selectedRecommendationId) ?? null;
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data]);
  const visitedDestinationIds = useMemo(() => getVisitedDestinationIds(data, user.id), [data, user.id]);
  const displayName = getDisplayName(user);
  const showProfileSetup = !user.profileCompletedAt && !profileSetupSkipped;
  const hasPersonalizedRecommendations = Boolean(latestAnalysis);
  const recommendationHeading = hasPersonalizedRecommendations ? "Recommended For You" : "Basic Suggestions";
  const recommendationSupportText = hasPersonalizedRecommendations
    ? "These places use your latest movement pattern, tourist category and unvisited destination list."
    : "These are general suggestions from destination demand and your current location until a completed trip creates an AI result.";

  const showTrackingNotice = (tone: NotificationTone, title: string, message: string) => {
    setTrackingMessage(message);
    notify({ tone, title, message });
  };

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

  const skipProfileSetup = () => {
    localStorage.setItem(getProfileSkipKey(user.id), "true");
    setProfileSetupSkipped(true);
    notify({ tone: "info", title: "Profile skipped", message: "You can complete your travel profile later from Home." });
  };

  if (view === "profile") {
    return (
      <Page title="Travel Profile" eyebrow="Tourist">
        <TouristProfileForm
          user={user}
          title="Travel Preferences"
          description="Update the details used to personalise your trip suggestions."
          primaryLabel="Save profile"
          onSave={saveProfile}
        />
      </Page>
    );
  }

  if (view === "overview" && showProfileSetup) {
    return (
      <Page title="Set Up Your Travel Profile" eyebrow="Tourist">
        <TouristProfileForm
          user={user}
          title="Make the app feel like yours"
          description="Add a name and travel style so recommendations start from your preferences, then improve as your movement history grows."
          primaryLabel="Save and continue"
          secondaryLabel="Skip for now"
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
    return (
      <Page title="My Trips" eyebrow="Tourist">
        <div className="two-column">
          <MovementMap points={selectedTripPoints.length ? selectedTripPoints : tripPoints} destinations={data.destinations} mode="tourist" />
          <section className="trip-history-panel">
            {selectedTripSummary && <TripSummaryPanel summary={selectedTripSummary} />}
            {selectedTrip && selectedTripSummary && (
              <aside className="trip-detail-panel">
                <span>Selected Trip</span>
                <h2>{formatDateTime(selectedTrip.startedAt)}</h2>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{selectedTrip.status === "completed" ? "Completed" : "Active"}</dd>
                  </div>
                  <div>
                    <dt>Started</dt>
                    <dd>{formatDateTime(selectedTrip.startedAt)}</dd>
                  </div>
                  <div>
                    <dt>Ended</dt>
                    <dd>{selectedTrip.endedAt ? formatDateTime(selectedTrip.endedAt) : "Trip still active"}</dd>
                  </div>
                  <div>
                    <dt>Recognised stops</dt>
                    <dd>{selectedTripDestinationNames.length > 0 ? selectedTripDestinationNames.join(", ") : "No nearby saved destination recognised yet"}</dd>
                  </div>
                  <div>
                    <dt>Analysis status</dt>
                    <dd>
                      {selectedTripAnalysis
                        ? "Complete"
                        : selectedTripSummary.pointCount >= 2
                          ? "Ready to refresh"
                          : "Needs at least 2 movement points"}
                    </dd>
                  </div>
                  <div>
                    <dt>Tourist category</dt>
                    <dd>{selectedTripAnalysis ? `${selectedTripAnalysis.profile} Tourist` : "Pending"}</dd>
                  </div>
                  <div>
                    <dt>Cluster ID</dt>
                    <dd>{selectedTripAnalysis ? `Cluster ${selectedTripAnalysis.cluster + 1}` : "Pending"}</dd>
                  </div>
                </dl>

                <div className="trip-detail-recommendations">
                  <strong>{hasPersonalizedRecommendations ? "Current generated recommendations" : "Basic suggestions"}</strong>
                  {selectedTripRecommendations.length > 0 ? (
                    selectedTripRecommendations.map((recommendation) => {
                      const destination = data.destinations.find((candidate) => candidate.id === recommendation.destinationId);

                      return destination ? (
                        <span key={recommendation.id}>
                          {destination.name} <small>{destination.city}</small>
                        </span>
                      ) : null;
                    })
                  ) : (
                    <p>Complete a trip with enough movement data to generate recommendations.</p>
                  )}
                </div>
              </aside>
            )}
            <section className="list-panel">
              {recentTrips.map((trip) => {
                const points = data.points.filter((point) => point.tripId === trip.id);
                const summary = tripSummaries.find((row) => row.tripId === trip.id);
                return (
                  <button className={selectedTrip?.id === trip.id ? "record-card selectable active" : "record-card selectable"} key={trip.id} onClick={() => setSelectedTripId(trip.id)}>
                    <div>
                      <strong>{formatDateTime(trip.startedAt)}</strong>
                      <span>{trip.status === "completed" ? "Completed" : "Active"}</span>
                    </div>
                    <p>
                      {points.length} point(s), {summary?.distanceKm ?? 0} km, {summary?.durationMinutes ?? 0} min, {summary?.visitedDestinationCount ?? 0} recognised stop(s)
                    </p>
                    <small>{trip.endedAt ? `Ended ${formatDateTime(trip.endedAt)}` : "Trip still active"}</small>
                  </button>
                );
              })}
              {userTrips.length === 0 && <EmptyState text="Your saved trips will appear here after you start tracking." />}
            </section>
          </section>
        </div>
      </Page>
    );
  }

  if (view === "recommendations") {
    const topRecommendations = recommendations.slice(0, 3);

    return (
      <Page
        title="Places To Visit"
        eyebrow="Tourist"
        actions={
          <button className="secondary-action" onClick={refreshRecommendations}>
            <RotateCcw size={18} />
            Refresh
          </button>
        }
      >
        <section className="recommendation-page">
          <section className="recommendation-profile-card">
            <div>
              <span>Latest travel category</span>
              <strong>{latestAnalysis ? `${latestAnalysis.profile} Tourist` : "Not enough movement data yet"}</strong>
            </div>
            <div>
              <span>Cluster</span>
              <strong>{latestAnalysis ? `Cluster ${latestAnalysis.cluster}` : "Pending"}</strong>
            </div>
            <p>
              {latestAnalysis
                ? `Your recent route pattern is closest to ${latestAnalysis.clusterLabel}. Recommendations prioritise matching places you have not visited.`
                : "Complete a trip with at least two movement points to unlock personalised recommendations. Basic suggestions may still appear from your preferences and nearby movement demand."}
            </p>
          </section>

          {!hasPersonalizedRecommendations && (
            <section className="recommendation-mode-notice">
              <strong>Basic suggestion mode</strong>
              <p>AI personalisation is locked until your movement history has enough usable points. These suggestions are safe to browse, but they are not final Tourist Category results.</p>
            </section>
          )}

          <RecommendationList
            recommendations={topRecommendations}
            destinations={data.destinations}
            demand={destinationDemand}
            personalized={hasPersonalizedRecommendations}
            onSelect={setSelectedRecommendationId}
          />

          <MovementDemandList title="Popular Right Now" demand={destinationDemand.slice(0, 5)} destinations={data.destinations} compact />
        </section>

        {selectedRecommendation && (
          <DestinationModal
            recommendation={selectedRecommendation}
            destination={data.destinations.find((destination) => destination.id === selectedRecommendation.destinationId) ?? null}
            demand={destinationDemand.find((row) => row.destinationId === selectedRecommendation.destinationId)}
            onClose={() => setSelectedRecommendationId(null)}
          />
        )}
      </Page>
    );
  }

  return (
    <Page title={displayName ? `Welcome back, ${displayName}` : "Plan Your Visit"} eyebrow="Tourist">
      <section className="tourist-home-flow">
        <div className="tracking-status-card">
          <span>{tripStateLabel}</span>
          <div>
            <h2>{activeTrip ? "Your trip is being recorded" : recentTrip ? "Ready for your next trip" : "Start your first tracked trip"}</h2>
            <p>
              {activeTrip
                ? "Keep this page open while your trip is being recorded."
                : recentTrip
                  ? "Use Home when you are ready to record another route."
                  : "Allow location, start a trip, and the app will use your route to improve recommendations."}
            </p>
          </div>
        </div>

        <MovementMap points={activePoints.length ? activePoints : tripPoints} destinations={data.destinations} activePoint={activePoints.at(-1) ?? tripPoints.at(-1)} mode="tourist" />

        <section className="mobile-trip-controls">
          <div className="consent-box">
            <ShieldCheck size={22} />
            <div>
              <strong>{currentConsent ? "Location is allowed" : "Allow location first"}</strong>
              <p>{currentConsent ? "You can start a trip whenever you are ready." : "Location is requested only when you choose to record a trip."}</p>
            </div>
          </div>

          {!currentConsent && (
            <button className="primary-action wide" onClick={grantConsent}>
              <ShieldCheck size={18} />
              Allow Location Access
            </button>
          )}

          {currentConsent && (
            <div className="mobile-action-row">
              <button className="primary-action" onClick={startTrip} disabled={Boolean(activeTrip)}>
                <Play size={18} />
                Start Trip
              </button>
              <button className="secondary-action" onClick={stopTrip} disabled={!activeTrip}>
                <Square size={18} />
                Stop Trip
              </button>
            </div>
          )}

          {activeTrip && !isLiveTracking && (
            <button className="secondary-action wide" onClick={resumeLiveTracking}>
              <Navigation size={18} />
              Resume tracking
            </button>
          )}

          {activeTrip && (
            <button className="secondary-action wide" onClick={addDemoPoint}>
              Add demo movement point
            </button>
          )}

          <button className="secondary-action wide" onClick={createSampleRoute} disabled={Boolean(activeTrip)}>
            <Compass size={18} />
            Add sample Malaysia route
          </button>

          {trackingMessage && <p className="status-message">{trackingMessage}</p>}

          {locationRetryAvailable && activeTrip && (
            <button className="secondary-action wide" type="button" onClick={resumeLiveTracking}>
              <RotateCcw size={18} />
              Try location again
            </button>
          )}

          {userTrips.length === 0 && (
            <section className="new-user-guide">
              <strong>How it works</strong>
              <ol>
                <li>Allow location when you are ready to record.</li>
                <li>Start a trip and keep this page open.</li>
                <li>Stop the trip to update your travel category and recommendations.</li>
              </ol>
            </section>
          )}
        </section>

        <MetricGrid
          items={[
            ["Trip status", tripStateLabel],
            ["Saved points", (activeTrip ? activePoints.length : tripPoints.length).toString()],
            ["Latest category", latestAnalysis?.profile ?? "Learning"],
            ["Distance", `${activeTripSummary?.distanceKm ?? recentTripSummary?.distanceKm ?? 0} km`],
          ]}
        />

        <section className="tourist-section profile-summary-card">
          <div className="section-heading">
            <div>
              <h2>Travel Profile</h2>
              <p>Your preferences give the app a starting point before movement history becomes strong enough for AI recommendations.</p>
            </div>
            <button className="secondary-action compact-action" onClick={() => onViewChange("profile")}>
              <UserRound size={16} />
              {user.profileCompletedAt ? "Edit" : "Complete"}
            </button>
          </div>
          <div className="profile-summary-grid">
            <div>
              <small>Name</small>
              <strong>{displayName || "Not set yet"}</strong>
            </div>
            <div>
              <small>Interests</small>
              <strong>{formatTravelPreferenceList(user.travelPreferences)}</strong>
            </div>
            <div>
              <small>Pace</small>
              <strong>{user.tripPace ?? "balanced"}</strong>
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
        <button className={adminTab === "records" ? "active" : ""} type="button" onClick={() => setAdminTab("records")}>
          Movement Records
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
              ["Alerts", movementAlerts.length.toString()],
            ]}
          />
          <div className="two-column">
            <MovementMap points={allDashboardPoints} destinations={data.destinations} />
            <section className="panel">
              {!movementDataStatus.hasMovementData && <EmptyState text={movementDataStatus.message} />}
              <MovementAlertList alerts={movementAlerts} destinations={data.destinations} onExport={exportMovementAlerts} />
              <h2>Movement Trend</h2>
              <CategoryBars values={movementTrend} />
              <h2>Movement Demand</h2>
              <MovementDemandList title="Top Tourist Flow" demand={destinationDemand.slice(0, 4)} destinations={data.destinations} compact />
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
      {adminTab === "records" && movementRecordsPanel}
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
          <dt>Coordinates</dt>
          <dd>
            {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
          </dd>
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
            <dt>Coordinates</dt>
            <dd>
              {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt>Recommendation score</dt>
            <dd>{recommendation.score}</dd>
          </div>
          <div>
            <dt>Movement demand</dt>
            <dd>{demand ? `${demand.tier} (${demand.popularityScore}%)` : "No signal yet"}</dd>
          </div>
        </dl>
        <section className="recommendation-reason">
          <strong>Why this place?</strong>
          <p>{recommendation.reason}</p>
        </section>
      </section>
    </div>
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
  category: DestinationCategory;
  latitude: string;
  longitude: string;
  averageVisitMinutes: string;
  description: string;
};

function createDestinationForm(destination?: Destination): DestinationFormState {
  return {
    name: destination?.name ?? "",
    city: destination?.city ?? "",
    category: destination?.category ?? "cultural",
    latitude: destination ? String(destination.latitude) : "3.1478",
    longitude: destination ? String(destination.longitude) : "101.6937",
    averageVisitMinutes: destination ? String(destination.averageVisitMinutes) : "60",
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
        [destination.name, destination.city, destination.description, destination.category].some((value) => value.toLowerCase().includes(normalizedSearch));

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
