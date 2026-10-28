import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";

const copy: Record<Locale, { cloud: string; backup: string; quota: string; quotaDetail: string; network: string }> = {
  en: { cloud: "Firestore collections", backup: "Firestore collections + local backup", quota: "Cloud service temporarily limited", quotaDetail: "Cloud data cannot be refreshed right now. Please try again later.", network: "Connection failed. Check your internet connection and try again." },
  ms: { cloud: "Koleksi Firestore", backup: "Koleksi Firestore + sandaran setempat", quota: "Perkhidmatan awan dihadkan buat sementara", quotaDetail: "Data awan tidak dapat dikemas kini sekarang. Sila cuba lagi kemudian.", network: "Sambungan gagal. Semak sambungan internet dan cuba lagi." },
  zh: { cloud: "Firestore 云端数据", backup: "Firestore 云端数据及本地备份", quota: "云端服务暂时受限", quotaDetail: "目前无法刷新云端数据，请稍后重试。", network: "连接失败，请检查网络后重试。" },
  ja: { cloud: "Firestoreのデータ", backup: "Firestoreのデータと端末のバックアップ", quota: "クラウドサービスは一時的に制限されています", quotaDetail: "現在クラウドデータを更新できません。しばらくしてから再試行してください。", network: "接続できませんでした。インターネット接続を確認して再試行してください。" },
  ko: { cloud: "Firestore 데이터", backup: "Firestore 데이터 및 기기 백업", quota: "클라우드 서비스가 일시적으로 제한되었습니다", quotaDetail: "지금은 클라우드 데이터를 새로 고칠 수 없습니다. 나중에 다시 시도하세요.", network: "연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요." },
  pt: { cloud: "Coleções do Firestore", backup: "Coleções do Firestore + cópia local", quota: "Serviço na nuvem temporariamente limitado", quotaDetail: "Não é possível atualizar os dados na nuvem agora. Tente novamente mais tarde.", network: "A ligação falhou. Verifique a Internet e tente novamente." },
  ta: { cloud: "Firestore தரவுத் தொகுப்புகள்", backup: "Firestore தரவுத் தொகுப்புகள் மற்றும் சாதனக் காப்புப்பிரதி", quota: "கிளவுட் சேவை தற்காலிகமாகக் கட்டுப்படுத்தப்பட்டுள்ளது", quotaDetail: "இப்போது கிளவுட் தரவைப் புதுப்பிக்க முடியாது. பின்னர் மீண்டும் முயற்சிக்கவும்.", network: "இணைப்பு தோல்வியடைந்தது. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்." },
  es: { cloud: "Colecciones de Firestore", backup: "Colecciones de Firestore + copia local", quota: "Servicio en la nube limitado temporalmente", quotaDetail: "No se pueden actualizar los datos en la nube ahora. Inténtalo más tarde.", network: "La conexión falló. Comprueba Internet e inténtalo de nuevo." },
  fr: { cloud: "Collections Firestore", backup: "Collections Firestore + copie locale", quota: "Service cloud temporairement limité", quotaDetail: "Les données du cloud ne peuvent pas être actualisées pour le moment. Réessayez plus tard.", network: "La connexion a échoué. Vérifiez votre connexion Internet et réessayez." },
};
registerFeatureCopy(["cloud", "backup", "quota", "quotaDetail", "network"] as const, (locale, key) => copy[locale][key]);
