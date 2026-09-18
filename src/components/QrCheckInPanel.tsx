import { Camera, Keyboard, ScanLine, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { createDestinationCheckInCode, parseDestinationCheckInCode } from "../services/qrCheckIn";
import type { Destination } from "../types";

type BarcodeDetectorShape = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorShape;

type QrCheckInPanelProps = {
  destinations: Destination[];
  selectedDestination: Destination | null;
  locale?: Locale;
  onDestinationChange: (destinationId: string) => void;
  onConfirm: (destinationId?: string) => void;
};

function getBarcodeDetector() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

export function QrCheckInPanel({ destinations, selectedDestination, locale = "en", onDestinationChange, onConfirm }: QrCheckInPanelProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState(t("tourist.checkin.qrHelp"));
  const [isScanning, setIsScanning] = useState(false);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const selectedCode = selectedDestination ? createDestinationCheckInCode(selectedDestination.id) : "";
  const canUseCamera = Boolean(getBarcodeDetector() && navigator.mediaDevices?.getUserMedia);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }, []);

  const useCode = useCallback(
    (rawCode: string) => {
      const result = parseDestinationCheckInCode(rawCode, destinations);

      if (result.error || !result.destination) {
        setMessage(result.error ?? t("tourist.checkin.codeInvalid"));
        return;
      }

      onDestinationChange(result.destination.id);
      onConfirm(result.destination.id);
      setManualCode("");
      setMessage(`${result.destination.name}: ${t("tourist.checkin.codeAccepted")}`);
      stopCamera();
    },
    [destinations, onConfirm, onDestinationChange, stopCamera]
  );

  const startCamera = async () => {
    const BarcodeDetector = getBarcodeDetector();

    if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMessage(t("tourist.checkin.cameraUnavailable"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      setMessage(t("tourist.checkin.cameraReady"));
    } catch {
      setMessage(t("tourist.checkin.cameraDenied"));
      stopCamera();
    }
  };

  useEffect(() => {
    if (!isScanning) {
      return undefined;
    }

    let animationFrame = 0;
    let cancelled = false;

    const scan = async () => {
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (!cancelled && video && detector && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(video);
          const rawValue = codes.find((code) => code.rawValue)?.rawValue;

          if (rawValue) {
            useCode(rawValue);
            return;
          }
        } catch {
          setMessage(t("tourist.checkin.cameraPaused"));
        }
      }

      if (!cancelled) {
        animationFrame = requestAnimationFrame(scan);
      }
    };

    animationFrame = requestAnimationFrame(scan);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [isScanning, useCode]);

  useEffect(() => stopCamera, [stopCamera]);

  return (
    <div className="qr-checkin-panel">
      <label>
        {t("tourist.checkin.attraction")}
        <select value={selectedDestination?.id ?? ""} onChange={(event) => onDestinationChange(event.target.value)}>
          {destinations.map((destination) => (
            <option key={destination.id} value={destination.id}>
              {destination.name} - {destination.city}
            </option>
          ))}
        </select>
      </label>

      <div className="qr-station-card">
        <span>{t("tourist.checkin.stationCode")}</span>
        <strong>{selectedCode}</strong>
        <small>{t("tourist.checkin.stationCodeNote")}</small>
      </div>

      <div className="qr-manual-row">
        <label>
          {t("tourist.checkin.scanOrEnterCode")}
          <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder={selectedCode || "TMM-CHECKIN-..."} />
        </label>
        <button className="secondary-action" type="button" onClick={() => useCode(manualCode || selectedCode)}>
          <Keyboard size={18} />
          {t("tourist.checkin.useCode")}
        </button>
      </div>

      <div className="qr-camera-actions">
        <button className="secondary-action" type="button" onClick={startCamera} disabled={!canUseCamera || isScanning}>
          <Camera size={18} />
          {t("tourist.checkin.scanQr")}
        </button>
        <button className="secondary-action" type="button" onClick={stopCamera} disabled={!isScanning}>
          <Square size={18} />
          {t("tourist.checkin.stopScan")}
        </button>
        <button className="primary-action" type="button" onClick={() => onConfirm(selectedDestination?.id)}>
          <ScanLine size={18} />
          {t("tourist.checkin.checkIn")}
        </button>
      </div>

      <video className={isScanning ? "qr-camera-preview active" : "qr-camera-preview"} ref={videoRef} muted playsInline />
      <p className="qr-checkin-message">{message}</p>
    </div>
  );
}
