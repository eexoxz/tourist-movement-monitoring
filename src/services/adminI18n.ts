import type { Locale } from "./i18n";

export type AdminCopyKey =
  | "notify.aiTitle"
  | "notify.aiMessage"
  | "common.shown"
  | "common.unknown"
  | "common.notProvided"
  | "common.unknownTourist"
  | "common.pending"
  | "common.minutes"
  | "common.points"
  | "common.trips"
  | "common.csv"
  | "common.reset"
  | "common.recompute"
  | "overview.touristProfiles"
  | "overview.completedTrips"
  | "overview.movementPoints"
  | "overview.movementAlerts"
  | "overview.safetyCases"
  | "overview.activeZones"
  | "overview.alertCount"
  | "overview.activeCount"
  | "overview.eventCount"
  | "overview.stopCount"
  | "overview.resultCount"
  | "overview.movementAlertsTitle"
  | "overview.geofenceActivity"
  | "overview.demandEvents"
  | "overview.movementTrend"
  | "overview.topTouristFlow"
  | "overview.travelPlanSignal"
  | "overview.recentRecommendations"
  | "overview.travelPlanControls"
  | "overview.audience"
  | "overview.city"
  | "overview.stops"
  | "overview.demand"
  | "overview.diverseCategories"
  | "overview.overallMovement"
  | "overview.allCities"
  | "overview.lowPlus"
  | "overview.emergingPlus"
  | "overview.mediumPlus"
  | "overview.highOnly"
  | "tourists.title"
  | "tourists.description"
  | "tourists.search"
  | "tourists.allProfiles"
  | "tourists.cultural"
  | "tourists.nature"
  | "tourists.urban"
  | "tourists.mixed"
  | "tourists.incomplete"
  | "tourists.registered"
  | "tourists.withPassport"
  | "tourists.activeTrips"
  | "tourists.openSafety"
  | "tourists.profilePending"
  | "tourists.locationConsentActive"
  | "tourists.noActiveConsent"
  | "tourists.checkIns"
  | "tourists.safety"
  | "tourists.empty"
  | "tourists.selected"
  | "tourists.latestActivity"
  | "tourists.noActivity"
  | "tourists.email"
  | "tourists.nationality"
  | "tourists.passport"
  | "tourists.travelStyle"
  | "tourists.emergencyContact"
  | "tourists.savedContact"
  | "tourists.recentPlaces"
  | "tourists.noRecognisedPlaces"
  | "tourists.viewMovement"
  | "tourists.viewSafety"
  | "records.allTourists"
  | "records.allTrips"
  | "records.filteredRecords"
  | "records.tripsMatched"
  | "records.touristsShown"
  | "records.dateRange"
  | "records.custom"
  | "records.all"
  | "records.noRecognised"
  | "records.clusterPending"
  | "records.empty"
  | "records.selected"
  | "records.tripId"
  | "records.date"
  | "records.duration"
  | "records.destinationsVisited"
  | "records.clusterId"
  | "records.touristCategory"
  | "records.analysisStatus"
  | "records.readOnly"
  | "safety.title"
  | "safety.description"
  | "safety.openCases"
  | "safety.openSos"
  | "safety.openIncidents"
  | "safety.resolved"
  | "safety.emergencyContacts"
  | "safety.sos"
  | "safety.incident"
  | "safety.status"
  | "safety.open"
  | "safety.reviewing"
  | "safety.location"
  | "safety.submitted"
  | "safety.responseLabel"
  | "safety.responsePlaceholder"
  | "safety.saveResponse"
  | "safety.empty"
  | "ai.title"
  | "ai.description"
  | "ai.clusteredRecords"
  | "ai.labelledRecords"
  | "ai.decisionAccuracy"
  | "ai.selectedK"
  | "ai.clusterSummary"
  | "ai.cluster"
  | "ai.tripCount"
  | "ai.dominantCategory"
  | "ai.avgSilhouette"
  | "ai.noClusters"
  | "ai.categoryDistribution"
  | "ai.confidence"
  | "ai.resultLabel"
  | "ai.empty"
  | "ai.selectedResult"
  | "ai.tripDate"
  | "ai.kMeansResult"
  | "ai.dominantPattern"
  | "ai.clusterDescriptionLabel"
  | "ai.clusterDescription"
  | "ai.decisionOutput"
  | "ai.generated"
  | "ai.decisionPath"
  | "ai.inputPattern"
  | "ai.clusterCentroid"
  | "ai.recommendationResult"
  | "ai.noRecommendation";

type AdminCopyTable = Partial<Record<AdminCopyKey, string>>;

const adminCopy: Record<Locale, AdminCopyTable> = {
  en: {
    "notify.aiTitle": "AI analysis refreshed",
    "notify.aiMessage": "K-Means, Decision Tree output and recommendations were recalculated.",
    "common.shown": "{count} shown",
    "common.unknown": "Unknown",
    "common.notProvided": "Not provided",
    "common.unknownTourist": "Unknown tourist",
    "common.pending": "Pending",
    "common.minutes": "minutes",
    "common.points": "points",
    "common.trips": "trips",
    "common.csv": "CSV",
    "common.reset": "Reset",
    "common.recompute": "Recompute",
    "overview.touristProfiles": "tourist profiles",
    "overview.completedTrips": "Completed trips",
    "overview.movementPoints": "Movement points",
    "overview.movementAlerts": "Movement alerts",
    "overview.safetyCases": "Safety cases",
    "overview.activeZones": "Active zones",
    "overview.alertCount": "{count} alert(s)",
    "overview.activeCount": "{count} active",
    "overview.eventCount": "{count} event(s)",
    "overview.stopCount": "{count} stop(s)",
    "overview.resultCount": "{count} result(s)",
    "overview.movementAlertsTitle": "Movement alerts",
    "overview.geofenceActivity": "Geofence activity",
    "overview.demandEvents": "Demand and events",
    "overview.movementTrend": "Movement Trend",
    "overview.topTouristFlow": "Top Tourist Flow",
    "overview.travelPlanSignal": "Travel Plan Signal",
    "overview.recentRecommendations": "Recent recommendation output",
    "overview.travelPlanControls": "Travel plan controls",
    "overview.audience": "Audience",
    "overview.city": "City",
    "overview.stops": "Stops",
    "overview.demand": "Demand",
    "overview.diverseCategories": "Diverse categories",
    "overview.overallMovement": "Overall movement",
    "overview.allCities": "All cities",
    "overview.lowPlus": "Low+",
    "overview.emergingPlus": "Emerging+",
    "overview.mediumPlus": "Medium+",
    "overview.highOnly": "High only",
    "tourists.title": "Tourist Management",
    "tourists.description": "Review registered tourists, travel profiles, consent state, movement activity, and support needs.",
    "tourists.search": "Search name, email, nationality, passport",
    "tourists.allProfiles": "All profiles",
    "tourists.cultural": "Cultural tourists",
    "tourists.nature": "Nature tourists",
    "tourists.urban": "Urban tourists",
    "tourists.mixed": "Mixed tourists",
    "tourists.incomplete": "Incomplete profile",
    "tourists.registered": "Registered tourists",
    "tourists.withPassport": "With passport",
    "tourists.activeTrips": "Active trips",
    "tourists.openSafety": "Open safety cases",
    "tourists.profilePending": "Profile pending",
    "tourists.locationConsentActive": "Location consent active",
    "tourists.noActiveConsent": "No active consent",
    "tourists.checkIns": "check-ins",
    "tourists.safety": "safety",
    "tourists.empty": "No tourists match the current search or profile filter.",
    "tourists.selected": "Selected tourist",
    "tourists.latestActivity": "Latest activity: {date}",
    "tourists.noActivity": "No movement activity has been recorded yet.",
    "tourists.email": "Email",
    "tourists.nationality": "Nationality",
    "tourists.passport": "Passport",
    "tourists.travelStyle": "Travel style",
    "tourists.emergencyContact": "Emergency contact",
    "tourists.savedContact": "Saved contact",
    "tourists.recentPlaces": "Recent places",
    "tourists.noRecognisedPlaces": "No recognised places yet",
    "tourists.viewMovement": "View movement records",
    "tourists.viewSafety": "View safety cases",
    "records.allTourists": "All tourists",
    "records.allTrips": "All trips",
    "records.filteredRecords": "Filtered records",
    "records.tripsMatched": "Trips matched",
    "records.touristsShown": "Tourists shown",
    "records.dateRange": "Date range",
    "records.custom": "Custom",
    "records.all": "All",
    "records.noRecognised": "No recognised destination yet",
    "records.clusterPending": "Cluster pending",
    "records.empty": "No movement records match this filter.",
    "records.selected": "Selected Movement Record",
    "records.tripId": "Trip ID",
    "records.date": "Date",
    "records.duration": "Duration",
    "records.destinationsVisited": "Destinations visited",
    "records.clusterId": "Cluster ID",
    "records.touristCategory": "Tourist Category",
    "records.analysisStatus": "Analysis status",
    "records.readOnly": "Administrators can review movement records, but individual coordinates are read-only.",
    "safety.title": "Safety Monitoring",
    "safety.description": "Review SOS requests and tourist incident reports submitted from the mobile tourist flow.",
    "safety.openCases": "{count} open case(s)",
    "safety.openSos": "Open SOS",
    "safety.openIncidents": "Open incidents",
    "safety.resolved": "Resolved",
    "safety.emergencyContacts": "Emergency contacts",
    "safety.sos": "SOS",
    "safety.incident": "Incident",
    "safety.status": "Safety case status",
    "safety.open": "Open",
    "safety.reviewing": "Reviewing",
    "safety.location": "Location",
    "safety.submitted": "Submitted",
    "safety.responseLabel": "Admin response for tourist",
    "safety.responsePlaceholder": "Example: We are reviewing this case and will contact your emergency contact if needed.",
    "safety.saveResponse": "Save response",
    "safety.empty": "No SOS requests or incident reports have been submitted yet.",
    "ai.title": "AI Results",
    "ai.description": "K-Means groups similar movement patterns, then the Decision Tree explains the tourist category used for recommendations.",
    "ai.clusteredRecords": "Clustered records",
    "ai.labelledRecords": "Labelled records",
    "ai.decisionAccuracy": "Decision accuracy",
    "ai.selectedK": "Selected K",
    "ai.clusterSummary": "K-Means Cluster Summary",
    "ai.cluster": "Cluster",
    "ai.tripCount": "{count} trip(s)",
    "ai.dominantCategory": "Dominant category",
    "ai.avgSilhouette": "Avg silhouette",
    "ai.noClusters": "K-Means results appear after completed trips contain enough movement points.",
    "ai.categoryDistribution": "Tourist Category Distribution",
    "ai.confidence": "confidence",
    "ai.resultLabel": "AI result",
    "ai.empty": "AI analysis appears after a tourist completes a trip with at least two movement points.",
    "ai.selectedResult": "Selected AI Result",
    "ai.tripDate": "Trip date",
    "ai.kMeansResult": "K-Means result",
    "ai.dominantPattern": "Dominant pattern",
    "ai.clusterDescriptionLabel": "Cluster description",
    "ai.clusterDescription": "The route is closest to a centroid with {cultural}% cultural, {nature}% nature, {urban}% urban, and about {unique} unique destination(s).",
    "ai.decisionOutput": "Decision Tree output",
    "ai.generated": "Generated",
    "ai.decisionPath": "Decision Path",
    "ai.inputPattern": "K-Means Input Pattern",
    "ai.clusterCentroid": "K-Means Cluster Centroid",
    "ai.recommendationResult": "Recommendation Result",
    "ai.noRecommendation": "No recommendation result is currently available for this tourist.",
  },
  ms: {
    "notify.aiTitle": "Analisis AI disegar semula",
    "notify.aiMessage": "Output K-Means, Decision Tree dan cadangan telah dikira semula.",
    "common.shown": "{count} dipaparkan",
    "common.unknown": "Tidak diketahui",
    "common.notProvided": "Tidak diberikan",
    "common.unknownTourist": "Pelancong tidak diketahui",
    "common.pending": "Menunggu",
    "common.minutes": "minit",
    "common.points": "titik",
    "common.trips": "perjalanan",
    "common.csv": "CSV",
    "common.reset": "Set semula",
    "common.recompute": "Kira semula",
    "overview.touristProfiles": "profil pelancong",
    "overview.completedTrips": "Perjalanan selesai",
    "overview.movementPoints": "Titik pergerakan",
    "overview.movementAlerts": "Amaran pergerakan",
    "overview.safetyCases": "Kes keselamatan",
    "overview.activeZones": "Zon aktif",
    "overview.alertCount": "{count} amaran",
    "overview.activeCount": "{count} aktif",
    "overview.eventCount": "{count} acara",
    "overview.stopCount": "{count} hentian",
    "overview.resultCount": "{count} keputusan",
    "overview.movementAlertsTitle": "Amaran pergerakan",
    "overview.geofenceActivity": "Aktiviti geofence",
    "overview.demandEvents": "Permintaan dan acara",
    "overview.movementTrend": "Trend Pergerakan",
    "overview.topTouristFlow": "Aliran Pelancong Teratas",
    "overview.travelPlanSignal": "Isyarat Pelan Perjalanan",
    "overview.recentRecommendations": "Output cadangan terkini",
    "overview.travelPlanControls": "Kawalan pelan perjalanan",
    "overview.audience": "Sasaran",
    "overview.city": "Bandar",
    "overview.stops": "Hentian",
    "overview.demand": "Permintaan",
    "overview.diverseCategories": "Kategori pelbagai",
    "overview.overallMovement": "Pergerakan keseluruhan",
    "overview.allCities": "Semua bandar",
    "overview.lowPlus": "Rendah+",
    "overview.emergingPlus": "Meningkat+",
    "overview.mediumPlus": "Sederhana+",
    "overview.highOnly": "Tinggi sahaja",
    "tourists.title": "Pengurusan Pelancong",
    "tourists.description": "Semak pelancong berdaftar, profil perjalanan, status persetujuan, aktiviti pergerakan dan keperluan sokongan.",
    "tourists.search": "Cari nama, emel, kewarganegaraan, pasport",
    "tourists.allProfiles": "Semua profil",
    "tourists.cultural": "Pelancong budaya",
    "tourists.nature": "Pelancong alam",
    "tourists.urban": "Pelancong bandar",
    "tourists.mixed": "Pelancong campuran",
    "tourists.incomplete": "Profil belum lengkap",
    "tourists.registered": "Pelancong berdaftar",
    "tourists.withPassport": "Dengan pasport",
    "tourists.activeTrips": "Perjalanan aktif",
    "tourists.openSafety": "Kes keselamatan terbuka",
    "tourists.profilePending": "Profil menunggu",
    "tourists.locationConsentActive": "Persetujuan lokasi aktif",
    "tourists.noActiveConsent": "Tiada persetujuan aktif",
    "tourists.checkIns": "daftar masuk",
    "tourists.safety": "keselamatan",
    "tourists.empty": "Tiada pelancong sepadan dengan carian atau penapis profil semasa.",
    "tourists.selected": "Pelancong dipilih",
    "tourists.latestActivity": "Aktiviti terkini: {date}",
    "tourists.noActivity": "Tiada aktiviti pergerakan direkodkan lagi.",
    "tourists.email": "Emel",
    "tourists.nationality": "Kewarganegaraan",
    "tourists.passport": "Pasport",
    "tourists.travelStyle": "Gaya perjalanan",
    "tourists.emergencyContact": "Kenalan kecemasan",
    "tourists.savedContact": "Kenalan disimpan",
    "tourists.recentPlaces": "Tempat terkini",
    "tourists.noRecognisedPlaces": "Belum ada tempat dikenal pasti",
    "tourists.viewMovement": "Lihat rekod pergerakan",
    "tourists.viewSafety": "Lihat kes keselamatan",
    "records.allTourists": "Semua pelancong",
    "records.allTrips": "Semua perjalanan",
    "records.filteredRecords": "Rekod ditapis",
    "records.tripsMatched": "Perjalanan sepadan",
    "records.touristsShown": "Pelancong dipaparkan",
    "records.dateRange": "Julat tarikh",
    "records.custom": "Tersuai",
    "records.all": "Semua",
    "records.noRecognised": "Tiada destinasi dikenal pasti lagi",
    "records.clusterPending": "Kluster menunggu",
    "records.empty": "Tiada rekod pergerakan sepadan dengan penapis ini.",
    "records.selected": "Rekod Pergerakan Dipilih",
    "records.tripId": "ID Perjalanan",
    "records.date": "Tarikh",
    "records.duration": "Tempoh",
    "records.destinationsVisited": "Destinasi dilawati",
    "records.clusterId": "ID Kluster",
    "records.touristCategory": "Kategori Pelancong",
    "records.analysisStatus": "Status analisis",
    "records.readOnly": "Pentadbir boleh menyemak rekod pergerakan, tetapi koordinat individu adalah baca sahaja.",
    "safety.title": "Pemantauan Keselamatan",
    "safety.description": "Semak permintaan SOS dan laporan insiden pelancong daripada aliran mudah alih.",
    "safety.openCases": "{count} kes terbuka",
    "safety.openSos": "SOS terbuka",
    "safety.openIncidents": "Insiden terbuka",
    "safety.resolved": "Selesai",
    "safety.emergencyContacts": "Kenalan kecemasan",
    "safety.sos": "SOS",
    "safety.incident": "Insiden",
    "safety.status": "Status kes keselamatan",
    "safety.open": "Terbuka",
    "safety.reviewing": "Sedang disemak",
    "safety.location": "Lokasi",
    "safety.submitted": "Dihantar",
    "safety.responseLabel": "Respons pentadbir untuk pelancong",
    "safety.responsePlaceholder": "Contoh: Kami sedang menyemak kes ini dan akan menghubungi kenalan kecemasan jika perlu.",
    "safety.saveResponse": "Simpan respons",
    "safety.empty": "Tiada permintaan SOS atau laporan insiden dihantar lagi.",
    "ai.title": "Keputusan AI",
    "ai.description": "K-Means mengumpulkan corak pergerakan yang serupa, kemudian Decision Tree menerangkan kategori pelancong untuk cadangan.",
    "ai.clusteredRecords": "Rekod berkluster",
    "ai.labelledRecords": "Rekod berlabel",
    "ai.decisionAccuracy": "Ketepatan keputusan",
    "ai.selectedK": "K dipilih",
    "ai.clusterSummary": "Ringkasan Kluster K-Means",
    "ai.cluster": "Kluster",
    "ai.tripCount": "{count} perjalanan",
    "ai.dominantCategory": "Kategori dominan",
    "ai.avgSilhouette": "Purata silhouette",
    "ai.noClusters": "Keputusan K-Means muncul selepas perjalanan selesai mempunyai titik pergerakan yang mencukupi.",
    "ai.categoryDistribution": "Taburan Kategori Pelancong",
    "ai.confidence": "keyakinan",
    "ai.resultLabel": "keputusan AI",
    "ai.empty": "Analisis AI muncul selepas pelancong menyelesaikan perjalanan dengan sekurang-kurangnya dua titik pergerakan.",
    "ai.selectedResult": "Keputusan AI Dipilih",
    "ai.tripDate": "Tarikh perjalanan",
    "ai.kMeansResult": "Keputusan K-Means",
    "ai.dominantPattern": "Corak dominan",
    "ai.clusterDescriptionLabel": "Penerangan kluster",
    "ai.clusterDescription": "Laluan ini paling hampir dengan centroid {cultural}% budaya, {nature}% alam, {urban}% bandar, dan kira-kira {unique} destinasi unik.",
    "ai.decisionOutput": "Output Decision Tree",
    "ai.generated": "Dijana",
    "ai.decisionPath": "Laluan Keputusan",
    "ai.inputPattern": "Corak Input K-Means",
    "ai.clusterCentroid": "Centroid Kluster K-Means",
    "ai.recommendationResult": "Keputusan Cadangan",
    "ai.noRecommendation": "Tiada keputusan cadangan tersedia untuk pelancong ini.",
  },
  zh: {},
  ja: {},
  ko: {},
  pt: {},
  ta: {},
  es: {},
  fr: {},
};

export function translateAdmin(locale: Locale, key: AdminCopyKey, values: Record<string, string | number> = {}) {
  const template = adminCopy[locale][key] ?? adminCopy.en[key] ?? key;

  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}
