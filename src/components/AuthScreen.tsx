import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, MapPinned, RotateCcw, ShieldCheck } from "lucide-react";
import { nationalityOptions } from "../data/nationalities";
import { type AuthMode } from "../services/access";
import { isValidEmail } from "../services/accounts";
import { hasConfiguredAuth } from "../services/auth";
import { isLocale, localeOptions, translate, type Locale, type TranslationKey } from "../services/i18n";
import type { UserRole } from "../types";
import type { NotifyFn } from "./ToastViewport";

export type AuthResult = { error?: string; message?: string };

export type TouristRegistrationDraft = {
  name: string;
  email: string;
  password: string;
  nationality: string;
  passportNumber: string;
  termsAccepted: boolean;
};

type RememberedLogin = { email: string; password: string };

const REMEMBER_LOGIN_KEY = "tourist-movement-monitoring:remember-login";
const demoCredentialEmails = new Set(["tourist@example.com", "nature@example.com", "culture@example.com", "urban@example.com", "admin@tourism.local"]);

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

export function LanguageSelector({ locale, onLocaleChange }: { locale: Locale; onLocaleChange: (locale: Locale) => void }) {
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

export function AuthScreen({
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchAuthMode("login")}>
              {t("auth.login")}
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchAuthMode("register")}>
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

          {firebaseMode && <p className="form-hint">{t("auth.firebaseMode")}</p>}

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
