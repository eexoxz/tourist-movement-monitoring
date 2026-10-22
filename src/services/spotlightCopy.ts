import type { Locale } from "./i18n";

const en = { title: "Discover Malaysia", previous: "Previous spotlight", next: "Next spotlight", pause: "Pause slideshow", play: "Play slideshow", slide: "Slide", national: "Across Malaysia" };
export type SpotlightKey = keyof typeof en;
const copy: Record<Locale, Record<SpotlightKey, string>> = {
  en,
  ms: { title: "Terokai Malaysia", previous: "Sorotan sebelumnya", next: "Sorotan seterusnya", pause: "Jeda tayangan slaid", play: "Mainkan tayangan slaid", slide: "Slaid", national: "Seluruh Malaysia" },
  zh: { title: "探索马来西亚", previous: "上一个精选", next: "下一个精选", pause: "暂停轮播", play: "播放轮播", slide: "幻灯片", national: "马来西亚全国精选" },
  ja: { title: "マレーシアを探索", previous: "前の特集", next: "次の特集", pause: "スライドショーを一時停止", play: "スライドショーを再生", slide: "スライド", national: "マレーシア全国から" },
  ko: { title: "말레이시아 둘러보기", previous: "이전 추천", next: "다음 추천", pause: "슬라이드 쇼 일시 정지", play: "슬라이드 쇼 재생", slide: "슬라이드", national: "말레이시아 전역" },
  pt: { title: "Descubra a Malásia", previous: "Destaque anterior", next: "Próximo destaque", pause: "Pausar apresentação", play: "Reproduzir apresentação", slide: "Diapositivo", national: "Por toda a Malásia" },
  ta: { title: "மலேசியாவை ஆராயுங்கள்", previous: "முந்தைய சிறப்பிடம்", next: "அடுத்த சிறப்பிடம்", pause: "ஸ்லைடு காட்சியை இடைநிறுத்து", play: "ஸ்லைடு காட்சியை இயக்கு", slide: "ஸ்லைடு", national: "மலேசியா முழுவதும்" },
  es: { title: "Descubre Malasia", previous: "Destacado anterior", next: "Siguiente destacado", pause: "Pausar presentación", play: "Reproducir presentación", slide: "Diapositiva", national: "Por toda Malasia" },
  fr: { title: "Découvrez la Malaisie", previous: "Sélection précédente", next: "Sélection suivante", pause: "Mettre le diaporama en pause", play: "Lancer le diaporama", slide: "Diapositive", national: "À travers la Malaisie" },
};

export function spotlightText(locale: Locale, key: SpotlightKey) { return copy[locale][key]; }
