import { useEffect, useRef, useState } from "react";
import { BarChart3, BellRing, CalendarDays, Compass, Download, LogOut, MapPinned, RotateCcw, Sparkles, UserRound } from "lucide-react";
import type { AppData, AppView, User } from "./types";
import { coerceViewForRole, getAuthModeFromPath, getDefaultViewForRole, getPathForAuthMode, getPathForView, getPrimaryViewsForRole, getViewFromPath, type AuthMode } from "./services/access";
import { cacheLocalData, clearSession, createId, getStorageMode, loadCloudData, loadData, loadSession, resetData, saveCheckInRecord, saveData, saveSession, saveSosAlertRecord, subscribeSosAlerts } from "./services/storage";
import { refreshAllRecommendations } from "./services/analytics";
import { authProviderName, getConfiguredAuthState, getConfiguredUserRecord, hasConfiguredAuth, registerWithConfiguredProvider, sendPasswordResetToConfiguredProvider, sendVerificationEmail, signInWithConfiguredProvider, signOutConfiguredProvider } from "./services/auth";
import { authenticateLocalUser, createTouristAccount, findUserByEmail, validateTouristAccount } from "./services/accounts";
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
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(() => getBrowserNotificationPermission());
  const [pendingCheckInDestinationId, setPendingCheckInDestinationId] = useState<string | null>(() => getTouristCheckInDestinationIdFromUrl());
  const watchId = useRef<number | null>(null);
  const selectLocale = useRef(createLocaleSelection());
  const lastSyncWarningAt = useRef(0);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = (key: TranslationKey) => translate(locale, key);
  const publicCheckInRequest = getTouristCheckInRequestFromUrl();
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

      if (isTouristCheckInRoute(pathname)) {
        return;
      }

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
  }, [authMode, currentUser, safeView]);

  const commitData = (nextData: AppData, actor: User | null = currentUser, options: CommitDataOptions = {}) => {
    setData(nextData);

    if (options.localOnlyStatus) {
      cacheLocalData(nextData);
      setSyncStatus(options.localOnlyStatus);
      return;
    }

    if (options.sosAlert) {
      cacheLocalData(nextData);
      setSyncStatus(sosText(locale, "syncPending"));
    }
    void (options.sosAlert ? saveSosAlertRecord(options.sosAlert, actor) : saveData(nextData, actor))
      .then((synced) => {
        setSyncStatus(synced ? "Saved to Firestore collections" : "Saved to local browser storage");
      })
      .catch(() => {
        setSyncStatus("Saved on this device; cloud retry pending");
        notifySyncIssue("Cloud save needs retry", "Your change was kept locally. Firestore did not accept the latest sync.");
      });
  };

  useEffect(() => {
    if (!currentUser) return;
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
  }, [currentUser?.id, currentUser?.role, locale]);

  const confirmPublicCheckIn = (): PublicCheckInResult => {
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
    if (activeCheckIn?.destinationId === publicCheckInDestination.id) {
      return {
        tone: "info",
        title: t("publicCheckin.alreadyTitle"),
        message: t("publicCheckin.alreadyMessage"),
        titleKey: "publicCheckin.alreadyTitle",
        messageKey: "publicCheckin.alreadyMessage",
        checkIn: activeCheckIn,
      };
    }

    if (activeCheckIn) {
      return {
        tone: "error",
        title: t("publicCheckin.checkoutNeededTitle"),
        message: t("publicCheckin.checkoutNeededMessage"),
        titleKey: "publicCheckin.checkoutNeededTitle",
        messageKey: "publicCheckin.checkoutNeededMessage",
      };
    }

    const result = createAttractionCheckIn(data, {
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

    setData(result.data);
    cacheLocalData(result.data);
    setSyncStatus("Check-in saved locally; cloud save pending");
    void saveCheckInRecord(result.checkIn, publicCheckInTourist)
      .then((synced) => {
        setSyncStatus(synced ? "Check-in saved to Firestore" : "Check-in saved to local browser storage");
      })
      .catch(() => {
        setSyncStatus("Check-in saved on this device; cloud retry pending");
        notifySyncIssue("Cloud save needs retry", "The check-in was kept locally. Firestore did not accept the quick check-in save.");
      });

    return {
      tone: "success",
      title: t("publicCheckin.successTitle"),
      message: `${t("publicCheckin.successPrefix")} ${publicCheckInDestination.name} ${t("publicCheckin.successSuffix")}`,
      titleKey: "publicCheckin.successTitle",
      checkIn: result.checkIn,
    };
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
      if (!isPublicCheckInFlow) {
        replaceBrowserPath(getPathForView(user.role, defaultView));
      }

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
    if (!isPublicCheckInFlow) {
      replaceBrowserPath(getPathForView(localUser.role, getDefaultViewForRole(localUser.role)));
    }
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
    if (!isPublicCheckInFlow) {
      replaceBrowserPath(getPathForView(user.role, getDefaultViewForRole(user.role)));
    }
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
    clearBrowserLocationWatch(watchId);

    await signOutConfiguredProvider().catch(() => undefined);
    clearSession();
    setSessionUserId(null);
    replaceBrowserPath(getPathForAuthMode("login"));
  };

  const resetPrototype = () => {
    clearBrowserLocationWatch(watchId);

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
          destination={publicCheckInDestination}
          locale={locale}
          missingReason={missingReason}
          passId={publicCheckInRequest.passId}
          passVerified={Boolean(publicCheckInTourist)}
          syncStatus={syncStatus}
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
          ["history", t("nav.trips"), MapPinned],
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
          <button className="nav-item utility danger" onClick={resetPrototype} title={t("nav.resetDemo")}>
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
        {currentUser.role === "tourist" && <div className="mobile-account-tools">
          <LanguageSelector locale={locale} onLocaleChange={changeLocale} />
          <button className="secondary-action icon-action" type="button" title={t("nav.profile")} aria-label={t("nav.profile")} onClick={() => goToView("profile")}><UserRound size={18} /></button>
          <button className="secondary-action icon-action" type="button" title={browserNotificationLabel} aria-label={browserNotificationLabel} disabled={browserNotificationDisabled} onClick={enableBrowserNotifications}><BellRing size={18} /></button>
          <button className="secondary-action icon-action" type="button" title={t("nav.logout")} aria-label={t("nav.logout")} onClick={logout}><LogOut size={18} /></button>
        </div>}
        {currentUser.role === "admin" ? (
          <AdminWorkspace data={data} actor={currentUser} view={safeView} locale={locale} onDataChange={commitData} notify={notify} />
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
          />
        )}
      </main>
      <ToastViewport notifications={notifications} onDismiss={dismissNotification} locale={locale} />
    </div>
  );
}

export default App;
