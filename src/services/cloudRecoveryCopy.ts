import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";
const copy: Record<Locale, [string, string]> = {
 en: ["Cloud usage limit reached", "The cloud service has reached a usage limit. Try again after its quota resets."],
 ms: ["Had penggunaan awan dicapai", "Perkhidmatan awan telah mencapai had penggunaan. Cuba lagi selepas kuotanya ditetapkan semula."],
 zh: ["已达到云端使用限额", "云端服务已达到使用限额。请在配额重置后重试。"],
 ja: ["クラウドの利用上限に達しました", "クラウドサービスの利用上限に達しました。割り当てがリセットされてから再試行してください。"],
 ko: ["클라우드 사용 한도에 도달했습니다", "클라우드 서비스 사용 한도에 도달했습니다. 할당량이 초기화된 후 다시 시도하세요."],
 pt: ["Limite de utilização da nuvem atingido", "O serviço na nuvem atingiu um limite de utilização. Tente novamente após a reposição da quota."],
 ta: ["கிளவுட் பயன்பாட்டு வரம்பு எட்டப்பட்டது", "கிளவுட் சேவை பயன்பாட்டு வரம்பை எட்டியுள்ளது. ஒதுக்கீடு மீட்டமைக்கப்பட்ட பிறகு மீண்டும் முயற்சிக்கவும்."],
 es: ["Se alcanzó el límite de uso de la nube", "El servicio en la nube ha alcanzado un límite de uso. Inténtalo de nuevo cuando se restablezca la cuota."],
 fr: ["Limite d'utilisation du cloud atteinte", "Le service cloud a atteint une limite d'utilisation. Réessayez après la réinitialisation du quota."],
};
export function cloudRecoveryText(locale: Locale, key: "quota" | "quotaDetail") { return copy[locale][key === "quota" ? 0 : 1]; }
registerFeatureCopy(["quota", "quotaDetail"], cloudRecoveryText);
