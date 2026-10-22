import type { Locale } from "./i18n";

const en = {
  batchButton: "Load {count} sample tourists",
  progress: "{count} / {max} sample tourists",
  sampleRecord: "Sample profile",
  realRecord: "Registered profile",
  batchMessage: "Added {count} fictional tourists on this device. No sample records were sent to Firestore.",
  dataNote: "Sample profiles are fictional demonstration data, not real visitor statistics.",
};
const copy: Record<Locale, Record<keyof typeof en, string>> = {
  en,
  ms: { batchButton: "Muatkan {count} pelancong contoh", progress: "{count} / {max} pelancong contoh", sampleRecord: "Profil contoh", realRecord: "Profil berdaftar", batchMessage: "{count} pelancong rekaan ditambah pada peranti ini. Tiada rekod contoh dihantar ke Firestore.", dataNote: "Profil contoh ialah data demonstrasi rekaan, bukan statistik pelawat sebenar." },
  zh: { batchButton: "加载 {count} 位示例游客", progress: "{count} / {max} 位示例游客", sampleRecord: "示例档案", realRecord: "注册档案", batchMessage: "已在此设备上添加 {count} 位虚构游客。未向 Firestore 发送示例记录。", dataNote: "示例档案为虚构演示数据，并非真实游客统计。" },
  ja: { batchButton: "サンプル観光客を{count}人追加", progress: "サンプル観光客 {count} / {max}人", sampleRecord: "サンプルプロフィール", realRecord: "登録プロフィール", batchMessage: "この端末に架空の観光客を{count}人追加しました。サンプル記録はFirestoreに送信されません。", dataNote: "サンプルプロフィールは架空のデモデータであり、実際の訪問者統計ではありません。" },
  ko: { batchButton: "샘플 관광객 {count}명 추가", progress: "샘플 관광객 {count} / {max}명", sampleRecord: "샘플 프로필", realRecord: "등록 프로필", batchMessage: "이 기기에 가상의 관광객 {count}명을 추가했습니다. 샘플 기록은 Firestore로 전송되지 않았습니다.", dataNote: "샘플 프로필은 가상의 시연 데이터이며 실제 방문객 통계가 아닙니다." },
  pt: { batchButton: "Carregar {count} turistas de exemplo", progress: "{count} / {max} turistas de exemplo", sampleRecord: "Perfil de exemplo", realRecord: "Perfil registado", batchMessage: "Foram adicionados {count} turistas fictícios neste dispositivo. Nenhum registo de exemplo foi enviado ao Firestore.", dataNote: "Os perfis de exemplo são dados fictícios de demonstração, não estatísticas reais de visitantes." },
  ta: { batchButton: "{count} மாதிரி சுற்றுலாப் பயணிகளை ஏற்று", progress: "{count} / {max} மாதிரி சுற்றுலாப் பயணிகள்", sampleRecord: "மாதிரி சுயவிவரம்", realRecord: "பதிவுசெய்த சுயவிவரம்", batchMessage: "இந்தச் சாதனத்தில் {count} கற்பனைப் பயணிகள் சேர்க்கப்பட்டனர். மாதிரிப் பதிவுகள் Firestore-க்கு அனுப்பப்படவில்லை.", dataNote: "மாதிரி சுயவிவரங்கள் கற்பனையான விளக்கத் தரவுகள்; உண்மையான வருகையாளர் புள்ளிவிவரங்கள் அல்ல." },
  es: { batchButton: "Cargar {count} turistas de ejemplo", progress: "{count} / {max} turistas de ejemplo", sampleRecord: "Perfil de ejemplo", realRecord: "Perfil registrado", batchMessage: "Se añadieron {count} turistas ficticios en este dispositivo. No se enviaron registros de ejemplo a Firestore.", dataNote: "Los perfiles de ejemplo son datos ficticios de demostración, no estadísticas reales de visitantes." },
  fr: { batchButton: "Charger {count} touristes d'exemple", progress: "{count} / {max} touristes d'exemple", sampleRecord: "Profil d'exemple", realRecord: "Profil inscrit", batchMessage: "{count} touristes fictifs ont été ajoutés sur cet appareil. Aucun enregistrement d'exemple n'a été envoyé à Firestore.", dataNote: "Les profils d'exemple sont des données fictives de démonstration, pas des statistiques réelles de visiteurs." },
};

export function demoDatasetText(locale: Locale, key: keyof typeof en, values: Record<string, number> = {}) {
  return copy[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => name in values ? new Intl.NumberFormat(locale).format(values[name]) : placeholder);
}
