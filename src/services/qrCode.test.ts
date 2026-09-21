import { describe, expect, it } from "vitest";
import { createQrMatrix, createQrSvgDataUri } from "./qrCode";

describe("QR code generation", () => {
  it("creates a square QR matrix for tourist pass links", () => {
    const qr = createQrMatrix("http://localhost:4175/check-in?checkin=batu-caves&pass=MYP-ABC123");

    expect(qr.size).toBeGreaterThanOrEqual(21);
    expect(qr.modules).toHaveLength(qr.size);
    expect(qr.modules.every((row) => row.length === qr.size)).toBe(true);
    expect(qr.modules.flat().some(Boolean)).toBe(true);
  });

  it("returns an inline SVG data URI that can be rendered by the pass card", () => {
    const source = createQrSvgDataUri("http://localhost:4175/check-in?checkin=batu-caves&pass=MYP-ABC123");

    expect(source).toContain("data:image/svg+xml");
    expect(decodeURIComponent(source)).toContain("<svg");
    expect(decodeURIComponent(source)).toContain('fill="#000"');
  });

  it("can encode longer check-in links without falling back to a fake pattern", () => {
    const qr = createQrMatrix("https://tourist-movement-monitoring.local/check-in?checkin=george-town-heritage-zone&pass=MYP-ABC123");

    expect(qr.size).toBeGreaterThan(21);
  });
});
