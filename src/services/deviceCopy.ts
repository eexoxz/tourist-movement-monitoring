import type { Locale } from "./i18n";

const en = {
  receiving: "GPS updates received", attention: "GPS needs attention", waiting: "Waiting for a GPS fix", stale: "No recent GPS update", background: "App is in the background",
  backgroundNote: "Your browser may pause location updates. Keep this page open for tracking.", signalNote: "Tracking is requested, but a fresh location is not confirmed yet.",
  privacyTitle: "Privacy on this device", privacyBody: "Remove downloaded profiles, route history and saved plan copies from this browser without deleting cloud records.",
  clearAction: "Clear downloads and sign out", confirmBody: "Tracking will stop and this browser's downloaded copies will be removed. Unsynced changes and itinerary drafts must be saved first. Cloud records will not be deleted.",
  pending: "Unsynced changes or itinerary drafts remain on this device. Save or sync them first; nothing has been removed.",
  failed: "Could not clear all downloaded copies. Nothing in the cloud was deleted. Please try again.", busy: "Clearing downloads…",
};
type Key = keyof typeof en;
const copy: Record<Locale, Record<Key, string>> = {
  en,
  ms: {
    receiving: "Kemas kini GPS diterima", attention: "GPS memerlukan perhatian", waiting: "Menunggu kedudukan GPS", stale: "Tiada kemas kini GPS terkini", background: "Aplikasi berada di latar belakang",
    backgroundNote: "Pelayar mungkin menjeda kemas kini lokasi. Biarkan halaman ini terbuka untuk penjejakan.", signalNote: "Penjejakan diminta, tetapi lokasi baharu belum disahkan.",
    privacyTitle: "Privasi pada peranti ini", privacyBody: "Buang profil, sejarah laluan dan salinan pelan yang dimuat turun daripada pelayar ini tanpa memadam rekod awan.",
    clearAction: "Kosongkan muat turun dan log keluar", confirmBody: "Penjejakan akan berhenti dan salinan muat turun pelayar ini akan dibuang. Simpan perubahan belum disegerakkan dan draf itinerari dahulu. Rekod awan tidak akan dipadam.",
    pending: "Masih ada perubahan belum disegerakkan atau draf itinerari pada peranti ini. Simpan atau segerakkannya dahulu; tiada apa-apa telah dibuang.",
    failed: "Tidak dapat membuang semua salinan muat turun. Tiada rekod awan dipadam. Sila cuba lagi.", busy: "Mengosongkan muat turun…",
  },
  zh: {
    receiving: "已收到 GPS 更新", attention: "GPS 需要处理", waiting: "正在等待 GPS 定位", stale: "近期未收到 GPS 更新", background: "应用处于后台",
    backgroundNote: "浏览器可能暂停位置更新。请保持此页面打开以进行追踪。", signalNote: "已请求追踪，但尚未确认新的位置。",
    privacyTitle: "此设备的隐私", privacyBody: "从此浏览器移除已下载的个人资料、路线历史和行程副本，不会删除云端记录。",
    clearAction: "清除下载并退出登录", confirmBody: "追踪将停止，此浏览器已下载的副本将被移除。请先保存未同步的更改和行程草稿。云端记录不会被删除。",
    pending: "此设备仍有未同步的更改或行程草稿。请先保存或同步；尚未移除任何内容。",
    failed: "未能清除所有已下载的副本。云端记录未被删除，请重试。", busy: "正在清除下载…",
  },
  ja: {
    receiving: "GPS の更新を受信済み", attention: "GPS の確認が必要です", waiting: "GPS の位置情報を待っています", stale: "最近の GPS 更新がありません", background: "アプリはバックグラウンドです",
    backgroundNote: "ブラウザーが位置情報の更新を一時停止する場合があります。追跡するにはこのページを開いたままにしてください。", signalNote: "追跡を要求していますが、新しい位置情報はまだ確認できていません。",
    privacyTitle: "この端末のプライバシー", privacyBody: "クラウドの記録を削除せずに、このブラウザーにダウンロードしたプロフィール、経路履歴、旅程のコピーを削除します。",
    clearAction: "ダウンロードを削除してログアウト", confirmBody: "追跡が停止し、このブラウザーにダウンロードしたコピーが削除されます。未同期の変更や旅程の下書きは先に保存してください。クラウドの記録は削除されません。",
    pending: "この端末には未同期の変更または旅程の下書きがあります。先に保存または同期してください。何も削除していません。",
    failed: "ダウンロードしたコピーをすべて削除できませんでした。クラウドの記録は削除していません。もう一度お試しください。", busy: "ダウンロードを削除中…",
  },
  ko: {
    receiving: "GPS 업데이트 수신됨", attention: "GPS 확인이 필요합니다", waiting: "GPS 위치를 기다리는 중", stale: "최근 GPS 업데이트 없음", background: "앱이 백그라운드에 있습니다",
    backgroundNote: "브라우저가 위치 업데이트를 일시 중지할 수 있습니다. 추적하려면 이 페이지를 열어 두세요.", signalNote: "추적을 요청했지만 새 위치는 아직 확인되지 않았습니다.",
    privacyTitle: "이 기기의 개인정보", privacyBody: "클라우드 기록을 삭제하지 않고 이 브라우저에 다운로드한 프로필, 경로 기록 및 일정 사본을 제거합니다.",
    clearAction: "다운로드 삭제 후 로그아웃", confirmBody: "추적이 중지되고 이 브라우저의 다운로드 사본이 제거됩니다. 동기화되지 않은 변경 사항과 일정 초안을 먼저 저장하세요. 클라우드 기록은 삭제되지 않습니다.",
    pending: "이 기기에 동기화되지 않은 변경 사항이나 일정 초안이 있습니다. 먼저 저장하거나 동기화하세요. 아무것도 제거하지 않았습니다.",
    failed: "다운로드 사본을 모두 삭제하지 못했습니다. 클라우드 기록은 삭제되지 않았습니다. 다시 시도해 주세요.", busy: "다운로드 삭제 중…",
  },
  pt: {
    receiving: "Atualizações GPS recebidas", attention: "O GPS precisa de atenção", waiting: "À espera de uma posição GPS", stale: "Sem atualização GPS recente", background: "A aplicação está em segundo plano",
    backgroundNote: "O navegador pode suspender as atualizações de localização. Mantenha esta página aberta para continuar o registo.", signalNote: "O registo foi solicitado, mas ainda não foi confirmada uma localização recente.",
    privacyTitle: "Privacidade neste dispositivo", privacyBody: "Remova deste navegador os perfis, históricos de percursos e cópias de planos descarregados, sem apagar os registos na nuvem.",
    clearAction: "Limpar dados descarregados e sair", confirmBody: "O registo de localização será interrompido e as cópias descarregadas neste navegador serão removidas. Guarde primeiro as alterações não sincronizadas e os rascunhos de itinerários. Os registos na nuvem não serão apagados.",
    pending: "Existem alterações não sincronizadas ou rascunhos de itinerários neste dispositivo. Guarde ou sincronize primeiro; nada foi removido.",
    failed: "Não foi possível remover todas as cópias descarregadas. Nenhum registo na nuvem foi apagado. Tente novamente.", busy: "A limpar dados descarregados…",
  },
  ta: {
    receiving: "GPS புதுப்பிப்புகள் பெறப்பட்டன", attention: "GPS-ஐச் சரிபார்க்க வேண்டும்", waiting: "GPS இருப்பிடத்திற்காகக் காத்திருக்கிறது", stale: "சமீபத்திய GPS புதுப்பிப்பு இல்லை", background: "செயலி பின்னணியில் உள்ளது",
    backgroundNote: "உலாவி இருப்பிடப் புதுப்பிப்புகளை இடைநிறுத்தக்கூடும். கண்காணிப்பிற்கு இந்தப் பக்கத்தைத் திறந்து வைத்திருக்கவும்.", signalNote: "கண்காணிப்பு கோரப்பட்டுள்ளது, ஆனால் புதிய இருப்பிடம் இன்னும் உறுதிசெய்யப்படவில்லை.",
    privacyTitle: "இந்தச் சாதனத்தின் தனியுரிமை", privacyBody: "மேகச் சேமிப்பகப் பதிவுகளை நீக்காமல், இந்த உலாவியில் பதிவிறக்கிய சுயவிவரங்கள், பாதை வரலாறு மற்றும் பயணத் திட்ட நகல்களை அகற்றவும்.",
    clearAction: "பதிவிறக்கங்களை அகற்றி வெளியேறு", confirmBody: "கண்காணிப்பு நிறுத்தப்பட்டு, இந்த உலாவியில் பதிவிறக்கிய நகல்கள் அகற்றப்படும். ஒத்திசைக்கப்படாத மாற்றங்களையும் பயணத் திட்ட வரைவுகளையும் முதலில் சேமிக்கவும். மேகச் சேமிப்பகப் பதிவுகள் நீக்கப்படாது.",
    pending: "இந்தச் சாதனத்தில் ஒத்திசைக்கப்படாத மாற்றங்கள் அல்லது பயணத் திட்ட வரைவுகள் உள்ளன. முதலில் சேமிக்கவும் அல்லது ஒத்திசைக்கவும்; எதுவும் அகற்றப்படவில்லை.",
    failed: "பதிவிறக்கிய அனைத்து நகல்களையும் அகற்ற முடியவில்லை. மேகச் சேமிப்பகத்தில் எதுவும் நீக்கப்படவில்லை. மீண்டும் முயற்சிக்கவும்.", busy: "பதிவிறக்கங்கள் அகற்றப்படுகின்றன…",
  },
  es: {
    receiving: "Actualizaciones GPS recibidas", attention: "El GPS necesita atención", waiting: "Esperando una posición GPS", stale: "Sin actualización GPS reciente", background: "La aplicación está en segundo plano",
    backgroundNote: "El navegador puede pausar las actualizaciones de ubicación. Mantén esta página abierta para registrar el recorrido.", signalNote: "Se ha solicitado el seguimiento, pero todavía no se ha confirmado una ubicación reciente.",
    privacyTitle: "Privacidad en este dispositivo", privacyBody: "Elimina de este navegador los perfiles, historiales de rutas y copias de planes descargados sin borrar los registros en la nube.",
    clearAction: "Borrar descargas y cerrar sesión", confirmBody: "El seguimiento se detendrá y se eliminarán las copias descargadas en este navegador. Guarda primero los cambios sin sincronizar y los borradores de itinerarios. No se borrarán los registros en la nube.",
    pending: "Quedan cambios sin sincronizar o borradores de itinerarios en este dispositivo. Guarda o sincroniza primero; no se ha eliminado nada.",
    failed: "No se pudieron eliminar todas las copias descargadas. No se borró nada de la nube. Inténtalo de nuevo.", busy: "Borrando descargas…",
  },
  fr: {
    receiving: "Mises à jour GPS reçues", attention: "Le GPS nécessite une vérification", waiting: "En attente d'une position GPS", stale: "Aucune mise à jour GPS récente", background: "L'application est en arrière-plan",
    backgroundNote: "Le navigateur peut suspendre les mises à jour de position. Gardez cette page ouverte pour enregistrer votre trajet.", signalNote: "Le suivi est demandé, mais aucune position récente n'a encore été confirmée.",
    privacyTitle: "Confidentialité sur cet appareil", privacyBody: "Supprimez de ce navigateur les profils, historiques de trajets et copies d'itinéraires téléchargés sans supprimer les données dans le cloud.",
    clearAction: "Effacer les téléchargements et se déconnecter", confirmBody: "Le suivi sera arrêté et les copies téléchargées dans ce navigateur seront supprimées. Enregistrez d'abord les modifications non synchronisées et les brouillons d'itinéraires. Les données dans le cloud ne seront pas supprimées.",
    pending: "Des modifications non synchronisées ou des brouillons d'itinéraires sont encore présents sur cet appareil. Enregistrez-les ou synchronisez-les d'abord ; rien n'a été supprimé.",
    failed: "Impossible de supprimer toutes les copies téléchargées. Aucune donnée dans le cloud n'a été supprimée. Réessayez.", busy: "Suppression des téléchargements…",
  },
};

export const deviceText = (locale: Locale, key: Key) => copy[locale][key];
export const deviceCopyKeys = Object.keys(en) as Key[];
