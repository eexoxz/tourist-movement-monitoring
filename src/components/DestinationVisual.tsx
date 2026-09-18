import type { Destination, DestinationCategory } from "../types";

type DestinationVisualProps = {
  destination: Destination;
  compact?: boolean;
};

const categoryVisuals: Record<DestinationCategory, { primary: string; secondary: string; accent: string; symbol: string }> = {
  cultural: { primary: "#7c3aed", secondary: "#ccfbf1", accent: "#fef3c7", symbol: "temple" },
  nature: { primary: "#15803d", secondary: "#dcfce7", accent: "#bfdbfe", symbol: "hill" },
  urban: { primary: "#2563eb", secondary: "#dbeafe", accent: "#fde68a", symbol: "city" },
  heritage: { primary: "#b45309", secondary: "#ffedd5", accent: "#e0f2fe", symbol: "arch" },
  food: { primary: "#be123c", secondary: "#ffe4e6", accent: "#fef9c3", symbol: "street" },
  coastal: { primary: "#0284c7", secondary: "#e0f2fe", accent: "#ccfbf1", symbol: "wave" },
};

function escapeSvgText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function landmarkShape(symbol: string, primary: string, accent: string) {
  if (symbol === "hill") {
    return `<path d="M0 145 C55 84 95 83 140 145 Z" fill="${primary}" opacity=".9"/><path d="M115 145 C165 70 220 82 280 145 Z" fill="${accent}" opacity=".88"/>`;
  }

  if (symbol === "city") {
    return `<rect x="34" y="72" width="48" height="73" rx="7" fill="${primary}"/><rect x="94" y="48" width="55" height="97" rx="7" fill="${accent}"/><rect x="164" y="84" width="66" height="61" rx="7" fill="${primary}" opacity=".8"/>`;
  }

  if (symbol === "arch") {
    return `<path d="M72 145 V74 C72 45 96 24 140 24 C184 24 208 45 208 74 V145 H176 V78 C176 62 164 51 140 51 C116 51 104 62 104 78 V145 Z" fill="${primary}"/><rect x="58" y="132" width="164" height="13" fill="${accent}"/>`;
  }

  if (symbol === "street") {
    return `<path d="M38 145 L92 52 H188 L242 145 Z" fill="${primary}" opacity=".86"/><path d="M108 52 H172 L158 145 H122 Z" fill="${accent}" opacity=".9"/>`;
  }

  if (symbol === "wave") {
    return `<path d="M0 116 C35 94 61 94 96 116 C132 139 158 139 194 116 C229 94 251 94 280 112 V145 H0 Z" fill="${primary}" opacity=".82"/><path d="M0 88 C38 67 70 68 108 88 C145 108 175 108 212 88 C243 71 261 71 280 83 V145 H0 Z" fill="${accent}" opacity=".78"/>`;
  }

  return `<path d="M64 145 V64 H216 V145 H184 V92 H96 V145 Z" fill="${primary}"/><path d="M140 26 L228 64 H52 Z" fill="${accent}"/><rect x="112" y="103" width="56" height="42" rx="8" fill="#fff7ed" opacity=".92"/>`;
}

function generatedDestinationImage(destination: Destination) {
  const visual = categoryVisuals[destination.category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160" role="img" aria-label="${escapeSvgText(destination.name)} visual reference">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${visual.secondary}"/>
        <stop offset="1" stop-color="#fffaf0"/>
      </linearGradient>
    </defs>
    <rect width="280" height="160" rx="16" fill="url(#bg)"/>
    <circle cx="238" cy="34" r="44" fill="${visual.accent}" opacity=".58"/>
    ${landmarkShape(visual.symbol, visual.primary, visual.accent)}
    <rect x="16" y="16" width="188" height="42" rx="12" fill="rgba(255,255,255,.78)"/>
    <text x="28" y="36" fill="#0f172a" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeSvgText(destination.city)}</text>
    <text x="28" y="52" fill="#475569" font-family="Arial, sans-serif" font-size="11" font-weight="700">${escapeSvgText(destination.category.toUpperCase())}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function DestinationVisual({ destination, compact = false }: DestinationVisualProps) {
  const src = destination.imageUrl?.trim() || generatedDestinationImage(destination);
  const alt = destination.imageAlt?.trim() || `${destination.name} visual reference`;

  return (
    <figure className={compact ? "destination-visual compact" : "destination-visual"}>
      <img src={src} alt={alt} loading="lazy" />
      {!compact && <figcaption>{destination.name}</figcaption>}
    </figure>
  );
}
