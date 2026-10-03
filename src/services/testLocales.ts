import { localeOptions } from "./i18n";
import { loadLocaleCatalog } from "./localeCatalog";

await Promise.all(localeOptions.map(({ value }) => loadLocaleCatalog(value)));
