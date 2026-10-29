import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";

const en = { resetView: "Reset view", directory: "Tourist directory", viewTrip: "View trip", backRecords: "Back to movement records", options: "Trip options", visited: "Places visited", similar: "Explore similar places" };
type Key = keyof typeof en;
const copy: Record<Locale, Record<Key, string>> = {
  en,
  ms: { resetView: "Tetapkan semula paparan", directory: "Direktori pelancong", viewTrip: "Lihat perjalanan", backRecords: "Kembali ke rekod pergerakan", options: "Pilihan perjalanan", visited: "Tempat dilawati", similar: "Terokai tempat serupa" },
  zh: { resetView: "重置视图", directory: "游客名录", viewTrip: "查看旅程", backRecords: "返回移动记录", options: "旅程选项", visited: "到访地点", similar: "探索类似地点" },
  ja: { resetView: "表示をリセット", directory: "旅行者一覧", viewTrip: "旅の詳細を見る", backRecords: "移動記録に戻る", options: "旅のオプション", visited: "訪問した場所", similar: "似た場所を探す" },
  ko: { resetView: "보기 초기화", directory: "관광객 목록", viewTrip: "여행 보기", backRecords: "이동 기록으로 돌아가기", options: "여행 옵션", visited: "방문한 장소", similar: "비슷한 장소 둘러보기" },
  pt: { resetView: "Repor vista", directory: "Diretório de turistas", viewTrip: "Ver viagem", backRecords: "Voltar aos registos de movimento", options: "Opções da viagem", visited: "Locais visitados", similar: "Explorar locais semelhantes" },
  ta: { resetView: "காட்சியை மீட்டமை", directory: "சுற்றுலாப் பயணிகள் பட்டியல்", viewTrip: "பயணத்தைப் பார்", backRecords: "நகர்வுப் பதிவுகளுக்குத் திரும்பு", options: "பயண விருப்பங்கள்", visited: "பார்வையிட்ட இடங்கள்", similar: "ஒத்த இடங்களை ஆராய்" },
  es: { resetView: "Restablecer vista", directory: "Directorio de turistas", viewTrip: "Ver viaje", backRecords: "Volver a registros de movimiento", options: "Opciones del viaje", visited: "Lugares visitados", similar: "Explorar lugares similares" },
  fr: { resetView: "Réinitialiser la vue", directory: "Répertoire des touristes", viewTrip: "Voir le voyage", backRecords: "Retour aux déplacements", options: "Options du voyage", visited: "Lieux visités", similar: "Explorer des lieux similaires" },
};
export const tripLayoutKeys = Object.keys(en) as Key[];
export const tripLayoutText = (locale: Locale, key: Key) => copy[locale][key];
registerFeatureCopy(tripLayoutKeys, tripLayoutText);
