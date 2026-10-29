import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createNearbySuggestionTracker, type LiveNearbySuggestion, type NearbyTrackingInput } from "./liveSuggestions";

export function useNearbySuggestions(input: NearbyTrackingInput) {
  const tracker = useMemo(createNearbySuggestionTracker, []);
  const latest = useRef(input);
  latest.current = input;
  const [suggestion, setSuggestion] = useState<LiveNearbySuggestion | null>(null);
  const refresh = useCallback(() => {
    setSuggestion(tracker.update(latest.current, Date.now(), !document.hidden));
  }, [tracker]);
  useEffect(refresh, [refresh, input.point, input.activeTripId, input.listening, input.consent, input.attention, input.destinations, input.demand, input.user]);
  useEffect(() => {
    if (!input.consent) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const visibilityChanged = () => {
      clearInterval(timer);
      refresh();
      if (!document.hidden) timer = setInterval(refresh, 15000);
    };
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibilityChanged); window.removeEventListener("focus", refresh); };
  }, [refresh, input.consent]);
  const dismiss = useCallback(() => { tracker.dismiss(); setSuggestion(null); }, [tracker]);
  return { suggestion, dismiss };
}
