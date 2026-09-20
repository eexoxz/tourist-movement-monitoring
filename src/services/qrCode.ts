import QRCode from "qrcode";

type QrMatrix = {
  modules: boolean[][];
  size: number;
};

type QrCodeModuleData = {
  size: number;
  data: Uint8Array | boolean[];
};

type QrCodeModel = {
  modules: QrCodeModuleData;
};

export function createQrMatrix(payload: string): QrMatrix {
  const qr = QRCode.create(payload, {
    errorCorrectionLevel: "M",
  }) as QrCodeModel;
  const size = qr.modules.size;
  const flatModules = Array.from(qr.modules.data, Boolean);
  const modules = Array.from({ length: size }, (_, row) => flatModules.slice(row * size, row * size + size));

  return { modules, size };
}

export function createQrSvgDataUri(payload: string) {
  const quietZone = 4;
  const { modules, size } = createQrMatrix(payload);
  const viewBoxSize = size + quietZone * 2;
  const cells = modules
    .flatMap((row, y) => row.map((dark, x) => (dark ? `<rect x="${x + quietZone}" y="${y + quietZone}" width="1" height="1"/>` : "")))
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges"><rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#fff"/><g fill="#000">${cells}</g></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
