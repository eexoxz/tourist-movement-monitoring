import type { Locale } from "./i18n";

const copy = {
  en: { title: "This screen could not load", body: "Check your connection and reload the app. Reloading does not delete your saved trips or account.", retry: "Reload app", loading: "Loading your workspace..." },
  ms: { title: "Skrin ini tidak dapat dimuatkan", body: "Semak sambungan anda dan muat semula aplikasi. Perjalanan tersimpan dan akaun anda tidak akan dipadamkan.", retry: "Muat semula aplikasi", loading: "Memuatkan ruang kerja anda..." },
  zh: { title: "无法加载此页面", body: "请检查网络连接并重新加载应用。重新加载不会删除已保存的行程或账户。", retry: "重新加载应用", loading: "正在加载您的工作区..." },
  ja: { title: "この画面を読み込めませんでした", body: "接続を確認してアプリを再読み込みしてください。保存した旅行やアカウントは削除されません。", retry: "アプリを再読み込み", loading: "ワークスペースを読み込み中..." },
  ko: { title: "화면을 불러올 수 없습니다", body: "연결을 확인한 후 앱을 새로고침하세요. 저장된 여행이나 계정은 삭제되지 않습니다.", retry: "앱 새로고침", loading: "작업 공간을 불러오는 중..." },
  pt: { title: "Não foi possível carregar este ecrã", body: "Verifique a ligação e recarregue a aplicação. As viagens guardadas e a conta não serão eliminadas.", retry: "Recarregar aplicação", loading: "A carregar o seu espaço..." },
  ta: { title: "இந்தத் திரையை ஏற்ற முடியவில்லை", body: "இணைப்பைச் சரிபார்த்து செயலியை மீண்டும் ஏற்றவும். சேமித்த பயணங்களும் கணக்கும் நீக்கப்படாது.", retry: "செயலியை மீண்டும் ஏற்று", loading: "உங்கள் பணியிடம் ஏற்றப்படுகிறது..." },
  es: { title: "No se pudo cargar esta pantalla", body: "Comprueba la conexión y recarga la aplicación. Tus viajes guardados y tu cuenta no se eliminarán.", retry: "Recargar aplicación", loading: "Cargando tu espacio..." },
  fr: { title: "Impossible de charger cet écran", body: "Vérifiez votre connexion et rechargez l'application. Vos voyages enregistrés et votre compte ne seront pas supprimés.", retry: "Recharger l'application", loading: "Chargement de votre espace..." },
} satisfies Record<Locale, { title: string; body: string; retry: string; loading: string }>;

export const recoveryCopy = (locale: Locale) => copy[locale];
