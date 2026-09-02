export type Locale = "en" | "ms" | "zh";

export type TranslationKey =
  | "language.label"
  | "language.english"
  | "language.malay"
  | "language.chinese"
  | "brand.title"
  | "brand.subtitle"
  | "nav.home"
  | "nav.trips"
  | "nav.places"
  | "nav.events"
  | "nav.dashboard"
  | "nav.destinations"
  | "nav.profile"
  | "nav.adminRole"
  | "nav.exportData"
  | "nav.resetDemo"
  | "nav.logout"
  | "sync.retrying"
  | "sync.retry"
  | "auth.title"
  | "auth.description"
  | "auth.mode"
  | "auth.login"
  | "auth.register"
  | "auth.demoRole"
  | "auth.firebaseMode"
  | "auth.name"
  | "auth.email"
  | "auth.password"
  | "auth.confirmPassword"
  | "auth.nationality"
  | "auth.selectNationality"
  | "auth.passportNumber"
  | "auth.passportHint"
  | "auth.privacyTitle"
  | "auth.privacyBody"
  | "auth.privacyAgreement"
  | "auth.rememberLogin"
  | "auth.checkingAccess"
  | "auth.enterSystem"
  | "auth.createAccount"
  | "auth.resendVerification"
  | "auth.forgotPassword"
  | "auth.createTouristAccount"
  | "auth.alreadyHaveAccount"
  | "auth.showPassword"
  | "auth.hidePassword";

const STORAGE_KEY = "tourist-movement-monitoring:locale";

export const localeOptions: Array<{ value: Locale; labelKey: TranslationKey }> = [
  { value: "en", labelKey: "language.english" },
  { value: "ms", labelKey: "language.malay" },
  { value: "zh", labelKey: "language.chinese" },
];

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.malay": "Malay",
    "language.chinese": "Chinese",
    "brand.title": "Tourist Movement",
    "brand.subtitle": "Monitoring",
    "nav.home": "Home",
    "nav.trips": "Trips",
    "nav.places": "Places",
    "nav.events": "Event Calendar",
    "nav.dashboard": "Dashboard",
    "nav.destinations": "Destinations",
    "nav.profile": "Travel profile",
    "nav.adminRole": "Tourism Administrator",
    "nav.exportData": "Export data",
    "nav.resetDemo": "Reset demo",
    "nav.logout": "Logout",
    "sync.retrying": "Retrying",
    "sync.retry": "Retry sync",
    "auth.title": "Smart Tourist Movement Monitoring",
    "auth.description": "Consent-based trip tracking, route visualization, dashboard monitoring, and explainable destination recommendations for selected Malaysian tourist locations.",
    "auth.mode": "Authentication mode",
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.demoRole": "Demo role",
    "auth.firebaseMode": "Firebase mode is active. Use a registered and verified Firebase account.",
    "auth.name": "Name",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.nationality": "Nationality",
    "auth.selectNationality": "Select nationality",
    "auth.passportNumber": "Passport Number",
    "auth.passportHint": "Use 5 to 20 letters or numbers, for example A12345678.",
    "auth.privacyTitle": "Data privacy and tourist safety",
    "auth.privacyBody": "The app stores your profile, consent choice, trip route points and recommendation results so tourism administrators can monitor movement trends. Passport and nationality details are kept with your account for identity support if assistance is needed during a recorded trip.",
    "auth.privacyAgreement": "I agree to consent-based location tracking and account data storage.",
    "auth.rememberLogin": "Remember login on this device",
    "auth.checkingAccess": "Checking access",
    "auth.enterSystem": "Enter system",
    "auth.createAccount": "Create tourist account",
    "auth.resendVerification": "Resend verification email",
    "auth.forgotPassword": "Forgot password",
    "auth.createTouristAccount": "Create Tourist Account",
    "auth.alreadyHaveAccount": "Already have an account? Login",
    "auth.showPassword": "Show password",
    "auth.hidePassword": "Hide password",
  },
  ms: {
    "language.label": "Bahasa",
    "language.english": "English",
    "language.malay": "Bahasa Melayu",
    "language.chinese": "Bahasa Cina",
    "brand.title": "Pergerakan Pelancong",
    "brand.subtitle": "Pemantauan",
    "nav.home": "Utama",
    "nav.trips": "Perjalanan",
    "nav.places": "Tempat",
    "nav.events": "Kalendar Acara",
    "nav.dashboard": "Papan Pemuka",
    "nav.destinations": "Destinasi",
    "nav.profile": "Profil perjalanan",
    "nav.adminRole": "Pentadbir Pelancongan",
    "nav.exportData": "Eksport data",
    "nav.resetDemo": "Tetap semula demo",
    "nav.logout": "Log keluar",
    "sync.retrying": "Mencuba semula",
    "sync.retry": "Cuba segerak",
    "auth.title": "Pemantauan Pergerakan Pelancong Pintar",
    "auth.description": "Penjejakan perjalanan berasaskan persetujuan, visualisasi laluan, pemantauan papan pemuka dan cadangan destinasi untuk lokasi pelancongan terpilih di Malaysia.",
    "auth.mode": "Mod pengesahan",
    "auth.login": "Log masuk",
    "auth.register": "Daftar",
    "auth.demoRole": "Peranan demo",
    "auth.firebaseMode": "Mod Firebase aktif. Gunakan akaun Firebase yang telah didaftarkan dan disahkan.",
    "auth.name": "Nama",
    "auth.email": "E-mel",
    "auth.password": "Kata laluan",
    "auth.confirmPassword": "Sahkan kata laluan",
    "auth.nationality": "Kewarganegaraan",
    "auth.selectNationality": "Pilih kewarganegaraan",
    "auth.passportNumber": "Nombor Pasport",
    "auth.passportHint": "Gunakan 5 hingga 20 huruf atau nombor, contohnya A12345678.",
    "auth.privacyTitle": "Privasi data dan keselamatan pelancong",
    "auth.privacyBody": "Aplikasi menyimpan profil, pilihan persetujuan, titik laluan perjalanan dan keputusan cadangan supaya pentadbir pelancongan boleh memantau trend pergerakan. Butiran pasport dan kewarganegaraan disimpan bersama akaun untuk sokongan identiti jika bantuan diperlukan semasa perjalanan direkodkan.",
    "auth.privacyAgreement": "Saya bersetuju dengan penjejakan lokasi berasaskan persetujuan dan penyimpanan data akaun.",
    "auth.rememberLogin": "Ingat log masuk pada peranti ini",
    "auth.checkingAccess": "Menyemak akses",
    "auth.enterSystem": "Masuk sistem",
    "auth.createAccount": "Cipta akaun pelancong",
    "auth.resendVerification": "Hantar semula e-mel pengesahan",
    "auth.forgotPassword": "Lupa kata laluan",
    "auth.createTouristAccount": "Cipta Akaun Pelancong",
    "auth.alreadyHaveAccount": "Sudah ada akaun? Log masuk",
    "auth.showPassword": "Papar kata laluan",
    "auth.hidePassword": "Sembunyi kata laluan",
  },
  zh: {
    "language.label": "语言",
    "language.english": "英语",
    "language.malay": "马来语",
    "language.chinese": "中文",
    "brand.title": "游客流动",
    "brand.subtitle": "监测",
    "nav.home": "首页",
    "nav.trips": "行程",
    "nav.places": "地点",
    "nav.events": "活动日历",
    "nav.dashboard": "仪表板",
    "nav.destinations": "目的地",
    "nav.profile": "旅行档案",
    "nav.adminRole": "旅游管理员",
    "nav.exportData": "导出数据",
    "nav.resetDemo": "重置演示",
    "nav.logout": "退出登录",
    "sync.retrying": "重试中",
    "sync.retry": "重新同步",
    "auth.title": "智能游客流动监测",
    "auth.description": "基于同意的行程追踪、路线可视化、管理仪表板，以及针对马来西亚精选旅游地点的可解释推荐。",
    "auth.mode": "认证模式",
    "auth.login": "登录",
    "auth.register": "注册",
    "auth.demoRole": "演示角色",
    "auth.firebaseMode": "Firebase 模式已启用。请使用已注册并验证的 Firebase 账号。",
    "auth.name": "姓名",
    "auth.email": "电子邮件",
    "auth.password": "密码",
    "auth.confirmPassword": "确认密码",
    "auth.nationality": "国籍",
    "auth.selectNationality": "选择国籍",
    "auth.passportNumber": "护照号码",
    "auth.passportHint": "请输入 5 至 20 个字母或数字，例如 A12345678。",
    "auth.privacyTitle": "数据隐私与游客安全",
    "auth.privacyBody": "应用会储存你的档案、同意选择、行程位置点和推荐结果，方便旅游管理员观察游客流动趋势。护照和国籍资料会与账号一起保存，以便记录行程期间需要协助时进行身份支持。",
    "auth.privacyAgreement": "我同意基于同意的位置追踪和账号数据储存。",
    "auth.rememberLogin": "在此设备记住登录资料",
    "auth.checkingAccess": "正在检查访问权限",
    "auth.enterSystem": "进入系统",
    "auth.createAccount": "创建游客账号",
    "auth.resendVerification": "重新发送验证邮件",
    "auth.forgotPassword": "忘记密码",
    "auth.createTouristAccount": "创建游客账号",
    "auth.alreadyHaveAccount": "已有账号？登录",
    "auth.showPassword": "显示密码",
    "auth.hidePassword": "隐藏密码",
  },
};

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "ms" || value === "zh";
}

export function loadLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && isLocale(saved) ? saved : "en";
}

export function saveLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
}

export function translate(locale: Locale, key: TranslationKey) {
  return translations[locale][key] ?? translations.en[key];
}
