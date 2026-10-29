import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";
const labels: Record<Locale, string> = {
  en: "View on map", ms: "Lihat pada peta", zh: "在地图上查看", ja: "地図で表示", ko: "지도에서 보기",
  pt: "Ver no mapa", ta: "வரைபடத்தில் காண்க", es: "Ver en el mapa", fr: "Voir sur la carte",
};
export const adminMapText = (locale: Locale) => labels[locale];
const closeLabels: Record<Locale, string> = {
  en: "Close panel", ms: "Tutup panel", zh: "关闭面板", ja: "パネルを閉じる", ko: "패널 닫기",
  pt: "Fechar painel", ta: "பலகையை மூடவும்", es: "Cerrar panel", fr: "Fermer le panneau",
};
export const adminPanelCloseText = (locale: Locale) => closeLabels[locale];
registerFeatureCopy(["viewOnMap", "closePanel"], (locale, key) => key === "closePanel" ? adminPanelCloseText(locale) : adminMapText(locale));
