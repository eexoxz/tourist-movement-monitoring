import { getNationalityRegion } from "./nationalities";
import type { Locale } from "../services/i18n";

export type DocumentType = "passport" | "national-id";

const pradoCountryCodes: Readonly<Record<string, string>> = {
  AD: "AND", AE: "ARE", AF: "AFG", AI: "AIA", AL: "ALB", AM: "ARM",
  AO: "AGO", AR: "ARG", AT: "AUT", AU: "AUS", AZ: "AZE", BA: "BIH",
  BD: "BGD", BE: "BEL", BF: "BFA", BG: "BGR", BH: "BHR", BI: "BDI",
  BJ: "BEN", BM: "BMU", BN: "BRN", BR: "BRA", BS: "BHS", BT: "BTN",
  BW: "BWA", BY: "BLR", BZ: "BLZ", CA: "CAN", CD: "COD", CF: "CAF",
  CG: "COG", CH: "CHE", CI: "CIV", CL: "CHL", CM: "CMR", CN: "CHN",
  CO: "COL", CR: "CRI", CU: "CUB", CV: "CPV", CY: "CYP", CZ: "CZE",
  DE: "DEU", DJ: "DJI", DK: "DNK", DM: "DMA", DO: "DOM", DZ: "DZA",
  EC: "ECU", EE: "EST", EG: "EGY", ER: "ERI", ES: "ESP", ET: "ETH",
  FI: "FIN", FO: "FRO", FR: "FRA", GA: "GAB", GB: "GBR", GD: "GRD",
  GE: "GEO", GG: "GGY", GH: "GHA", GI: "GIB", GL: "GRL", GM: "GMB",
  GN: "GIN", GQ: "GNQ", GR: "GRC", GW: "GNB", GY: "GUY", HK: "HKG",
  HN: "HND", HR: "HRV", HT: "HTI", HU: "HUN", IE: "IRL", IL: "ISR",
  IM: "IMN", IN: "IND", IQ: "IRQ", IR: "IRN", IS: "ISL", IT: "ITA",
  JE: "JEY", JM: "JAM", JO: "JOR", JP: "JPN", KE: "KEN", KG: "KGZ",
  KH: "KHM", KM: "COM", KN: "KNA", KP: "PRK", KR: "KOR", KW: "KWT",
  KZ: "KAZ", LA: "LAO", LB: "LBN", LI: "LIE", LK: "LKA", LR: "LBR",
  LS: "LSO", LT: "LTU", LU: "LUX", LV: "LVA", LY: "LBY", MA: "MAR",
  MC: "MCO", MD: "MDA", ME: "MNE", MG: "MDG", MK: "MKD", ML: "MLI",
  MN: "MNG", MO: "MAC", MR: "MRT", MS: "MSR", MT: "MLT", MV: "MDV",
  MW: "MWI", MX: "MEX", MY: "MYS", MZ: "MOZ", NA: "NAM", NC: "NCL",
  NG: "NGA", NI: "NIC", NL: "NLD", NO: "NOR", NP: "NPL", NZ: "NZL",
  OM: "OMN", PA: "PAN", PE: "PER", PF: "PYF", PH: "PHL", PK: "PAK",
  PL: "POL", PT: "PRT", PW: "PLW", PY: "PRY", QA: "QAT", RO: "ROU",
  RS: "SRB", RU: "RUS", RW: "RWA", SA: "SAU", SC: "SYC", SD: "SDN",
  SE: "SWE", SG: "SGP", SH: "SHN", SI: "SVN", SK: "SVK", SL: "SLE",
  SM: "SMR", SN: "SEN", SO: "SOM", SR: "SUR", SS: "SSD", ST: "STP",
  SV: "SLV", SY: "SYR", TC: "TCA", TD: "TCD", TG: "TGO", TH: "THA",
  TL: "TLS", TM: "TKM", TN: "TUN", TR: "TUR", TV: "TUV", TW: "TWN",
  TZ: "TZA", UA: "UKR", UG: "UGA", US: "USA", UY: "URY", UZ: "UZB",
  VA: "VAT", VE: "VEN", VG: "VGB", VN: "VNM", YE: "YEM", ZA: "ZAF",
  ZM: "ZMB", ZW: "ZWE",
};

const malaysianRenewalGuide = "https://www.kln.gov.my/documents/34253/10298265/PASSPORT%2BRENEWAL%2BPROCEDURE%2B%282026%29%2B05022026.pdf/8bdbf34b-2655-4d39-981f-f25938a1d73e?download=true";

const examples: Readonly<Record<string, Partial<Record<DocumentType, { number: string; source: string }>>>> = {
  AU: {
    passport: { number: "PA1234567", source: "https://www.vic.gov.au/dgs-proof-identity-verification-user-guide" },
  },
  CA: {
    passport: { number: "A123456BC", source: "https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1446" },
  },
  FR: {
    passport: { number: "12AB34567", source: "https://www.plus.transformation.gouv.fr/experiences/4124633_passeport" },
  },
  GB: {
    passport: { number: "123456789", source: "https://www.gov.uk/government/publications/basic-passport-checks/basic-passport-checks-accessible" },
  },
  MY: {
    passport: { number: "A12345678", source: malaysianRenewalGuide },
    "national-id": { number: "123456-01-1234", source: malaysianRenewalGuide },
  },
  US: {
    passport: { number: "A12345678", source: "https://travel.state.gov/content/travel/en/passports/passport-help/next-generation-passport.html" },
  },
};

export function getDocumentNumberGuidance(nationality: string, type: DocumentType, locale: Locale) {
  const region = getNationalityRegion(nationality);
  const country = region ? pradoCountryCodes[region] : undefined;
  const language = locale === "es" || locale === "fr" || locale === "pt" ? locale : "en";
  const prado = `https://www.consilium.europa.eu/prado/${language}`;
  const catalogueIndexUrl = `${prado}/search-by-document-country.html`;
  return {
    example: region ? examples[region]?.[type] : undefined,
    catalogueUrl: country ? `${prado}/prado-documents/${country}/all/docs-all.html` : catalogueIndexUrl,
    catalogueIndexUrl,
  };
}
