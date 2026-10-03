import type { Locale } from "./i18n";

const english = {
  cancel: "Cancel",
  confirmAction: "Confirm SOS request",
  confirm: "Save an SOS request for app administrators? No police station or emergency service will be notified.",
  recorded: "SOS request recorded",
  withLocation: "Your location was attached for app administrator review. Emergency services were not contacted.",
  withoutLocation: "The request was recorded without a location. Emergency services were not contacted.",
  title: "Nearby police help",
  purpose: "Lost belongings or documents? Contact a police station for guidance.",
  notContacted: "This request stays within the app. Police have not been contacted.",
  distance: "Approximate straight-line distance; road distance may differ.",
  requestLocation: "Based on the location attached to your SOS.",
  currentLocation: "Based on your current location.",
  areaLocation: "Based on the selected area centre, not your GPS.",
  noStation: "No police station is listed within 50 km of this location. The directory is limited.",
  noLocation: "Allow location or choose an area to find a listed police station.",
  viewMap: "View map",
  directions: "Directions",
  source: "Official directory",
};

export type EmergencyHelpCopyKey = keyof typeof english;
const copy: Record<Locale, Record<EmergencyHelpCopyKey, string>> = {
  en: english,
  ms: {
    cancel: "Batal",
    confirmAction: "Sahkan permintaan SOS",
    confirm: "Simpan permintaan SOS untuk pentadbir aplikasi? Tiada balai polis atau perkhidmatan kecemasan akan dimaklumkan.",
    recorded: "Permintaan SOS direkodkan",
    withLocation: "Lokasi anda dilampirkan untuk semakan pentadbir aplikasi. Perkhidmatan kecemasan tidak dihubungi.",
    withoutLocation: "Permintaan direkodkan tanpa lokasi. Perkhidmatan kecemasan tidak dihubungi.",
    title: "Bantuan polis berdekatan", purpose: "Kehilangan barang atau dokumen? Hubungi balai polis untuk panduan.",
    notContacted: "Permintaan ini kekal dalam aplikasi. Polis tidak dihubungi.",
    distance: "Anggaran jarak garis lurus; jarak jalan mungkin berbeza.",
    requestLocation: "Berdasarkan lokasi yang dilampirkan pada SOS anda.", currentLocation: "Berdasarkan lokasi semasa anda.",
    areaLocation: "Berdasarkan pusat kawasan pilihan, bukan GPS anda.",
    noStation: "Tiada balai polis disenaraikan dalam lingkungan 50 km dari lokasi ini. Direktori ini terhad.",
    noLocation: "Benarkan lokasi atau pilih kawasan untuk mencari balai polis yang disenaraikan.",
    viewMap: "Lihat peta", directions: "Arah perjalanan", source: "Direktori rasmi",
  },
  zh: {
    cancel: "取消",
    confirmAction: "确认 SOS 请求",
    confirm: "为应用管理员保存 SOS 请求？不会通知任何警察局或紧急服务。", recorded: "SOS 请求已记录",
    withLocation: "您的位置已附加供应用管理员查看。未联系紧急服务。", withoutLocation: "请求已记录，但没有位置信息。未联系紧急服务。",
    title: "附近的警方帮助", purpose: "遗失物品或证件？请联系警察局寻求指引。", notContacted: "此请求仅保存在应用内。未联系警方。",
    distance: "估算的直线距离；道路距离可能不同。", requestLocation: "根据您的 SOS 所附位置。", currentLocation: "根据您的当前位置。",
    areaLocation: "根据所选地区的中心，而非您的 GPS 位置。", noStation: "目录中没有距此位置 50 公里以内的警察局。目录覆盖范围有限。",
    noLocation: "允许定位或选择地区以查找目录中的警察局。", viewMap: "查看地图", directions: "路线", source: "官方目录",
  },
  ja: {
    cancel: "キャンセル",
    confirmAction: "SOSリクエストを確認",
    confirm: "アプリ管理者へのSOSリクエストを保存しますか？警察署や緊急サービスには通知されません。", recorded: "SOSリクエストを記録しました",
    withLocation: "位置情報をアプリ管理者の確認用に添付しました。緊急サービスには連絡していません。", withoutLocation: "位置情報なしでリクエストを記録しました。緊急サービスには連絡していません。",
    title: "近くの警察署", purpose: "持ち物や書類をなくしましたか？警察署に相談してください。", notContacted: "このリクエストはアプリ内に保存されます。警察には連絡していません。",
    distance: "おおよその直線距離です。道路での距離とは異なる場合があります。", requestLocation: "SOSに添付された位置情報に基づきます。", currentLocation: "現在地に基づきます。",
    areaLocation: "GPSではなく、選択したエリアの中心に基づきます。", noStation: "この位置から50km以内に登録された警察署はありません。登録範囲は限られています。",
    noLocation: "位置情報を許可するか、エリアを選んで登録済みの警察署を探してください。", viewMap: "地図を見る", directions: "経路", source: "公式一覧",
  },
  ko: {
    cancel: "취소",
    confirmAction: "SOS 요청 확인",
    confirm: "앱 관리자에게 SOS 요청을 저장할까요? 경찰서나 긴급 서비스에는 알림이 전송되지 않습니다.", recorded: "SOS 요청이 기록되었습니다",
    withLocation: "앱 관리자 확인을 위해 위치를 첨부했습니다. 긴급 서비스에는 연락하지 않았습니다.", withoutLocation: "위치 없이 요청이 기록되었습니다. 긴급 서비스에는 연락하지 않았습니다.",
    title: "가까운 경찰서", purpose: "물건이나 서류를 잃어버렸나요? 경찰서에 문의하세요.", notContacted: "이 요청은 앱 안에만 저장됩니다. 경찰에는 연락하지 않았습니다.",
    distance: "대략적인 직선 거리이며 도로 거리는 다를 수 있습니다.", requestLocation: "SOS에 첨부된 위치를 기준으로 합니다.", currentLocation: "현재 위치를 기준으로 합니다.",
    areaLocation: "GPS가 아닌 선택한 지역 중심을 기준으로 합니다.", noStation: "이 위치에서 50km 이내에 등록된 경찰서가 없습니다. 목록의 범위는 제한적입니다.",
    noLocation: "위치를 허용하거나 지역을 선택하여 등록된 경찰서를 찾으세요.", viewMap: "지도 보기", directions: "길찾기", source: "공식 목록",
  },
  pt: {
    cancel: "Cancelar",
    confirmAction: "Confirmar pedido SOS",
    confirm: "Guardar um pedido SOS para os administradores da app? Nenhuma esquadra ou serviço de emergência será notificado.", recorded: "Pedido SOS registado",
    withLocation: "A sua localização foi anexada para análise pelos administradores. Os serviços de emergência não foram contactados.", withoutLocation: "O pedido foi registado sem localização. Os serviços de emergência não foram contactados.",
    title: "Ajuda policial nas proximidades", purpose: "Perdeu objetos ou documentos? Contacte uma esquadra para obter orientação.", notContacted: "Este pedido fica apenas na app. A polícia não foi contactada.",
    distance: "Distância aproximada em linha reta; a distância por estrada pode variar.", requestLocation: "Com base na localização anexada ao seu SOS.", currentLocation: "Com base na sua localização atual.",
    areaLocation: "Com base no centro da área selecionada, não no seu GPS.", noStation: "Não há esquadras listadas num raio de 50 km desta localização. O diretório é limitado.",
    noLocation: "Permita a localização ou escolha uma área para encontrar uma esquadra listada.", viewMap: "Ver mapa", directions: "Direções", source: "Diretório oficial",
  },
  ta: {
    cancel: "ரத்துசெய்",
    confirmAction: "SOS கோரிக்கையை உறுதிப்படுத்தவும்",
    confirm: "செயலி நிர்வாகிகளுக்கான SOS கோரிக்கையைச் சேமிக்கவா? காவல் நிலையத்திற்கோ அவசர சேவைக்கோ அறிவிப்பு அனுப்பப்படாது.", recorded: "SOS கோரிக்கை பதிவு செய்யப்பட்டது",
    withLocation: "செயலி நிர்வாகிகள் பார்வைக்காக உங்கள் இருப்பிடம் இணைக்கப்பட்டது. அவசர சேவைகள் தொடர்புகொள்ளப்படவில்லை.", withoutLocation: "இருப்பிடம் இல்லாமல் கோரிக்கை பதிவு செய்யப்பட்டது. அவசர சேவைகள் தொடர்புகொள்ளப்படவில்லை.",
    title: "அருகிலுள்ள காவல் உதவி", purpose: "பொருட்கள் அல்லது ஆவணங்கள் தொலைந்துவிட்டதா? வழிகாட்டுதலுக்கு காவல் நிலையத்தைத் தொடர்புகொள்ளுங்கள்.", notContacted: "இந்தக் கோரிக்கை செயலிக்குள் மட்டுமே உள்ளது. காவல்துறை தொடர்புகொள்ளப்படவில்லை.",
    distance: "தோராயமான நேர்கோட்டு தூரம்; சாலை தூரம் மாறுபடலாம்.", requestLocation: "உங்கள் SOS உடன் இணைக்கப்பட்ட இருப்பிடத்தின் அடிப்படையில்.", currentLocation: "உங்கள் தற்போதைய இருப்பிடத்தின் அடிப்படையில்.",
    areaLocation: "உங்கள் GPS அல்ல, தேர்ந்தெடுத்த பகுதியின் மையத்தின் அடிப்படையில்.", noStation: "இந்த இடத்திலிருந்து 50 கி.மீ.க்குள் பட்டியலில் காவல் நிலையம் இல்லை. பட்டியலின் வரம்பு குறைவானது.",
    noLocation: "பட்டியலிலுள்ள காவல் நிலையத்தைக் கண்டறிய இருப்பிடத்தை அனுமதிக்கவும் அல்லது பகுதியைத் தேர்ந்தெடுக்கவும்.", viewMap: "வரைபடம் பார்க்க", directions: "வழித்தடம்", source: "அதிகாரப்பூர்வ பட்டியல்",
  },
  es: {
    cancel: "Cancelar",
    confirmAction: "Confirmar solicitud SOS",
    confirm: "¿Guardar una solicitud SOS para los administradores de la app? No se notificará a ninguna comisaría ni servicio de emergencia.", recorded: "Solicitud SOS registrada",
    withLocation: "Se adjuntó tu ubicación para revisión de los administradores. No se contactó con los servicios de emergencia.", withoutLocation: "La solicitud se registró sin ubicación. No se contactó con los servicios de emergencia.",
    title: "Ayuda policial cercana", purpose: "¿Perdiste objetos o documentos? Contacta con una comisaría para recibir orientación.", notContacted: "Esta solicitud permanece en la app. No se contactó con la policía.",
    distance: "Distancia aproximada en línea recta; la distancia por carretera puede variar.", requestLocation: "Según la ubicación adjunta a tu SOS.", currentLocation: "Según tu ubicación actual.",
    areaLocation: "Según el centro de la zona elegida, no tu GPS.", noStation: "No hay comisarías registradas a menos de 50 km de esta ubicación. El directorio es limitado.",
    noLocation: "Permite la ubicación o elige una zona para encontrar una comisaría registrada.", viewMap: "Ver mapa", directions: "Cómo llegar", source: "Directorio oficial",
  },
  fr: {
    cancel: "Annuler",
    confirmAction: "Confirmer la demande SOS",
    confirm: "Enregistrer une demande SOS pour les administrateurs de l'application ? Aucun commissariat ni service d'urgence ne sera averti.", recorded: "Demande SOS enregistrée",
    withLocation: "Votre position a été jointe pour examen par les administrateurs. Les services d'urgence n'ont pas été contactés.", withoutLocation: "La demande a été enregistrée sans position. Les services d'urgence n'ont pas été contactés.",
    title: "Aide policière à proximité", purpose: "Objets ou documents perdus ? Contactez un commissariat pour obtenir des conseils.", notContacted: "Cette demande reste dans l'application. La police n'a pas été contactée.",
    distance: "Distance approximative à vol d'oiseau ; la distance routière peut différer.", requestLocation: "Selon la position jointe à votre SOS.", currentLocation: "Selon votre position actuelle.",
    areaLocation: "Selon le centre de la zone choisie, pas votre GPS.", noStation: "Aucun commissariat n'est répertorié à moins de 50 km de cette position. L'annuaire est limité.",
    noLocation: "Autorisez la localisation ou choisissez une zone pour trouver un commissariat répertorié.", viewMap: "Voir la carte", directions: "Itinéraire", source: "Annuaire officiel",
  },
};

export function emergencyHelpText(locale: Locale, key: EmergencyHelpCopyKey) {
  return copy[locale][key];
}

export function englishEmergencySource(locale: Locale, text: string) {
  const key = (Object.keys(english) as EmergencyHelpCopyKey[]).find((key) => copy[locale][key] === text);
  return key ? english[key] : undefined;
}

export function translatedEmergencySource(locale: Locale, source: string) {
  const key = (Object.keys(english) as EmergencyHelpCopyKey[]).find((key) => english[key] === source);
  return key ? copy[locale][key] : undefined;
}
