import { useEffect, useRef, useState } from "react";
import type { Itinerary, User } from "../types";
import { getConfiguredAuthState } from "./auth";
import { isFirebaseConfigured } from "./firebaseClient";
import { createItinerary, reconcileItineraries, sameItineraryContent, type ItineraryEntry } from "./itineraries";
import { cacheItineraries, deleteItinerary, itineraryDeadline, ItineraryError, loadItineraryCache, saveItinerary, subscribeItineraries } from "./itineraryStorage";

export function useItineraries(user: User) {
  const cloud = isFirebaseConfigured();
  const [entries, setEntries] = useState(() => loadItineraryCache(user.id));
  const [remote, setRemote] = useState<Itinerary[]>([]);
  const [connection, setConnection] = useState<"local" | "loading" | "live" | "unavailable">(cloud ? "loading" : "local");
  const [notice, setNotice] = useState<"saved" | "local" | "unavailable" | "conflict" | "invalid" | "storageFull" | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const locked = useRef(false);
  const latest = useRef(entries);
  latest.current = entries;

  useEffect(() => {
    const timer = window.setTimeout(() => { if (!cacheItineraries(user.id, entries)) setNotice("storageFull"); }, 250);
    return () => window.clearTimeout(timer);
  }, [entries, user.id]);
  useEffect(() => {
    const persist = () => { cacheItineraries(user.id, latest.current); };
    const hide = () => { if (document.visibilityState === "hidden") persist(); };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", hide);
    return () => { persist(); window.removeEventListener("pagehide", persist); document.removeEventListener("visibilitychange", hide); };
  }, [user.id]);

  useEffect(() => {
    if (!cloud) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const fail = () => { if (!stopped) setConnection("unavailable"); };
    setConnection("loading");
    void getConfiguredAuthState().then(() => subscribeItineraries(user, (plans) => {
      if (stopped) return;
      setConnection("live");
      setRemote(plans);
      setEntries((current) => reconcileItineraries(current, plans));
    }, fail)).then((cleanup) => { if (stopped) cleanup(); else unsubscribe = cleanup; }).catch(fail);
    return () => { stopped = true; unsubscribe?.(); };
  }, [cloud, user.id, retry]);

  const create = (title: string, source?: Itinerary) => {
    const plan = { ...createItinerary(user.id, title), ...(source ? { startDate: source.startDate, days: source.days, notes: source.notes, stops: source.stops.map((stop) => ({ ...stop, id: crypto.randomUUID() })) } : {}) };
    setEntries((current) => [{ plan, dirty: true }, ...current]);
    setNotice(null);
    return plan.id;
  };
  const change = (plan: Itinerary) => {
    setEntries((current) => current.map((entry) => entry.plan.id === plan.id ? { plan: { ...plan, updatedAt: new Date().toISOString() }, dirty: true } : entry));
    setNotice(null);
  };
  const restore = (plan: Itinerary) => {
    setEntries((current) => plan.deletedAt ? current.filter((entry) => entry.plan.id !== plan.id) : current.map((entry) => entry.plan.id === plan.id ? { plan, dirty: false } : entry));
    setNotice(null);
  };
  const commit = async (plan: Itinerary, deleting = false) => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setNotice(null);
    try {
      if (deleting) {
        await itineraryDeadline(deleteItinerary(plan, user));
        setEntries((current) => current.filter((entry) => entry.plan.id !== plan.id));
      } else {
        const saved = await itineraryDeadline(saveItinerary(plan, user));
        setEntries((current) => current.map((entry) => entry.plan.id !== plan.id ? entry : sameItineraryContent(entry.plan, plan) ? { plan: saved, dirty: false } : entry));
      }
      setNotice(cloud ? "saved" : "local");
      return true;
    } catch (error) {
      const code = error instanceof ItineraryError ? error.code : "unavailable";
      setNotice(code);
      if (code === "unavailable") setConnection("unavailable");
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return { entries, remote, connection, notice, busy, cloud, create, change, restore, commit, reconnect: () => setRetry((value) => value + 1) };
}
