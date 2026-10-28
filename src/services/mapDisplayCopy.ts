import type { Locale } from "./i18n";
const words: Record<Locale, string[]> = {
  en: ["{count} movement records loaded", "{real} GPS · {sample} sample", "{count} places", "View all Malaysia", "Numbered circles group places; dots show movement records.", "Nearby activity counts may overlap between places.", "Places in this group", "Close place group"],
  ms: ["{count} rekod pergerakan dimuatkan", "{real} GPS · {sample} contoh", "{count} tempat", "Lihat seluruh Malaysia", "Bulatan bernombor mengumpulkan tempat; titik menunjukkan rekod pergerakan.", "Bilangan aktiviti berhampiran boleh bertindih antara tempat.", "Tempat dalam kumpulan ini", "Tutup kumpulan tempat"],
  zh: ["已加载 {count} 条移动记录", "{real} 条 GPS · {sample} 条示例", "{count} 个地点", "查看全马", "数字圆圈代表地点分组；圆点代表移动记录。", "同一移动记录可能计入多个附近地点。", "此分组中的地点", "关闭地点分组"],
  ja: ["移動記録{count}件を読み込み済み", "GPS {real}件 · サンプル{sample}件", "{count}か所", "マレーシア全域を表示", "数字の円は観光地のグループ、点は移動記録を表します。", "近隣の活動数は複数の場所で重複する場合があります。", "このグループの観光地", "観光地グループを閉じる"],
  ko: ["이동 기록 {count}개 불러옴", "GPS {real}개 · 샘플 {sample}개", "장소 {count}곳", "말레이시아 전체 보기", "숫자 원은 장소 묶음이며 점은 이동 기록입니다.", "주변 활동 수는 여러 장소에 중복 집계될 수 있습니다.", "이 그룹의 장소", "장소 그룹 닫기"],
  pt: ["{count} registos de movimento carregados", "{real} GPS · {sample} exemplos", "{count} locais", "Ver toda a Malásia", "Os círculos numerados agrupam locais; os pontos mostram registos de movimento.", "As contagens de atividade próxima podem sobrepor-se entre locais.", "Locais neste grupo", "Fechar grupo de locais"],
  ta: ["{count} நகர்வு பதிவுகள் ஏற்றப்பட்டன", "{real} GPS · {sample} மாதிரி", "{count} இடங்கள்", "மலேசியா முழுவதையும் காண்க", "எண் வட்டங்கள் இடக் குழுக்களையும் புள்ளிகள் நகர்வு பதிவுகளையும் காட்டுகின்றன.", "அருகிலுள்ள செயல்பாட்டு எண்ணிக்கைகள் இடங்களுக்கு இடையே ஒன்றுடன் ஒன்று பொருந்தலாம்.", "இந்தக் குழுவிலுள்ள இடங்கள்", "இடக் குழுவை மூடவும்"],
  es: ["{count} registros de movimiento cargados", "{real} GPS · {sample} de muestra", "{count} lugares", "Ver toda Malasia", "Los círculos numerados agrupan lugares; los puntos muestran registros de movimiento.", "Los recuentos de actividad cercana pueden solaparse entre lugares.", "Lugares de este grupo", "Cerrar grupo de lugares"],
  fr: ["{count} relevés de déplacement chargés", "{real} GPS · {sample} exemples", "{count} lieux", "Voir toute la Malaisie", "Les cercles numérotés regroupent les lieux ; les points représentent les déplacements.", "Les comptages d’activité à proximité peuvent se chevaucher entre lieux.", "Lieux de ce groupe", "Fermer le groupe de lieux"],
};
const keys = ["loaded", "sources", "places", "national", "help", "overlap", "group", "close"] as const;
export function mapDisplayText(locale: Locale, key: typeof keys[number], values: Record<string, number> = {}) {
  return words[locale][keys.indexOf(key)].replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] === undefined ? placeholder : new Intl.NumberFormat(locale).format(values[name]));
}
