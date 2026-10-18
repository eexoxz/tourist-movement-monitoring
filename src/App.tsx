import { useEffect, useRef, useState } from "react";
import { BarChart3, BellRing, CalendarDays, Compass, Download, LogOut, MapPinned, RotateCcw, Sparkles, UserRound } from "lucide-react";
import type { AppData, AppView, User } from "./types";
import { coerceViewForRole, getAuthModeFromPath, getDefaultViewForRole, getPathForAuthMode, getPathForView, getPrimaryViewsForRole, getViewFromPath, type AuthMode } from "./services/access";
import { cacheLocalData, clearSession, createId, getStorageMode, loadCloudData, loadData, loadSession, resetData, saveCheckInRecord, saveCloudData, saveData, savePlaceReview, saveSession, saveSosAlertChange, subscribeCheckInRecords, subscribeIncidentReports, subscribeSosAlerts, subscribePlaceReviewRecords } from "./services/storage";
import { confirmCheckInSync, mergeCheckInRecords } from "./services/checkInSync";
import { acknowledgePendingCheckIn, rememberPendingCheckIn } from "./services/pendingCheckIns";
import { refreshAllRecommendations } from "./services/analytics";
import { authProviderName, getConfiguredAuthState, getConfiguredUserRecord, hasConfiguredAuth, registerWithConfiguredProvider, sendPasswordResetToConfiguredProvider, sendVerificationEmail, signInWithConfiguredProvider, signOutConfiguredProvider, subscribeConfiguredSessionEnd } from "./services/auth";
import { authenticateLocalUser, createTouristAccount, findUserByEmail, registrationData, validateTouristAccount } from "./services/accounts";
import { createTouristPassId, getTouristCheckInDestinationIdFromUrl, getTouristCheckInRequestFromUrl, isTouristCheckInRoute } from "./services/checkInDeepLink";
import { loadLocale, saveLocale, translate, type Locale, type TranslationKey } from "./services/i18n";
import { createLocaleSelection } from "./services/localeCatalog";
import { createAttractionCheckIn, getActiveCheckIn } from "./services/checkIns";
import { mergeSosAlerts } from "./services/safety";
import { sosText } from "./services/sosCopy";
import { getBrowserNotificationPermission, requestBrowserNotificationPermission, showBrowserNotification } from "./services/browserNotifications";
import { AuthScreen, LanguageSelector, type AuthResult, type TouristRegistrationDraft } from "./components/AuthScreen";
import { ToastViewport, type AppNotification, type NotifyFn } from "./components/ToastViewport";
import { notificationSource, uiText } from "./services/uiText";
import { PublicCheckInPage, type PublicCheckInResult } from "./components/PublicCheckInPage";
import { clearBrowserLocationWatch } from "./services/browserLocation";
import { getCurrentPathname, replaceBrowserPath, pushBrowserPath } from "./services/browserRouting";
import { friendlyAuthError } from "./services/authError";
import { type CommitDataOptions, mergeUserRecord } from "./services/workspaceSupport";
import { TouristWorkspace } from "./workspaces/TouristWorkspace";
import { AdminWorkspace } from "./workspaces/AdminWorkspace";
import { applyPlaceReview, mergePlaceReviewRecords } from "./services/unlistedPlaces";
import { unlistedLocationText } from "./services/unlistedLocationCopy";
import { placeText } from "./services/placeSubmissionCopy";
import { loadRememberedLogin } from "./services/loginPreferences";
import { buildDataExport } from "./services/dataExport";
import { workflowText } from "./services/workflowCopy";
import { mergeIncidentReports } from "./services/incidentSync";
import { mergeMonitoringSnapshot, subscribeAdminMonitoring } from "./services/monitoringSync";
import { DevicePrivacyPanel } from "./components/DevicePrivacyPanel";
import { deviceText } from "./services/deviceCopy";
import { AccountDeletionPanel } from "./components/AccountDeletionPanel";
import { deletionText, type DeletionCopyKey } from "./services/accountDeletionCopy";
import type { DeletionPhase } from "./services/accountDeletion";

function App() {
  useEffect(() => { loadRememberedLogin(); }, []);
  const [data, setData] = useState<AppData>(() => refreshAllRecommendations(loadData()));
  const [placeQueueState, setPlaceQueueState] = useState<"loading" | "live" | "offline">();
  const [placeQueueRevision, setPlaceQueueRevision] = useState(0);
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => hasConfiguredAuth() ? null : loadSession());
  const currentUser = data.users.find((user) => user.id === sessionUserId || user.authUid === sessionUserId) ?? null;
  const [view, setView] = useState<AppView>(() => getViewFromPath(getCurrentPathname()) ?? "overview");
  const [authMode, setAuthMode] = useState<AuthMode>(() => getAuthModeFromPath(getCurrentPathname()) ?? "login");
  const [locale, setLocale] = useState<Locale>(() => loadLocale());
  const safeView = currentUser ? coerceViewForRole(currentUser.role, view) : view;
  const [syncStatus, setSyncStatus] = useState(getStorageMode());
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [cloudAuthReady, setCloudAuthReady] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(() => getBrowserNotificationPermission());
  const [pendingCheckInDestinationId, setPendingCheckInDestinationId] = useState<string | null>(() => getTouristCheckInDestinationIdFromUrl());
  const [publicCheckInRequest, setPublicCheckInRequest] = useState(getTouristCheckInRequestFromUrl);
  const watchId = useRef<number | null>(null);
  const selectLocale = useRef(createLocaleSelection());
  const lastSyncWarningAt = useRef(0);
  const sessionRevision = useRef(0);
  const [deletionUid, setDeletionUid] = useState<string | null>(null);
  const [deletionEmail, setDeletionEmail] = useState("");
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionPhase, setDeletionPhase] = useState<DeletionPhase>();
  const [deletionError, setDeletionError] = useState<DeletionCopyKey>();
  const deletionAccount = useRef<string | null>(null);
  const deletionRunning = useRef(false);
  const lockForDeletion = (uid: string, email?: string | null) => {
    if (deletionAccount.current === uid) return;
    deletionAccount.current = uid;
    sessionRevision.current++;
    clearBrowserLocationWatch(watchId);
    clearSession();
    setSessionUserId(null);
    setDeletionUid(uid);
    setDeletionEmail(email ?? currentUser?.email ?? "");
    setCloudAuthReady(true);
  };
  const t = (key: TranslationKey) => translate(locale, key);
  const isPublicCheckInFlow = Boolean(publicCheckInRequest);
  const publicCheckInDestination = publicCheckInRequest?.destinationId ? data.destinations.find((destination) => destination.id === publicCheckInRequest.destinationId) ?? null : null;
  const publicCheckInPassOwner = publicCheckInRequest?.passId
    ? data.users.find((user) => user.role === "tourist" && createTouristPassId(user) === publicCheckInRequest.passId) ?? null
    : null;
  const publicCheckInTourist =
    currentUser?.role === "tourist" &&
    publicCheckInPassOwner &&
    (currentUser.id === publicCheckInPassOwner.id || (Boolean(currentUser.authUid) && currentUser.authUid === publicCheckInPassOwner.authUid))
      ? currentUser
      : null;

  const notify: NotifyFn = (notification) => {
    setNotifications((current) => [...current.slice(-2), { ...notification, title: notificationSource(locale, notification.title), message: notification.message ? notificationSource(locale, notification.message) : undefined, id: createId("notification") }]);
    if (notification.browser) {
      void showBrowserNotification({ ...notification, title: uiText(locale, notification.title), message: notification.message ? uiText(locale, notification.message) : undefined });
      setBrowserNotificationPermission(getBrowserNotificationPermission());

      if (getBrowserNotificationPermission() === "default") {
        setNotifications((current) => [
          ...current.slice(-2),
          {
            id: createId("notification"),
            tone: "info",
            title: translate("en", "notifications.enableTitle"),
            message: translate("en", "notifications.enableMessage"),
          },
        ]);
      }
    }
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
    void selectLocale.current(nextLocale, (readyLocale) => {
      setLocale(readyLocale);
      saveLocale(readyLocale);
    }).catch(() => {
      notify({ tone: "warning", title: "Language unavailable", message: "Could not load this language. Check your connection and try again." });
    });
  };

  const enableBrowserNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    setBrowserNotificationPermission(permission);

    if (permission === "granted") {
      notify({ tone: "success", title: t("notifications.enabledTitle"), message: t("notifications.enabledMessage"), browser: true });
      return;
    }

    if (permission === "denied") {
      notify({ tone: "warning", title: t("notifications.deniedTitle"), message: t("notifications.deniedMessage") });
      return;
    }

    notify({ tone: "warning", title: t("notifications.unsupportedTitle"), message: t("notifications.unsupportedMessage") });
  };

  const goToAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    if (isPublicCheckInFlow) {
      return;
    }
    pushBrowserPath(getPathForAuthMode(mode));
  };

  const goToView = (nextView: AppView) => {
    const activeUser = currentUser;
    if (!activeUser) {
      return;
    }

    const nextSafeView = coerceViewForRole(activeUser.role, nextView);
    if (nextSafeView === safeView) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    setView(nextSafeView);
    pushBrowserPath(getPathForView(activeUser.role, nextSafeView));
  };

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : locale;
  }, [locale]);

  useEffect(() => {
    let isMounted = true;
    const revision = sessionRevision.current;
    const isCurrent = () => isMounted && sessionRevision.current === revision;

    const hydrateCloudData = async () => {
      try {
        const firebaseUser = hasConfiguredAuth() ? await getConfiguredAuthState() : null;
        if (!isCurrent()) {
          return;
        }

        if (hasConfiguredAuth() && !firebaseUser) {
          clearSession();
          setSessionUserId(null);
        }

        if (firebaseUser?.uid) {
          const { hasAccountDeletion } = await import("./services/accountDeletion");
          if (await hasAccountDeletion(firebaseUser.uid)) {
            if (isCurrent()) lockForDeletion(firebaseUser.uid, firebaseUser.email);
            return;
          }
          if (!isCurrent()) return;
          if (!firebaseUser.emailVerified) {
            const account = await getConfiguredUserRecord(firebaseUser.uid);
            if (!isCurrent()) return;
            if (account?.role !== "admin") {
              await signOutConfiguredProvider();
              clearSession();
              setSessionUserId(null);
              return;
            }
          }
          saveSession(firebaseUser.uid, false);
          setSessionUserId(firebaseUser.uid);
        }

        const cloudData = await loadCloudData(undefined, isCurrent);
        if (!isCurrent() || !cloudData) {
          return;
        }

        const refreshed = refreshAllRecommendations(cloudData);
        setData(refreshed);
        if (firebaseUser?.uid && refreshed.users.some((user) => user.id === firebaseUser.uid || user.authUid === firebaseUser.uid)) {
          setSessionUserId(firebaseUser.uid);
        }
        setSyncStatus("Loaded from Firebase Firestore");
      } catch {
        if (isCurrent()) {
          setSyncStatus("Local mode; Firebase sync unavailable");
          notifySyncIssue("Firebase sync unavailable", "The app is still usable, but data is currently saved on this device.");
        }
      } finally {
        if (isCurrent()) setCloudAuthReady(true);
      }
    };

    void hydrateCloudData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasConfiguredAuth() || !currentUser) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const signedOut = () => {
      if (stopped) return;
      sessionRevision.current++;
      clearBrowserLocationWatch(watchId);
      clearSession();
      setSessionUserId(null);
    };
    void subscribeConfiguredSessionEnd(currentUser.authUid ?? currentUser.id, signedOut).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(signedOut);
    return () => { stopped = true; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.authUid]);

  useEffect(() => {
    if (!currentUser || !hasConfiguredAuth()) return;
    let stopped = false;
    let stop: (() => void) | undefined;
    const uid = currentUser.authUid ?? currentUser.id;
    void import("./services/accountDeletion").then(({ subscribeAccountDeletion }) => subscribeAccountDeletion(uid, () => { if (!stopped) lockForDeletion(uid); }, () => {}))
      .then((cleanup) => { if (stopped) cleanup(); else stop = cleanup; }).catch(() => {});
    return () => { stopped = true; stop?.(); };
  }, [currentUser?.id, currentUser?.authUid]);

  useEffect(() => {
    if (currentUser && safeView !== view) {
      setView(safeView);
    }
  }, [currentUser, safeView, view]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [safeView, isPublicCheckInFlow, publicCheckInRequest?.destinationId, publicCheckInRequest?.passId]);

  useEffect(() => {
    if (hasConfiguredAuth() && !cloudAuthReady && !currentUser) return;
    const handlePopState = () => {
      const pathname = getCurrentPathname();
      setPublicCheckInRequest(getTouristCheckInRequestFromUrl());
      setPendingCheckInDestinationId(isTouristCheckInRoute(pathname) ? null : getTouristCheckInDestinationIdFromUrl());

      if (isTouristCheckInRoute(pathname)) {
        return;
      }

      if (!currentUser) {
        const nextMode = getAuthModeFromPath(pathname) ?? "login";
        setAuthMode(nextMode);
        replaceBrowserPath(getPathForAuthMode(nextMode));
        return;
      }

      const pathView = getViewFromPath(pathname) ?? getDefaultViewForRole(currentUser.role);
      const nextView = coerceViewForRole(currentUser.role, pathView);
      setView(nextView);
      replaceBrowserPath(getPathForView(currentUser.role, nextView));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser, cloudAuthReady]);

  useEffect(() => {
    if (hasConfiguredAuth() && !cloudAuthReady && !currentUser) return;
    const pathname = getCurrentPathname();

    if (isTouristCheckInRoute(pathname)) {
      return;
    }

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
  }, [authMode, currentUser, safeView, cloudAuthReady]);

  const commitData = (nextData: AppData, actor: User | null = currentUser, options: CommitDataOptions = {}) => {
    const previousData = loadData();
    if (options.checkIn?.submittedPlace && hasConfiguredAuth()) {
      const checkIn = options.checkIn;
      setSyncStatus(t("sync.retrying"));
      return saveCheckInRecord(checkIn, actor).then((synced) => {
        if (!synced) throw new Error("Check-in was not accepted");
        setData((current) => {
          const next = { ...current, checkIns: current.checkIns.some((record) => record.id === checkIn.id) ? current.checkIns.map((record) => record.id === checkIn.id ? { ...record, status: checkIn.status, checkedOutAt: checkIn.checkedOutAt } : record) : [checkIn, ...current.checkIns] };
          cacheLocalData(next);
          return next;
        });
        setSyncStatus("Saved to Firestore collections");
        return true;
      }).catch(() => {
        setSyncStatus(unlistedLocationText(locale, "saveFailed"));
        return false;
      });
    }
    if (options.placeReview && hasConfiguredAuth()) {
      const review = options.placeReview;
      setSyncStatus(t("sync.retrying"));
      return savePlaceReview(review, actor).then((synced) => {
        if (!synced) throw new Error("Place review was not accepted");
        setData((current) => {
          const missing = nextData.checkIns.filter((record) => review.checkInIds.includes(record.id) && !current.checkIns.some((saved) => saved.id === record.id));
          const next = refreshAllRecommendations(applyPlaceReview({ ...current, checkIns: [...current.checkIns, ...missing] }, review));
          cacheLocalData(next);
          return next;
        });
        setSyncStatus("Saved to Firestore collections");
        return true;
      }).catch(() => {
        setSyncStatus("Saved on this device; cloud retry pending");
        notify({ tone: "warning", title: placeText(locale, "queue"), message: placeText(locale, "saveFailed") });
        return false;
      });
    }
    setData(nextData);

    if (options.localOnlyStatus) {
      cacheLocalData(nextData);
      setSyncStatus(options.localOnlyStatus);
      return;
    }

    if (options.sosAlert || options.checkIn || options.placeReview) {
      cacheLocalData(nextData);
      if (options.sosAlert) setSyncStatus(sosText(locale, "syncPending"));
    }
    if (hasConfiguredAuth() && !options.sosAlert) setSyncStatus("Saving");
    void (options.sosAlert ? saveSosAlertChange(options.sosAlert, actor) : options.placeReview ? savePlaceReview(options.placeReview, actor) : saveData(nextData, actor, previousData))
      .then((synced) => {
        setSyncStatus(synced ? "Saved to Firestore collections" : hasConfiguredAuth() ? "Saved on this device; cloud retry pending" : "Saved to local browser storage");
      })
      .catch(() => {
        setSyncStatus("Saved on this device; cloud retry pending");
        notifySyncIssue("Cloud save needs retry", "Your change was kept locally. Firestore did not accept the latest sync.");
      });
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin" || !hasConfiguredAuth()) { setPlaceQueueState(undefined); return; }
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    setPlaceQueueState("loading");
    const fail = () => { if (!stopped) setPlaceQueueState("offline"); };
    void subscribePlaceReviewRecords(currentUser, (pending, reviewed) => {
      if (stopped) return;
      setPlaceQueueState("live");
      setData((current) => {
        const checkIns = mergePlaceReviewRecords(current.checkIns, pending, reviewed);
        if (checkIns === current.checkIns) return current;
        const next = { ...current, checkIns };
        cacheLocalData(next);
        return next;
      });
    }, fail).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(fail);
    return () => { stopped = true; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.role, placeQueueRevision]);

  useEffect(() => {
    if (!currentUser || !cloudAuthReady || !hasConfiguredAuth()) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const fail = () => {
      if (!stopped) notifySyncIssue("Firebase sync unavailable", "The app is still usable, but data is currently saved on this device.");
    };
    void subscribeCheckInRecords(currentUser, (records) => {
      if (stopped) return;
      setData((current) => {
        const checkIns = mergeCheckInRecords(current.checkIns, records);
        if (checkIns === current.checkIns) return current;
        const next = { ...current, checkIns };
        cacheLocalData(next);
        return next;
      });
    }, fail).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(fail);
    return () => { stopped = true; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.authUid, currentUser?.role, cloudAuthReady]);

  useEffect(() => {
    if (!currentUser || !cloudAuthReady) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    void subscribeSosAlerts(currentUser, (alerts) => {
      if (stopped) return;
      setData((current) => {
        const next = { ...current, sosAlerts: mergeSosAlerts(current.sosAlerts, alerts) };
        cacheLocalData(next);
        return next;
      });
    }, () => {
      if (!stopped) notifySyncIssue(sosText(locale, "syncUnavailable"), sosText(locale, "syncDetail"));
    }).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(() => {
      if (!stopped) notifySyncIssue(sosText(locale, "syncUnavailable"), sosText(locale, "syncDetail"));
    });
    return () => { stopped = true; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.role, locale, cloudAuthReady]);

  useEffect(() => {
    if (!currentUser || !cloudAuthReady || !hasConfiguredAuth()) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const fail = () => { if (!stopped) notifySyncIssue("Firebase sync unavailable", "The app is still usable, but data is currently saved on this device."); };
    void subscribeIncidentReports(currentUser, (reports) => {
      if (stopped) return;
      setData((current) => {
        const incidentReports = mergeIncidentReports(current.incidentReports, reports);
        if (incidentReports === current.incidentReports) return current;
        const next = { ...current, incidentReports };
        cacheLocalData(next);
        return next;
      });
    }, fail).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(fail);
    return () => { stopped = true; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.authUid, currentUser?.role, cloudAuthReady]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin" || !cloudAuthReady || !hasConfiguredAuth()) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const fail = () => { if (!stopped) notifySyncIssue("Firebase sync unavailable", "The app is still usable, but data is currently saved on this device."); };
    void subscribeAdminMonitoring(currentUser, (snapshots, pending) => {
      if (stopped) return;
      setData((current) => {
        const next = snapshots.reduce((value, snapshot) => mergeMonitoringSnapshot(value, snapshot, pending), current);
        if (next !== current) cacheLocalData(next);
        return next;
      });
    }, fail).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(fail);
    return () => { stopped = true; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.authUid, currentUser?.role, cloudAuthReady]);

  const confirmPublicCheckIn = async (): Promise<PublicCheckInResult> => {
    if (!publicCheckInRequest?.destinationId || !publicCheckInDestination) {
      return {
        tone: "error",
        title: t("publicCheckin.destinationErrorTitle"),
        message: t("publicCheckin.destinationNotLinked"),
        titleKey: "publicCheckin.destinationErrorTitle",
        messageKey: "publicCheckin.destinationNotLinked",
      };
    }

    if (!publicCheckInRequest.passId || !publicCheckInTourist) {
      return {
        tone: "error",
        title: t("publicCheckin.passErrorTitle"),
        message: t("publicCheckin.missingUser"),
        titleKey: "publicCheckin.passErrorTitle",
        messageKey: "publicCheckin.missingUser",
      };
    }

    const activeCheckIn = getActiveCheckIn(data, publicCheckInTourist.id);
    if (activeCheckIn && activeCheckIn.destinationId !== publicCheckInDestination.id) {
      return {
        tone: "error",
        title: t("publicCheckin.checkoutNeededTitle"),
        message: t("publicCheckin.checkoutNeededMessage"),
        titleKey: "publicCheckin.checkoutNeededTitle",
        messageKey: "publicCheckin.checkoutNeededMessage",
      };
    }

    const result = activeCheckIn ? { data, checkIn: activeCheckIn, error: undefined } : createAttractionCheckIn(data, {
      userId: publicCheckInTourist.id,
      destinationId: publicCheckInDestination.id,
    });

    if (result.error || !result.data || !result.checkIn) {
      return {
        tone: "error",
        title: t("publicCheckin.saveErrorTitle"),
        message: result.error ?? t("publicCheckin.saveErrorMessage"),
        titleKey: "publicCheckin.saveErrorTitle",
        messageKey: result.error ? undefined : "publicCheckin.saveErrorMessage",
      };
    }

    const checkIn = result.checkIn;
    if (hasConfiguredAuth()) rememberPendingCheckIn(checkIn);
    setData((current) => {
      const next = { ...current, checkIns: mergeCheckInRecords(current.checkIns, [checkIn]) };
      cacheLocalData(next);
      return next;
    });
    setSyncStatus("Check-in saved locally; cloud save pending");
    const syncState = await confirmCheckInSync(() => saveCheckInRecord(checkIn, publicCheckInTourist), hasConfiguredAuth());
    if (syncState === "synced") acknowledgePendingCheckIn(checkIn);
    setSyncStatus(syncState === "synced" ? "Check-in saved to Firestore" : syncState === "local" ? "Check-in saved to local browser storage" : "Check-in saved on this device; cloud retry pending");

    return {
      tone: syncState === "synced" ? "success" : syncState === "local" ? "info" : "error",
      title: t("publicCheckin.successTitle"),
      message: `${t("publicCheckin.successPrefix")} ${publicCheckInDestination.name} ${t("publicCheckin.successSuffix")}`,
      titleKey: "publicCheckin.successTitle",
      checkIn: result.checkIn,
      syncState,
    };
  };

  const retryCloudSync = async () => {
    if (!currentUser) {
      return;
    }

    setIsRetryingSync(true);
    try {
      const synced = await saveCloudData(data, currentUser);
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

  const login = async (email: string, password: string, rememberSession = false): Promise<AuthResult> => {
    const revision = ++sessionRevision.current;
    const firebaseMode = hasConfiguredAuth();
    const localEmailUser = findUserByEmail(data, email);

    if (firebaseMode) {
      let authUid: string | undefined;
      let firebaseStoredUser: User | null = null;

      try {
        const firebaseUser = await signInWithConfiguredProvider(email, password, rememberSession);
        authUid = firebaseUser?.uid;
        if (!authUid) {
          return { error: "Firebase login could not return a user account." };
        }

        const { hasAccountDeletion } = await import("./services/accountDeletion");
        if (await hasAccountDeletion(authUid)) { lockForDeletion(authUid, firebaseUser?.email); return {}; }

        firebaseStoredUser = await getConfiguredUserRecord(authUid);
        const loginRole = firebaseStoredUser?.role ?? "tourist";
        if (firebaseUser && !firebaseUser.emailVerified && loginRole !== "admin") {
          const sent = await sendVerificationEmail(firebaseUser).catch(() => false);
          await signOutConfiguredProvider().catch(() => undefined);
          return { error: sent ? "Verify your email first. A fresh verification email has been sent." : "Verification email could not be sent." };
        }
      } catch (error) {
        await signOutConfiguredProvider().catch(() => undefined);
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
      saveSession(authUid, rememberSession);
      setSessionUserId(authUid);
      setCloudAuthReady(false);
      setView(defaultView);
      if (!isPublicCheckInFlow) {
        replaceBrowserPath(getPathForView(user.role, defaultView));
      }

      void loadCloudData({ ...user, authUid }, () => sessionRevision.current === revision)
        .then((cloudData) => {
          if (sessionRevision.current !== revision) return;
          if (!cloudData) {
            setSyncStatus("Signed in; local backup ready");
            return;
          }

          const refreshed = refreshAllRecommendations(cloudData.users.some((record) => record.id === authUid) ? cloudData : mergeUserRecord(cloudData, { ...user, authUid }));
          cacheLocalData(refreshed);
          setData(refreshed);
          setSyncStatus("Loaded from Firebase Firestore");
        })
        .catch(() => {
          if (sessionRevision.current === revision) setSyncStatus("Signed in; cloud refresh needs retry");
        }).finally(() => { if (sessionRevision.current === revision) setCloudAuthReady(true); });

      return {};
    }

    const localUser = authenticateLocalUser(data, email, password);
    if (!localUser) {
      return { error: "Invalid email or password." };
    }
    saveSession(localUser.id, rememberSession);
    setSessionUserId(localUser.id);
    setView(getDefaultViewForRole(localUser.role));
    if (!isPublicCheckInFlow) {
      replaceBrowserPath(getPathForView(localUser.role, getDefaultViewForRole(localUser.role)));
    }
    return {};
  };

  const register = async (draft: TouristRegistrationDraft): Promise<AuthResult> => {
    sessionRevision.current++;
    const registrationSnapshot = registrationData(data, draft.email, hasConfiguredAuth());
    const precheck = validateTouristAccount(registrationSnapshot, {
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
    let verificationSent = false;
    try {
      const registration = await registerWithConfiguredProvider(draft.email, draft.password);
      authUid = registration?.user.uid;
      verificationSent = registration?.verificationSent ?? false;
    } catch (error) {
      return { error: friendlyAuthError(error, "Firebase registration failed.") };
    }

    const created = createTouristAccount(registrationSnapshot, {
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
      const synced = await saveData(created.data, user).catch(() => false);
      await signOutConfiguredProvider().catch(() => undefined);
      const message = verificationSent ? uiText(locale, "Account created. Check your email for the Firebase verification link, then log in after verifying.") : workflowText(locale, "emailFailed");
      return { message: synced ? message : `${message} ${workflowText(locale, "profilePending")}` };
    }

    commitData(created.data, user);
    saveSession(user.id, false);
    setSessionUserId(user.id);
    setView(getDefaultViewForRole(user.role));
    if (!isPublicCheckInFlow) {
      replaceBrowserPath(getPathForView(user.role, getDefaultViewForRole(user.role)));
    }
    return {};
  };

  const resendVerification = async (email: string, password: string): Promise<AuthResult> => {
    sessionRevision.current++;
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
      return { message: "Verification email sent again. Check your inbox or spam folder." };
    } catch (error) {
      return { error: friendlyAuthError(error, "Verification email could not be sent.") };
    } finally {
      await signOutConfiguredProvider().catch(() => undefined);
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
    sessionRevision.current++;
    clearBrowserLocationWatch(watchId);

    await signOutConfiguredProvider().catch(() => undefined);
    deletionAccount.current = null;
    setDeletionUid(null);
    clearSession();
    setSessionUserId(null);
    setPublicCheckInRequest(null);
    replaceBrowserPath(getPathForAuthMode("login"));
  };

  const clearDeviceDownloads = async (): Promise<"pending" | "failed" | undefined> => {
    try {
      const privacy = await import("./services/devicePrivacy");
      if (privacy.hasUnsyncedDeviceWork()) return "pending";
      await signOutConfiguredProvider();
      sessionRevision.current++;
      clearBrowserLocationWatch(watchId);
      clearSession();
      setSessionUserId(null);
      privacy.clearDownloadedDeviceData();
      window.location.replace(getPathForAuthMode("login"));
    } catch (error) {
      const { UnsyncedDeviceWork } = await import("./services/devicePrivacy");
      const result = error instanceof UnsyncedDeviceWork ? "pending" : "failed";
      notify({ tone: "warning", title: deviceText(locale, "privacyTitle"), message: deviceText(locale, result) });
      return result;
    }
  };

  const deleteAccount = async (password: string) => {
    if (deletionRunning.current) return;
    const uid = deletionUid ?? currentUser?.authUid ?? currentUser?.id;
    if (!uid || (!deletionUid && currentUser?.role !== "tourist")) { setDeletionError("unavailable"); return; }
    deletionRunning.current = true;
    setDeletionBusy(true); setDeletionError(undefined);
    try {
      const { deleteOwnAccount, AccountDeletionError } = await import("./services/accountDeletion");
      const { clearDeletedAccountDeviceData } = await import("./services/accountDeletionLocal");
      try {
        await deleteOwnAccount(uid, password, { onStarted: () => lockForDeletion(uid), onPhase: setDeletionPhase, clearLocal: () => clearDeletedAccountDeviceData(uid) });
      } catch (error) {
        if (error instanceof AccountDeletionError) { setDeletionError(error.code === "timeout" ? "failed" : error.code); return; }
        throw error;
      }
      window.location.replace("/login?account=deleted");
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setDeletionError(["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"].includes(code ?? "") ? "badPassword" : code === "auth/requires-recent-login" || code === "auth/user-token-expired" ? "session" : "failed");
    } finally { deletionRunning.current = false; setDeletionBusy(false); }
  };

  const resetPrototype = () => {
    if (hasConfiguredAuth()) return;
    clearBrowserLocationWatch(watchId);

    const freshData = refreshAllRecommendations(resetData());
    cacheLocalData(freshData);
    setData(freshData);
    setSessionUserId(null);
    setPublicCheckInRequest(null);
    setView("overview");
    replaceBrowserPath(getPathForAuthMode("login"));
    notify({ tone: "info", title: "Demo data reset", message: "The prototype data has been restored to its prepared sample state." });
  };

  const exportData = async () => {
    if (!currentUser) return;
    const { readItineraryDrafts } = await import("./services/itineraryStorage");
    const plans = readItineraryDrafts(currentUser.id).map((entry) => entry.plan);
    const blob = new Blob([JSON.stringify(buildDataExport(data, currentUser, plans), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tourist-movement-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify({ tone: "success", title: "Export started", message: "The current prototype data is downloading as a JSON file." });
  };

  if (deletionUid) return <main className="account-deletion-page"><LanguageSelector locale={locale} onLocaleChange={changeLocale} /><AccountDeletionPanel locale={locale} email={deletionEmail} pending busy={deletionBusy} phase={deletionPhase} error={deletionError} onDelete={deleteAccount} onLogout={() => void logout()} /></main>;

  if (hasConfiguredAuth() && !cloudAuthReady && !currentUser) {
    return <main className="auth-layout" aria-busy="true"><div role="status">{t("auth.checkingAccess")}</div></main>;
  }

  if (publicCheckInRequest && !currentUser) {
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
        <ToastViewport notifications={notifications} onDismiss={dismissNotification} locale={locale} />
      </>
    );
  }

  if (publicCheckInRequest) {
    const missingReason = !publicCheckInRequest.destinationId
      ? t("publicCheckin.missingDestination")
      : !publicCheckInDestination
        ? t("publicCheckin.destinationNotLinked")
        : !publicCheckInRequest.passId
          ? t("publicCheckin.missingPass")
          : !publicCheckInPassOwner
            ? t("publicCheckin.missingUser")
            : !publicCheckInTourist
              ? t("publicCheckin.accountMismatch")
            : undefined;

    return (
      <>
        <PublicCheckInPage
          key={`${publicCheckInRequest.destinationId}:${publicCheckInRequest.passId}`}
          destination={publicCheckInDestination}
          locale={locale}
          missingReason={missingReason}
          passId={publicCheckInRequest.passId}
          passVerified={Boolean(publicCheckInTourist)}
          syncStatus={syncStatus}
          initializing={hasConfiguredAuth() && !cloudAuthReady}
          onConfirm={confirmPublicCheckIn}
          onLocaleChange={changeLocale}
        />
        <ToastViewport notifications={notifications} onDismiss={dismissNotification} locale={locale} />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthScreen
          initialNotice={new URLSearchParams(window.location.search).get("account") === "deleted" ? deletionText(locale, "deleted") : undefined}
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
        <ToastViewport notifications={notifications} onDismiss={dismissNotification} locale={locale} />
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
          ["tracking", t("nav.trips"), MapPinned],
          ["recommendations", t("nav.places"), Sparkles],
          ["events", t("nav.events"), CalendarDays],
        ] as const);
  const primaryViews = getPrimaryViewsForRole(currentUser.role);
  const browserNotificationLabel =
    browserNotificationPermission === "granted"
      ? t("notifications.enabledAction")
      : browserNotificationPermission === "denied"
      ? t("notifications.deniedAction")
      : browserNotificationPermission === "unsupported"
      ? t("notifications.unsupportedAction")
      : t("notifications.enableAction");
  const browserNotificationDisabled = browserNotificationPermission === "granted" || browserNotificationPermission === "denied" || browserNotificationPermission === "unsupported";

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

        <nav className="nav-list" aria-label={uiText(locale, "Primary navigation")}>
          {roleViews.filter(([key]) => primaryViews.includes(key)).map(([key, label, Icon]) => (
            <button key={key} className={safeView === key || (key === "tracking" && (safeView === "history" || safeView === "itinerary")) ? "nav-item active" : "nav-item"} onClick={() => goToView(key)}>
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
          <span>{uiText(locale, authProviderName())}</span>
          <strong>{uiText(locale, syncStatus)}</strong>
          {hasConfiguredAuth() && (
            <button className="status-retry-button" type="button" onClick={retryCloudSync} disabled={isRetryingSync}>
              <RotateCcw size={15} />
              {isRetryingSync ? t("sync.retrying") : t("sync.retry")}
            </button>
          )}
        </div>

        <div className="sidebar-tools">
          <button className="nav-item utility" onClick={enableBrowserNotifications} disabled={browserNotificationDisabled} title={browserNotificationLabel}>
            <BellRing size={18} />
            {browserNotificationLabel}
          </button>
          <button className="nav-item utility" onClick={exportData} title={t("nav.exportData")}>
            <Download size={18} />
            {t("nav.exportData")}
          </button>
          {!hasConfiguredAuth() && <button className="nav-item utility danger" onClick={resetPrototype} title={t("nav.resetDemo")}>
            <RotateCcw size={18} />
            {t("nav.resetDemo")}
          </button>}
        </div>

        <button className="nav-item logout" onClick={logout}>
          <LogOut size={18} />
          {t("nav.logout")}
        </button>
      </aside>

      <main className="content">
        {currentUser.role === "tourist" && <div className="mobile-account-tools">
          <LanguageSelector locale={locale} onLocaleChange={changeLocale} />
          <button className="secondary-action icon-action" type="button" title={t("nav.profile")} aria-label={t("nav.profile")} onClick={() => goToView("profile")}><UserRound size={18} /></button>
          <button className="secondary-action icon-action" type="button" title={browserNotificationLabel} aria-label={browserNotificationLabel} disabled={browserNotificationDisabled} onClick={enableBrowserNotifications}><BellRing size={18} /></button>
          <button className="secondary-action icon-action" type="button" title={t("nav.logout")} aria-label={t("nav.logout")} onClick={logout}><LogOut size={18} /></button>
        </div>}
        {currentUser.role === "admin" ? (
          <AdminWorkspace data={data} actor={currentUser} view={safeView} locale={locale} onDataChange={commitData} onViewChange={goToView} placeQueueState={placeQueueState} onRetryPlaceQueue={() => setPlaceQueueRevision((current) => current + 1)} notify={notify} />
        ) : (
          <TouristWorkspace
            data={data}
            view={safeView}
            user={currentUser}
            locale={locale}
            pendingCheckInDestinationId={pendingCheckInDestinationId}
            onPendingCheckInConsumed={() => setPendingCheckInDestinationId(null)}
            onDataChange={commitData}
            onViewChange={goToView}
            watchId={watchId}
            notify={notify}
            hasNotifications={notifications.length > 0}
            syncStatus={syncStatus}
          />
        )}
        {hasConfiguredAuth() && (currentUser.role === "admin" || safeView === "profile") && <DevicePrivacyPanel locale={locale} onClear={clearDeviceDownloads} />}
        {hasConfiguredAuth() && currentUser.role === "tourist" && safeView === "profile" && <AccountDeletionPanel locale={locale} email={currentUser.email} busy={deletionBusy} phase={deletionPhase} error={deletionError} onDelete={deleteAccount} onExport={() => void exportData()} />}
      </main>
      <ToastViewport notifications={notifications} onDismiss={dismissNotification} locale={locale} />
    </div>
  );
}

export default App;
