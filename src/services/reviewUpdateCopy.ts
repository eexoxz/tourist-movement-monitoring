import { registerFeatureCopy } from "./featureTranslations";
import type { Locale } from "./i18n";

const en = {
  remove: "Remove from my history",
  retention: "This hides the trip from your history. Its route and visit records remain available for tourism monitoring and research. This does not erase your data; permanent account/privacy deletion is separate.",
  removed: "Trip removed from your history",
  removeFailed: "Trip could not be removed",
  countries: "Tourists by country",
  country: "Country / nationality",
  allCountries: "All countries",
  identity: "Passport / ID",
  allIdentity: "All identity records",
  missingIdentity: "Missing passport / ID",
  withIdentity: "Passport / ID supplied",
  touristId: "Tourist ID",
  exportCsv: "Export tourist list (CSV)",
  exportPdf: "Print / save PDF",
  exportNote: "Exports include the full filtered list, not just the visible preview. Identity numbers are masked unless explicitly included.",
  includeIdentity: "Include full passport / ID numbers",
  registered: "Registered",
  identityRequired: "Complete your country and passport / ID before continuing. This identifies your account; the system does not verify the document's authenticity.",
  identityInvalid: "Choose your country and enter 5–20 letters or numbers for your passport / ID.",
  missing: "Not provided",
};
type Key = keyof typeof en;
const rows: Record<Exclude<Locale, "en">, string[]> = {
  ms: ["Alih keluar daripada sejarah saya", "Perjalanan disembunyikan daripada sejarah anda. Laluan dan rekod lawatan dikekalkan untuk pemantauan pelancongan dan penyelidikan. Ini tidak memadam data; pemadaman akaun/privasi kekal adalah berasingan.", "Perjalanan dialih keluar daripada sejarah", "Perjalanan tidak dapat dialih keluar", "Pelancong mengikut negara", "Negara / kewarganegaraan", "Semua negara", "Pasport / ID", "Semua rekod identiti", "Pasport / ID tiada", "Pasport / ID diberikan", "ID pelancong", "Eksport senarai pelancong (CSV)", "Cetak / simpan PDF", "Eksport merangkumi semua hasil ditapis, bukan pratonton sahaja. Nombor identiti disamarkan kecuali dipilih secara khusus.", "Sertakan nombor pasport / ID penuh", "Berdaftar", "Lengkapkan negara dan pasport / ID sebelum meneruskan. Ini mengenal pasti akaun anda; sistem tidak mengesahkan kesahihan dokumen.", "Pilih negara dan masukkan 5–20 huruf atau nombor bagi pasport / ID.", "Tidak diberikan"],
  zh: ["从我的历史记录中移除", "此操作仅隐藏行程。路线和到访记录仍保留用于旅游监测与研究，并不会删除您的数据；永久账户或隐私数据删除是独立操作。", "已从历史记录中移除行程", "无法移除行程", "按国家统计游客", "国家 / 国籍", "所有国家", "护照 / 身份证", "所有身份记录", "缺少护照 / 身份证", "已提供护照 / 身份证", "游客编号", "导出游客名单 (CSV)", "打印 / 保存 PDF", "导出包含所有筛选结果，而不仅是预览。除非明确勾选，否则身份号码会被遮盖。", "包含完整护照 / 身份证号码", "注册时间", "请先填写国家和护照 / 身份证。此信息用于识别账户；系统不会验证证件真伪。", "请选择国家，并填写 5–20 个字母或数字的护照 / 身份证号码。", "未提供"],
  ja: ["履歴から削除", "旅行を履歴から非表示にします。ルートと訪問記録は観光監視と研究のため保持されます。データ消去ではなく、アカウント・プライバシーデータの完全削除は別の操作です。", "旅行を履歴から非表示にしました", "旅行を非表示にできませんでした", "国別の旅行者数", "国 / 国籍", "すべての国", "パスポート / 身分証", "すべての本人情報", "パスポート / 身分証なし", "パスポート / 身分証あり", "旅行者ID", "旅行者一覧を出力 (CSV)", "印刷 / PDF保存", "出力にはプレビューだけでなく絞り込み結果全体が含まれます。明示的に選択しない限り身分証番号は伏せられます。", "パスポート / 身分証番号を全文含める", "登録日", "続行する前に国とパスポート / 身分証を入力してください。アカウント識別用であり、書類の真正性は確認されません。", "国を選び、パスポート / 身分証番号を英数字5～20文字で入力してください。", "未入力"],
  ko: ["내 기록에서 제거", "여행을 기록에서 숨깁니다. 경로와 방문 기록은 관광 모니터링 및 연구를 위해 보관됩니다. 데이터 삭제가 아니며 계정/개인정보 영구 삭제는 별도입니다.", "내 기록에서 여행을 제거했습니다", "여행을 제거하지 못했습니다", "국가별 관광객", "국가 / 국적", "모든 국가", "여권 / 신분증", "모든 신원 기록", "여권 / 신분증 누락", "여권 / 신분증 제공됨", "관광객 ID", "관광객 목록 내보내기 (CSV)", "인쇄 / PDF 저장", "미리보기가 아닌 전체 필터 결과를 내보냅니다. 명시적으로 선택하지 않으면 신분증 번호는 가려집니다.", "전체 여권 / 신분증 번호 포함", "등록일", "계속하기 전에 국가와 여권 / 신분증을 입력하세요. 계정 식별용이며 문서의 진위는 확인하지 않습니다.", "국가를 선택하고 여권 / 신분증 번호를 영문 또는 숫자 5–20자로 입력하세요.", "미제공"],
  pt: ["Remover do meu histórico", "Oculta a viagem do seu histórico. A rota e as visitas são conservadas para monitorização turística e investigação. Não apaga os dados; a eliminação permanente da conta/dados é separada.", "Viagem removida do histórico", "Não foi possível remover a viagem", "Turistas por país", "País / nacionalidade", "Todos os países", "Passaporte / identificação", "Todos os registos de identidade", "Sem passaporte / identificação", "Passaporte / identificação fornecido", "ID do turista", "Exportar lista de turistas (CSV)", "Imprimir / guardar PDF", "A exportação inclui todos os resultados filtrados. Os números de identificação ficam ocultos, salvo escolha explícita.", "Incluir números completos de passaporte / identificação", "Registo", "Preencha o país e o passaporte / identificação antes de continuar. Identifica a conta; o sistema não verifica a autenticidade do documento.", "Escolha o país e introduza 5–20 letras ou números do passaporte / identificação.", "Não fornecido"],
  ta: ["எனது வரலாற்றிலிருந்து அகற்று", "பயணம் உங்கள் வரலாற்றில் மறைக்கப்படும். பாதையும் வருகைப் பதிவுகளும் சுற்றுலா கண்காணிப்பு மற்றும் ஆராய்ச்சிக்காகத் தக்கவைக்கப்படும். இது தரவை அழிக்காது; கணக்கு/தனியுரிமைத் தரவின் நிரந்தர நீக்கம் தனியானது.", "பயணம் வரலாற்றிலிருந்து அகற்றப்பட்டது", "பயணத்தை அகற்ற முடியவில்லை", "நாடு வாரியாகப் பயணிகள்", "நாடு / குடியுரிமை", "அனைத்து நாடுகள்", "கடவுச்சீட்டு / அடையாள அட்டை", "அனைத்து அடையாளப் பதிவுகள்", "கடவுச்சீட்டு / அடையாள அட்டை இல்லை", "கடவுச்சீட்டு / அடையாள அட்டை வழங்கப்பட்டது", "பயணி அடையாள எண்", "பயணிகள் பட்டியலை ஏற்றுமதி செய் (CSV)", "அச்சிடு / PDF சேமி", "முன்னோட்டம் மட்டுமல்லாமல் வடிகட்டப்பட்ட முழுப் பட்டியலும் ஏற்றுமதியாகும். வெளிப்படையாகத் தேர்ந்தெடுக்காவிட்டால் அடையாள எண்கள் மறைக்கப்படும்.", "முழு கடவுச்சீட்டு / அடையாள எண்களைச் சேர்", "பதிவு நாள்", "தொடர்வதற்கு முன் நாடு மற்றும் கடவுச்சீட்டு / அடையாள அட்டையை நிரப்பவும். இது கணக்கை அடையாளம் காண உதவும்; ஆவணத்தின் உண்மைத்தன்மையைச் சரிபார்க்காது.", "நாட்டைத் தேர்ந்து கடவுச்சீட்டு / அடையாள எண்ணில் 5–20 எழுத்துகள் அல்லது எண்களை உள்ளிடவும்.", "வழங்கப்படவில்லை"],
  es: ["Quitar de mi historial", "Oculta el viaje del historial. La ruta y las visitas se conservan para seguimiento turístico e investigación. No borra los datos; la eliminación permanente de cuenta/datos es independiente.", "Viaje quitado del historial", "No se pudo quitar el viaje", "Turistas por país", "País / nacionalidad", "Todos los países", "Pasaporte / identificación", "Todos los registros de identidad", "Sin pasaporte / identificación", "Pasaporte / identificación proporcionado", "ID del turista", "Exportar lista de turistas (CSV)", "Imprimir / guardar PDF", "Se exportan todos los resultados filtrados, no solo la vista previa. Los números de identificación se ocultan salvo elección explícita.", "Incluir números completos de pasaporte / identificación", "Registro", "Completa el país y el pasaporte / identificación antes de continuar. Identifica tu cuenta; el sistema no verifica la autenticidad del documento.", "Elige el país e introduce 5–20 letras o números del pasaporte / identificación.", "No proporcionado"],
  fr: ["Retirer de mon historique", "Masque le trajet de votre historique. Le parcours et les visites sont conservés pour le suivi touristique et la recherche. Les données ne sont pas effacées ; la suppression définitive du compte/des données est distincte.", "Trajet retiré de l'historique", "Impossible de retirer le trajet", "Touristes par pays", "Pays / nationalité", "Tous les pays", "Passeport / pièce d'identité", "Tous les dossiers d'identité", "Passeport / identité manquant", "Passeport / identité fourni", "Identifiant du touriste", "Exporter la liste des touristes (CSV)", "Imprimer / enregistrer en PDF", "L'export comprend tous les résultats filtrés, pas seulement l'aperçu. Les numéros sont masqués sauf choix explicite.", "Inclure les numéros complets de passeport / identité", "Inscription", "Renseignez le pays et le passeport / identité avant de continuer. Cela identifie le compte ; le système ne vérifie pas l'authenticité du document.", "Choisissez le pays et saisissez 5 à 20 lettres ou chiffres du passeport / identité.", "Non fourni"],
};
export function reviewText(locale: Locale, key: Key) {
  if (locale === "en") return en[key];
  return rows[locale][Object.keys(en).indexOf(key)];
}
export const reviewCopyLength = Object.keys(en).length;
export const reviewTranslations = rows;

registerFeatureCopy(Object.keys(en) as (keyof typeof en)[], reviewText);
