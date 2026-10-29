import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";

const keys = ["active", "history", "all", "filter", "emptyActive", "emptyHistory", "description"] as const;
type Key = typeof keys[number];
const copy: Record<Locale, Record<Key, string>> = {
  en: { description: "Manage SOS requests and incident reports. Find completed cases in resolved history.", active: "Active cases", history: "Resolved history", all: "All cases", filter: "Filter safety cases", emptyActive: "No active safety cases.", emptyHistory: "No resolved safety cases yet." },
  ms: { description: "Urus permintaan SOS dan laporan insiden. Lihat kes yang telah selesai dalam sejarah kes selesai.", active: "Kes aktif", history: "Sejarah kes selesai", all: "Semua kes", filter: "Tapis kes keselamatan", emptyActive: "Tiada kes keselamatan aktif.", emptyHistory: "Belum ada kes keselamatan yang selesai." },
  zh: { description: "处理SOS求助和事件报告。已处理完毕的事件可在已解决记录中查看。", active: "待处理事件", history: "已解决记录", all: "全部事件", filter: "筛选安全事件", emptyActive: "目前没有待处理的安全事件。", emptyHistory: "暂无已解决的安全事件。" },
  ja: { description: "SOS要請と事故・事件の報告に対応します。対応済みの案件は解決済みの履歴で確認できます。", active: "対応中の案件", history: "解決済みの履歴", all: "すべての案件", filter: "安全案件の絞り込み", emptyActive: "対応中の安全案件はありません。", emptyHistory: "解決済みの安全案件はまだありません。" },
  ko: { description: "SOS 요청과 사고 신고를 관리하세요. 처리된 사건은 해결된 사건 기록에서 확인할 수 있습니다.", active: "처리 중인 사건", history: "해결된 사건 기록", all: "모든 사건", filter: "안전 사건 필터", emptyActive: "처리 중인 안전 사건이 없습니다.", emptyHistory: "아직 해결된 안전 사건이 없습니다." },
  pt: { description: "Gerencie pedidos SOS e relatos de incidentes. Consulte os casos concluídos no histórico de casos resolvidos.", active: "Casos ativos", history: "Histórico de casos resolvidos", all: "Todos os casos", filter: "Filtrar casos de segurança", emptyActive: "Não há casos de segurança ativos.", emptyHistory: "Ainda não há casos de segurança resolvidos." },
  ta: { description: "SOS கோரிக்கைகளையும் சம்பவ அறிக்கைகளையும் நிர்வகிக்கவும். முடிக்கப்பட்ட சம்பவங்களைத் தீர்க்கப்பட்ட சம்பவங்களின் பட்டியலில் காணலாம்.", active: "நடப்பில் உள்ள சம்பவங்கள்", history: "தீர்க்கப்பட்ட சம்பவங்கள்", all: "அனைத்து சம்பவங்கள்", filter: "பாதுகாப்புச் சம்பவங்களை வடிகட்டவும்", emptyActive: "நடப்பில் பாதுகாப்புச் சம்பவங்கள் எதுவும் இல்லை.", emptyHistory: "இன்னும் தீர்க்கப்பட்ட பாதுகாப்புச் சம்பவங்கள் இல்லை." },
  es: { description: "Gestiona solicitudes SOS e informes de incidentes. Consulta los casos cerrados en el historial de casos resueltos.", active: "Casos activos", history: "Historial de casos resueltos", all: "Todos los casos", filter: "Filtrar casos de seguridad", emptyActive: "No hay casos de seguridad activos.", emptyHistory: "Aún no hay casos de seguridad resueltos." },
  fr: { description: "Gérez les demandes SOS et les signalements. Retrouvez les cas clôturés dans l’historique des cas résolus.", active: "Cas en cours", history: "Historique des cas résolus", all: "Tous les cas", filter: "Filtrer les cas de sécurité", emptyActive: "Aucun cas de sécurité en cours.", emptyHistory: "Aucun cas de sécurité résolu pour le moment." },
};
export const adminSafetyText = (locale: Locale, key: Key) => copy[locale][key];
registerFeatureCopy(keys, adminSafetyText);
