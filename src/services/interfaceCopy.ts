import { registerFeatureCopy } from "./featureTranslations";
import type { Locale } from "./i18n";

const en = { tools: "Data tools", guide: "Plan your visit", details: "Event details", filters: "Filter events", attention: "Needs your attention", recording: "Recording", locationAttention: "Location needs attention", more: "More about this place" };
type Key = keyof typeof en;
const copy: Record<Locale, Record<Key, string>> = {
  en,
  ms: { tools: "Alat data", guide: "Rancang lawatan anda", details: "Butiran acara", filters: "Tapis acara", attention: "Memerlukan perhatian anda", recording: "Sedang merekod", locationAttention: "Lokasi memerlukan perhatian", more: "Maklumat lanjut tentang tempat ini" },
  zh: { tools: "数据工具", guide: "规划您的游览", details: "活动详情", filters: "筛选活动", attention: "需要您处理", recording: "正在记录", locationAttention: "需要检查定位", more: "更多地点信息" },
  ja: { tools: "データ管理ツール", guide: "訪問の計画", details: "イベントの詳細", filters: "イベントを絞り込む", attention: "対応が必要です", recording: "記録中", locationAttention: "位置情報の確認が必要です", more: "このスポットの詳細" },
  ko: { tools: "데이터 도구", guide: "방문 계획", details: "이벤트 상세 정보", filters: "이벤트 필터", attention: "확인이 필요합니다", recording: "기록 중", locationAttention: "위치 확인이 필요합니다", more: "이 장소에 대한 자세한 정보" },
  pt: { tools: "Ferramentas de dados", guide: "Planeie a sua visita", details: "Detalhes do evento", filters: "Filtrar eventos", attention: "Requer a sua atenção", recording: "A registar", locationAttention: "A localização requer atenção", more: "Mais sobre este local" },
  ta: { tools: "தரவு கருவிகள்", guide: "உங்கள் வருகையைத் திட்டமிடுங்கள்", details: "நிகழ்வு விவரங்கள்", filters: "நிகழ்வுகளை வடிகட்டு", attention: "உங்கள் கவனம் தேவை", recording: "பதிவாகிறது", locationAttention: "இருப்பிடத்தைச் சரிபார்க்க வேண்டும்", more: "இந்த இடத்தைப் பற்றிய கூடுதல் தகவல்" },
  es: { tools: "Herramientas de datos", guide: "Planifica tu visita", details: "Detalles del evento", filters: "Filtrar eventos", attention: "Requiere tu atención", recording: "Grabando", locationAttention: "Revisa la ubicación", more: "Más sobre este lugar" },
  fr: { tools: "Outils de données", guide: "Préparez votre visite", details: "Détails de l'événement", filters: "Filtrer les événements", attention: "À traiter", recording: "Enregistrement en cours", locationAttention: "Position à vérifier", more: "En savoir plus sur ce lieu" },
};
export const interfaceKeys = Object.keys(en) as Key[];
export const interfaceText = (locale: Locale, key: Key) => copy[locale][key];

registerFeatureCopy(Object.keys(en) as (keyof typeof en)[], interfaceText);
