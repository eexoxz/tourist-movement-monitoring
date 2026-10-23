import { useEffect, useMemo, useRef, useState } from "react";
import { useCalendarDay } from "../services/useCalendarDay";
import { ArrowRight, ChartNoAxesCombined, ChevronDown, Download, FlaskConical, LayoutDashboard, MapPin, RotateCcw, Route, ShieldCheck, Siren, SlidersHorizontal, Users } from "lucide-react";
import { interfaceText } from "../services/interfaceCopy";
import type { AppData, AppView, Destination, SafetyStatus, SosClosureReason, User } from "../types";
import { loadData, loadPlaceReviewRecords } from "../services/storage";
import { formatDateTime } from "../services/geo";
import { buildMovementAlertsCsv, buildTravelPlanCsv, calculateDestinationDemand, calculateMovementAlerts, createMovementBasedTravelPlan, evaluateAiOutput, refreshAllRecommendations } from "../services/analytics";
import { translateAdmin, type AdminCopyKey } from "../services/adminI18n";
import { demoDatasetMetadata, getPreparedDemoTouristCount } from "../data/demoData";
import { demoDatasetText } from "../services/demoDatasetCopy";
import { rememberDemoDatasetSelection } from "../services/demoDatasetSelection";
import { replaceDemoDataset } from "../services/demoDataset";
import { demoControlsText } from "../services/demoDatasetControlsCopy";
import { DemoDatasetManager } from "../components/DemoDatasetManager";
import { malaysiaFestivalEvents } from "../data/festivals";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { getUpcomingFestivals } from "../services/festivals";
import { buildMovementRecordsCsv, getDailyMovementTrend, getMovementDashboardViews, getMovementDataStatus, getProfileDistribution, getTourists, getTripFilterOptions, summarizeDashboard, type MovementDashboardViews } from "../services/dashboard";
import { calculateGeofenceActivity } from "../services/geofencing";
import { getOpenSafetyCount, updateIncidentStatus, updateSosStatus } from "../services/safety";
import { sosText } from "../services/sosCopy";
import { SosRequestActions } from "../components/SosRequestActions";
import { getTouristManagementRows } from "../services/touristManagement";
import { TouristDirectory } from "../components/TouristDirectory";
import { RecordPagination } from "../components/RecordPagination";
import { PlaceGuideDialog } from "../components/PlaceGuideDialog";
import { directoryPage } from "../services/touristDirectory";
import { directoryText } from "../services/touristDirectoryCopy";
import { discoveryText } from "../services/discoveryCopy";
import { ActivitySummaryPublisher } from "../components/ActivitySummaryPublisher";
import { activityText } from "../services/activityCopy";
import { buildDestinationActivitySummaries } from "../services/activitySummary";
import { MovementAlertList, MovementDemandList, TravelPlanPanel } from "../components/AdminPlanningPanels";
import { CategoryBars, ConfusionMatrix, KMeansFeatureBars } from "../components/AdminAnalyticsWidgets";
import { EmptyState, MetricGrid } from "../components/SummaryCards";
import { ListLimitFooter } from "../components/ListLimitFooter";
import { type NotifyFn } from "../components/ToastViewport";
import { DestinationManager } from "../components/DestinationManager";
import { reviewUnlistedCheckIns, mergePlaceReviewRecords, sampleUnlistedCheckIns, groupUnlistedCheckIns } from "../services/unlistedPlaces";
import { unlistedLocationText } from "../services/unlistedLocationCopy";
import { placeText } from "../services/placeSubmissionCopy";
import { uiText } from "../services/uiText";
import { clusterText, decisionStepText, profileLabel } from "../services/planningText";
import { FestivalCalendarPanel } from "../components/FestivalCalendarPanel";
import { MovementMap } from "../components/MovementMap";
import { MovementPulseHero } from "../components/MovementPulseHero";
import { Page } from "../components/Page";
import { RecommendationList } from "../components/RecommendationList";
import { type PlanAudience, type PlanTier, type AdminDashboardTab, type CommitDataOptions, DEMO_DATASET_LOCAL_ONLY_STATUS, adminSafetyPreviewLimit, analysisKey, getIncidentTypeLabel } from "../services/workspaceSupport";

const emptyMovementViews: MovementDashboardViews = { records: [], tripRecords: [] };

export function AdminWorkspace({
  data,
  actor,
  view,
  locale,
  onDataChange,
  onViewChange,
  placeQueueState,
  onRetryPlaceQueue,
  notify,
}: {
  data: AppData;
  actor: User;
  view: AppView;
  locale: Locale;
  onDataChange: (data: AppData, actor?: User | null, options?: CommitDataOptions) => void | Promise<boolean>;
  onViewChange?: (view: AppView) => void;
  placeQueueState?: "loading" | "live" | "offline";
  onRetryPlaceQueue?: () => void;
  notify: NotifyFn;
}) {
  const t = (key: TranslationKey) => translate(locale, key);
  const adminText = (key: AdminCopyKey, values?: Record<string, string | number>) => translateAdmin(locale, key, values);
  const tourists = useMemo(() => getTourists(data), [data.users]);
  const pendingPlaceCount = useMemo(() => groupUnlistedCheckIns(data.checkIns.filter((record) => !record.isDemo)).length, [data.checkIns]);
  const summary = useMemo(() => summarizeDashboard(data), [data.users, data.consents, data.trips, data.points, data.destinations]);
  const profileDistribution = useMemo(() => getProfileDistribution(data), [data.analyses]);
  const calendarDay = useCalendarDay();
  const movementTrend = useMemo(() => getDailyMovementTrend(data), [data.points, calendarDay]);
  const movementDataStatus = useMemo(() => getMovementDataStatus(data), [data.points]);
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
  const [safetyAdminNotes, setSafetyAdminNotes] = useState<Record<string, string>>({});
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(25);
  const [showAllSafetyCases, setShowAllSafetyCases] = useState(false);
  const [analysisPage, setAnalysisPage] = useState(1);
  const [analysisPageSize, setAnalysisPageSize] = useState(25);
  const movementScroller = useRef<HTMLDivElement>(null);
  const analysisScroller = useRef<HTMLDivElement>(null);
  const [demoDatasetAction, setDemoDatasetAction] = useState<"loading" | "removing" | null>(null);
  const [showDemoDataset, setShowDemoDataset] = useState(false);
  const demoDatasetTask = useRef<number | null>(null);
  const latestDataset = useRef(data);
  latestDataset.current = data;
  useEffect(() => () => { if (demoDatasetTask.current !== null) window.clearTimeout(demoDatasetTask.current); }, []);
  const [refreshingReports, setRefreshingReports] = useState(false);

  const recordsActive = view === "dashboard" && adminTab === "records";
  const tripOptions = useMemo(() => getTripFilterOptions(data, selectedTouristId), [data.trips, selectedTouristId]);
  const movementViews = useMemo(
    () =>
      recordsActive ? getMovementDashboardViews(data, {
        touristId: selectedTouristId,
        tripId: selectedTripId,
        fromDate,
        toDate,
      }) : emptyMovementViews,
    [data.trips, data.points, data.destinations, data.users, data.analyses, recordsActive, selectedTouristId, selectedTripId, fromDate, toDate]
  );
  const movementRecords = movementViews.records;
  const movementTripRecords = movementViews.tripRecords;
  const filteredPoints = useMemo(() => movementRecords.map((record) => record.point), [movementRecords]);
  const allDashboardPoints = data.points;
  const aiEvaluation = useMemo(() => evaluateAiOutput(data), [data.trips, data.points, data.destinations, data.users]);
  const destinationDemand = useMemo(() => calculateDestinationDemand(data), [data.trips, data.points, data.destinations]);
  const movementAlerts = useMemo(() => calculateMovementAlerts(data, destinationDemand), [data.destinations, destinationDemand]);
  const upcomingFestivals = useMemo(() => getUpcomingFestivals(malaysiaFestivalEvents, new Date(`${calendarDay}T00:00:00`)), [calendarDay]);
  const geofenceActivity = useMemo(() => calculateGeofenceActivity(data), [data.geofences, data.points]);
  const activeGeofenceCount = geofenceActivity.filter((row) => row.pointCount > 0).length;
  const demoTouristCount = getPreparedDemoTouristCount(data);
  const touristManagementRows = useMemo(() => getTouristManagementRows(data), [data]);
  const travelPlan = useMemo(
    () =>
      createMovementBasedTravelPlan(data, {
        audience: planAudience,
        city: planCity,
        maxStops: planMaxStops,
        minimumTier: planMinimumTier,
        diversifyCategories: planDiversifyCategories,
      }, destinationDemand),
    [data.destinations, destinationDemand, planAudience, planCity, planMaxStops, planMinimumTier, planDiversifyCategories]
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
  const userById = useMemo(() => new Map(data.users.map((candidate) => [candidate.id, candidate])), [data.users]);
  const tripById = useMemo(() => new Map(data.trips.map((candidate) => [candidate.id, candidate])), [data.trips]);
  const destinationById = useMemo(() => new Map(data.destinations.map((candidate) => [candidate.id, candidate])), [data.destinations]);
  const recommendationsByUser = useMemo(() => {
    const grouped = new Map<string, typeof data.recommendations>();

    data.recommendations.forEach((recommendation) => {
      const rows = grouped.get(recommendation.userId) ?? [];
      rows.push(recommendation);
      grouped.set(recommendation.userId, rows);
    });

    return grouped;
  }, [data.recommendations]);
  const selectedAnalysis = analysisRows.find((analysis) => analysisKey(analysis) === selectedAnalysisKey) ?? null;
  const selectedAnalysisUser = selectedAnalysis ? userById.get(selectedAnalysis.userId) ?? null : null;
  const selectedAnalysisTrip = selectedAnalysis ? tripById.get(selectedAnalysis.tripId) ?? null : null;
  const selectedAnalysisRecommendations = selectedAnalysis ? (recommendationsByUser.get(selectedAnalysis.userId) ?? []).slice(0, 3) : [];
  const safetyRecords = useMemo(
    () =>
      [
        ...data.sosAlerts.map((alert) => ({
          id: alert.id,
          kind: "sos" as const,
          userId: alert.userId,
          status: alert.status,
          title: uiText(locale, "SOS assistance request"),
          detail: uiText(locale, alert.message),
          locationNote: uiText(locale, alert.latitude !== undefined && alert.longitude !== undefined ? "Approximate location was saved from the latest trip point." : "No recent location point was available."),
          adminNote: alert.adminNote,
          closureReason: alert.closureReason,
          photoDataUrl: undefined,
          photoName: undefined,
          photoCapturedAt: undefined,
          createdAt: alert.createdAt,
          updatedAt: alert.updatedAt,
        })),
        ...data.incidentReports.map((report) => ({
          id: report.id,
          kind: "incident" as const,
          userId: report.userId,
          status: report.status,
          title: getIncidentTypeLabel(report.type, (key) => translate(locale, key)),
          detail: report.description,
          locationNote: report.locationNote || uiText(locale, report.latitude !== undefined && report.longitude !== undefined ? "Approximate location was saved from the latest trip point." : "No location note was provided."),
          adminNote: report.adminNote,
          closureReason: undefined,
          photoDataUrl: report.photoDataUrl,
          photoName: report.photoName,
          photoCapturedAt: report.photoCapturedAt,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        })),
      ].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data.incidentReports, data.sosAlerts, locale]
  );
  const openSosCount = data.sosAlerts.filter((alert) => alert.status !== "resolved").length;
  const openIncidentCount = data.incidentReports.filter((report) => report.status !== "resolved").length;
  const openSafetyRecordCount = getOpenSafetyCount(data);
  const resolvedSafetyRecordCount = safetyRecords.filter((record) => record.status === "resolved").length;
  const movementPageResult = directoryPage(movementTripRecords, movementPage, movementPageSize);
  const visibleSafetyRecords = showAllSafetyCases ? safetyRecords : safetyRecords.slice(0, adminSafetyPreviewLimit);
  const hiddenSafetyRecordCount = safetyRecords.length - visibleSafetyRecords.length;
  const analysisPageResult = directoryPage(analysisRows, analysisPage, analysisPageSize);
  const selectedKValue = aiEvaluation.validClusteredRecordCount > 0 ? Math.min(3, aiEvaluation.validClusteredRecordCount) : 0;
  const clusterSummaries = useMemo(() => {
    const clusters = new Map<number, { cluster: number; label: string; profileCounts: Record<string, number>; silhouetteTotal: number; size: number }>();

    analysisRows.forEach((analysis) => {
      const cluster = clusters.get(analysis.cluster) ?? {
        cluster: analysis.cluster,
        label: analysis.clusterLabel ?? "Unlabelled cluster",
        profileCounts: {},
        silhouetteTotal: 0,
        size: 0,
      };

      cluster.size += 1;
      cluster.silhouetteTotal += analysis.silhouetteScore;
      cluster.profileCounts[analysis.profile] = (cluster.profileCounts[analysis.profile] ?? 0) + 1;
      clusters.set(analysis.cluster, cluster);
    });

    return [...clusters.values()]
      .sort((a, b) => a.cluster - b.cluster)
      .map((cluster) => ({
        cluster: cluster.cluster,
        size: cluster.size,
        label: cluster.label,
        dominantProfile: Object.entries(cluster.profileCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed",
        averageSilhouette: cluster.size ? Number((cluster.silhouetteTotal / cluster.size).toFixed(2)) : 0,
      }));
  }, [analysisRows]);
  const selectedClusterSize = selectedAnalysis ? clusterSummaries.find((summary) => summary.cluster === selectedAnalysis.cluster)?.size ?? 0 : 0;

  useEffect(() => {
    if (selectedTripId !== "all" && !tripOptions.some((trip) => trip.id === selectedTripId)) {
      setSelectedTripId("all");
    }
  }, [selectedTripId, tripOptions]);

  useEffect(() => {
    setMovementPage(1);
  }, [fromDate, selectedTouristId, selectedTripId, toDate]);


  useEffect(() => {
    if (recordsActive && movementPage !== movementPageResult.page) setMovementPage(movementPageResult.page);
  }, [recordsActive, movementPage, movementPageResult.page]);

  useEffect(() => {
    if (analysisPage !== analysisPageResult.page) setAnalysisPage(analysisPageResult.page);
  }, [analysisPage, analysisPageResult.page]);

  useEffect(() => {
    if (recordsActive && selectedRecordTripId && !movementTripRecords.some((record) => record.trip.id === selectedRecordTripId)) {
      setSelectedRecordTripId(null);
    }
  }, [recordsActive, movementTripRecords, selectedRecordTripId]);

  useEffect(() => {
    if (selectedAnalysisKey && !analysisRows.some((analysis) => analysisKey(analysis) === selectedAnalysisKey)) {
      setSelectedAnalysisKey(null);
    }
  }, [analysisRows, selectedAnalysisKey]);


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

  const changeDemoDataset = (ids: ReadonlySet<string>) => {
    if (demoDatasetTask.current !== null || demoDatasetAction) return;
    const loading = ids.size > 0;
    setDemoDatasetAction(loading ? "loading" : "removing");
    // Let the busy state paint, then use the latest live snapshot rather than a captured dataset.
    demoDatasetTask.current = window.setTimeout(() => {
      try {
        const next = refreshAllRecommendations(replaceDemoDataset(latestDataset.current, ids));
        rememberDemoDatasetSelection(next);
        onDataChange(next, null, { localOnlyStatus: DEMO_DATASET_LOCAL_ONLY_STATUS });
        notify({ tone: loading ? "success" : "info", title: t(loading ? "admin.demo.loadedTitle" : "admin.demo.removedTitle"), message: loading ? demoControlsText(locale, "loaded", { count: getPreparedDemoTouristCount(next) }) : t("admin.demo.removedMessage") });
      } catch {
        notify({ tone: "warning", title: demoControlsText(locale, "manage"), message: demoControlsText(locale, "failed") });
      } finally {
        demoDatasetTask.current = null;
        setDemoDatasetAction(null);
      }
    }, 0);
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

  const updateSafetyCase = (kind: "sos" | "incident", recordId: string, status: SafetyStatus, adminNote?: string, closureReason?: SosClosureReason) => {
    const current = loadData();
    const nextData = kind === "sos" ? updateSosStatus(current, recordId, status, adminNote, closureReason, actor.id) : updateIncidentStatus(current, recordId, status, adminNote);
    onDataChange(nextData, actor, kind === "sos" ? { sosAlert: nextData.sosAlerts.find((alert) => alert.id === recordId) } : undefined);
    notify({
      tone: "success",
      title: kind === "sos" && status === "resolved" ? sosText(locale, "saved") : "Safety case updated",
      message: kind === "sos" && status === "resolved" ? sosText(locale, "savedDetail") : adminNote?.trim() ? "The case status and admin response were saved." : status === "resolved" ? "The case is marked as resolved." : "The case status was saved.",
    });
  };

  const touristManagementPanel = <TouristDirectory rows={touristManagementRows} locale={locale} onViewMovement={(userId) => {
    setSelectedTouristId(userId);
    setSelectedTripId("all");
    setAdminTab("records");
  }} onViewSafety={() => setAdminTab("safety")} />;

  const movementRecordsPanel = (
    <div className="admin-tab-panel">
      <div className="filter-toolbar admin-filter-toolbar">
        <label><span>{t("admin.tabs.tourists")}</span>
        <select
          aria-label={adminText("records.allTourists")}
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
        </select></label>
        <label><span>{adminText("records.allTrips")}</span><select className="toolbar-select" aria-label={adminText("records.allTrips")} value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>
          <option value="all">{adminText("records.allTrips")}</option>
          {tripOptions.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {formatDateTime(trip.startedAt, locale)} - {t(trip.status === "active" ? "tourist.trips.activeTrip" : "tourist.trips.completedTrip")}
            </option>
          ))}
        </select></label>
        <label><span>{t("tourist.events.fromDate")}</span><input className="toolbar-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label><span>{t("tourist.events.toDate")}</span><input className="toolbar-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
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
      <div className="admin-records-layout">
        <section className="admin-record-list">
          <div className="directory-heading"><h2>{t("admin.tabs.records")}</h2><span>{directoryText(locale, "range", { from: movementPageResult.from, to: movementPageResult.to, total: movementPageResult.total })}</span></div>
          <div className="directory-table-scroll" ref={movementScroller} tabIndex={0} aria-label={t("admin.tabs.records")}>
            <table className="directory-table record-table movement-record-table">
              <caption className="sr-only">{t("admin.tabs.records")}</caption>
              <thead><tr><th scope="col">{t("auth.name")}</th><th scope="col" className="record-wide-column">{adminText("records.destinationsVisited")}</th><th scope="col" className="directory-numeric">{adminText("records.duration")}</th><th scope="col" className="directory-numeric">{adminText("common.points")}</th></tr></thead>
              <tbody>{movementPageResult.rows.map((record) => <tr key={record.trip.id} className={selectedRecord?.trip.id === record.trip.id ? "record-selected" : undefined}>
                <th scope="row"><button className="directory-person" type="button" aria-pressed={selectedRecord?.trip.id === record.trip.id} onClick={() => setSelectedRecordTripId(record.trip.id)}><strong>{record.tourist?.name ?? adminText("common.unknownTourist")}</strong><time dateTime={record.trip.startedAt}>{formatDateTime(record.trip.startedAt, locale)}</time><small>{t(record.trip.status === "active" ? "tourist.trips.activeTrip" : "tourist.trips.completedTrip")}</small></button></th>
                <td className="record-wide-column">{record.destinationNames.join(", ") || adminText("records.noRecognised")}</td>
                <td className="directory-numeric">{new Intl.NumberFormat(locale).format(record.summary.durationMinutes)} <small>{adminText("common.minutes")}</small></td>
                <td className="directory-numeric">{new Intl.NumberFormat(locale).format(record.summary.pointCount)}</td>
              </tr>)}</tbody>
            </table>
            {!movementTripRecords.length && <EmptyState text={adminText("records.empty")} />}
          </div>
          <RecordPagination page={movementPageResult.page} pages={movementPageResult.pages} pageSize={movementPageSize} locale={locale} scrollTarget={movementScroller} onPageChange={setMovementPage} onPageSizeChange={(size) => { setMovementPageSize(size); setMovementPage(1); }} />
        </section>
        <div className="admin-movement-detail">
          <MovementMap points={selectedRecord?.points.length ? selectedRecord.points : filteredPoints} destinations={data.destinations} displayMode={selectedRecord?.points.length ? "route" : "signals"} locale={locale} />
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
                  <dd>{formatDateTime(selectedRecord.trip.startedAt, locale)}</dd>
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
                  <dd>{selectedRecord.analysis ? `${profileLabel(locale, selectedRecord.analysis.profile)} ${t("common.tourist")}` : adminText("common.pending")}</dd>
                </div>
                <div>
                  <dt>{adminText("records.analysisStatus")}</dt>
                  <dd>{selectedRecord.analysis ? `${selectedRecord.analysis.classifier} generated ${formatDateTime(selectedRecord.analysis.generatedAt, locale)}` : adminText("common.pending")}</dd>
                </div>
              </dl>
              <p>{adminText("records.readOnly")}</p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );

  if (view === "destinations") {
    return (
      <Page title={uiText(locale, "Destination Management")} eyebrow={t("admin.dashboard.eyebrow")}>
        <ActivitySummaryPublisher destinations={data.destinations} locale={locale} onPublish={(source) => {
          const destinations = buildDestinationActivitySummaries(data, Date.now(), source);
          onDataChange({ ...data, destinations });
          notify({ tone: "info", title: activityText(locale, "title"), message: activityText(locale, destinations.some((destination) => ((source === "browser" ? destination.activitySummary : destination.demoActivitySummary)?.popularityScore ?? 0) > 0) ? "saved" : "noEvidence") });
        }} />
        <DestinationManager destinations={data.destinations} checkIns={data.checkIns} onChange={(destinations) => onDataChange(refreshAllRecommendations({ ...data, destinations }))} notify={notify} locale={locale}
          placeQueueState={placeQueueState}
          onToggleSamples={() => {
            const current = loadData();
            const existing = current.checkIns.filter((record) => !record.isDemo);
            const checkIns = current.checkIns.some((record) => record.isDemo) ? existing : [...existing, ...sampleUnlistedCheckIns()];
            onDataChange({ ...current, checkIns }, actor, { localOnlyStatus: DEMO_DATASET_LOCAL_ONLY_STATUS });
          }}
          refreshingReports={refreshingReports}
          onRefreshReports={placeQueueState ? async () => {
            if (refreshingReports) return;
            if (placeQueueState === "offline") onRetryPlaceQueue?.();
            setRefreshingReports(true);
            try {
              const reports = await loadPlaceReviewRecords(actor);
              if (!reports) throw new Error("Review queue unavailable");
              const current = loadData();
              onDataChange({ ...current, checkIns: mergePlaceReviewRecords(current.checkIns, reports) }, actor, { localOnlyStatus: "Loaded from Firebase Firestore" });
            } catch { notify({ tone: "warning", title: placeText(locale, "queue"), message: unlistedLocationText(locale, "queueOffline") }); }
            finally { setRefreshingReports(false); }
          } : undefined}
          onReview={async (ids, destinationId) => {
            const result = reviewUnlistedCheckIns(data, actor, ids, destinationId);
            if (result.error || !result.data) { notify({ tone: "error", title: placeText(locale, "queue"), message: placeText(locale, result.error ?? "missing") }); return; }
            const synced = await onDataChange(result.data, actor, { placeReview: result.review });
            if (synced !== false) notify({ tone: "success", title: placeText(locale, "reviewed") });
          }}
          onCreateReviewedPlace={async (destination: Destination, ids) => {
            const result = reviewUnlistedCheckIns(data, actor, ids, destination.id, destination);
            if (result.error || !result.data) return placeText(locale, result.error ?? "missing");
            const synced = await onDataChange(result.data, actor, { placeReview: result.review });
            return synced === false ? placeText(locale, "saveFailed") : null;
          }} />
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
      <section className="safety-admin-list">
        {visibleSafetyRecords.map((record) => {
          const tourist = userById.get(record.userId);
          const caseKey = `${record.kind}:${record.id}`;
          const noteDraft = safetyAdminNotes[caseKey] ?? record.adminNote ?? "";
          const contactLine = tourist?.emergencyContactPhone
            ? `${tourist.emergencyContactName || adminText("tourists.emergencyContact")} · ${tourist.emergencyContactPhone}${tourist.emergencyContactRelation ? ` · ${tourist.emergencyContactRelation}` : ""}`
            : adminText("common.notProvided");

          return (
            <article className={record.kind === "sos" && record.status !== "resolved" ? "safety-admin-card urgent" : "safety-admin-card"} key={`${record.kind}-${record.id}`}>
              <div className="safety-admin-heading">
                <div>
                  <span>{record.kind === "sos" ? adminText("safety.sos") : adminText("safety.incident")}</span>
                  <h3>{record.title}</h3>
                  <p>{record.detail}</p>
                </div>
                <select className="safety-status-select" value={record.status} disabled={record.kind === "sos" && record.status === "resolved"} onChange={(event) => updateSafetyCase(record.kind, record.id, event.target.value as SafetyStatus, noteDraft)} aria-label={adminText("safety.status")}>
                  <option value="open">{adminText("safety.open")}</option>
                  <option value="reviewing">{adminText("safety.reviewing")}</option>
                  {(record.kind !== "sos" || record.status === "resolved") && <option value="resolved">{adminText("safety.resolved")}</option>}
                </select>
              </div>
              {record.kind === "sos" && (record.status === "resolved"
                ? <p className="safety-disclaimer">{sosText(locale, record.closureReason === "cancelled" ? "cancelled" : "resolved")}</p>
                : <SosRequestActions locale={locale} onClose={(reason) => updateSafetyCase("sos", record.id, "resolved", noteDraft, reason)} />)}
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
                  <dd>{formatDateTime(record.createdAt, locale)}</dd>
                </div>
              </dl>
              {record.photoDataUrl && (
                <figure className="safety-photo-evidence">
                  <img src={record.photoDataUrl} alt={record.photoName ? `Incident evidence: ${record.photoName}` : "Incident evidence"} />
                  <figcaption>{record.photoName ?? uiText(locale, "Incident photo")}{record.photoCapturedAt ? ` · ${formatDateTime(record.photoCapturedAt, locale)}` : ""}</figcaption>
                </figure>
              )}
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
        <ListLimitFooter hiddenCount={hiddenSafetyRecordCount} isExpanded={showAllSafetyCases} itemLabel="safety case" pluralLabel="safety cases" onToggle={() => setShowAllSafetyCases((value) => !value)} locale={locale} />
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
        <section className="ai-cluster-panel">
          <div>
          <div className="section-heading">
            <h2>{adminText("ai.clusterSummary")}</h2>
            <span>K = {selectedKValue}</span>
          </div>
          <div className="cluster-summary-grid">
            {clusterSummaries.map((summary) => (
              <article key={summary.cluster}>
                <strong>{adminText("ai.cluster")} {summary.cluster + 1}</strong>
                <span>{adminText("ai.tripCount", { count: summary.size })}</span>
                <p>{clusterText(locale, summary.label)}</p>
                <small>
                  {adminText("ai.dominantCategory")}: {profileLabel(locale, summary.dominantProfile)} | {adminText("ai.avgSilhouette")} {summary.averageSilhouette}
                </small>
              </article>
            ))}
            {clusterSummaries.length === 0 && <EmptyState text={adminText("ai.noClusters")} />}
          </div>
          </div>
          <div className="ai-category-summary"><h2>{adminText("ai.categoryDistribution")}</h2><CategoryBars values={profileDistribution} locale={locale} /></div>
        </section>

        <section className="ai-analysis-list">
          <div className="directory-heading"><h2>{adminText("ai.title")}</h2><span>{directoryText(locale, "range", { from: analysisPageResult.from, to: analysisPageResult.to, total: analysisPageResult.total })}</span></div>
          <div className="directory-table-scroll" ref={analysisScroller} tabIndex={0} aria-label={adminText("ai.title")}>
            <table className="directory-table record-table analysis-record-table">
              <caption className="sr-only">{adminText("ai.title")}</caption>
              <thead><tr><th scope="col">{t("auth.name")}</th><th scope="col">{adminText("ai.cluster")}</th><th scope="col" className="record-wide-column">{adminText("records.touristCategory")}</th><th scope="col" className="directory-numeric record-wide-column">{adminText("common.points")}</th><th scope="col" className="directory-numeric">{adminText("ai.confidence")}</th></tr></thead>
              <tbody>{analysisPageResult.rows.map((analysis) => {
                const tripDate = tripById.get(analysis.tripId)?.startedAt ?? analysis.generatedAt;
                return <tr key={analysisKey(analysis)}><th scope="row"><button className="directory-person" aria-haspopup="dialog" type="button" onClick={() => setSelectedAnalysisKey(analysisKey(analysis))}><strong>{userById.get(analysis.userId)?.name ?? adminText("common.unknownTourist")}</strong><time dateTime={tripDate}>{formatDateTime(tripDate, locale)}</time></button></th><td>{new Intl.NumberFormat(locale).format(analysis.cluster + 1)}</td><td className="record-wide-column">{profileLabel(locale, analysis.profile)}</td><td className="directory-numeric record-wide-column">{new Intl.NumberFormat(locale).format(analysis.dataPointCount)}</td><td className="directory-numeric">{new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(analysis.classificationConfidence)}</td></tr>;
              })}</tbody>
            </table>
            {!analysisRows.length && <EmptyState text={adminText("ai.empty")} />}
          </div>
          <RecordPagination page={analysisPageResult.page} pages={analysisPageResult.pages} pageSize={analysisPageSize} locale={locale} scrollTarget={analysisScroller} onPageChange={setAnalysisPage} onPageSizeChange={(size) => { setAnalysisPageSize(size); setAnalysisPage(1); }} />
        </section>

        {selectedAnalysis && (
          <PlaceGuideDialog title={adminText("ai.selectedResult")} locale={locale} closeLabel={discoveryText(locale, "dismiss")} onClose={() => setSelectedAnalysisKey(null)}>
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
                <dd>{selectedAnalysisTrip ? formatDateTime(selectedAnalysisTrip.startedAt, locale) : adminText("common.unknown")}</dd>
              </div>
              <div>
                <dt>{adminText("ai.kMeansResult")}</dt>
                <dd>
                  {adminText("ai.cluster")} {selectedAnalysis.cluster + 1}{" "}{uiText(locale, "of K=")}{selectedKValue} ({adminText("ai.tripCount", { count: selectedClusterSize })})
                </dd>
              </div>
              <div>
                <dt>{adminText("ai.dominantPattern")}</dt>
                <dd>{clusterText(locale, selectedAnalysis.clusterLabel)}</dd>
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
                  {profileLabel(locale, selectedAnalysis.profile)} {t("common.tourist")}, {Math.round(selectedAnalysis.classificationConfidence * 100)}% {adminText("ai.confidence")}
                </dd>
              </div>
              <div>
                <dt>{adminText("ai.generated")}</dt>
                <dd>{formatDateTime(selectedAnalysis.generatedAt, locale)}</dd>
              </div>
            </dl>
            <div className="tree-metrics">
              <span>{uiText(locale, "Silhouette")}{" "}{selectedAnalysis.silhouetteScore}</span>
              <span>{uiText(locale, "Depth")}{" "}{selectedAnalysis.decisionTreeDepth}</span>
              <span>{selectedAnalysis.decisionRuleCount}{" "}{uiText(locale, "rules")}</span>
            </div>
            <section className="ai-detail-section">
              <h3>{adminText("ai.decisionPath")}</h3>
              <ul className="decision-path">
                {selectedAnalysis.decisionPath.map((step) => (
                  <li key={step}>{decisionStepText(locale, step)}</li>
                ))}
              </ul>
            </section>
            <section className="ai-detail-section">
              <h3>{adminText("ai.inputPattern")}</h3>
              <KMeansFeatureBars features={selectedAnalysis.kMeansInput} locale={locale} />
            </section>
            <section className="ai-detail-section">
              <h3>{adminText("ai.clusterCentroid")}</h3>
              <KMeansFeatureBars features={selectedAnalysis.kMeansCentroid} locale={locale} />
            </section>
            <section className="ai-detail-section">
              <h3>{adminText("ai.recommendationResult")}</h3>
              {selectedAnalysisRecommendations.length > 0 ? (
                <div className="ai-recommendation-result">
                  {selectedAnalysisRecommendations.map((recommendation) => {
                    const destination = destinationById.get(recommendation.destinationId);

                    return destination ? (
                      <span key={recommendation.id}>
                        {destination.name}
                        <small>
                          {destination.city}{" "}{uiText(locale, "| score")}{" "}{recommendation.score}
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
          </PlaceGuideDialog>
        )}
      </div>
      {aiEvaluation.labelledRecordCount > 0 && <ConfusionMatrix values={aiEvaluation.confusionMatrix} locale={locale} />}
    </div>
  );

  return (
    <Page
      title={t("admin.dashboard.title")}
      eyebrow={t("admin.dashboard.eyebrow")}
      actions={
        <details className="admin-data-tools" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}><summary><SlidersHorizontal size={18} />{interfaceText(locale, "tools")}<ChevronDown size={16} /></summary><div className="page-action-row">
          <button className="secondary-action" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setShowDemoDataset(true); }} disabled={Boolean(demoDatasetAction)}>
            <FlaskConical size={18} />
            {demoControlsText(locale, "manage")}
          </button>
          <button className="secondary-action" onClick={recomputeAi} disabled={Boolean(demoDatasetAction)}>
            <RotateCcw size={18} />
            {t("admin.dashboard.refreshAi")}
          </button>
          <small className="demo-sync-note" aria-live="polite">
            {t("admin.demo.localOnlyNote")}
          </small>
        </div></details>
      }
    >
      {showDemoDataset && <DemoDatasetManager data={data} locale={locale} action={demoDatasetAction} onApply={changeDemoDataset} onRemove={() => changeDemoDataset(new Set())} onClose={() => { if (!demoDatasetAction) setShowDemoDataset(false); }} />}
      {demoTouristCount > 0 && <p className="admin-dataset-note">{demoDatasetText(locale, "progress", { count: demoTouristCount, max: demoDatasetMetadata.generatedTouristCount })} · {t("admin.demo.localOnlyNote")} {demoDatasetText(locale, "dataNote")}</p>}
      {adminTab !== "tourists" && <section className="admin-priorities" aria-label={interfaceText(locale, "attention")}><h2>{interfaceText(locale, "attention")}</h2><div>
        <button type="button" className={openSafetyRecordCount ? "needs-action safety" : "safety"} onClick={() => setAdminTab("safety")}><Siren size={22} /><span>{adminText("overview.safetyCases")}</span><strong>{openSafetyRecordCount}</strong><ArrowRight size={17} /></button>
        {onViewChange && <button type="button" className={pendingPlaceCount ? "needs-action reviews" : "reviews"} onClick={() => onViewChange("destinations")}><MapPin size={22} /><span>{placeText(locale, "queue")}</span><strong>{pendingPlaceCount}</strong><ArrowRight size={17} /></button>}
        <button type="button" onClick={() => { setAdminTab("overview"); window.requestAnimationFrame(() => { const panel = document.getElementById("admin-movement-alerts") as HTMLDetailsElement | null; if (panel) { panel.open = true; panel.querySelector("summary")?.focus({ preventScroll: true }); panel.scrollIntoView({ block: "start", behavior: "instant" }); } }); }}><Route size={22} /><span>{adminText("overview.movementAlerts")}</span><strong>{movementAlerts.length}</strong><ArrowRight size={17} /></button>
      </div></section>}
      {placeQueueState === "offline" && <p role="alert">{unlistedLocationText(locale, "queueOffline")}</p>}
      <div className="segmented-control admin-tabs" aria-label={t("admin.dashboard.tabsLabel")}>
        <button className={adminTab === "overview" ? "active" : ""} aria-pressed={adminTab === "overview"} type="button" onClick={() => setAdminTab("overview")}>
          <LayoutDashboard size={18} />{t("admin.tabs.overview")}
        </button>
        <button className={adminTab === "tourists" ? "active" : ""} aria-pressed={adminTab === "tourists"} type="button" onClick={() => setAdminTab("tourists")}>
          <Users size={18} />{t("admin.tabs.tourists")}
        </button>
        <button className={adminTab === "records" ? "active" : ""} aria-pressed={adminTab === "records"} type="button" onClick={() => setAdminTab("records")}>
          <Route size={18} />{t("admin.tabs.records")}
        </button>
        <button className={adminTab === "safety" ? "active" : ""} aria-pressed={adminTab === "safety"} type="button" onClick={() => setAdminTab("safety")}>
          <ShieldCheck size={18} />{t("admin.tabs.safety")}
        </button>
        <button className={adminTab === "ai" ? "active" : ""} aria-pressed={adminTab === "ai"} type="button" onClick={() => setAdminTab("ai")}>
          <ChartNoAxesCombined size={18} />{t("admin.tabs.ai")}
        </button>
      </div>

      {adminTab === "overview" && (
        <div className="admin-tab-panel">
          <details className="admin-planning-disclosure"><summary><ChartNoAxesCombined size={19} />{adminText("overview.travelPlanSignal")}</summary><MovementPulseHero
            mode="admin"
            demand={destinationDemand}
            destinations={data.destinations}
            profile={`${tourists.length} ${adminText("overview.touristProfiles")}`}
            pointCount={summary.movementPointCount}
            plan={travelPlan}
          locale={locale} /></details>
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

              <details className="admin-overview-section" id="admin-movement-alerts" open>
                <summary>
                  <span>{adminText("overview.movementAlertsTitle")}</span>
                  <strong>{adminText("overview.alertCount", { count: movementAlerts.length })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <MovementAlertList alerts={movementAlerts} destinations={data.destinations} onExport={exportMovementAlerts} locale={locale} />
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
                          <strong>{uiText(locale, row.geofence.name)}</strong>
                          <span>{uiText(locale, row.geofence.type)}</span>
                        </div>
                        <p>{uiText(locale, row.geofence.message)}</p>
                        <small>
                          {row.pointCount} {uiText(locale, "movement point(s),")} {row.touristCount} {uiText(locale, "tourist(s)")}
                          {row.latestRecordedAt ? ` · ${uiText(locale, "Latest {date}", { date: formatDateTime(row.latestRecordedAt, locale) })}` : ""}
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
                  <CategoryBars values={movementTrend} locale={locale} />
                  <MovementDemandList title={adminText("overview.topTouristFlow")} demand={destinationDemand.slice(0, 4)} destinations={data.destinations} compact locale={locale} />
                  <FestivalCalendarPanel events={upcomingFestivals} destinations={data.destinations} compact locale={locale} />
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
                  <TravelPlanPanel plan={travelPlan} destinations={data.destinations} locale={locale} />
                </div>
              </details>

              <details className="admin-overview-section">
                <summary>
                  <span>{adminText("overview.recentRecommendations")}</span>
                  <strong>{adminText("overview.resultCount", { count: data.recommendations.length })}</strong>
                </summary>
                <div className="admin-overview-section-body">
                  <RecommendationList recommendations={data.recommendations.slice(0, 3)} destinations={data.destinations} compact locale={locale} />
                </div>
              </details>
            </aside>
          </section>
        </div>
      )}
      <div hidden={adminTab !== "tourists"}>{touristManagementPanel}</div>
      {adminTab === "records" && movementRecordsPanel}
      {adminTab === "safety" && safetyPanel}
      {adminTab === "ai" && aiResultsPanel}
    </Page>
  );
}
