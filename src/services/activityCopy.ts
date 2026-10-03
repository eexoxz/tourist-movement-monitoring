import type { Locale } from "./i18n";

const en = {
  accuracy: "Your location is not precise enough yet. Tracking will continue when a clearer reading arrives.",
  jump: "A sudden location jump was skipped. Waiting for the next reliable reading.",
  timestamp: "An old location reading was skipped. Waiting for a current reading.",
  title: "Shared place activity",
  hint: "Last 7 days · Separate observed and sample activity · Individual routes stay private",
  publish: "Update observed activity",
  publishSample: "Update sample activity",
  previewSample: "Preview sample activity (not real visitor numbers)",
  refresh: "Refresh place activity",
  refreshFailed: "Place activity could not be refreshed. Your saved places are still available.",
  saved: "Activity summary updated.",
  noEvidence: "Not enough recent activity to share yet.",
  demoBasis: "Sample activity · Not live visitor numbers",
  observedBasis: "Recent shared activity · Updated",
  localBasis: "Nearby suggestions · Popularity is not available yet",
};
type ActivityCopyKey = keyof typeof en;
const copy: Record<Locale, Record<ActivityCopyKey, string>> = {
  en,
  ms: {
    refresh: "Muat semula aktiviti tempat", refreshFailed: "Aktiviti tempat tidak dapat dimuat semula. Tempat yang disimpan masih tersedia.",
    accuracy: "Lokasi anda belum cukup tepat. Penjejakan akan diteruskan apabila bacaan lebih jelas diterima.",
    jump: "Perubahan lokasi mendadak diabaikan. Menunggu bacaan seterusnya yang boleh dipercayai.",
    timestamp: "Bacaan lokasi lama diabaikan. Menunggu bacaan semasa.",
    title: "Aktiviti tempat yang dikongsi", hint: "7 hari terakhir · Aktiviti sebenar dan contoh diasingkan · Laluan individu kekal peribadi",
    publishSample: "Kemas kini aktiviti contoh", previewSample: "Pratonton aktiviti contoh (bukan bilangan pelawat sebenar)",
    publish: "Kemas kini aktiviti sebenar", saved: "Ringkasan aktiviti dikemas kini.",
    noEvidence: "Belum cukup aktiviti terkini untuk dikongsi.", demoBasis: "Aktiviti contoh · Bukan bilangan pelawat langsung",
    observedBasis: "Aktiviti terkini yang dikongsi · Dikemas kini", localBasis: "Cadangan berdekatan · Populariti belum tersedia",
  },
  zh: {
    refresh: "刷新地点活动", refreshFailed: "无法刷新地点活动，已保存的地点仍可查看。",
    accuracy: "定位暂时不够准确。收到更清晰的定位后将继续记录。", jump: "已忽略突然的定位跳跃，正在等待下一次可靠定位。", timestamp: "已忽略旧的定位数据，正在等待当前定位。",
    title: "共享地点活动", hint: "最近7天 · 实际活动与示例活动分开 · 个人路线保持私密", publish: "更新实际活动",
    publishSample: "更新示例活动", previewSample: "预览示例活动（非真实访客数量）",
    saved: "活动摘要已更新。", noEvidence: "近期活动不足，暂时无法共享。",
    demoBasis: "示例活动 · 非实时访客数量", observedBasis: "近期共享活动 · 更新于", localBasis: "附近推荐 · 暂无热度数据",
  },
  ja: {
    refresh: "スポット活動を更新", refreshFailed: "スポット活動を更新できませんでした。保存済みのスポットは引き続き利用できます。",
    accuracy: "位置情報の精度がまだ十分ではありません。より正確な情報が届くと記録を続けます。", jump: "突然の位置の変化を除外しました。次の信頼できる情報を待っています。", timestamp: "古い位置情報を除外しました。現在の位置情報を待っています。",
    title: "共有スポット活動", hint: "過去7日間 · 実際の活動とサンプルを分離 · 個人のルートは非公開", publish: "実際の活動を更新",
    publishSample: "サンプル活動を更新", previewSample: "サンプル活動を表示（実際の訪問者数ではありません）",
    saved: "活動の概要を更新しました。", noEvidence: "共有できる最近の活動がまだ十分ではありません。",
    demoBasis: "サンプル活動 · 実際の訪問者数ではありません", observedBasis: "最近の共有活動 · 更新", localBasis: "近くのおすすめ · 人気度の情報はまだありません",
  },
  ko: {
    refresh: "장소 활동 새로고침", refreshFailed: "장소 활동을 새로고침하지 못했습니다. 저장된 장소는 계속 이용할 수 있습니다.",
    accuracy: "아직 위치가 충분히 정확하지 않습니다. 더 정확한 위치를 받으면 기록을 계속합니다.", jump: "갑작스러운 위치 변화를 제외했습니다. 다음 신뢰할 수 있는 위치를 기다립니다.", timestamp: "오래된 위치를 제외했습니다. 현재 위치를 기다립니다.",
    title: "공유 장소 활동", hint: "최근 7일 · 실제 활동과 샘플 구분 · 개인 경로는 비공개", publish: "실제 활동 업데이트",
    publishSample: "샘플 활동 업데이트", previewSample: "샘플 활동 미리보기 (실제 방문자 수가 아닙니다)",
    saved: "활동 요약을 업데이트했습니다.", noEvidence: "아직 공유할 최근 활동이 충분하지 않습니다.",
    demoBasis: "샘플 활동 · 실시간 방문자 수가 아닙니다", observedBasis: "최근 공유 활동 · 업데이트", localBasis: "주변 추천 · 아직 인기도 정보가 없습니다",
  },
  pt: {
    refresh: "Atualizar atividade dos lugares", refreshFailed: "Não foi possível atualizar a atividade. Seus lugares salvos continuam disponíveis.",
    accuracy: "Sua localização ainda não é precisa o suficiente. O registro continuará quando chegar uma leitura mais clara.", jump: "Um salto repentino de localização foi ignorado. Aguardando a próxima leitura confiável.", timestamp: "Uma leitura antiga foi ignorada. Aguardando a localização atual.",
    title: "Atividade compartilhada dos lugares", hint: "Últimos 7 dias · Atividade observada separada dos exemplos · Rotas individuais permanecem privadas", publish: "Atualizar atividade observada",
    publishSample: "Atualizar atividade de exemplo", previewSample: "Ver atividade de exemplo (não são visitantes reais)",
    saved: "Resumo atualizado.", noEvidence: "Ainda não há atividade recente suficiente para compartilhar.",
    demoBasis: "Atividade de exemplo · Não são números de visitantes ao vivo", observedBasis: "Atividade recente compartilhada · Atualizada", localBasis: "Sugestões próximas · Popularidade ainda indisponível",
  },
  ta: {
    refresh: "இடச் செயல்பாட்டைப் புதுப்பிக்கவும்", refreshFailed: "இடச் செயல்பாட்டைப் புதுப்பிக்க முடியவில்லை. சேமித்த இடங்கள் இன்னும் கிடைக்கும்.",
    accuracy: "உங்கள் இருப்பிடம் இன்னும் போதுமான துல்லியத்துடன் இல்லை. தெளிவான தகவல் கிடைத்ததும் பதிவு தொடரும்.", jump: "திடீர் இருப்பிட மாற்றம் தவிர்க்கப்பட்டது. அடுத்த நம்பகமான தகவலுக்காகக் காத்திருக்கிறது.", timestamp: "பழைய இருப்பிடத் தகவல் தவிர்க்கப்பட்டது. தற்போதைய தகவலுக்காகக் காத்திருக்கிறது.",
    title: "பகிரப்பட்ட இடச் செயல்பாடு", hint: "கடந்த 7 நாட்கள் · உண்மையான செயல்பாடும் மாதிரியும் தனித்தனியாக · தனிப்பட்ட வழித்தடங்கள் தனியுரிமையுடன் இருக்கும்", publish: "உண்மையான செயல்பாட்டைப் புதுப்பிக்கவும்",
    publishSample: "மாதிரிச் செயல்பாட்டைப் புதுப்பிக்கவும்", previewSample: "மாதிரிச் செயல்பாட்டைப் பார்க்கவும் (உண்மையான வருகையாளர் எண்ணிக்கை அல்ல)",
    saved: "செயல்பாட்டுச் சுருக்கம் புதுப்பிக்கப்பட்டது.", noEvidence: "பகிர்வதற்குப் போதுமான சமீபத்திய செயல்பாடு இன்னும் இல்லை.",
    demoBasis: "மாதிரிச் செயல்பாடு · நேரடி வருகையாளர் எண்ணிக்கை அல்ல", observedBasis: "சமீபத்திய பகிரப்பட்ட செயல்பாடு · புதுப்பிக்கப்பட்டது", localBasis: "அருகிலுள்ள பரிந்துரைகள் · பிரபலத் தகவல் இன்னும் இல்லை",
  },
  es: {
    refresh: "Actualizar actividad de los lugares", refreshFailed: "No se pudo actualizar la actividad. Tus lugares guardados siguen disponibles.",
    accuracy: "Tu ubicación aún no es suficientemente precisa. El registro continuará cuando llegue una lectura más clara.", jump: "Se omitió un salto repentino de ubicación. Esperando la próxima lectura fiable.", timestamp: "Se omitió una lectura antigua. Esperando la ubicación actual.",
    title: "Actividad compartida de los lugares", hint: "Últimos 7 días · Actividad observada separada de los ejemplos · Las rutas individuales siguen siendo privadas", publish: "Actualizar actividad observada",
    publishSample: "Actualizar actividad de ejemplo", previewSample: "Ver actividad de ejemplo (no son visitantes reales)",
    saved: "Resumen actualizado.", noEvidence: "Todavía no hay suficiente actividad reciente para compartir.",
    demoBasis: "Actividad de ejemplo · No son cifras de visitantes en directo", observedBasis: "Actividad reciente compartida · Actualizada", localBasis: "Sugerencias cercanas · Popularidad aún no disponible",
  },
  fr: {
    refresh: "Actualiser l'activité des lieux", refreshFailed: "L'activité n'a pas pu être actualisée. Vos lieux enregistrés restent disponibles.",
    accuracy: "Votre position n'est pas encore assez précise. L'enregistrement reprendra avec une mesure plus fiable.", jump: "Un déplacement soudain de la position a été ignoré. En attente de la prochaine mesure fiable.", timestamp: "Une ancienne position a été ignorée. En attente de la position actuelle.",
    title: "Activité partagée des lieux", hint: "7 derniers jours · Activité observée séparée des exemples · Les itinéraires individuels restent privés", publish: "Actualiser l'activité observée",
    publishSample: "Actualiser l'activité d'exemple", previewSample: "Afficher l'activité d'exemple (pas de visiteurs réels)",
    saved: "Résumé actualisé.", noEvidence: "Pas encore assez d'activité récente à partager.",
    demoBasis: "Activité d'exemple · Pas de nombre de visiteurs en direct", observedBasis: "Activité récente partagée · Actualisée", localBasis: "Suggestions proches · Popularité encore indisponible",
  },
};

export function activityText(locale: Locale, key: ActivityCopyKey) {
  return copy[locale][key];
}
