import { describe, expect, it } from "vitest";
import { createQrMatrix, createQrSvgDataUri } from "./qrCode";

describe("QR code generation", () => {
  it("creates a version 4 QR matrix for tourist pass payloads", () => {
    const qr = createQrMatrix("TMM-PASS|MYP-ABC123|PROFILE");

    expect(qr.size).toBe(33);
    expect(qr.modules).toHaveLength(33);
    expect(qr.modules.every((row) => row.length === 33)).toBe(true);
  });

  it("returns an inline SVG data URI that can be rendered by the pass card", () => {
    const source = createQrSvgDataUri("TMM-PASS|MYP-ABC123|VISIT|batu-caves");

    expect(source).toContain("data:image/svg+xml");
    expect(decodeURIComponent(source)).toContain("<svg");
    expect(decodeURIComponent(source)).toContain("#0f766e");
  });

  it("rejects payloads that are too long for the fixed pass QR size", () => {
    expect(() => createQrMatrix("x".repeat(90))).toThrow("QR payload is too long");
  });
});
