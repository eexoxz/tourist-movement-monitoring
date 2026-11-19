import { Camera, Copy, Keyboard, ScanLine, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { createDestinationCheckInCode, parseDestinationCheckInCode } from "../services/qrCheckIn";
import type { Destination, MalaysianState } from "../types";
import { DestinationVisual } from "./DestinationVisual";
import { uiText } from "../services/uiText";
import { getDestinationState } from "../services/destinationState";
import { destinationAdminText } from "../services/destinationAdminCopy";
import { createQrCameraSession, createQrFrameReader } from "../services/qrCamera";
import { getScannedAttractionCheckInPath } from "../services/checkInDeepLink";

type QrCheckInPanelProps = {
  destinations: Destination[];
  selectedDestination: Destination | null;
  locale?: Locale;
  cameraEnabled?: boolean;
  onDestinationChange: (destinationId: string) => void;
  onConfirm: (destinationId?: string) => void;
};

export function QrCheckInPanel({ destinations, selectedDestination, locale = "en", cameraEnabled = true, onDestinationChange, onConfirm }: QrCheckInPanelProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [stateFilter, setStateFilter] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [copyResult, setCopyResult] = useState<{ code: string; feedbackKey: TranslationKey } | null>(null);
  const [message, setMessage] = useState(() => translate("en", "tourist.checkin.qrHelp"));
  const [isScanning, setIsScanning] = useState(false);
  const readFrameRef = useRef<Awaited<ReturnType<typeof createQrFrameReader>> | null>(null);
  const camera = useMemo(createQrCameraSession, []);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const destinationGroups = useMemo(() => {
    const groups = new Map<MalaysianState | undefined, Destination[]>();
    for (const destination of destinations) {
      const state = getDestinationState(destination);
      const group = groups.get(state);
      if (group) group.push(destination);
      else groups.set(state, [destination]);
    }

    const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
    return Array.from(groups, ([state, places]) => ({
      state,
      label: state ? uiText(locale, state) : translate(locale, "publicCheckin.unknown"),
      places: places.sort((left, right) => collator.compare(left.name, right.name)),
    })).sort((left, right) => Number(!left.state) - Number(!right.state) || collator.compare(left.label, right.label));
  }, [destinations, locale]);
  const selectedState = selectedDestination ? getDestinationState(selectedDestination) : undefined;
  const activeState = destinationGroups.some((group) => group.state === stateFilter)
    && (!selectedDestination || stateFilter === selectedState) ? stateFilter : "";
  const selectedCode = selectedDestination ? createDestinationCheckInCode(selectedDestination.id) : "";
  const codeToUse = manualCode.trim() || selectedCode;

  const copyStationCode = async () => {
    try {
      await navigator.clipboard.writeText(selectedCode);
      setCopyResult({ code: selectedCode, feedbackKey: "tourist.checkin.codeCopied" });
    } catch {
      setCopyResult({ code: selectedCode, feedbackKey: "tourist.checkin.codeCopyFailed" });
    }
  };

  useEffect(() => {
    if (stateFilter !== activeState) setStateFilter(activeState);
  }, [activeState, stateFilter]);
  const canUseCamera = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  const stopCamera = useCallback(() => {
    camera.stop();
    readFrameRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStartingCamera(false);
    setIsScanning(false);
  }, [camera]);

  const useCode = useCallback(
    (rawCode: string, source: "manual" | "camera") => {
      const path = getScannedAttractionCheckInPath(rawCode);
      stopCamera();
      if (path) {
        window.location.assign(path);
        return;
      }

      const result = parseDestinationCheckInCode(rawCode, destinations);
      if (result.error || !result.destination) {
        setMessage(result.error ?? translate("en", "tourist.checkin.codeInvalid"));
        return;
      }

      onDestinationChange(result.destination.id);
      if (source === "manual") onConfirm(result.destination.id);
      setManualCode("");
      setMessage(`${result.destination.name}: ${translate("en", "tourist.checkin.codeAccepted")}`);
    },
    [destinations, onConfirm, onDestinationChange, stopCamera]
  );

  const startCamera = async () => {
    if (!cameraEnabled || isStartingCamera || isScanning || document.visibilityState === "hidden") return;
    if (!canUseCamera) {
      setMessage(translate("en", "tourist.checkin.cameraUnavailable"));
      return;
    }

    setIsStartingCamera(true);
    let stream: MediaStream | null = null;
    try {
      stream = await camera.start(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }));
      if (!stream) return;
      const readFrame = await createQrFrameReader();
      if (!camera.isCurrent(stream)) return;
      readFrameRef.current = readFrame;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!camera.isCurrent(stream)) return;
      setIsStartingCamera(false);
      setIsScanning(true);
      setMessage(translate("en", "tourist.checkin.cameraReady"));
    } catch {
      if (stream && !camera.isCurrent(stream)) return;
      setMessage(translate("en", stream ? "tourist.checkin.cameraPaused" : "tourist.checkin.cameraDenied"));
      stopCamera();
    }
  };

  useEffect(() => {
    if (!isScanning) {
      return undefined;
    }

    let scanTimer: number | undefined;
    let cancelled = false;

    const scan = () => {
      const video = videoRef.current;
      if (!cancelled && cameraEnabled && video?.srcObject &&
        camera.isCurrent(video.srcObject as MediaStream) && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const rawValue = readFrameRef.current?.(video);
          if (rawValue) {
            useCode(rawValue, "camera");
            return;
          }
        } catch {
          setMessage(translate("en", "tourist.checkin.cameraPaused"));
          stopCamera();
          return;
        }
      }

      if (!cancelled) scanTimer = window.setTimeout(scan, 150);
    };

    scanTimer = window.setTimeout(scan, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(scanTimer);
    };
  }, [camera, cameraEnabled, isScanning, stopCamera, useCode]);

  useEffect(() => {
    if (!cameraEnabled) stopCamera();
  }, [cameraEnabled, stopCamera]);
  useEffect(() => {
    const pause = () => { if (document.visibilityState === "hidden") stopCamera(); };
    document.addEventListener("visibilitychange", pause);
    return () => { document.removeEventListener("visibilitychange", pause); stopCamera(); };
  }, [stopCamera]);

  return (
    <div className="qr-checkin-panel">
      <label>
        {t("tourist.events.state")}
        <select value={activeState} onChange={(event) => {
          const state = event.target.value;
          setStateFilter(state);
          if (state && selectedDestination && state !== selectedState) onDestinationChange("");
        }}>
          <option value="">{destinationAdminText(locale, "allStates")}</option>
          {destinationGroups.map(({ state, label }) => state && <option key={state} value={state}>{label}</option>)}
        </select>
      </label>
      <label>
        {t("tourist.checkin.attraction")}
        <select value={selectedDestination?.id ?? ""} onChange={(event) => onDestinationChange(event.target.value)}>
          <option value="" disabled>{t("tourist.checkin.selectAttraction")}</option>
          {destinationGroups.filter(({ state }) => !activeState || state === activeState).map(({ state, label, places }) => (
            <optgroup key={state ?? "unknown"} label={label}>
              {places.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {selectedDestination && <div className="qr-station-card">
        <DestinationVisual destination={selectedDestination} compact locale={locale} />
        <span>{t("tourist.checkin.stationCode")}</span>
        <strong>{selectedCode}</strong>
        <small>{t("tourist.checkin.stationCodeNote")}</small>
        <div className="qr-station-actions">
          <button className="secondary-action compact" type="button" onClick={copyStationCode}>
            <Copy size={16} aria-hidden="true" />
            {t("tourist.checkin.copyCode")}
          </button>
          <span role="status">{copyResult?.code === selectedCode ? t(copyResult.feedbackKey) : ""}</span>
        </div>
      </div>}

      <div className="qr-manual-row">
        <label>
          {t("tourist.checkin.scanOrEnterCode")}
          <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder={selectedCode || "TMM-CHECKIN-..."} />
        </label>
        <button className="secondary-action" type="button" onClick={() => useCode(codeToUse, "manual")} disabled={!codeToUse}>
          <Keyboard size={18} />
          {t("tourist.checkin.useCode")}
        </button>
      </div>

      <div className="qr-camera-actions">
        <button className="secondary-action" type="button" onClick={startCamera} disabled={!canUseCamera || !cameraEnabled || isStartingCamera || isScanning}>
          <Camera size={18} />
          {t("tourist.checkin.scanQr")}
        </button>
        <button className="secondary-action" type="button" onClick={stopCamera} disabled={!isScanning && !isStartingCamera}>
          <Square size={18} />
          {t("tourist.checkin.stopScan")}
        </button>
        <button className="primary-action" type="button" onClick={() => onConfirm(selectedDestination?.id)} disabled={!selectedDestination}>
          <ScanLine size={18} />
          {t("tourist.checkin.checkIn")}
        </button>
      </div>

      <video className={isScanning ? "qr-camera-preview active" : "qr-camera-preview"} ref={videoRef} muted playsInline />
      <p className="qr-checkin-message" role="status">{canUseCamera ? uiText(locale, message) : t("tourist.checkin.cameraUnavailable")}</p>
    </div>
  );
}
