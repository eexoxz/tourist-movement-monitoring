import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";

const keys = ["sample", "viewActivity", "recent", "empty", "filtered"] as const;
type Key = typeof keys[number];

const copy: Record<Locale, readonly [string, string, string, string, string]> = {
  en: ["Sample", "View movement activity", "{count} tracked tourists nearby in the last 24 hours · {average} per day over the preceding 7 days", "No new movement alerts in the last 24 hours.", "Trips contributing to the alert for {place}"],
  ms: ["Sampel", "Lihat aktiviti pergerakan", "{count} pelancong direkodkan berdekatan dalam 24 jam terakhir · {average} sehari dalam 7 hari sebelumnya", "Tiada amaran pergerakan baharu dalam 24 jam terakhir.", "Perjalanan yang mencetuskan amaran untuk {place}"],
  zh: ["示例", "查看活动记录", "过去24小时记录到{count}名游客在附近活动 · 此前7天日均{average}人", "过去24小时没有新的活动提醒。", "触发{place}提醒的行程"],
  ja: ["サンプル", "移動記録を見る", "過去24時間に付近で記録された観光客は{count}人 · その前の7日間は1日平均{average}人", "過去24時間に新しい移動アラートはありません。", "{place}のアラートの根拠となった移動記録"],
  ko: ["샘플", "이동 활동 보기", "최근 24시간 동안 주변에서 기록된 관광객 {count}명 · 그 이전 7일의 일평균 {average}명", "최근 24시간 동안 새로운 이동 알림이 없습니다.", "{place} 알림의 근거가 된 이동 기록"],
  pt: ["Amostra", "Ver atividade de deslocação", "{count} turistas registados nas proximidades nas últimas 24 horas · {average} por dia nos 7 dias anteriores", "Sem novos alertas de movimento nas últimas 24 horas.", "Percursos que contribuíram para o alerta de {place}"],
  ta: ["மாதிரி", "நகர்வுப் பதிவுகளைக் காண்க", "கடந்த 24 மணிநேரத்தில் அருகில் பதிவான சுற்றுலாப் பயணிகள் {count} பேர் · அதற்கு முந்தைய 7 நாட்களில் தினசரி சராசரி {average} பேர்", "கடந்த 24 மணிநேரத்தில் புதிய நகர்வு எச்சரிக்கைகள் இல்லை.", "{place} எச்சரிக்கைக்குப் பங்களித்த பயணங்கள்"],
  es: ["Muestra", "Ver actividad de movimiento", "{count} turistas registrados en las inmediaciones en las últimas 24 horas · {average} al día durante los 7 días anteriores", "No hay nuevas alertas de movimiento en las últimas 24 horas.", "Trayectos que contribuyeron a la alerta de {place}"],
  fr: ["Exemple", "Voir les déplacements", "{count} touristes détectés à proximité ces dernières 24 heures · {average} par jour durant les 7 jours précédents", "Aucune nouvelle alerte de déplacement ces dernières 24 heures.", "Trajets à l’origine de l’alerte pour {place}"],
};

export function movementAlertText(locale: Locale, key: Key, values: Record<string, string> = {}) {
  return copy[locale][keys.indexOf(key)].replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token);
}

registerFeatureCopy(keys, movementAlertText);
