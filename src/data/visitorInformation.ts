export type VisitorLabel = "adult" | "child" | "senior" | "student" | "entry" | "malaysian" | "international" | "sarawakian" | "otherMalaysian" | "standard" | "mykad" | "daily" | "weekdays" | "weekendsHolidays" | "publicAreas" | "exhibition" | "sessions" | "lastEntry" | "lastUp" | "lastDown" | "ramadan" | "normalReturn" | "mainGrounds" | "dayAdmission" | "wott" | "campus" | "museum" | "residentPermit";
export type VisitorNote = "jmmHolidays" | "eidHolidays" | "cnyHolidays" | "extras" | "weatherMaintenance" | "wednesdayHolidayException" | "mondayHolidayException" | "selectedHolidays" | "conditionalAccess" | "firstMondayClosed" | "bookSession";
export interface VisitorHours { label?: VisitorLabel; days?: number[]; time: string }
export interface VisitorPrice { audience: VisitorLabel; residency?: VisitorLabel; ages?: string; height?: string; amount: number }
export interface VisitorInformation {
  checkedAt: string;
  sources: string[];
  hours?: VisitorHours[];
  closedDays?: number[];
  hoursNotes?: VisitorNote[];
  prices?: VisitorPrice[];
  priceScope?: VisitorLabel;
  priceNotes?: VisitorNote[];
  closure?: { from: string; through: string };
}

const checkedAt = "2026-10-23";
const daily = (time: string): VisitorHours[] => [{ label: "daily", time }];
const price = (audience: VisitorLabel, amount: number, residency?: VisitorLabel, ages?: string): VisitorPrice => ({ audience, amount, residency, ages });
const jmmFree = (source: string): VisitorInformation => ({ checkedAt, sources: [source], hours: daily("09:00 - 17:00"), hoursNotes: ["jmmHolidays"], prices: [price("entry", 0)] });

// Researched display data only: never written over an administrator's Firestore records.
export const visitorInformation: Record<string, VisitorInformation> = {
  "my-perlis-kota-kayang-museum": {
    checkedAt: "2026-10-27", sources: ["https://www.jmm.gov.my/ms/content/muzium-kota-kayang-0"],
    hours: daily("09:00 - 17:00"), hoursNotes: ["jmmHolidays"], prices: [price("entry", 0)],
  },
  "my-selangor-national-zoo-of-malaysia": {
    checkedAt: "2026-10-27", sources: ["https://www.zoonegara.my/visitor-guide/tickets"],
    hours: daily("09:00 - 17:00"), priceNotes: ["extras"],
    prices: [price("adult", 55, "malaysian"), price("child", 28, "malaysian", "3-12"), price("senior", 33, "malaysian", "60+"), price("adult", 93, "international"), price("child", 48, "international", "3-12"), price("senior", 93, "international", "60+"), price("adult", 60, "residentPermit"), price("child", 35, "residentPermit", "3-12"), price("senior", 60, "residentPermit", "60+"), price("child", 0, undefined, "<3")],
  },
  "islamic-arts-museum": {
    checkedAt, sources: ["https://iamm.org.my/visit-us"],
    hours: [...daily("09:30 - 18:00"), { label: "ramadan", time: "09:30 - 17:00" }], hoursNotes: ["eidHolidays"],
    prices: [price("adult", 20), price("student", 10), price("senior", 10, "malaysian"), price("senior", 20, "international"), price("child", 0, undefined, "<6")],
  },
  "penang-hill": {
    checkedAt, sources: ["https://www.penanghill.gov.my/index.php/en/tickets"],
    hours: [...daily("06:30 - 23:00"), { label: "lastUp", time: "22:00" }, { label: "lastDown", time: "23:00" }], hoursNotes: ["weatherMaintenance"],
    priceScope: "normalReturn", prices: [price("adult", 16, "mykad", "13-59"), price("child", 8, "mykad", "4-12"), price("senior", 8, "mykad", "60+"), price("adult", 40, "standard", "13-59"), price("child", 20, "standard", "4-12"), price("senior", 30, "standard", "60+")], priceNotes: ["extras"],
  },
  "kek-lok-si-temple": {
    checkedAt, sources: ["https://mypenang.gov.my/view_directory.php?id=c2pkMG9tMEw2UUwzUk1hVTNWV3ZXZz09"],
    hours: daily("08:30 - 17:30"), priceScope: "mainGrounds", prices: [price("entry", 0)], priceNotes: ["extras"],
  },
  "hin-bus-depot": {
    checkedAt, sources: ["https://hinbusdepot.com/visitor-guide", "https://hinbusdepot.com/contact-1"],
    hours: [{ label: "publicAreas", time: "10:00 - 22:00" }, { label: "exhibition", days: [1, 2, 3, 4, 5], time: "12:00 - 19:00" }, { label: "exhibition", days: [6, 0], time: "10:00 - 19:00" }],
    prices: [price("entry", 0)], priceNotes: ["extras"],
  },
  "central-market": { checkedAt, sources: ["https://centralmarket.com.my/"], hours: daily("10:00 - 22:00") },
  "my-penang-pinang-peranakan-mansion": {
    checkedAt, sources: ["https://www.pinangperanakanmansion.com.my/"], hours: daily("09:30 - 17:30"),
    prices: [price("adult", 30), price("child", 18, undefined, "6-12"), price("child", 0, undefined, "<6")],
  },
  "my-penang-khoo-kongsi": {
    checkedAt, sources: ["https://www.khookongsi.com.my/contact-us/"], hours: daily("09:00 - 17:00"), hoursNotes: ["cnyHolidays"],
    prices: [price("adult", 15, "standard"), price("adult", 10, "mykad"), price("child", 1, undefined, "5-11"), price("child", 0, undefined, "<5"), price("student", 1)],
  },
  "my-penang-entopia": {
    checkedAt, sources: ["https://www.entopia.com/visitor-info/"], hours: [...daily("09:00 - 18:00"), { label: "lastEntry", time: "17:00" }],
    priceScope: "dayAdmission", prices: [price("adult", 75, "standard", "13+"), price("child", 55, "standard", "4-12"), price("senior", 55, "standard", "60+"), price("adult", 65, "mykad", "13+"), price("child", 45, "mykad", "4-12"), price("senior", 45, "mykad", "60+"), price("child", 0, undefined, "<4")],
  },
  "my-penang-the-top-penang": {
    checkedAt, sources: ["https://thetop.com.my/purchase-ticket1/"], hours: [{ days: [1, 3, 4, 5, 6, 0], time: "10:00 - 22:00" }, { days: [2], time: "10:00 - 19:00" }], hoursNotes: ["weatherMaintenance"],
    priceScope: "wott", prices: [price("adult", 78), { ...price("child", 58, undefined, "<=12"), height: ">=90" }, { ...price("child", 0), height: "<90" }, price("senior", 58, undefined, "60+")], priceNotes: ["extras"],
  },
  "my-penang-tropical-spice-garden": {
    checkedAt, sources: ["https://tropicalspicegarden.com/tickets"], hours: [{ days: [1, 2, 3, 4], time: "09:00 - 16:30" }, { days: [5, 6, 0], time: "09:00 - 18:00" }],
  },
  "my-perlis-gua-kelam": {
    checkedAt, sources: ["https://forestry.perlis.gov.my/eko-pelancongan/gua-kelam"], hours: [{ days: [1, 2, 4, 5, 6, 0], time: "09:00 - 18:00" }], closedDays: [3], hoursNotes: ["wednesdayHolidayException", "weatherMaintenance"],
    priceScope: "mainGrounds", prices: [price("adult", 2, "malaysian"), price("child", 1, "malaysian", "<12"), price("adult", 5, "international"), price("child", 3, "international", "<12")], priceNotes: ["extras"],
  },
  "my-kedah-bujang-valley-archaeology-museum": jmmFree("https://www.jmm.gov.my/en/content/lembah-bujang-archaeological-museum"),
  "my-negeri-sembilan-fort-lukut-and-lukut-museum": jmmFree("https://www.jmm.gov.my/en/content/lukut-museum"),
  "my-negeri-sembilan-custom-museum-kuala-klawang": jmmFree("https://www.jmm.gov.my/ms/content/muzium-adat-0"),
  "my-johor-kota-johor-lama-museum": jmmFree("https://www.jmm.gov.my/en/content/kota-johor-lama-museum"),
  "my-federal-territories-labuan-chimney-museum": jmmFree("https://www.jmm.gov.my/ms/content/muzium-chimney-0"),
  "my-perak-perak-museum-taiping": {
    checkedAt, sources: ["https://www.jmm.gov.my/en/content/perak-museum", "https://www.tourismperakmalaysia.com/the-perak-museum/"],
    hours: daily("09:00 - 17:00"), hoursNotes: ["jmmHolidays", "firstMondayClosed"],
    prices: [price("adult", 2, "malaysian"), price("adult", 5, "international"), price("child", 0, "malaysian", "<=12"), price("child", 2, "international", "6-12")],
  },
  "my-selangor-forest-research-institute-malaysia-kepong": {
    checkedAt, sources: ["https://www.frim.gov.my/attractions/information-for-visitors/admission-fees/"], hoursNotes: ["conditionalAccess"],
    priceScope: "campus", prices: [price("adult", 1, "malaysian", "13+"), price("child", 0, "malaysian", "<=12"), price("adult", 5, "international", "13+"), price("child", 1, "international", "7-12")], priceNotes: ["extras"],
  },
  "my-pahang-sungai-lembing-museum": {
    checkedAt, sources: ["https://pahangtourism.com.my/sungai-lembing-museum/"], hours: daily("09:00 - 17:00"), hoursNotes: ["firstMondayClosed", "eidHolidays"],
    prices: [price("adult", 2, "malaysian"), price("senior", 1, "malaysian"), price("child", 0, "malaysian", "<=12"), price("adult", 5, "international"), price("child", 2, "international", "6-12")],
  },
  "my-pahang-boh-sungai-palas-tea-centre": {
    checkedAt, sources: ["https://bohtea.com/visit-our-tea-gardens/", "https://www.malaysia.travel/storage/files/pdf/2024-list-of-agroparks.pdf"],
    hours: [{ days: [2, 3, 4, 5, 6, 0], time: "08:30 - 16:30" }], closedDays: [1], hoursNotes: ["mondayHolidayException"], prices: [price("entry", 0)], priceNotes: ["extras"],
  },
  "my-kelantan-istana-jahar-museum": {
    checkedAt, sources: ["https://muzium.kelantan.gov.my/index.php?catid=35&id=267%3Aistana-jahar-2&view=article"],
    hours: [{ days: [6, 0, 1, 2, 3, 4], time: "08:30 - 16:45" }], closedDays: [5],
    prices: [price("adult", 2, "malaysian"), price("child", 1, "malaysian"), price("adult", 4, "international"), price("child", 2, "international")],
  },
  "my-terengganu-terengganu-state-museum-complex": {
    checkedAt, sources: ["https://museum.terengganu.gov.my/index.php/perkhidmatan/soalan-lazim"],
    hours: [{ days: [6, 0, 1, 2, 3, 4], time: "09:00 - 17:00" }], closedDays: [5], hoursNotes: ["selectedHolidays"],
    prices: [price("adult", 5, "malaysian"), price("child", 2, "malaysian"), price("adult", 15, "international"), price("child", 10, "international")],
  },
  "my-johor-tanjung-piai-national-park": {
    checkedAt, sources: ["https://johornationalparks.gov.my/tanjung-piai/", "https://www.gatetransactionpiai.johornationalparks.gov.my/"],
    hours: [...daily("09:00 - 17:00"), { label: "lastEntry", time: "16:30" }],
    prices: [price("adult", 5, "malaysian"), price("student", 3, "malaysian"), price("senior", 3, "malaysian"), price("adult", 20, "international"), price("student", 10, "international"), price("senior", 10, "international")],
  },
  "my-sabah-bornean-sun-bear-conservation-centre": {
    checkedAt, sources: ["https://www.bsbcc.org.my/visit-us"], hours: daily("09:00 - 15:30"),
    prices: [price("adult", 10, "malaysian", "18+"), price("child", 5, "malaysian", "2-17"), price("adult", 50, "international", "18+"), price("child", 25, "international", "2-17"), price("child", 0, undefined, "<2")],
  },
  "my-sabah-agnes-keith-house": {
    checkedAt, sources: ["https://museum.sabah.gov.my/exhibition/72"], prices: [price("entry", 2, "malaysian"), price("entry", 15, "international")],
  },
  "mari-mari-cultural-village": { checkedAt, sources: ["https://marimariculturalvillage.my/"], hours: [{ label: "sessions", time: "10:00 / 14:00" }], hoursNotes: ["bookSession"] },
  "my-sarawak-borneo-cultures-museum": {
    checkedAt, sources: ["https://services.sarawak.gov.my/web/web/home/sla_view/0/646/", "https://museum.sarawak.gov.my/web/subpage/webpage_view/169"],
    hours: [{ label: "weekdays", time: "09:00 - 16:45" }, { label: "weekendsHolidays", time: "09:30 - 16:30" }, { label: "lastEntry", time: "16:00" }], hoursNotes: ["selectedHolidays"],
    prices: [price("adult", 10, "sarawakian", "18-60"), price("adult", 20, "otherMalaysian", "18-60"), price("adult", 50, "international", "18-60"), price("child", 0, "malaysian", "<=12"), price("child", 20, "international", "<=12"), price("student", 5, "malaysian"), price("student", 25, "international"), price("senior", 5, "sarawakian", "61+"), price("senior", 10, "otherMalaysian", "61+"), price("senior", 25, "international", "61+")],
  },
  "my-federal-territories-national-museum-muzium-negara": {
    checkedAt, sources: ["https://www.muziumnegara.gov.my/index.php/en/faq-page"], hours: [...daily("09:00 - 17:00"), { label: "lastEntry", time: "16:30" }], hoursNotes: ["jmmHolidays"],
    prices: [price("adult", 2, "malaysian"), price("senior", 1, "malaysian"), price("child", 0, "malaysian", "<12"), price("adult", 5, "international"), price("child", 2, "international", "6-12")],
  },
  "my-federal-territories-national-textile-museum": {
    checkedAt, sources: ["https://www.jmm.gov.my/en/content/national-textile-museum"], hours: [...daily("09:00 - 17:00"), { label: "lastEntry", time: "16:30" }], hoursNotes: ["jmmHolidays"],
    prices: [price("adult", 2, "malaysian"), price("senior", 1, "malaysian"), price("child", 0, "malaysian", "<=12"), price("adult", 5, "international"), price("child", 2, "international", "6-12"), price("child", 0, "international", "<6")],
  },
  "my-federal-territories-royal-museum-kuala-lumpur": {
    checkedAt, sources: ["https://www.jmm.gov.my/en/content/royal-museum"], closure: { from: "2026-01-01", through: "2027-01-31" },
  },
  "my-federal-territories-titiwangsa-lake-gardens": {
    checkedAt, sources: ["https://www.dbkl.gov.my/en/fasiliti-awam/taman-awam/taman-tasik-titiwangsa"], hours: daily("06:00 - 19:00"),
  },
  "taman-botani-putrajaya": {
    checkedAt, sources: ["https://gerbang.ppj.gov.my/second-page/waktu-operasi-taman"], hours: [{ days: [2, 3, 4, 5, 6, 0], time: "06:30 - 19:00" }], closedDays: [1],
  },
  "my-melaka-baba-nyonya-heritage-museum": {
    checkedAt, sources: ["https://www.babanyonyamuseum.com/events/admission-ticket-adult-weekdays/", "https://www.babanyonyamuseum.com/events/admission-ticket-adult-weekends/", "https://www.babanyonyamuseum.com/events/admission-ticket-children-weekdays/"],
    prices: [price("adult", 25, undefined, "13+"), price("child", 15, undefined, "<=12")],
  },
};
