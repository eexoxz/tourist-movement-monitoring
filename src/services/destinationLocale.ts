import type { Destination, DestinationCategory } from "../types";
import type { Locale } from "./i18n";

type DestinationCopy = Pick<Destination, "name" | "city" | "description" | "openingHours" | "feeNote" | "visitTips" | "imageAlt">;

const cityNames: Partial<Record<Locale, Record<string, string>>> = {
  zh: {
    "Federal Territories": "联邦直辖区",
    Ipoh: "怡保",
    "Kota Kinabalu": "亚庇",
    Kuching: "古晋",
    "Kuala Lumpur": "吉隆坡",
    Melaka: "马六甲",
    Penang: "槟城",
    Perak: "霹雳",
    Putrajaya: "布城",
    Sabah: "沙巴",
    Sarawak: "砂拉越",
    Selangor: "雪兰莪",
  },
  ms: {
    "Federal Territories": "Wilayah Persekutuan",
    Melaka: "Melaka",
    Penang: "Pulau Pinang",
  },
  ja: {
    "Kota Kinabalu": "コタキナバル",
    "Kuala Lumpur": "クアラルンプール",
    Melaka: "マラッカ",
    Penang: "ペナン",
    Putrajaya: "プトラジャヤ",
    Sabah: "サバ",
    Sarawak: "サラワク",
    Selangor: "セランゴール",
  },
  ko: {
    "Kota Kinabalu": "코타키나발루",
    "Kuala Lumpur": "쿠알라룸푸르",
    Melaka: "말라카",
    Penang: "페낭",
    Putrajaya: "푸트라자야",
    Sabah: "사바",
    Sarawak: "사라왁",
    Selangor: "셀랑고르",
  },
  pt: {
    "Kota Kinabalu": "Kota Kinabalu",
    "Kuala Lumpur": "Kuala Lumpur",
    Melaka: "Melaka",
    Penang: "Penang",
  },
  ta: {
    "Kota Kinabalu": "கோட்டா கினபாலு",
    "Kuala Lumpur": "கோலாலம்பூர்",
    Melaka: "மலாக்கா",
    Penang: "பினாங்கு",
    Putrajaya: "புத்ராஜெயா",
    Sabah: "சபா",
    Sarawak: "சரவாக்",
    Selangor: "சிலாங்கூர்",
  },
  es: {
    "Kota Kinabalu": "Kota Kinabalu",
    "Kuala Lumpur": "Kuala Lumpur",
    Melaka: "Melaka",
    Penang: "Penang",
  },
  fr: {
    "Kota Kinabalu": "Kota Kinabalu",
    "Kuala Lumpur": "Kuala Lumpur",
    Melaka: "Melaka",
    Penang: "Penang",
  },
};

const chineseDestinationNames: Record<string, string> = {
  "batu-caves": "黑风洞",
  "central-market": "中央艺术坊",
  "concubine-lane": "二奶巷",
  "george-town-heritage-zone": "乔治市古迹区",
  "hin-bus-depot": "Hin Bus Depot 创意园",
  "islamic-arts-museum": "马来西亚伊斯兰艺术博物馆",
  "kampung-baru-kl": "甘榜峇鲁",
  "kek-lok-si-temple": "极乐寺",
  "klcc-park": "KLCC 公园",
  "kwai-chai-hong": "鬼仔巷",
  "mari-mari-cultural-village": "Mari Mari 文化村",
  "merdeka-square": "独立广场",
  "penang-hill": "升旗山",
  "perdana-botanical-garden": "国家植物园",
  "sarawak-cultural-village": "砂拉越文化村",
  "semenggoh-nature-reserve": "实蒙谷自然保护区",
  "taman-botani-putrajaya": "布城植物园",
  "tanjung-aru": "丹绒亚路海滩",
  "thean-hou-temple": "天后宫",
};

const categoryDescriptions: Record<Locale, Record<DestinationCategory, string>> = {
  en: {
    coastal: "A coastal destination in {city} with scenery, relaxed walks, and visitor activity.",
    cultural: "A cultural destination in {city} with visitor activity, local identity, and useful trip-planning value.",
    food: "A food-focused destination in {city} with local dining, casual stops, and nearby visitor movement.",
    heritage: "A heritage destination in {city} with historic streets, architecture, and cultural walking routes.",
    nature: "A nature destination in {city} with outdoor space, scenery, and slower visitor movement.",
    urban: "An urban destination in {city} with shops, public spaces, cafes, and city activity.",
  },
  ms: {
    coastal: "Destinasi pantai di {city} dengan pemandangan, laluan santai dan aktiviti pelawat.",
    cultural: "Destinasi budaya di {city} dengan identiti tempatan, aktiviti pelawat dan nilai perancangan perjalanan.",
    food: "Destinasi makanan di {city} dengan pilihan makan tempatan, hentian santai dan pergerakan pelawat berhampiran.",
    heritage: "Destinasi warisan di {city} dengan jalan bersejarah, seni bina dan laluan berjalan budaya.",
    nature: "Destinasi alam semula jadi di {city} dengan ruang luar, pemandangan dan pergerakan pelawat yang lebih santai.",
    urban: "Destinasi bandar di {city} dengan kedai, ruang awam, kafe dan aktiviti bandar.",
  },
  zh: {
    coastal: "{city} 的海滨景点，适合看风景、散步，并观察游客流动。",
    cultural: "{city} 的文化景点，适合了解本地特色，也能作为行程规划参考。",
    food: "{city} 的美食地点，适合安排用餐、短暂停留，并观察附近人流。",
    heritage: "{city} 的历史文化地点，适合步行探索建筑、街区和文化路线。",
    nature: "{city} 的自然景点，适合户外活动、看风景和较轻松的行程。",
    urban: "{city} 的城市景点，周边有商店、公共空间、咖啡馆和城市活动。",
  },
  ja: {
    coastal: "{city}の海沿いスポットです。景色、散歩、来訪者の動きを確認できます。",
    cultural: "{city}の文化スポットです。地域らしさを知り、旅行計画にも役立ちます。",
    food: "{city}の食のスポットです。食事、短い立ち寄り、周辺の人の流れを確認できます。",
    heritage: "{city}の歴史スポットです。街並み、建築、文化的な徒歩ルートを楽しめます。",
    nature: "{city}の自然スポットです。屋外空間、景色、ゆったりした行程に向いています。",
    urban: "{city}の都市スポットです。店舗、公共空間、カフェ、街の活動があります。",
  },
  ko: {
    coastal: "{city}의 해안 명소로, 풍경과 산책, 방문객 흐름을 확인하기 좋습니다.",
    cultural: "{city}의 문화 명소로, 지역 정체성과 여행 계획에 도움이 되는 방문 정보를 제공합니다.",
    food: "{city}의 음식 중심 장소로, 식사와 짧은 방문, 주변 이동 흐름을 확인하기 좋습니다.",
    heritage: "{city}의 유산 명소로, 역사 거리와 건축, 문화 도보 코스를 살펴볼 수 있습니다.",
    nature: "{city}의 자연 명소로, 야외 공간과 풍경, 여유로운 일정에 적합합니다.",
    urban: "{city}의 도시 명소로, 상점과 공공 공간, 카페, 도시 활동이 있습니다.",
  },
  pt: {
    coastal: "Destino costeiro em {city}, útil para paisagens, caminhadas leves e movimento de visitantes.",
    cultural: "Destino cultural em {city}, útil para conhecer a identidade local e planear a viagem.",
    food: "Destino gastronómico em {city}, com comida local, paragens rápidas e movimento próximo.",
    heritage: "Destino patrimonial em {city}, com ruas históricas, arquitetura e rotas culturais a pé.",
    nature: "Destino de natureza em {city}, com espaço exterior, paisagem e movimento mais calmo.",
    urban: "Destino urbano em {city}, com lojas, espaços públicos, cafés e atividade da cidade.",
  },
  ta: {
    coastal: "{city} பகுதியில் உள்ள கடற்கரை இடம். காட்சி, நடைபயணம் மற்றும் பயணிகள் நகர்வுக்கு ஏற்றது.",
    cultural: "{city} பகுதியில் உள்ள கலாச்சார இடம். உள்ளூர் அடையாளத்தையும் பயண திட்டமிடலையும் புரிந்துகொள்ள உதவும்.",
    food: "{city} பகுதியில் உள்ள உணவு மையமான இடம். உணவு, குறுகிய நிறுத்தம் மற்றும் அருகிலுள்ள நகர்வுக்கு ஏற்றது.",
    heritage: "{city} பகுதியில் உள்ள பாரம்பரிய இடம். வரலாற்று தெருக்கள், கட்டிடங்கள் மற்றும் கலாச்சார நடைபாதைகள் உள்ளன.",
    nature: "{city} பகுதியில் உள்ள இயற்கை இடம். வெளிப்புறம், காட்சி மற்றும் அமைதியான பயணத்திற்கு ஏற்றது.",
    urban: "{city} பகுதியில் உள்ள நகர இடம். கடைகள், பொது இடங்கள், கஃபேக்கள் மற்றும் நகர செயற்பாடுகள் உள்ளன.",
  },
  es: {
    coastal: "Destino costero en {city}, útil para vistas, paseos tranquilos y movimiento de visitantes.",
    cultural: "Destino cultural en {city}, útil para conocer la identidad local y planificar la visita.",
    food: "Destino gastronómico en {city}, con comida local, paradas cortas y movimiento cercano.",
    heritage: "Destino patrimonial en {city}, con calles históricas, arquitectura y rutas culturales a pie.",
    nature: "Destino natural en {city}, con espacios al aire libre, paisaje y un ritmo más tranquilo.",
    urban: "Destino urbano en {city}, con tiendas, espacios públicos, cafés y actividad de ciudad.",
  },
  fr: {
    coastal: "Destination côtière à {city}, utile pour les vues, les promenades et le mouvement des visiteurs.",
    cultural: "Destination culturelle à {city}, utile pour découvrir l'identité locale et planifier la visite.",
    food: "Destination gastronomique à {city}, avec cuisine locale, courts arrêts et mouvement proche.",
    heritage: "Destination patrimoniale à {city}, avec rues historiques, architecture et parcours culturels à pied.",
    nature: "Destination nature à {city}, avec espaces extérieurs, paysages et rythme plus calme.",
    urban: "Destination urbaine à {city}, avec boutiques, espaces publics, cafés et activité de ville.",
  },
};

const practicalCopy: Record<Locale, Pick<DestinationCopy, "openingHours" | "feeNote" | "visitTips">> = {
  en: {
    openingHours: "Check the latest local opening hours before visiting, especially during public holidays.",
    feeNote: "Fees may vary by section, ticket counter, activity, or operator.",
    visitTips: ["Check busy periods before going.", "Pair this stop with nearby places if you have extra time."],
  },
  ms: {
    openingHours: "Semak waktu operasi tempatan sebelum melawat, terutama ketika cuti umum.",
    feeNote: "Bayaran mungkin berbeza mengikut bahagian, kaunter tiket, aktiviti atau pengendali.",
    visitTips: ["Semak waktu sibuk sebelum pergi.", "Gabungkan hentian ini dengan tempat berhampiran jika ada masa tambahan."],
  },
  zh: {
    openingHours: "参观前请查看当地最新开放时间，尤其是在公共假期期间。",
    feeNote: "费用可能会因区域、售票处、活动或经营者而有所不同。",
    visitTips: ["出发前先查看人流较多的时段。", "如果时间充裕，可以把这里和附近景点一起安排。"],
  },
  ja: {
    openingHours: "訪問前に最新の現地営業時間を確認してください。祝日は特に注意してください。",
    feeNote: "料金はエリア、チケット窓口、アクティビティ、運営者によって変わる場合があります。",
    visitTips: ["混みやすい時間を確認してから向かいましょう。", "時間があれば近くのスポットと組み合わせると便利です。"],
  },
  ko: {
    openingHours: "방문 전 최신 현지 운영 시간을 확인하세요. 공휴일에는 특히 확인이 필요합니다.",
    feeNote: "요금은 구역, 매표소, 활동 또는 운영자에 따라 달라질 수 있습니다.",
    visitTips: ["가기 전에 혼잡한 시간대를 확인하세요.", "시간이 있다면 가까운 장소와 함께 일정에 넣어 보세요."],
  },
  pt: {
    openingHours: "Verifique os horários locais mais recentes antes da visita, sobretudo em feriados.",
    feeNote: "As taxas podem variar por zona, bilheteira, atividade ou operador.",
    visitTips: ["Verifique os períodos de maior movimento antes de ir.", "Combine esta paragem com locais próximos se tiver tempo."],
  },
  ta: {
    openingHours: "செல்லும் முன் சமீபத்திய உள்ளூர் திறப்பு நேரத்தைச் சரிபார்க்கவும், குறிப்பாக பொது விடுமுறைகளில்.",
    feeNote: "பகுதி, டிக்கெட் கவுண்டர், செயல்பாடு அல்லது நிர்வாகியைப் பொறுத்து கட்டணம் மாறலாம்.",
    visitTips: ["செல்லும் முன் கூட்டமான நேரங்களைப் பார்க்கவும்.", "நேரம் இருந்தால் அருகிலுள்ள இடங்களுடன் இதையும் சேர்த்து திட்டமிடவும்."],
  },
  es: {
    openingHours: "Consulta los horarios locales más recientes antes de visitar, especialmente en días festivos.",
    feeNote: "Las tarifas pueden variar según la zona, taquilla, actividad u operador.",
    visitTips: ["Revisa los periodos de mayor afluencia antes de ir.", "Combina esta parada con lugares cercanos si tienes tiempo."],
  },
  fr: {
    openingHours: "Vérifiez les horaires locaux les plus récents avant la visite, surtout pendant les jours fériés.",
    feeNote: "Les frais peuvent varier selon la zone, le guichet, l'activité ou l'opérateur.",
    visitTips: ["Vérifiez les périodes les plus fréquentées avant de partir.", "Associez cet arrêt à des lieux proches si vous avez du temps."],
  },
};

function localCity(destination: Destination, locale: Locale) {
  return cityNames[locale]?.[destination.city] ?? destination.city;
}

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((current, [key, value]) => current.replaceAll(`{${key}}`, value), template);
}

export function localizeDestination(destination: Destination, locale: Locale): Destination {
  if (locale === "en") {
    return destination;
  }

  const city = localCity(destination, locale);
  const copy = practicalCopy[locale] ?? practicalCopy.en;
  const descriptionTemplate = categoryDescriptions[locale]?.[destination.category] ?? categoryDescriptions.en[destination.category];

  return {
    ...destination,
    name: locale === "zh" ? chineseDestinationNames[destination.id] ?? destination.name : destination.name,
    city,
    description: interpolate(descriptionTemplate, { city }),
    openingHours: copy.openingHours,
    feeNote: copy.feeNote,
    visitTips: copy.visitTips,
    imageAlt: `${locale === "zh" ? chineseDestinationNames[destination.id] ?? destination.name : destination.name}`,
  };
}

export function localizeDestinations(destinations: Destination[], locale: Locale) {
  return locale === "en" ? destinations : destinations.map((destination) => localizeDestination(destination, locale));
}
