import type { Locale } from "./i18n";

const en = {
  cancelRequest: "Cancel request", helpReceived: "Help received", cancelled: "Request cancelled", resolved: "Help received / resolved",
  confirmCancel: "Cancel this SOS request? It will leave the open queue, but its history will be kept.",
  confirmResolve: "Have you received help or no longer need assistance? This will close the SOS request.",
  confirm: "Confirm", keepOpen: "Keep request open", activeExists: "You already have an open SOS request. Manage it below instead of sending another.",
  saved: "SOS request closed", savedDetail: "The case is closed on this device. Check the sync status for cloud confirmation.",
  requests: "Your SOS requests", history: "Closed requests", showMore: "Show all requests", showLess: "Show fewer", newRequest: "For a new emergency, send a new SOS request.",
  syncUnavailable: "SOS live updates unavailable", syncDetail: "Check the cloud sync status before relying on another device's case status.", syncPending: "SOS saved on this device; cloud save pending",
};

export type SosCopyKey = keyof typeof en;
const copy: Record<Locale, Record<SosCopyKey, string>> = {
  en,
  ms: {
    cancelRequest: "Batalkan permintaan", helpReceived: "Bantuan diterima", cancelled: "Permintaan dibatalkan", resolved: "Bantuan diterima / selesai",
    confirmCancel: "Batalkan permintaan SOS ini? Permintaan akan dikeluarkan daripada senarai terbuka, tetapi sejarahnya disimpan.",
    confirmResolve: "Sudah menerima bantuan atau tidak lagi memerlukan bantuan? Ini akan menutup permintaan SOS.",
    confirm: "Sahkan", keepOpen: "Kekalkan permintaan terbuka", activeExists: "Anda sudah mempunyai permintaan SOS terbuka. Uruskannya di bawah dan jangan hantar permintaan baharu.",
    saved: "Permintaan SOS ditutup", savedDetail: "Kes ditutup pada peranti ini. Semak status penyegerakan untuk pengesahan awan.",
    requests: "Permintaan SOS anda", history: "Permintaan ditutup", showMore: "Tunjukkan semua permintaan", showLess: "Tunjukkan lebih sedikit", newRequest: "Untuk kecemasan baharu, hantar permintaan SOS baharu.",
    syncUnavailable: "Kemas kini SOS langsung tidak tersedia", syncDetail: "Semak status penyegerakan awan sebelum bergantung pada status kes di peranti lain.", syncPending: "SOS disimpan pada peranti ini; simpanan awan belum selesai",
  },
  zh: {
    cancelRequest: "取消请求", helpReceived: "已获得帮助", cancelled: "请求已取消", resolved: "已获得帮助／已解决",
    confirmCancel: "取消此 SOS 请求？它将从待处理列表中移除，但会保留历史记录。", confirmResolve: "您已获得帮助或不再需要协助吗？这将关闭 SOS 请求。",
    confirm: "确认", keepOpen: "保持请求待处理", activeExists: "您已有待处理的 SOS 请求。请在下方管理，而不是重复发送。",
    saved: "SOS 请求已关闭", savedDetail: "此设备上的请求已关闭。请查看同步状态以确认云端保存。",
    requests: "您的 SOS 请求", history: "已关闭的请求", showMore: "显示全部请求", showLess: "收起", newRequest: "如发生新的紧急情况，请发送新的 SOS 请求。",
    syncUnavailable: "SOS 实时更新不可用", syncDetail: "在依赖另一设备的案件状态前，请检查云端同步状态。", syncPending: "SOS 已保存在此设备；正在等待云端保存",
  },
  ja: {
    cancelRequest: "リクエストを取り消す", helpReceived: "支援を受けた", cancelled: "取り消し済み", resolved: "支援を受けた／解決済み",
    confirmCancel: "このSOSリクエストを取り消しますか？未対応一覧から除外されますが、履歴は残ります。", confirmResolve: "支援を受けた、または支援が不要になりましたか？SOSリクエストを終了します。",
    confirm: "確認", keepOpen: "リクエストを継続", activeExists: "対応中のSOSリクエストがあります。再送信せず、下で管理してください。",
    saved: "SOSリクエストを終了しました", savedDetail: "この端末で終了しました。クラウドへの保存は同期状態を確認してください。",
    requests: "あなたのSOSリクエスト", history: "終了したリクエスト", showMore: "すべて表示", showLess: "表示を減らす", newRequest: "新たな緊急事態では、新しいSOSリクエストを送信してください。",
    syncUnavailable: "SOSのリアルタイム更新を利用できません", syncDetail: "他の端末の対応状況を確認する前に、クラウドの同期状態を確認してください。", syncPending: "SOSをこの端末に保存しました。クラウドへの保存は保留中です",
  },
  ko: {
    cancelRequest: "요청 취소", helpReceived: "도움 받음", cancelled: "요청 취소됨", resolved: "도움 받음 / 해결됨",
    confirmCancel: "이 SOS 요청을 취소할까요? 미처리 목록에서 제외되지만 기록은 유지됩니다.", confirmResolve: "도움을 받았거나 더 이상 도움이 필요하지 않나요? SOS 요청을 종료합니다.",
    confirm: "확인", keepOpen: "요청 유지", activeExists: "이미 진행 중인 SOS 요청이 있습니다. 다시 보내지 말고 아래에서 관리하세요.",
    saved: "SOS 요청 종료됨", savedDetail: "이 기기에서 요청을 종료했습니다. 클라우드 저장 여부는 동기화 상태를 확인하세요.",
    requests: "내 SOS 요청", history: "종료된 요청", showMore: "모든 요청 보기", showLess: "간략히 보기", newRequest: "새로운 긴급 상황에는 새 SOS 요청을 보내세요.",
    syncUnavailable: "SOS 실시간 업데이트를 사용할 수 없습니다", syncDetail: "다른 기기의 처리 상태를 신뢰하기 전에 클라우드 동기화 상태를 확인하세요.", syncPending: "SOS를 이 기기에 저장했습니다. 클라우드 저장 대기 중입니다",
  },
  pt: {
    cancelRequest: "Cancelar pedido", helpReceived: "Ajuda recebida", cancelled: "Pedido cancelado", resolved: "Ajuda recebida / resolvido",
    confirmCancel: "Cancelar este pedido SOS? Será retirado da lista de pedidos abertos, mas o histórico será mantido.", confirmResolve: "Já recebeu ajuda ou deixou de precisar de assistência? Isto encerrará o pedido SOS.",
    confirm: "Confirmar", keepOpen: "Manter pedido aberto", activeExists: "Já tem um pedido SOS aberto. Faça a gestão abaixo em vez de enviar outro.",
    saved: "Pedido SOS encerrado", savedDetail: "O caso foi encerrado neste dispositivo. Consulte o estado de sincronização para confirmar a gravação na nuvem.",
    requests: "Os seus pedidos SOS", history: "Pedidos encerrados", showMore: "Mostrar todos os pedidos", showLess: "Mostrar menos", newRequest: "Para uma nova emergência, envie um novo pedido SOS.",
    syncUnavailable: "Atualizações SOS em tempo real indisponíveis", syncDetail: "Verifique a sincronização na nuvem antes de confiar no estado do caso noutro dispositivo.", syncPending: "SOS guardado neste dispositivo; gravação na nuvem pendente",
  },
  ta: {
    cancelRequest: "கோரிக்கையை ரத்துசெய்", helpReceived: "உதவி கிடைத்தது", cancelled: "கோரிக்கை ரத்துசெய்யப்பட்டது", resolved: "உதவி கிடைத்தது / தீர்க்கப்பட்டது",
    confirmCancel: "இந்த SOS கோரிக்கையை ரத்துசெய்யவா? திறந்த கோரிக்கைப் பட்டியலிலிருந்து நீக்கப்படும், ஆனால் வரலாறு பாதுகாக்கப்படும்.", confirmResolve: "உதவி கிடைத்துவிட்டதா அல்லது இனி உதவி தேவையில்லையா? இது SOS கோரிக்கையை முடிக்கும்.",
    confirm: "உறுதிப்படுத்து", keepOpen: "கோரிக்கையைத் திறந்த நிலையில் வை", activeExists: "ஏற்கெனவே திறந்த SOS கோரிக்கை உள்ளது. மீண்டும் அனுப்பாமல் கீழே நிர்வகிக்கவும்.",
    saved: "SOS கோரிக்கை முடிக்கப்பட்டது", savedDetail: "இந்தச் சாதனத்தில் கோரிக்கை முடிக்கப்பட்டது. மேகத்தில் சேமிக்கப்பட்டதை உறுதிசெய்ய ஒத்திசைவு நிலையைப் பார்க்கவும்.",
    requests: "உங்கள் SOS கோரிக்கைகள்", history: "முடிக்கப்பட்ட கோரிக்கைகள்", showMore: "அனைத்துக் கோரிக்கைகளையும் காட்டு", showLess: "குறைவாகக் காட்டு", newRequest: "புதிய அவசரநிலைக்கு புதிய SOS கோரிக்கையை அனுப்பவும்.",
    syncUnavailable: "SOS நேரடி புதுப்பிப்புகள் கிடைக்கவில்லை", syncDetail: "மற்றொரு சாதனத்தின் கோரிக்கை நிலையை நம்புவதற்கு முன் மேக ஒத்திசைவு நிலையைச் சரிபார்க்கவும்.", syncPending: "SOS இந்தச் சாதனத்தில் சேமிக்கப்பட்டது; மேகச் சேமிப்பு நிலுவையில் உள்ளது",
  },
  es: {
    cancelRequest: "Cancelar solicitud", helpReceived: "Ayuda recibida", cancelled: "Solicitud cancelada", resolved: "Ayuda recibida / resuelto",
    confirmCancel: "¿Cancelar esta solicitud SOS? Se retirará de la lista de solicitudes abiertas, pero se conservará su historial.", confirmResolve: "¿Has recibido ayuda o ya no necesitas asistencia? Esto cerrará la solicitud SOS.",
    confirm: "Confirmar", keepOpen: "Mantener solicitud abierta", activeExists: "Ya tienes una solicitud SOS abierta. Gestiónala abajo en lugar de enviar otra.",
    saved: "Solicitud SOS cerrada", savedDetail: "El caso se cerró en este dispositivo. Consulta el estado de sincronización para confirmar el guardado en la nube.",
    requests: "Tus solicitudes SOS", history: "Solicitudes cerradas", showMore: "Mostrar todas las solicitudes", showLess: "Mostrar menos", newRequest: "Para una nueva emergencia, envía una nueva solicitud SOS.",
    syncUnavailable: "Actualizaciones SOS en tiempo real no disponibles", syncDetail: "Comprueba la sincronización en la nube antes de confiar en el estado del caso en otro dispositivo.", syncPending: "SOS guardado en este dispositivo; guardado en la nube pendiente",
  },
  fr: {
    cancelRequest: "Annuler la demande", helpReceived: "Aide reçue", cancelled: "Demande annulée", resolved: "Aide reçue / résolu",
    confirmCancel: "Annuler cette demande SOS ? Elle sera retirée de la liste des demandes ouvertes, mais son historique sera conservé.", confirmResolve: "Avez-vous reçu de l’aide ou n’avez-vous plus besoin d’assistance ? Cela clôturera la demande SOS.",
    confirm: "Confirmer", keepOpen: "Garder la demande ouverte", activeExists: "Vous avez déjà une demande SOS ouverte. Gérez-la ci-dessous au lieu d’en envoyer une autre.",
    saved: "Demande SOS clôturée", savedDetail: "Le dossier est clôturé sur cet appareil. Consultez l’état de synchronisation pour confirmer l’enregistrement dans le cloud.",
    requests: "Vos demandes SOS", history: "Demandes clôturées", showMore: "Afficher toutes les demandes", showLess: "Afficher moins", newRequest: "Pour une nouvelle urgence, envoyez une nouvelle demande SOS.",
    syncUnavailable: "Mises à jour SOS en temps réel indisponibles", syncDetail: "Vérifiez la synchronisation dans le cloud avant de vous fier à l’état du dossier sur un autre appareil.", syncPending: "SOS enregistré sur cet appareil ; enregistrement dans le cloud en attente",
  },
};

export function sosText(locale: Locale, key: SosCopyKey) { return copy[locale][key]; }

export function englishSosSource(locale: Locale, text: string) {
  const key = (Object.keys(en) as SosCopyKey[]).find((key) => copy[locale][key] === text);
  return key ? en[key] : undefined;
}

export function translatedSosSource(locale: Locale, source: string) {
  const key = (Object.keys(en) as SosCopyKey[]).find((key) => en[key] === source);
  return key ? copy[locale][key] : undefined;
}
