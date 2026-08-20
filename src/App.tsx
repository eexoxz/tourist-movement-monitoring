import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Compass,
  Database,
  Download,
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
import { MapView } from "./components/MapView";
import type { AppData, Destination, DestinationCategory, DestinationDemand, LocationConsent, MovementPoint, TravelPlan, TripSession, User, UserRole } from "./types";
import { clearSession, createId, getStorageMode, loadCloudData, loadData, loadSession, resetData, saveData, saveSession } from "./services/storage";
import { formatDateTime, nearestDestination } from "./services/geo";
import { calculateDestinationDemand, createMovementBasedTravelPlan, evaluateAiOutput, refreshAllRecommendations, refreshAnalysis } from "./services/analytics";
import { authProviderName, registerWithConfiguredProvider, signInWithConfiguredProvider, signOutConfiguredProvider } from "./services/auth";
import { authenticateLocalUser, createTouristAccount, findUserByEmail, validateTouristAccount } from "./services/accounts";

type View = "overview" | "tracking" | "history" | "recommendations" | "dashboard" | "records" | "destinations" | "ai";

const demoRoute = [
  [3.142, 101.6894],
  [3.1457, 101.6954],
  [3.1478, 101.6937],
  [3.1556, 101.7139],
  [3.1579, 101.7116],
] as const;

const destinationCategories: DestinationCategory[] = ["cultural", "nature", "urban", "heritage", "food", "coastal"];

function App() {
  const [data, setData] = useState<AppData>(() => refreshAllRecommendations(loadData()));
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadSession());
  const currentUser = data.users.find((user) => user.id === sessionUserId) ?? null;
  const [view, setView] = useState<View>(() => (currentUser?.role === "admin" ? "dashboard" : "overview"));
  const [syncStatus, setSyncStatus] = useState(getStorageMode());
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadCloudData()
      .then((cloudData) => {
        if (!isMounted || !cloudData) {
          return;
        }

        const refreshed = refreshAllRecommendations(cloudData);
        setData(refreshed);
        saveData(refreshed);
        setSyncStatus("Synced with Firebase Firestore");
      })
      .catch(() => {
        if (isMounted) {
          setSyncStatus("Local mode; Firebase sync unavailable");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const commitData = (nextData: AppData) => {
    setData(nextData);
    saveData(nextData);
  };

  const login = async (email: string, password: string) => {
    let authUid: string | undefined;
    try {
      const firebaseUser = await signInWithConfiguredProvider(email, password);
      authUid = firebaseUser?.uid;
    } catch (error) {
      const hasLocalAccount = Boolean(authenticateLocalUser(data, email, password));
      if (!hasLocalAccount) {
        return error instanceof Error ? error.message : "Firebase login failed.";
      }
    }

    let user = authUid ? findUserByEmail(data, email) : authenticateLocalUser(data, email, password);
    if (!user && authUid) {
      user = {
        id: createId("user"),
        authUid,
        name: email.split("@")[0],
        email,
        password: "",
        role: "tourist",
        createdAt: new Date().toISOString(),
      };
      commitData({ ...data, users: [...data.users, user] });
    } else if (user && authUid && user.authUid !== authUid) {
      user = { ...user, authUid };
      commitData({ ...data, users: data.users.map((candidate) => (candidate.id === user?.id ? user : candidate)) });
    }

    if (!user) {
      return "Invalid email or password.";
    }

    setSessionUserId(user.id);
    saveSession(user.id);
    setView(user.role === "admin" ? "dashboard" : "overview");
    return null;
  };

  const register = async (name: string, email: string, password: string) => {
    const precheck = validateTouristAccount(data, { name, email, password });
    if (precheck.error) {
      return precheck.error;
    }

    let authUid: string | undefined;
    try {
      const firebaseUser = await registerWithConfiguredProvider(email, password);
      authUid = firebaseUser?.uid;
    } catch (error) {
      return error instanceof Error ? error.message : "Firebase registration failed.";
    }

    const created = createTouristAccount(data, { name, email, password, authUid });
    if (created.error || !created.user || !created.data) {
      return created.error ?? "Unable to create tourist account.";
    }

    const user = created.user;
    commitData(created.data);
    setSessionUserId(user.id);
    saveSession(user.id);
    setView("overview");
    return null;
  };

  const logout = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    await signOutConfiguredProvider().catch(() => undefined);
    clearSession();
    setSessionUserId(null);
  };

  const resetPrototype = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const freshData = refreshAllRecommendations(resetData());
    saveData(freshData);
    setData(freshData);
    setSessionUserId(null);
    setView("overview");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tourist-movement-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={login} onRegister={register} />;
  }

  const roleViews =
    currentUser.role === "admin"
      ? ([
          ["dashboard", "Dashboard", BarChart3],
          ["records", "Records", Database],
          ["destinations", "Destinations", MapPinned],
          ["ai", "AI Analysis", Sparkles],
        ] as const)
      : ([
          ["overview", "Overview", Compass],
          ["tracking", "Tracking", Navigation],
          ["history", "History", MapPinned],
          ["recommendations", "Recommendations", Sparkles],
        ] as const);

  return (
    <div className="app-shell">
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
          {roleViews.map(([key, label, Icon]) => (
            <button key={key} className={view === key ? "nav-item active" : "nav-item"} onClick={() => setView(key)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="account-strip">
          <UserRound size={18} />
          <div>
            <strong>{currentUser.name}</strong>
            <span>{currentUser.role === "admin" ? "Tourism Administrator" : "Tourist"}</span>
          </div>
        </div>

        <div className="status-pill">
          <span>{authProviderName()}</span>
          <strong>{syncStatus}</strong>
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
          <AdminWorkspace data={data} view={view} onDataChange={commitData} />
        ) : (
          <TouristWorkspace data={data} view={view} user={currentUser} onDataChange={commitData} watchId={watchId} />
        )}
      </main>
    </div>
  );
}

function AuthScreen({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (name: string, email: string, password: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [roleHint, setRoleHint] = useState<UserRole | "nature">("tourist");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("tourist@example.com");
  const [password, setPassword] = useState("tourist123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setDemoRole = (role: UserRole | "nature") => {
    setRoleHint(role);
    if (role === "admin") {
      setEmail("admin@tourism.local");
      setPassword("admin123");
    } else if (role === "nature") {
      setEmail("nature@example.com");
      setPassword("nature123");
    } else {
      setEmail("tourist@example.com");
      setPassword("tourist123");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const message = mode === "login" ? await onLogin(email, password) : await onRegister(name, email, password);
    setError(message);
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

        <form className="auth-form" onSubmit={submit}>
          <div className="segmented-control" role="tablist" aria-label="Authentication mode">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Login
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Register
            </button>
          </div>

          {mode === "login" && (
            <div className="segmented-control role-switch three-way" aria-label="Demo role">
              <button type="button" className={roleHint === "tourist" ? "active" : ""} onClick={() => setDemoRole("tourist")}>
                Tourist
              </button>
              <button type="button" className={roleHint === "nature" ? "active" : ""} onClick={() => setDemoRole("nature")}>
                Nature
              </button>
              <button type="button" className={roleHint === "admin" ? "active" : ""} onClick={() => setDemoRole("admin")}>
                Admin
              </button>
            </div>
          )}

          {mode === "register" && (
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          )}

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-action" type="submit" disabled={isSubmitting}>
            <ShieldCheck size={18} />
            {isSubmitting ? "Checking access" : mode === "login" ? "Enter system" : "Create tourist account"}
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
  watchId,
}: {
  data: AppData;
  view: View;
  user: User;
  onDataChange: (data: AppData) => void;
  watchId: React.MutableRefObject<number | null>;
}) {
  const userTrips = data.trips.filter((trip) => trip.userId === user.id);
  const activeTrip = userTrips.find((trip) => trip.status === "active");
  const currentConsent = data.consents.find((consent) => consent.userId === user.id && consent.granted);
  const tripPoints = data.points.filter((point) => userTrips.some((trip) => trip.id === point.tripId));
  const latestAnalysis = data.analyses.filter((analysis) => analysis.userId === user.id).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
  const recommendations = data.recommendations.filter((recommendation) => recommendation.userId === user.id);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>(userTrips[0]?.id ?? "");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>(data.destinations[0]?.id ?? "");
  const [manualLocation, setManualLocation] = useState({ latitude: "3.1478", longitude: "101.6937", accuracyMeters: "25" });
  const selectedTrip = userTrips.find((trip) => trip.id === selectedTripId) ?? userTrips[0];
  const selectedTripPoints = selectedTrip ? data.points.filter((point) => point.tripId === selectedTrip.id) : [];
  const selectedDestination = data.destinations.find((destination) => destination.id === selectedDestinationId) ?? data.destinations[0];
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data]);

  const grantConsent = () => {
    const consent: LocationConsent = {
      id: createId("consent"),
      userId: user.id,
      granted: true,
      grantedAt: new Date().toISOString(),
    };
    onDataChange({
      ...data,
      consents: [...data.consents.filter((item) => item.userId !== user.id), consent],
    });
  };

  const appendPoint = (tripId: string, latitude: number, longitude: number, accuracyMeters: number, source: "browser" | "demo") => {
    const point: MovementPoint = {
      id: createId("point"),
      tripId,
      latitude,
      longitude,
      accuracyMeters,
      recordedAt: new Date().toISOString(),
      source,
    };
    const latestData = loadData();
    const nextData = { ...latestData, points: [...latestData.points, point] };
    onDataChange(nextData);
  };

  const startTrip = () => {
    if (!currentConsent) {
      setTrackingMessage("Location consent is required before trip tracking starts.");
      return;
    }

    if (activeTrip) {
      setTrackingMessage("A trip is already being recorded.");
      return;
    }

    const trip: TripSession = {
      id: createId("trip"),
      userId: user.id,
      status: "active",
      startedAt: new Date().toISOString(),
      consentId: currentConsent.id,
    };
    const nextData = { ...data, trips: [...data.trips, trip] };
    onDataChange(nextData);

    if (!navigator.geolocation) {
      setTrackingMessage("Browser geolocation is unavailable. Demo points can still be added manually.");
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        appendPoint(trip.id, position.coords.latitude, position.coords.longitude, position.coords.accuracy, "browser");
        setTrackingMessage("Live movement point recorded.");
      },
      (error) => {
        setTrackingMessage(error.message || "Location permission was denied by the browser.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  };

  const stopTrip = () => {
    if (!activeTrip) {
      return;
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const endedData = {
      ...data,
      trips: data.trips.map((trip) => (trip.id === activeTrip.id ? { ...trip, status: "completed" as const, endedAt: new Date().toISOString() } : trip)),
    };
    onDataChange(refreshAnalysis(endedData, user.id));
    setTrackingMessage("Trip stopped and recommendation analysis refreshed.");
  };

  const addDemoPoint = () => {
    if (!activeTrip) {
      return;
    }

    const currentPoints = data.points.filter((point) => point.tripId === activeTrip.id);
    const [latitude, longitude] = demoRoute[currentPoints.length % demoRoute.length];
    appendPoint(activeTrip.id, latitude, longitude, 32, "demo");
    setTrackingMessage("Demo movement point added to the active trip.");
  };

  const addManualPoint = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTrip) {
      setTrackingMessage("Start a trip before saving a manual movement point.");
      return;
    }

    const latitude = Number(manualLocation.latitude);
    const longitude = Number(manualLocation.longitude);
    const accuracyMeters = Number(manualLocation.accuracyMeters);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setTrackingMessage("Enter a valid latitude and longitude before saving.");
      return;
    }

    appendPoint(activeTrip.id, latitude, longitude, Math.max(1, accuracyMeters || 25), "demo");
    setTrackingMessage("Manual movement point saved to the active trip.");
  };

  const refreshRecommendations = () => {
    onDataChange(refreshAnalysis(data, user.id));
  };

  const revokeConsent = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const nextData = {
      ...data,
      consents: data.consents.map((consent) =>
        consent.userId === user.id && consent.granted ? { ...consent, granted: false, revokedAt: new Date().toISOString() } : consent
      ),
      trips: data.trips.map((trip) => (trip.userId === user.id && trip.status === "active" ? { ...trip, status: "completed" as const, endedAt: new Date().toISOString() } : trip)),
    };
    onDataChange(refreshAllRecommendations(nextData));
    setTrackingMessage("Location consent revoked. Active tracking has been stopped.");
  };

  const deleteMyMovementData = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    const userTripIds = new Set(userTrips.map((trip) => trip.id));
    const nextData = {
      ...data,
      trips: data.trips.filter((trip) => trip.userId !== user.id),
      points: data.points.filter((point) => !userTripIds.has(point.tripId)),
      analyses: data.analyses.filter((analysis) => analysis.userId !== user.id),
      recommendations: data.recommendations.filter((recommendation) => recommendation.userId !== user.id),
    };
    onDataChange(refreshAllRecommendations(nextData));
    setSelectedTripId("");
    setTrackingMessage("Your movement history and AI recommendation records were deleted.");
  };

  if (view === "tracking") {
    const activePoints = activeTrip ? data.points.filter((point) => point.tripId === activeTrip.id) : [];

    return (
      <Page title="Trip Tracking" eyebrow="Tourist workspace">
        <div className="two-column">
          <section className="panel">
            <h2>Movement Session</h2>
            <div className="consent-box">
              <ShieldCheck size={22} />
              <div>
                <strong>{currentConsent ? "Location consent granted" : "Location consent required"}</strong>
                <p>Movement recording starts only after consent is granted and a trip session is active.</p>
              </div>
            </div>

            {!currentConsent && (
              <button className="primary-action" onClick={grantConsent}>
                <ShieldCheck size={18} />
                Grant consent
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
                Start tracking
              </button>
              <button className="secondary-action" onClick={stopTrip} disabled={!activeTrip}>
                <Square size={18} />
                Stop
              </button>
            </div>

            <button className="secondary-action wide" onClick={addDemoPoint} disabled={!activeTrip}>
              Add demo movement point
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

            <section className="privacy-actions">
              <strong>Privacy control</strong>
              <p>Movement data remains linked to your tourist account for route history and recommendations.</p>
              <button className="secondary-action wide danger" onClick={deleteMyMovementData} disabled={userTrips.length === 0}>
                <Trash2 size={18} />
                Delete my movement data
              </button>
            </section>

            <MetricGrid
              items={[
                ["Active points", activePoints.length.toString()],
                ["Completed trips", userTrips.filter((trip) => trip.status === "completed").length.toString()],
                ["Profile", latestAnalysis?.profile ?? "Pending"],
              ]}
            />
          </section>

          <MapView points={activePoints.length ? activePoints : tripPoints} destinations={data.destinations} />
        </div>
      </Page>
    );
  }

  if (view === "history") {
    return (
      <Page title="Movement History" eyebrow="Tourist workspace">
        <div className="two-column">
          <MapView points={selectedTripPoints.length ? selectedTripPoints : tripPoints} destinations={data.destinations} />
          <section className="list-panel">
            {userTrips.map((trip) => {
              const points = data.points.filter((point) => point.tripId === trip.id);
              return (
                <button className={selectedTrip?.id === trip.id ? "record-card selectable active" : "record-card selectable"} key={trip.id} onClick={() => setSelectedTripId(trip.id)}>
                  <div>
                    <strong>{formatDateTime(trip.startedAt)}</strong>
                    <span>{trip.status}</span>
                  </div>
                  <p>{points.length} movement points recorded</p>
                </button>
              );
            })}
            {userTrips.length === 0 && <EmptyState text="No trip sessions have been created yet." />}
          </section>
        </div>
      </Page>
    );
  }

  if (view === "recommendations") {
    return (
      <Page
        title="Recommendations"
        eyebrow="Tourist workspace"
        actions={
          <button className="secondary-action" onClick={refreshRecommendations}>
            <RotateCcw size={18} />
            Refresh
          </button>
        }
      >
        <RecommendationList recommendations={recommendations} destinations={data.destinations} />
      </Page>
    );
  }

  return (
    <Page title="Tourist Overview" eyebrow="Tourist workspace">
      <MovementPulseHero
        mode="tourist"
        demand={destinationDemand}
        destinations={data.destinations}
        profile={latestAnalysis?.profile ?? "pending"}
        pointCount={tripPoints.length}
      />
      <MetricGrid
        items={[
          ["Trips", userTrips.length.toString()],
          ["Movement points", tripPoints.length.toString()],
          ["Tourist profile", latestAnalysis?.profile ?? "Pending"],
          ["Decision confidence", latestAnalysis ? `${Math.round(latestAnalysis.classificationConfidence * 100)}%` : "Pending"],
          ["Recommendations", recommendations.length.toString()],
        ]}
      />
      <div className="two-column">
        <MapView points={tripPoints} destinations={data.destinations} />
        <div className="stack">
          <MovementDemandList title="Where Tourists Are Moving" demand={destinationDemand.slice(0, 5)} destinations={data.destinations} />
          <DestinationPanel destinations={data.destinations.slice(0, 6)} selectedId={selectedDestination?.id} onSelect={setSelectedDestinationId} />
          {selectedDestination && <DestinationDetail destination={selectedDestination} />}
        </div>
      </div>
    </Page>
  );
}

function AdminWorkspace({ data, view, onDataChange }: { data: AppData; view: View; onDataChange: (data: AppData) => void }) {
  const tourists = data.users.filter((user) => user.role === "tourist");
  const completedTrips = data.trips.filter((trip) => trip.status === "completed");
  const categories = data.destinations.reduce<Record<string, number>>((totals, destination) => {
    totals[destination.category] = (totals[destination.category] ?? 0) + 1;
    return totals;
  }, {});
  const [selectedTouristId, setSelectedTouristId] = useState<string>("all");
  const [destinationForm, setDestinationForm] = useState({
    name: "",
    city: "",
    category: "cultural",
    latitude: "3.1478",
    longitude: "101.6937",
    description: "",
  });

  const visibleTrips = selectedTouristId === "all" ? data.trips : data.trips.filter((trip) => trip.userId === selectedTouristId);
  const visibleTripIds = new Set(visibleTrips.map((trip) => trip.id));
  const allPoints = data.points.filter((point) => visibleTripIds.has(point.tripId));
  const aiEvaluation = useMemo(() => evaluateAiOutput(data), [data]);
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data]);
  const travelPlan = useMemo(() => createMovementBasedTravelPlan(data), [data]);

  const addDestination = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const destination: Destination = {
      id: createId("destination"),
      name: destinationForm.name,
      city: destinationForm.city,
      category: destinationForm.category as Destination["category"],
      latitude: Number(destinationForm.latitude),
      longitude: Number(destinationForm.longitude),
      description: destinationForm.description,
      averageVisitMinutes: 60,
    };
    onDataChange({ ...data, destinations: [...data.destinations, destination] });
    setDestinationForm({ name: "", city: "", category: "cultural", latitude: "3.1478", longitude: "101.6937", description: "" });
  };

  const recomputeAi = () => {
    onDataChange(refreshAllRecommendations(data));
  };

  if (view === "records") {
    return (
      <Page
        title="Movement Records"
        eyebrow="Administrator workspace"
        actions={
          <select className="toolbar-select" value={selectedTouristId} onChange={(event) => setSelectedTouristId(event.target.value)}>
            <option value="all">All tourists</option>
            {tourists.map((tourist) => (
              <option key={tourist.id} value={tourist.id}>
                {tourist.name}
              </option>
            ))}
          </select>
        }
      >
        <div className="two-column">
          <MapView points={allPoints} destinations={data.destinations} />
          <section className="list-panel">
            {allPoints.map((point) => {
              const trip = data.trips.find((candidate) => candidate.id === point.tripId);
              const user = data.users.find((candidate) => candidate.id === trip?.userId);
              const nearest = nearestDestination(point, data.destinations);
              return (
                <article className="record-card" key={point.id}>
                  <div>
                    <strong>{user?.name ?? "Unknown tourist"}</strong>
                    <span>{formatDateTime(point.recordedAt)}</span>
                  </div>
                  <p>
                    {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)} near {nearest?.destination.name ?? "unmapped destination"}
                  </p>
                </article>
              );
            })}
            {allPoints.length === 0 && <EmptyState text="No movement records match this filter." />}
          </section>
        </div>
      </Page>
    );
  }

  if (view === "destinations") {
    return (
      <Page title="Destination Management" eyebrow="Administrator workspace">
        <div className="two-column">
          <form className="panel destination-form" onSubmit={addDestination}>
            <h2>Add Destination</h2>
            <label>
              Name
              <input value={destinationForm.name} onChange={(event) => setDestinationForm({ ...destinationForm, name: event.target.value })} required />
            </label>
            <label>
              City
              <input value={destinationForm.city} onChange={(event) => setDestinationForm({ ...destinationForm, city: event.target.value })} required />
            </label>
            <label>
              Category
              <select value={destinationForm.category} onChange={(event) => setDestinationForm({ ...destinationForm, category: event.target.value })}>
                <option value="cultural">Cultural</option>
                <option value="nature">Nature</option>
                <option value="urban">Urban</option>
                <option value="heritage">Heritage</option>
                <option value="food">Food</option>
                <option value="coastal">Coastal</option>
              </select>
            </label>
            <div className="field-pair">
              <label>
                Latitude
                <input value={destinationForm.latitude} onChange={(event) => setDestinationForm({ ...destinationForm, latitude: event.target.value })} required />
              </label>
              <label>
                Longitude
                <input value={destinationForm.longitude} onChange={(event) => setDestinationForm({ ...destinationForm, longitude: event.target.value })} required />
              </label>
            </div>
            <label>
              Description
              <textarea value={destinationForm.description} onChange={(event) => setDestinationForm({ ...destinationForm, description: event.target.value })} required />
            </label>
            <button className="primary-action" type="submit">
              <MapPinned size={18} />
              Save destination
            </button>
          </form>

          <DestinationManager destinations={data.destinations} onChange={(destinations) => onDataChange(refreshAllRecommendations({ ...data, destinations }))} />
        </div>
      </Page>
    );
  }

  if (view === "ai") {
    return (
      <Page
        title="AI Analysis"
        eyebrow="Administrator workspace"
        actions={
          <button className="secondary-action" onClick={recomputeAi}>
            <RotateCcw size={18} />
            Recompute
          </button>
        }
      >
        <MetricGrid
          items={[
            ["Clustered records", aiEvaluation.validClusteredRecordCount.toString()],
            ["Labelled records", aiEvaluation.labelledRecordCount.toString()],
            ["Decision accuracy", `${Math.round(aiEvaluation.classificationAccuracy * 100)}%`],
            ["Avg silhouette", aiEvaluation.averageSilhouetteScore.toString()],
          ]}
        />
        <div className="analysis-grid">
          {data.analyses.map((analysis) => {
            const user = data.users.find((candidate) => candidate.id === analysis.userId);
            return (
              <article className="analysis-card" key={`${analysis.tripId}-${analysis.generatedAt}`}>
                <div className="cluster-badge">Cluster {analysis.cluster + 1}</div>
                <h2>{user?.name ?? "Unknown tourist"}</h2>
                <p>{analysis.profile} tourist profile</p>
                <strong>Silhouette {analysis.silhouetteScore}</strong>
                <small>
                  {analysis.dataPointCount} points processed by {analysis.method} + {analysis.classifier}
                </small>
                <ul className="decision-path">
                  {analysis.decisionPath.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <CategoryBars values={analysis.categoryCounts} />
              </article>
            );
          })}
          {data.analyses.length === 0 && <EmptyState text="AI analysis appears after a tourist completes a trip with at least two movement points." />}
        </div>
        <ConfusionMatrix values={aiEvaluation.confusionMatrix} />
      </Page>
    );
  }

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
      <MovementPulseHero
        mode="admin"
        demand={destinationDemand}
        destinations={data.destinations}
        profile={`${tourists.length} tourist profiles`}
        pointCount={data.points.length}
        plan={travelPlan}
      />
      <MetricGrid
        items={[
          ["Tourists", tourists.length.toString()],
          ["Completed trips", completedTrips.length.toString()],
          ["Movement points", data.points.length.toString()],
          ["Destinations", data.destinations.length.toString()],
        ]}
      />
      <div className="two-column">
        <MapView points={allPoints} destinations={data.destinations} />
        <section className="panel">
          <h2>Destination Coverage</h2>
          <CategoryBars values={categories} />
          <h2>Movement Demand</h2>
          <MovementDemandList title="Top Tourist Flow" demand={destinationDemand.slice(0, 4)} destinations={data.destinations} compact />
          <h2>Travel Plan Signal</h2>
          <TravelPlanPanel plan={travelPlan} destinations={data.destinations} />
          <h2>Recent Recommendation Output</h2>
          <RecommendationList recommendations={data.recommendations.slice(0, 4)} destinations={data.destinations} compact />
        </section>
      </div>
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

function DestinationPanel({ destinations, selectedId, onSelect }: { destinations: Destination[]; selectedId?: string; onSelect?: (id: string) => void }) {
  return (
    <section className="list-panel">
      {destinations.map((destination) => (
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
          <small>{destination.category}</small>
        </button>
      ))}
    </section>
  );
}

function DestinationDetail({ destination }: { destination: Destination }) {
  return (
    <section className="panel detail-panel">
      <h2>{destination.name}</h2>
      <p>{destination.description}</p>
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
      </dl>
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
                {row.uniqueTouristCount} tourist profile(s), {row.movementPointCount} movement points
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

function TravelPlanPanel({ plan, destinations }: { plan: TravelPlan; destinations: Destination[] }) {
  return (
    <section className="travel-plan">
      <p>{plan.summary}</p>
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

function DestinationManager({ destinations, onChange }: { destinations: Destination[]; onChange: (destinations: Destination[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingDestination = destinations.find((destination) => destination.id === editingId) ?? null;
  const [form, setForm] = useState<Destination | null>(null);

  const startEdit = (destination: Destination) => {
    setEditingId(destination.id);
    setForm(destination);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(null);
  };

  const saveEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    onChange(destinations.map((destination) => (destination.id === form.id ? form : destination)));
    cancelEdit();
  };

  const removeDestination = (destinationId: string) => {
    if (destinations.length <= 1) {
      return;
    }

    onChange(destinations.filter((destination) => destination.id !== destinationId));
    if (editingId === destinationId) {
      cancelEdit();
    }
  };

  return (
    <section className="list-panel">
      {destinations.map((destination) => (
        <article className="destination-card editable" key={destination.id}>
          <div>
            <strong>{destination.name}</strong>
            <span>{destination.city}</span>
          </div>
          <p>{destination.description}</p>
          <small>{destination.category}</small>
          <div className="card-actions">
            <button className="secondary-action icon-action" onClick={() => startEdit(destination)} type="button" title="Edit destination">
              <Pencil size={16} />
            </button>
            <button className="secondary-action icon-action danger" onClick={() => removeDestination(destination.id)} type="button" title="Delete destination" disabled={destinations.length <= 1}>
              <Trash2 size={16} />
            </button>
          </div>
        </article>
      ))}
      {editingDestination && form && (
        <form className="panel destination-form edit-form" onSubmit={saveEdit}>
          <div className="form-heading">
            <h2>Edit Destination</h2>
            <button className="secondary-action icon-action" type="button" onClick={cancelEdit} title="Cancel edit">
              <X size={16} />
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
              <input type="number" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })} required />
            </label>
            <label>
              Longitude
              <input type="number" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })} required />
            </label>
          </div>
          <label>
            Average visit minutes
            <input type="number" min="1" value={form.averageVisitMinutes} onChange={(event) => setForm({ ...form, averageVisitMinutes: Number(event.target.value) })} required />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </label>
          <button className="primary-action" type="submit">
            <Save size={18} />
            Save changes
          </button>
        </form>
      )}
    </section>
  );
}

function RecommendationList({
  recommendations,
  destinations,
  compact = false,
}: {
  recommendations: { destinationId: string; score: number; reason: string; id: string }[];
  destinations: Destination[];
  compact?: boolean;
}) {
  if (recommendations.length === 0) {
    return <EmptyState text="Complete a trip with movement points to generate recommendations." />;
  }

  return (
    <section className={compact ? "recommendation-list compact" : "recommendation-list"}>
      {recommendations.map((recommendation) => {
        const destination = destinations.find((candidate) => candidate.id === recommendation.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="recommendation-card" key={recommendation.id}>
            <div>
              <strong>{destination.name}</strong>
              <span>{destination.city}</span>
            </div>
            <p>{recommendation.reason}</p>
            <meter value={recommendation.score} min={0} max={100} />
            <small>Score {recommendation.score}</small>
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
