import { registerFeatureCopy } from "./featureTranslations";
import type { Locale } from "./i18n";

const en = {
  manage: "Sample dataset", limit: "Tourist limit", preview: "Selection preview", matches: "{count} matching sample tourists",
  bounds: "Prepared pool: {max} tourists, up to {points} movement points. Selected samples replace the previous sample set only.",
  replace: "Replace samples", load: "Load selection", empty: "No prepared tourists match these filters.",
  loaded: "{count} sample tourists loaded on this device. Previous samples were replaced; registered users were not changed.",
  failed: "The sample dataset could not be updated. Please try again.", current: "Currently loaded", unchanged: "This selection is already loaded.",
};
type Copy = Record<keyof typeof en, string>;
const copy: Record<Locale, Copy> = {
  en,
  ms: {
    manage: "Set data contoh", limit: "Had pelancong", preview: "Pratonton pilihan", matches: "{count} pelancong contoh sepadan",
    bounds: "Kumpulan tersedia: {max} pelancong, sehingga {points} titik pergerakan. Pilihan hanya menggantikan set contoh sebelumnya.",
    replace: "Ganti contoh", load: "Muatkan pilihan", empty: "Tiada pelancong tersedia yang sepadan dengan penapis ini.",
    loaded: "{count} pelancong contoh dimuatkan pada peranti ini. Contoh sebelumnya diganti; pengguna berdaftar tidak diubah.",
    failed: "Set data contoh tidak dapat dikemas kini. Sila cuba lagi.", current: "Sedang dimuatkan", unchanged: "Pilihan ini sudah dimuatkan.",
  },
  zh: {
    manage: "示例数据集", limit: "游客数量上限", preview: "所选数据预览", matches: "{count} 位符合条件的示例游客",
    bounds: "预设数据池：{max} 位游客，最多 {points} 个移动点。所选示例仅替换之前的示例数据。",
    replace: "替换示例", load: "加载所选数据", empty: "没有符合这些筛选条件的预设游客。",
    loaded: "已在此设备上加载 {count} 位示例游客。之前的示例已替换，注册用户未受影响。",
    failed: "无法更新示例数据集，请重试。", current: "当前已加载", unchanged: "已加载此组数据。",
  },
  ja: {
    manage: "サンプルデータ", limit: "観光客数の上限", preview: "選択内容のプレビュー", matches: "条件に一致するサンプル観光客 {count}人",
    bounds: "用意されたデータ：観光客{max}人、移動地点は最大{points}件。選択内容は以前のサンプルのみを置き換えます。",
    replace: "サンプルを置換", load: "選択内容を読み込む", empty: "条件に一致する観光客データがありません。",
    loaded: "この端末にサンプル観光客{count}人を読み込みました。以前のサンプルを置き換え、登録ユーザーは変更していません。",
    failed: "サンプルデータを更新できませんでした。再試行してください。", current: "読み込み済み", unchanged: "この選択内容は読み込み済みです。",
  },
  ko: {
    manage: "샘플 데이터", limit: "관광객 수 제한", preview: "선택 미리보기", matches: "조건에 맞는 샘플 관광객 {count}명",
    bounds: "준비된 데이터: 관광객 {max}명, 이동 지점 최대 {points}개. 선택한 샘플만 이전 샘플을 대체합니다.",
    replace: "샘플 교체", load: "선택 항목 불러오기", empty: "이 필터에 맞는 관광객 데이터가 없습니다.",
    loaded: "이 기기에 샘플 관광객 {count}명을 불러왔습니다. 이전 샘플은 교체되었으며 등록 사용자는 변경되지 않았습니다.",
    failed: "샘플 데이터를 업데이트하지 못했습니다. 다시 시도해 주세요.", current: "현재 불러온 수", unchanged: "이미 불러온 선택 항목입니다.",
  },
  pt: {
    manage: "Dados de exemplo", limit: "Limite de turistas", preview: "Pré-visualização da seleção", matches: "{count} turistas de exemplo correspondentes",
    bounds: "Conjunto preparado: {max} turistas, até {points} pontos de movimento. A seleção substitui apenas os exemplos anteriores.",
    replace: "Substituir exemplos", load: "Carregar seleção", empty: "Nenhum turista preparado corresponde a estes filtros.",
    loaded: "{count} turistas de exemplo carregados neste dispositivo. Os exemplos anteriores foram substituídos; os utilizadores registados não foram alterados.",
    failed: "Não foi possível atualizar os dados de exemplo. Tente novamente.", current: "Atualmente carregados", unchanged: "Esta seleção já está carregada.",
  },
  ta: {
    manage: "மாதிரித் தரவுத் தொகுப்பு", limit: "பயணிகள் வரம்பு", preview: "தேர்வின் முன்னோட்டம்", matches: "பொருந்தும் மாதிரிப் பயணிகள் {count}",
    bounds: "தயாரான தொகுப்பு: {max} பயணிகள், அதிகபட்சம் {points} இயக்கப் புள்ளிகள். தேர்வு முந்தைய மாதிரிகளை மட்டுமே மாற்றும்.",
    replace: "மாதிரிகளை மாற்று", load: "தேர்வை ஏற்று", empty: "இந்த வடிகட்டிகளுக்குப் பொருந்தும் பயணிகள் இல்லை.",
    loaded: "இந்தச் சாதனத்தில் {count} மாதிரிப் பயணிகள் ஏற்றப்பட்டனர். முந்தைய மாதிரிகள் மாற்றப்பட்டன; பதிவுசெய்த பயனர்கள் மாற்றப்படவில்லை.",
    failed: "மாதிரித் தரவைப் புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", current: "தற்போது ஏற்றப்பட்டவை", unchanged: "இந்தத் தேர்வு ஏற்கனவே ஏற்றப்பட்டுள்ளது.",
  },
  es: {
    manage: "Datos de ejemplo", limit: "Límite de turistas", preview: "Vista previa de la selección", matches: "{count} turistas de ejemplo coincidentes",
    bounds: "Conjunto preparado: {max} turistas, hasta {points} puntos de movimiento. La selección sustituye solo los ejemplos anteriores.",
    replace: "Sustituir ejemplos", load: "Cargar selección", empty: "Ningún turista preparado coincide con estos filtros.",
    loaded: "Se cargaron {count} turistas de ejemplo en este dispositivo. Se sustituyeron los ejemplos anteriores; los usuarios registrados no cambiaron.",
    failed: "No se pudieron actualizar los datos de ejemplo. Inténtalo de nuevo.", current: "Cargados actualmente", unchanged: "Esta selección ya está cargada.",
  },
  fr: {
    manage: "Données d'exemple", limit: "Limite de touristes", preview: "Aperçu de la sélection", matches: "{count} touristes d'exemple correspondants",
    bounds: "Ensemble préparé : {max} touristes, jusqu'à {points} points de déplacement. La sélection remplace uniquement les exemples précédents.",
    replace: "Remplacer les exemples", load: "Charger la sélection", empty: "Aucun touriste préparé ne correspond à ces filtres.",
    loaded: "{count} touristes d'exemple chargés sur cet appareil. Les exemples précédents ont été remplacés ; les utilisateurs inscrits n'ont pas été modifiés.",
    failed: "Impossible de mettre à jour les données d'exemple. Veuillez réessayer.", current: "Actuellement chargés", unchanged: "Cette sélection est déjà chargée.",
  },
};
export const demoDatasetControlKeys = Object.keys(en) as (keyof typeof en)[];
export function demoControlsText(locale: Locale, key: keyof typeof en, values: Record<string, number> = {}) {
  return copy[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => name in values ? new Intl.NumberFormat(locale).format(values[name]) : placeholder);
}

registerFeatureCopy(Object.keys(en) as (keyof typeof en)[], demoControlsText);
