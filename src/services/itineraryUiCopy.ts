import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";

const en = {
  hours: "Hour", minutes: "Minute", clear: "Clear time", timeFormat: "24h",
  search: "Search itineraries", draft: "Draft", online: "Saved online", device: "On this device",
  previous: "Previous page", next: "Next page", page: "Page {page} of {pages}", noMatches: "No matching itineraries.",
};
type Key = keyof typeof en;
const copy: Record<Locale, Record<Key, string>> = {
  en,
  ms: { hours: "Jam", minutes: "Minit", clear: "Kosongkan masa", timeFormat: "24j", search: "Cari itinerari", draft: "Draf", online: "Disimpan dalam talian", device: "Pada peranti ini", previous: "Halaman sebelumnya", next: "Halaman seterusnya", page: "Halaman {page} daripada {pages}", noMatches: "Tiada itinerari sepadan." },
  zh: { hours: "小时", minutes: "分钟", clear: "清除时间", timeFormat: "24小时制", search: "搜索行程", draft: "草稿", online: "已保存到云端", device: "仅在此设备", previous: "上一页", next: "下一页", page: "第{page}页，共{pages}页", noMatches: "没有匹配的行程。" },
  ja: { hours: "時", minutes: "分", clear: "時刻をクリア", timeFormat: "24時間制", search: "旅程を検索", draft: "下書き", online: "オンライン保存済み", device: "この端末のみ", previous: "前のページ", next: "次のページ", page: "{pages}ページ中{page}ページ", noMatches: "一致する旅程はありません。" },
  ko: { hours: "시", minutes: "분", clear: "시간 지우기", timeFormat: "24시간제", search: "여행 일정 검색", draft: "초안", online: "온라인 저장됨", device: "이 기기에만", previous: "이전 페이지", next: "다음 페이지", page: "{pages}페이지 중 {page}페이지", noMatches: "일치하는 일정이 없습니다." },
  pt: { hours: "Hora", minutes: "Minuto", clear: "Limpar hora", timeFormat: "24h", search: "Pesquisar itinerários", draft: "Rascunho", online: "Guardado online", device: "Neste dispositivo", previous: "Página anterior", next: "Página seguinte", page: "Página {page} de {pages}", noMatches: "Nenhum itinerário encontrado." },
  ta: { hours: "மணி", minutes: "நிமிடம்", clear: "நேரத்தை நீக்கு", timeFormat: "24 மணி", search: "பயணத் திட்டங்களைத் தேடு", draft: "வரைவு", online: "இணையத்தில் சேமிக்கப்பட்டது", device: "இந்தச் சாதனத்தில் மட்டும்", previous: "முந்தைய பக்கம்", next: "அடுத்த பக்கம்", page: "{pages} பக்கங்களில் {page} ஆம் பக்கம்", noMatches: "பொருந்தும் பயணத் திட்டங்கள் இல்லை." },
  es: { hours: "Hora", minutes: "Minuto", clear: "Borrar hora", timeFormat: "24h", search: "Buscar itinerarios", draft: "Borrador", online: "Guardado en línea", device: "En este dispositivo", previous: "Página anterior", next: "Página siguiente", page: "Página {page} de {pages}", noMatches: "No hay itinerarios coincidentes." },
  fr: { hours: "Heure", minutes: "Minute", clear: "Effacer l’heure", timeFormat: "24h", search: "Rechercher des itinéraires", draft: "Brouillon", online: "Enregistré en ligne", device: "Sur cet appareil", previous: "Page précédente", next: "Page suivante", page: "Page {page} sur {pages}", noMatches: "Aucun itinéraire correspondant." },
};
export const itineraryUiKeys = Object.keys(en) as Key[];
export const itineraryUiText = (locale: Locale, key: Key) => copy[locale][key];
registerFeatureCopy(itineraryUiKeys, itineraryUiText);
