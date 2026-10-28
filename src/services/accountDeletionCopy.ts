import { registerFeatureCopy } from "./featureTranslations";
import type { Locale } from "./i18n";

const en = {
  title: "Delete account", description: "Permanently remove your tourist account and its private records. Export anything you want to keep first.",
  warning: "This cannot be undone. Your profile, trips, check-ins, safety reports, itineraries, unsaved drafts and pending changes will be removed. Shared catalogue places stay available. A minimal deletion lock without your email or profile is retained to block old sessions.",
  action: "Delete my account", agree: "I understand that my account and private records will be permanently deleted.", confirm: "Permanently delete my account",
  resume: "Complete account deletion", resumeBody: "Deletion has started. Some records may already be removed and cannot be restored. Enter your password to safely finish; you can sign out and return later.",
  verifying: "Checking your password…", records: "Removing private records…", profile: "Removing your profile…", authentication: "Removing your account login…",
  badPassword: "The password could not be verified. Check it and try again.", failed: "Deletion did not finish. Check your connection and try again. Your login is removed only after private-data cleanup succeeds.",
  unavailable: "Self-deletion is available only for your own tourist account.", session: "Sign in to the same account again to continue deletion.",
  local: "Browser cleanup could not finish. Allow browser storage and retry. Cloud records already removed cannot be restored.",
  deleted: "Your account was deleted. You can register again using the same email address.",
};
export type DeletionCopyKey = keyof typeof en;
const copy: Record<Locale, Record<DeletionCopyKey, string>> = {
  en,
  ms: {
    title: "Padam akaun", description: "Padam akaun pelancong dan rekod peribadi anda secara kekal. Eksport maklumat yang ingin disimpan dahulu.",
    warning: "Tindakan ini tidak boleh dibatalkan. Profil, perjalanan, daftar masuk, laporan keselamatan, itinerari, draf dan perubahan belum disegerakkan akan dipadam. Tempat dalam katalog bersama dikekalkan. Kunci pemadaman minimum tanpa e-mel atau profil anda dikekalkan untuk menyekat sesi lama.",
    action: "Padam akaun saya", agree: "Saya faham bahawa akaun dan rekod peribadi saya akan dipadam secara kekal.", confirm: "Padam akaun saya secara kekal",
    resume: "Selesaikan pemadaman akaun", resumeBody: "Pemadaman telah bermula. Sesetengah rekod mungkin telah dipadam dan tidak boleh dipulihkan. Masukkan kata laluan untuk menyelesaikannya dengan selamat; anda boleh log keluar dan kembali kemudian.",
    verifying: "Menyemak kata laluan…", records: "Memadam rekod peribadi…", profile: "Memadam profil…", authentication: "Memadam log masuk akaun…",
    badPassword: "Kata laluan tidak dapat disahkan. Semak dan cuba lagi.", failed: "Pemadaman belum selesai. Semak sambungan dan cuba lagi. Log masuk hanya dipadam selepas pembersihan data peribadi berjaya.",
    unavailable: "Pemadaman sendiri hanya tersedia untuk akaun pelancong anda sendiri.", session: "Log masuk semula ke akaun yang sama untuk meneruskan pemadaman.",
    local: "Pembersihan pelayar belum selesai. Benarkan storan pelayar dan cuba lagi. Rekod awan yang telah dipadam tidak boleh dipulihkan.", deleted: "Akaun anda telah dipadam. Anda boleh mendaftar semula menggunakan alamat e-mel yang sama.",
  },
  zh: {
    title: "删除账户", description: "永久删除您的游客账户及其私人记录。请先导出需要保留的资料。",
    warning: "此操作无法撤销。您的个人资料、旅行、签到、安全报告、行程计划、未保存草稿及待同步更改将被删除。共享目录中的地点会保留。系统会保留一个不含您的邮箱或个人资料的最小删除锁，以阻止旧会话写入数据。",
    action: "删除我的账户", agree: "我理解我的账户及私人记录将被永久删除。", confirm: "永久删除我的账户",
    resume: "完成账户删除", resumeBody: "删除已开始。部分记录可能已被删除，无法恢复。请输入密码以安全完成删除；您也可以退出登录，稍后继续。",
    verifying: "正在验证密码…", records: "正在删除私人记录…", profile: "正在删除个人资料…", authentication: "正在删除账户登录信息…",
    badPassword: "无法验证密码。请检查后重试。", failed: "删除尚未完成。请检查网络后重试。只有在私人数据清理成功后，才会删除账户登录信息。",
    unavailable: "只能删除您自己的游客账户。", session: "请重新登录同一账户以继续删除。",
    local: "浏览器清理未完成。请允许浏览器存储后重试。已删除的云端记录无法恢复。", deleted: "您的账户已删除。您可以使用同一邮箱重新注册。",
  },
  ja: {
    title: "アカウントを削除", description: "旅行者アカウントと非公開の記録を完全に削除します。残したい情報は先にエクスポートしてください。",
    warning: "この操作は取り消せません。プロフィール、旅行、チェックイン、安全報告、旅程、未保存の下書き、未同期の変更が削除されます。共有カタログの場所は残ります。古いセッションからの書き込みを防ぐため、メールやプロフィールを含まない最小限の削除ロックは保持されます。",
    action: "自分のアカウントを削除", agree: "アカウントと非公開の記録が完全に削除されることを理解しました。", confirm: "自分のアカウントを完全に削除",
    resume: "アカウントの削除を完了", resumeBody: "削除が始まっています。一部の記録はすでに削除され、復元できない場合があります。パスワードを入力して安全に完了してください。ログアウトして後で再開することもできます。",
    verifying: "パスワードを確認中…", records: "非公開の記録を削除中…", profile: "プロフィールを削除中…", authentication: "アカウントのログイン情報を削除中…",
    badPassword: "パスワードを確認できませんでした。確認して再試行してください。", failed: "削除は完了していません。接続を確認して再試行してください。非公開データの削除に成功した後にのみ、ログイン情報が削除されます。",
    unavailable: "削除できるのは自分の旅行者アカウントのみです。", session: "削除を続けるには同じアカウントに再度ログインしてください。",
    local: "ブラウザー内の削除が完了しませんでした。ストレージを許可して再試行してください。削除済みのクラウド記録は復元できません。", deleted: "アカウントを削除しました。同じメールアドレスで再登録できます。",
  },
  ko: {
    title: "계정 삭제", description: "여행자 계정과 비공개 기록을 영구적으로 삭제합니다. 보관할 정보는 먼저 내보내세요.",
    warning: "이 작업은 취소할 수 없습니다. 프로필, 여행, 체크인, 안전 신고, 일정, 저장하지 않은 초안 및 동기화 대기 중인 변경 사항이 삭제됩니다. 공유 목록의 장소는 유지됩니다. 이전 세션의 쓰기를 차단하기 위해 이메일이나 프로필을 포함하지 않는 최소한의 삭제 잠금은 보관됩니다.",
    action: "내 계정 삭제", agree: "내 계정과 비공개 기록이 영구적으로 삭제됨을 이해합니다.", confirm: "내 계정 영구 삭제",
    resume: "계정 삭제 완료하기", resumeBody: "삭제가 시작되었습니다. 일부 기록은 이미 삭제되어 복원할 수 없을 수 있습니다. 비밀번호를 입력하여 안전하게 완료하세요. 로그아웃한 후 나중에 계속할 수도 있습니다.",
    verifying: "비밀번호 확인 중…", records: "비공개 기록 삭제 중…", profile: "프로필 삭제 중…", authentication: "계정 로그인 정보 삭제 중…",
    badPassword: "비밀번호를 확인할 수 없습니다. 확인 후 다시 시도하세요.", failed: "삭제가 완료되지 않았습니다. 연결을 확인하고 다시 시도하세요. 비공개 데이터 정리가 성공한 후에만 로그인 정보가 삭제됩니다.",
    unavailable: "본인의 여행자 계정만 삭제할 수 있습니다.", session: "삭제를 계속하려면 같은 계정으로 다시 로그인하세요.",
    local: "브라우저 정리를 완료하지 못했습니다. 브라우저 저장소를 허용한 후 다시 시도하세요. 이미 삭제된 클라우드 기록은 복원할 수 없습니다.", deleted: "계정이 삭제되었습니다. 같은 이메일 주소로 다시 가입할 수 있습니다.",
  },
  pt: {
    title: "Eliminar conta", description: "Elimine permanentemente a sua conta de turista e os registos privados. Exporte primeiro o que pretende guardar.",
    warning: "Esta ação não pode ser anulada. O perfil, viagens, entradas em atrações, relatos de segurança, itinerários, rascunhos e alterações pendentes serão eliminados. Os locais do catálogo partilhado serão mantidos. É conservado um bloqueio mínimo de eliminação, sem email nem perfil, para impedir escritas de sessões antigas.",
    action: "Eliminar a minha conta", agree: "Compreendo que a minha conta e os registos privados serão eliminados permanentemente.", confirm: "Eliminar permanentemente a minha conta",
    resume: "Concluir eliminação da conta", resumeBody: "A eliminação já começou. Alguns registos podem ter sido removidos e não podem ser recuperados. Introduza a palavra-passe para concluir com segurança; pode sair e voltar mais tarde.",
    verifying: "A verificar a palavra-passe…", records: "A eliminar registos privados…", profile: "A eliminar o perfil…", authentication: "A eliminar o acesso à conta…",
    badPassword: "Não foi possível verificar a palavra-passe. Confirme e tente novamente.", failed: "A eliminação não terminou. Verifique a ligação e tente novamente. O acesso só é eliminado depois de a limpeza dos dados privados terminar com sucesso.",
    unavailable: "Só pode eliminar a sua própria conta de turista.", session: "Inicie sessão novamente na mesma conta para continuar a eliminação.",
    local: "Não foi possível concluir a limpeza do navegador. Permita o armazenamento e tente novamente. Os registos já eliminados da nuvem não podem ser recuperados.", deleted: "A sua conta foi eliminada. Pode registar-se novamente com o mesmo endereço de email.",
  },
  ta: {
    title: "கணக்கை நீக்கு", description: "உங்கள் சுற்றுலாப் பயணி கணக்கையும் தனிப்பட்ட பதிவுகளையும் நிரந்தரமாக நீக்கவும். வைத்திருக்க விரும்பும் தகவல்களை முதலில் ஏற்றுமதி செய்யவும்.",
    warning: "இந்தச் செயலை மாற்ற முடியாது. சுயவிவரம், பயணங்கள், வருகைப் பதிவுகள், பாதுகாப்பு அறிக்கைகள், பயணத் திட்டங்கள், சேமிக்காத வரைவுகள் மற்றும் நிலுவை மாற்றங்கள் நீக்கப்படும். பகிரப்பட்ட பட்டியலிலுள்ள இடங்கள் இருக்கும். பழைய அமர்வுகள் தரவை எழுதுவதைத் தடுக்க, மின்னஞ்சல் அல்லது சுயவிவரம் இல்லாத குறைந்தபட்ச நீக்கப் பூட்டு தக்கவைக்கப்படும்.",
    action: "என் கணக்கை நீக்கு", agree: "என் கணக்கும் தனிப்பட்ட பதிவுகளும் நிரந்தரமாக நீக்கப்படும் என்பதைப் புரிந்துகொள்கிறேன்.", confirm: "என் கணக்கை நிரந்தரமாக நீக்கு",
    resume: "கணக்கு நீக்கத்தை முடிக்கவும்", resumeBody: "நீக்கம் தொடங்கிவிட்டது. சில பதிவுகள் ஏற்கனவே நீக்கப்பட்டிருக்கலாம்; அவற்றை மீட்டெடுக்க முடியாது. பாதுகாப்பாக முடிக்க கடவுச்சொல்லை உள்ளிடவும். வெளியேறிவிட்டுப் பின்னர் தொடரலாம்.",
    verifying: "கடவுச்சொல் சரிபார்க்கப்படுகிறது…", records: "தனிப்பட்ட பதிவுகள் நீக்கப்படுகின்றன…", profile: "சுயவிவரம் நீக்கப்படுகிறது…", authentication: "கணக்கு உள்நுழைவு நீக்கப்படுகிறது…",
    badPassword: "கடவுச்சொல்லைச் சரிபார்க்க முடியவில்லை. சரிபார்த்து மீண்டும் முயற்சிக்கவும்.", failed: "நீக்கம் முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும். தனிப்பட்ட தரவு அகற்றப்பட்ட பிறகே உள்நுழைவு நீக்கப்படும்.",
    unavailable: "உங்கள் சொந்த சுற்றுலாப் பயணி கணக்கை மட்டுமே நீக்க முடியும்.", session: "நீக்கத்தைத் தொடர அதே கணக்கில் மீண்டும் உள்நுழையவும்.",
    local: "உலாவித் தரவை அகற்ற முடியவில்லை. உலாவிச் சேமிப்பை அனுமதித்து மீண்டும் முயற்சிக்கவும். ஏற்கனவே நீக்கிய மேகப் பதிவுகளை மீட்டெடுக்க முடியாது.", deleted: "உங்கள் கணக்கு நீக்கப்பட்டது. அதே மின்னஞ்சல் முகவரியுடன் மீண்டும் பதிவு செய்யலாம்.",
  },
  es: {
    title: "Eliminar cuenta", description: "Elimina permanentemente tu cuenta de turista y sus registros privados. Exporta primero lo que quieras conservar.",
    warning: "Esta acción no se puede deshacer. Se eliminarán tu perfil, viajes, visitas, informes de seguridad, itinerarios, borradores y cambios pendientes. Los lugares del catálogo compartido se conservarán. Se mantiene un bloqueo mínimo de eliminación, sin tu correo ni perfil, para impedir escrituras desde sesiones antiguas.",
    action: "Eliminar mi cuenta", agree: "Entiendo que mi cuenta y mis registros privados se eliminarán permanentemente.", confirm: "Eliminar mi cuenta permanentemente",
    resume: "Completar la eliminación", resumeBody: "La eliminación ha comenzado. Es posible que algunos registros ya se hayan eliminado y no se puedan recuperar. Introduce tu contraseña para terminar de forma segura; puedes cerrar sesión y volver después.",
    verifying: "Verificando contraseña…", records: "Eliminando registros privados…", profile: "Eliminando tu perfil…", authentication: "Eliminando el acceso a tu cuenta…",
    badPassword: "No se pudo verificar la contraseña. Revísala e inténtalo de nuevo.", failed: "La eliminación no terminó. Comprueba tu conexión e inténtalo de nuevo. El acceso solo se elimina después de limpiar correctamente los datos privados.",
    unavailable: "Solo puedes eliminar tu propia cuenta de turista.", session: "Vuelve a iniciar sesión en la misma cuenta para continuar la eliminación.",
    local: "No se pudo completar la limpieza del navegador. Permite el almacenamiento y vuelve a intentarlo. Los registros ya eliminados de la nube no se pueden recuperar.", deleted: "Tu cuenta se ha eliminado. Puedes registrarte de nuevo con el mismo correo electrónico.",
  },
  fr: {
    title: "Supprimer le compte", description: "Supprimez définitivement votre compte de touriste et ses données privées. Exportez d'abord ce que vous souhaitez conserver.",
    warning: "Cette action est irréversible. Votre profil, trajets, visites, signalements, itinéraires, brouillons et modifications en attente seront supprimés. Les lieux du catalogue partagé seront conservés. Un verrou minimal de suppression, sans votre email ni profil, est conservé pour bloquer les écritures des anciennes sessions.",
    action: "Supprimer mon compte", agree: "Je comprends que mon compte et mes données privées seront définitivement supprimés.", confirm: "Supprimer définitivement mon compte",
    resume: "Terminer la suppression du compte", resumeBody: "La suppression a commencé. Certaines données peuvent déjà avoir été supprimées et ne sont pas récupérables. Saisissez votre mot de passe pour terminer en sécurité ; vous pouvez vous déconnecter et revenir plus tard.",
    verifying: "Vérification du mot de passe…", records: "Suppression des données privées…", profile: "Suppression du profil…", authentication: "Suppression de l'accès au compte…",
    badPassword: "Impossible de vérifier le mot de passe. Vérifiez-le et réessayez.", failed: "La suppression n'est pas terminée. Vérifiez votre connexion et réessayez. L'accès n'est supprimé qu'après le nettoyage réussi des données privées.",
    unavailable: "Vous pouvez uniquement supprimer votre propre compte de touriste.", session: "Reconnectez-vous au même compte pour poursuivre la suppression.",
    local: "Le nettoyage du navigateur n'a pas abouti. Autorisez le stockage et réessayez. Les données déjà supprimées du cloud ne sont pas récupérables.", deleted: "Votre compte a été supprimé. Vous pouvez vous réinscrire avec la même adresse email.",
  },
};
export const deletionCopyKeys = Object.keys(en) as DeletionCopyKey[];
export const deletionText = (locale: Locale, key: DeletionCopyKey) => copy[locale][key];

registerFeatureCopy(Object.keys(en) as (keyof typeof en)[], deletionText);
