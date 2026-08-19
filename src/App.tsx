import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Compass,
  Database,
  LogOut,
  MapPinned,
  Navigation,
  Play,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
} from "lucide-react";
import { MapView } from "./components/MapView";
import type { AppData, Destination, LocationConsent, MovementPoint, TripSession, User, UserRole } from "./types";
import { clearSession, createId, loadData, loadSession, saveData, saveSession } from "./services/storage";
import { formatDateTime, nearestDestination } from "./services/geo";
import { refreshAnalysis } from "./services/analytics";

type View = "overview" | "tracking" | "history" | "recommendations" | "dashboard" | "records" | "destinations" | "ai";

const demoRoute = [
  [3.142, 101.6894],
  [3.1457, 101.6954],
  [3.1478, 101.6937],
  [3.1556, 101.7139],
  [3.1579, 101.7116],
] as const;

function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadSession());
  const currentUser = data.users.find((user) => user.id === sessionUserId) ?? null;
  const [view, setView] = useState<View>(() => (currentUser?.role === "admin" ? "dashboard" : "overview"));
  const watchId = useRef<number | null>(null);

  const commitData = (nextData: AppData) => {
    setData(nextData);
    saveData(nextData);
  };

  const login = (email: string, password: string) => {
    const user = data.users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password);
    if (!user) {
      return "Invalid email or password.";
    }

    setSessionUserId(user.id);
    saveSession(user.id);
    setView(user.role === "admin" ? "dashboard" : "overview");
    return null;
  };

  const register = (name: string, email: string, password: string) => {
    if (data.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      return "An account with this email already exists.";
    }

    const user: User = {
      id: createId("user"),
      name,
      email,
      password,
      role: "tourist",
      createdAt: new Date().toISOString(),
    };
    const nextData = { ...data, users: [...data.users, user] };
    commitData(nextData);
    setSessionUserId(user.id);
    saveSession(user.id);
    setView("overview");
    return null;
  };

  const logout = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    clearSession();
    setSessionUserId(null);
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

function AuthScreen({ onLogin, onRegister }: { onLogin: (email: string, password: string) => string | null; onRegister: (name: string, email: string, password: string) => string | null }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [roleHint, setRoleHint] = useState<UserRole>("tourist");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("tourist@example.com");
  const [password, setPassword] = useState("tourist123");
  const [error, setError] = useState<string | null>(null);

  const setDemoRole = (role: UserRole) => {
    setRoleHint(role);
    if (role === "admin") {
      setEmail("admin@tourism.local");
      setPassword("admin123");
    } else {
      setEmail("tourist@example.com");
      setPassword("tourist123");
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = mode === "login" ? onLogin(email, password) : onRegister(name, email, password);
    setError(message);
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
            <div className="segmented-control role-switch" aria-label="Demo role">
              <button type="button" className={roleHint === "tourist" ? "active" : ""} onClick={() => setDemoRole("tourist")}>
                Tourist
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

          <button className="primary-action" type="submit">
            <ShieldCheck size={18} />
            {mode === "login" ? "Enter system" : "Create tourist account"}
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

            {trackingMessage && <p className="status-message">{trackingMessage}</p>}

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
          <MapView points={tripPoints} destinations={data.destinations} />
          <section className="list-panel">
            {userTrips.map((trip) => {
              const points = data.points.filter((point) => point.tripId === trip.id);
              return (
                <article className="record-card" key={trip.id}>
                  <div>
                    <strong>{formatDateTime(trip.startedAt)}</strong>
                    <span>{trip.status}</span>
                  </div>
                  <p>{points.length} movement points recorded</p>
                </article>
              );
            })}
          </section>
        </div>
      </Page>
    );
  }

  if (view === "recommendations") {
    return (
      <Page title="Recommendations" eyebrow="Tourist workspace">
        <RecommendationList recommendations={recommendations} destinations={data.destinations} />
      </Page>
    );
  }

  return (
    <Page title="Tourist Overview" eyebrow="Tourist workspace">
      <MetricGrid
        items={[
          ["Trips", userTrips.length.toString()],
          ["Movement points", tripPoints.length.toString()],
          ["Tourist profile", latestAnalysis?.profile ?? "Pending"],
          ["Recommendations", recommendations.length.toString()],
        ]}
      />
      <div className="two-column">
        <MapView points={tripPoints} destinations={data.destinations} />
        <DestinationPanel destinations={data.destinations.slice(0, 5)} />
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
  const [destinationForm, setDestinationForm] = useState({
    name: "",
    city: "",
    category: "cultural",
    latitude: "3.1478",
    longitude: "101.6937",
    description: "",
  });

  const allPoints = data.points;

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

  if (view === "records") {
    return (
      <Page title="Movement Records" eyebrow="Administrator workspace">
        <div className="two-column">
          <MapView points={allPoints} destinations={data.destinations} />
          <section className="list-panel">
            {data.points.map((point) => {
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
                    {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)} near {nearest.destination.name}
                  </p>
                </article>
              );
            })}
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

          <DestinationPanel destinations={data.destinations} />
        </div>
      </Page>
    );
  }

  if (view === "ai") {
    return (
      <Page title="AI Analysis" eyebrow="Administrator workspace">
        <div className="analysis-grid">
          {data.analyses.map((analysis) => {
            const user = data.users.find((candidate) => candidate.id === analysis.userId);
            return (
              <article className="analysis-card" key={`${analysis.tripId}-${analysis.generatedAt}`}>
                <div className="cluster-badge">Cluster {analysis.cluster + 1}</div>
                <h2>{user?.name ?? "Unknown tourist"}</h2>
                <p>{analysis.profile} tourist profile</p>
                <strong>Silhouette {analysis.silhouetteScore}</strong>
                <CategoryBars values={analysis.categoryCounts} />
              </article>
            );
          })}
          {data.analyses.length === 0 && <EmptyState text="AI analysis appears after a tourist completes a trip with at least two movement points." />}
        </div>
      </Page>
    );
  }

  return (
    <Page title="Administrator Dashboard" eyebrow="Administrator workspace">
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
          <h2>Recent Recommendation Output</h2>
          <RecommendationList recommendations={data.recommendations.slice(0, 4)} destinations={data.destinations} compact />
        </section>
      </div>
    </Page>
  );
}

function Page({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="page">
      <header className="page-header">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </header>
      {children}
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

function DestinationPanel({ destinations }: { destinations: Destination[] }) {
  return (
    <section className="list-panel">
      {destinations.map((destination) => (
        <article className="destination-card" key={destination.id}>
          <div>
            <strong>{destination.name}</strong>
            <span>{destination.city}</span>
          </div>
          <p>{destination.description}</p>
          <small>{destination.category}</small>
        </article>
      ))}
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

function EmptyState({ text }: { text: string }) {
  return (
    <section className="empty-state">
      <Sparkles size={22} />
      <p>{text}</p>
    </section>
  );
}

export default App;
