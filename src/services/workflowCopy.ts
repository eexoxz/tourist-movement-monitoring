import { registerFeatureCopy } from "./featureTranslations";
import type { Locale } from "./i18n";

const copy = {
  en: { emailFailed: "Your account was created, but the verification email could not be sent. Use Resend verification with your email and password; do not register again.", profilePending: "Your profile is saved on this device and queued for cloud retry when you next sign in." },
  ms: { emailFailed: "Akaun anda telah dicipta, tetapi e-mel pengesahan tidak dapat dihantar. Gunakan Hantar semula pengesahan dengan e-mel dan kata laluan anda; jangan daftar semula.", profilePending: "Profil anda disimpan pada peranti ini dan akan dicuba semula ke awan apabila anda log masuk nanti." },
  zh: { emailFailed: "您的账户已创建，但验证邮件未能发送。请使用邮箱和密码重新发送验证邮件，无需再次注册。", profilePending: "您的个人资料已保存在此设备上，下次登录时会重试云端同步。" },
  ja: { emailFailed: "アカウントは作成されましたが、確認メールを送信できませんでした。メールアドレスとパスワードを使って確認メールを再送してください。再登録は不要です。", profilePending: "プロフィールはこの端末に保存され、次回ログイン時にクラウドへの同期を再試行します。" },
  ko: { emailFailed: "계정은 생성되었지만 인증 이메일을 보내지 못했습니다. 이메일과 비밀번호로 인증 이메일을 다시 보내 주세요. 다시 가입할 필요는 없습니다.", profilePending: "프로필은 이 기기에 저장되었으며 다음 로그인 시 클라우드 동기화를 다시 시도합니다." },
  pt: { emailFailed: "A sua conta foi criada, mas não foi possível enviar o e-mail de verificação. Reenvie a verificação com o seu e-mail e palavra-passe; não se registe novamente.", profilePending: "O seu perfil está guardado neste dispositivo e a sincronização será tentada novamente no próximo início de sessão." },
  ta: { emailFailed: "உங்கள் கணக்கு உருவாக்கப்பட்டது, ஆனால் சரிபார்ப்பு மின்னஞ்சலை அனுப்ப முடியவில்லை. உங்கள் மின்னஞ்சல் மற்றும் கடவுச்சொல்லைப் பயன்படுத்தி சரிபார்ப்பு மின்னஞ்சலை மீண்டும் அனுப்பவும்; மீண்டும் பதிவு செய்ய வேண்டாம்.", profilePending: "உங்கள் சுயவிவரம் இந்தச் சாதனத்தில் சேமிக்கப்பட்டுள்ளது. அடுத்த முறை உள்நுழையும்போது மேகச் சேமிப்பக ஒத்திசைவு மீண்டும் முயற்சிக்கப்படும்." },
  es: { emailFailed: "Tu cuenta se ha creado, pero no se pudo enviar el correo de verificación. Reenvía la verificación con tu correo y contraseña; no vuelvas a registrarte.", profilePending: "Tu perfil está guardado en este dispositivo y se volverá a intentar la sincronización al iniciar sesión de nuevo." },
  fr: { emailFailed: "Votre compte a été créé, mais l’e-mail de vérification n’a pas pu être envoyé. Renvoyez la vérification avec votre e-mail et votre mot de passe ; ne vous inscrivez pas à nouveau.", profilePending: "Votre profil est enregistré sur cet appareil. La synchronisation sera réessayée lors de votre prochaine connexion." },
} satisfies Record<Locale, { emailFailed: string; profilePending: string }>;

export const workflowText = (locale: Locale, key: keyof typeof copy.en) => copy[locale][key];

registerFeatureCopy(Object.keys(copy.en) as (keyof typeof copy.en)[], workflowText);
