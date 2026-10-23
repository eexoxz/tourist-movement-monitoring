import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2, Landmark, MapPin, Trees, Utensils, Waves } from "lucide-react";

const sizes = [13, 15, 17, 18, 20];
const icons = { cultural: Landmark, nature: Trees, urban: Building2, food: Utensils, coastal: Waves };
const categories = Object.fromEntries(Object.entries(icons).map(([category, Icon]) => [category,
  Object.fromEntries(sizes.map(size => [size, renderToStaticMarkup(createElement(Icon, { size, strokeWidth: 2.7, "aria-hidden": "true" }))])),
]));
const emergency = renderToStaticMarkup(createElement(Building2, { size: 18, "aria-hidden": "true" }));
const checkIn = renderToStaticMarkup(createElement(MapPin, { size: 19, "aria-hidden": "true" }));
const license = await readFile(new URL("../node_modules/lucide-react/LICENSE", import.meta.url), "utf8");
const source = `// Generated from lucide-react by npm run generate:map-icons. Do not edit SVG paths by hand.
/*! ${license.trim()} */
export type CategoryIconSize = ${sizes.join(" | ")};
const icons = ${JSON.stringify(categories, null, 2)};
export const categoryIconMarkup = { ...icons, heritage: icons.cultural };
export const emergencyIconMarkup = ${JSON.stringify(emergency)};
export const checkInIconMarkup = ${JSON.stringify(checkIn)};
`;
await writeFile(new URL("../src/generated/mapIconMarkup.ts", import.meta.url), source);
await mkdir(new URL("../public/licenses/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/licenses/lucide.txt", import.meta.url), license);
