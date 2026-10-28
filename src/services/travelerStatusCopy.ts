import { registerFeatureCopy } from "./featureTranslations";
import type { Locale } from "./i18n";

const en = {
  listening: "Listening for GPS", paused: "GPS is not running", latest: "Last accepted location",
  local: "Stored on this device", cloud: "Latest sync result",
  interest: "Matches your interest: {category}",
  distance: "Straight-line distance, not journey time.",
  basis: "Shared activity covers the last 7 days and requires at least 3 recorded visitors per place. Exact counts stay private; this is not a live crowd count.",
};
type Key = keyof typeof en;
const copy: Record<Locale, Record<Key, string>> = {
  en,
  ms: {
    listening: "Menunggu bacaan GPS", paused: "GPS tidak berjalan", latest: "Lokasi terakhir diterima", local: "Disimpan pada peranti ini", cloud: "Hasil penyegerakan terakhir",
    interest: "Sepadan dengan minat anda: {category}", distance: "Jarak garis lurus, bukan masa perjalanan.",
    basis: "Aktiviti dikongsi meliputi 7 hari terakhir dan memerlukan sekurang-kurangnya 3 pelawat yang direkodkan bagi setiap tempat. Bilangan tepat kekal peribadi; ini bukan kiraan orang ramai secara langsung.",
  },
  zh: {
    listening: "正在等待 GPS 定位", paused: "GPS 未运行", latest: "最后接受的定位", local: "已存储在此设备", cloud: "最近一次同步结果",
    interest: "符合您的兴趣：{category}", distance: "此为直线距离，并非行程时间。",
    basis: "共享活动涵盖最近7天，每个地点至少有3名已记录访客才会发布。确切人数保持私密；这不是实时人流统计。",
  },
  ja: {
    listening: "GPS の受信待ち", paused: "GPS は停止中", latest: "最後に採用した位置情報", local: "この端末に保存済み", cloud: "直近の同期結果",
    interest: "興味のある分野に一致：{category}", distance: "直線距離です。移動時間ではありません。",
    basis: "共有される活動は過去7日間が対象で、各スポットに少なくとも3人の訪問記録が必要です。正確な人数は非公開です。リアルタイムの混雑人数ではありません。",
  },
  ko: {
    listening: "GPS 수신 대기 중", paused: "GPS가 실행되고 있지 않습니다", latest: "마지막으로 수락한 위치", local: "이 기기에 저장됨", cloud: "최근 동기화 결과",
    interest: "관심사와 일치: {category}", distance: "직선 거리이며 이동 시간이 아닙니다.",
    basis: "공유 활동은 최근 7일을 대상으로 하며 장소마다 기록된 방문자가 최소 3명이어야 합니다. 정확한 인원은 비공개이며 실시간 혼잡 인원이 아닙니다.",
  },
  pt: {
    listening: "À espera de leituras GPS", paused: "O GPS não está ativo", latest: "Última localização aceite", local: "Guardado neste dispositivo", cloud: "Resultado da última sincronização",
    interest: "Corresponde ao seu interesse: {category}", distance: "Distância em linha reta, não tempo de viagem.",
    basis: "A atividade partilhada abrange os últimos 7 dias e exige pelo menos 3 visitantes registados por local. Os números exatos são privados; não é uma contagem de pessoas em tempo real.",
  },
  ta: {
    listening: "GPS தகவலுக்காகக் காத்திருக்கிறது", paused: "GPS இயங்கவில்லை", latest: "கடைசியாக ஏற்றுக்கொள்ளப்பட்ட இருப்பிடம்", local: "இந்தச் சாதனத்தில் சேமிக்கப்பட்டது", cloud: "கடைசி ஒத்திசைவு முடிவு",
    interest: "உங்கள் விருப்பத்துடன் பொருந்துகிறது: {category}", distance: "இது நேர்கோட்டுத் தூரம்; பயண நேரம் அல்ல.",
    basis: "பகிரப்படும் செயல்பாடு கடந்த 7 நாட்களை உள்ளடக்கும். ஒவ்வொரு இடத்திற்கும் குறைந்தது 3 பதிவு செய்யப்பட்ட வருகையாளர்கள் தேவை. துல்லியமான எண்ணிக்கை தனிப்பட்டதாக இருக்கும்; இது நேரடிக் கூட்ட எண்ணிக்கை அல்ல.",
  },
  es: {
    listening: "Esperando lecturas GPS", paused: "El GPS no está activo", latest: "Última ubicación aceptada", local: "Guardado en este dispositivo", cloud: "Resultado de la última sincronización",
    interest: "Coincide con tu interés: {category}", distance: "Distancia en línea recta, no tiempo de viaje.",
    basis: "La actividad compartida abarca los últimos 7 días y requiere al menos 3 visitantes registrados por lugar. Las cifras exactas son privadas; no es un recuento de personas en tiempo real.",
  },
  fr: {
    listening: "En attente de positions GPS", paused: "Le GPS est arrêté", latest: "Dernière position acceptée", local: "Enregistré sur cet appareil", cloud: "Résultat de la dernière synchronisation",
    interest: "Correspond à votre intérêt : {category}", distance: "Distance à vol d'oiseau, pas une durée de trajet.",
    basis: "L'activité partagée couvre les 7 derniers jours et nécessite au moins 3 visiteurs enregistrés par lieu. Les nombres exacts restent privés ; ce n'est pas un comptage de foule en temps réel.",
  },
};
export const travelerStatusText = (locale: Locale, key: Key) => copy[locale][key];

registerFeatureCopy(Object.keys(en) as (keyof typeof en)[], travelerStatusText);
