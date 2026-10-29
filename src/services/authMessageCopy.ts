import type { Locale } from "./i18n";
import { registerFeatureCopy } from "./featureTranslations";

const en = {
  noAccount: "Your account could not be loaded. Try signing in again.",
  verifyFirst: "Verify your email first. A fresh verification email has been sent.",
  verificationFailed: "Verification email could not be sent.",
  loginFailed: "Sign-in failed. Please try again.",
  adminSetup: "This account does not have administrator access. Contact the system administrator.",
  invalid: "Invalid email or password.",
  verificationMode: "Verification email is only available in Firebase mode.",
  missing: "Firebase account could not be found.",
  resetMode: "Password reset is only available in Firebase mode.",
  resetFailed: "Password reset email could not be sent.",
};
const rows: Record<Exclude<Locale, "en">, string[]> = {
  ms: ["Akaun anda tidak dapat dimuatkan. Cuba log masuk semula.", "Sahkan e-mel anda dahulu. E-mel pengesahan baharu telah dihantar.", "E-mel pengesahan tidak dapat dihantar.", "Log masuk gagal. Sila cuba lagi.", "Akaun ini tiada akses pentadbir. Hubungi pentadbir sistem.", "E-mel atau kata laluan tidak sah.", "E-mel pengesahan hanya tersedia dalam mod Firebase.", "Akaun Firebase tidak ditemui.", "Tetapan semula kata laluan hanya tersedia dalam mod Firebase.", "E-mel tetapan semula kata laluan tidak dapat dihantar."],
  zh: ["无法加载您的账户，请重新登录。", "请先验证邮箱。新的验证邮件已发送。", "无法发送验证邮件。", "登录失败，请重试。", "此账户没有管理员权限，请联系系统管理员。", "邮箱或密码无效。", "仅在 Firebase 模式下支持验证邮件。", "找不到 Firebase 账户。", "仅在 Firebase 模式下支持重置密码。", "无法发送密码重置邮件。"],
  ja: ["アカウントを読み込めませんでした。再度ログインしてください。", "まずメールアドレスを確認してください。新しい確認メールを送信しました。", "確認メールを送信できませんでした。", "ログインできませんでした。もう一度お試しください。", "このアカウントには管理者権限がありません。システム管理者にお問い合わせください。", "メールアドレスまたはパスワードが正しくありません。", "確認メールはFirebaseモードでのみ利用できます。", "Firebaseアカウントが見つかりませんでした。", "パスワードの再設定はFirebaseモードでのみ利用できます。", "パスワード再設定メールを送信できませんでした。"],
  ko: ["계정을 불러오지 못했습니다. 다시 로그인하세요.", "먼저 이메일을 인증하세요. 새 인증 이메일을 보냈습니다.", "인증 이메일을 보내지 못했습니다.", "로그인하지 못했습니다. 다시 시도하세요.", "이 계정에는 관리자 권한이 없습니다. 시스템 관리자에게 문의하세요.", "이메일 또는 비밀번호가 올바르지 않습니다.", "인증 이메일은 Firebase 모드에서만 사용할 수 있습니다.", "Firebase 계정을 찾을 수 없습니다.", "비밀번호 재설정은 Firebase 모드에서만 사용할 수 있습니다.", "비밀번호 재설정 이메일을 보내지 못했습니다."],
  pt: ["Não foi possível carregar a conta. Tente iniciar sessão novamente.", "Confirme primeiro o seu e-mail. Foi enviada uma nova mensagem de verificação.", "Não foi possível enviar o e-mail de verificação.", "O início de sessão falhou. Tente novamente.", "Esta conta não tem acesso de administrador. Contacte o administrador do sistema.", "E-mail ou palavra-passe inválidos.", "O e-mail de verificação só está disponível no modo Firebase.", "Não foi possível encontrar a conta Firebase.", "A recuperação da palavra-passe só está disponível no modo Firebase.", "Não foi possível enviar o e-mail de recuperação da palavra-passe."],
  ta: ["கணக்கை ஏற்ற முடியவில்லை. மீண்டும் உள்நுழையவும்.", "முதலில் உங்கள் மின்னஞ்சலைச் சரிபார்க்கவும். புதிய சரிபார்ப்பு மின்னஞ்சல் அனுப்பப்பட்டுள்ளது.", "சரிபார்ப்பு மின்னஞ்சலை அனுப்ப முடியவில்லை.", "உள்நுழைவு தோல்வியடைந்தது. மீண்டும் முயலவும்.", "இந்தக் கணக்கிற்கு நிர்வாகி அணுகல் இல்லை. அமைப்பு நிர்வாகியைத் தொடர்புகொள்ளவும்.", "மின்னஞ்சல் அல்லது கடவுச்சொல் தவறானது.", "சரிபார்ப்பு மின்னஞ்சல் Firebase முறையில் மட்டுமே கிடைக்கும்.", "Firebase கணக்கைக் கண்டறிய முடியவில்லை.", "கடவுச்சொல் மீட்டமைப்பு Firebase முறையில் மட்டுமே கிடைக்கும்.", "கடவுச்சொல் மீட்டமைப்பு மின்னஞ்சலை அனுப்ப முடியவில்லை."],
  es: ["No se pudo cargar tu cuenta. Vuelve a iniciar sesión.", "Verifica primero tu correo. Se ha enviado un nuevo mensaje de verificación.", "No se pudo enviar el correo de verificación.", "No se pudo iniciar sesión. Inténtalo de nuevo.", "Esta cuenta no tiene acceso de administrador. Contacta con el administrador del sistema.", "Correo o contraseña no válidos.", "El correo de verificación solo está disponible en modo Firebase.", "No se encontró la cuenta de Firebase.", "El restablecimiento de contraseña solo está disponible en modo Firebase.", "No se pudo enviar el correo para restablecer la contraseña."],
  fr: ["Impossible de charger votre compte. Reconnectez-vous.", "Vérifiez d'abord votre adresse e-mail. Un nouveau message de vérification a été envoyé.", "L'e-mail de vérification n'a pas pu être envoyé.", "La connexion a échoué. Réessayez.", "Ce compte ne dispose pas d’un accès administrateur. Contactez l’administrateur du système.", "Adresse e-mail ou mot de passe incorrect.", "L'e-mail de vérification est disponible uniquement en mode Firebase.", "Le compte Firebase est introuvable.", "La réinitialisation du mot de passe est disponible uniquement en mode Firebase.", "L'e-mail de réinitialisation du mot de passe n'a pas pu être envoyé."],
};
const keys = Object.keys(en) as (keyof typeof en)[];
registerFeatureCopy(keys, (locale, key) => locale === "en" ? en[key] : rows[locale][keys.indexOf(key)]);
