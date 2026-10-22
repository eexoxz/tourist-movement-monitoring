import { useMemo, useState, type FormEvent } from "react";
import { MapPin, MapPinned, Pencil, RotateCcw, Save, Tag, Trash2, X } from "lucide-react";
import type { AttractionCheckIn, Destination, DestinationCategory, MalaysianState } from "../types";
import { discoveryStates } from "../data/discoveryAreas";
import { getDestinationState } from "../services/destinationState";
import { addDestinationRecord, deleteDestinationRecord, destinationCategories, updateDestinationRecord } from "../services/destinationManagement";
import { DestinationVisual } from "./DestinationVisual";
import { EmptyState } from "./SummaryCards";
import type { NotifyFn } from "./ToastViewport";
import { translate, type Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { localizeCity, localizeDestination } from "../services/destinationLocale";
import { UnlistedPlaceReview } from "./UnlistedPlaceReview";
import type { PlaceSubmissionGroup } from "../services/unlistedPlaces";
import { placeText } from "../services/placeSubmissionCopy";

type DestinationFormState = {
  name: string;
  city: string;
  state: MalaysianState | "";
  address: string;
  category: DestinationCategory;
  latitude: string;
  longitude: string;
  averageVisitMinutes: string;
  openingHours: string;
  feeNote: string;
  visitTips: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
};

function createDestinationForm(destination?: Destination): DestinationFormState {
  return {
    name: destination?.name ?? "",
    city: destination?.city ?? "",
    state: destination ? getDestinationState(destination) ?? "" : "",
    address: destination?.address ?? "",
    category: destination?.category ?? "cultural",
    latitude: destination ? String(destination.latitude) : "3.1478",
    longitude: destination ? String(destination.longitude) : "101.6937",
    averageVisitMinutes: destination ? String(destination.averageVisitMinutes) : "60",
    openingHours: destination?.openingHours ?? "",
    feeNote: destination?.feeNote ?? "",
    visitTips: destination?.visitTips?.join("\n") ?? "",
    imageUrl: destination?.imageUrl ?? "",
    imageAlt: destination?.imageAlt ?? "",
    description: destination?.description ?? "",
  };
}

export function DestinationManager({ destinations, onChange, notify, locale, checkIns = [], onReview, onCreateReviewedPlace, onRefreshReports, refreshingReports, onToggleSamples, placeQueueState }: { destinations: Destination[]; onChange: (destinations: Destination[]) => void; notify: NotifyFn; locale: Locale; checkIns?: AttractionCheckIn[]; onReview?: (ids: string[], destinationId: string) => void | Promise<void>; onCreateReviewedPlace?: (destination: Destination, ids: string[]) => string | null | Promise<string | null>; onRefreshReports?: () => void; refreshingReports?: boolean; onToggleSamples?: () => void; placeQueueState?: "loading" | "live" | "offline" }) {
  const text = (source: string, values?: Record<string, string | number>) => uiText(locale, source, values);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationFormState>(() => createDestinationForm());
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [savingAction, setSavingAction] = useState<"add" | "edit" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DestinationCategory | "all">("all");
  const [candidate, setCandidate] = useState<PlaceSubmissionGroup | null>(null);
  const [showAllDestinations, setShowAllDestinations] = useState(false);

  const filteredDestinations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return destinations.filter((destination) => {
      const matchesCategory = categoryFilter === "all" || destination.category === categoryFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [destination.name, destination.city, destination.address ?? "", destination.description, destination.category].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, destinations, searchTerm]);

  const resetDestinationFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
  };

  const openAddModal = () => {
    setCandidate(null);
    setForm(createDestinationForm());
    setEditingId(null);
    setModalMode("add");
    setMessage(null);
  };

  const startEdit = (destination: Destination) => {
    setCandidate(null);
    setEditingId(destination.id);
    setForm(createDestinationForm(destination));
    setModalMode("edit");
    setMessage(null);
  };

  const closeFormModal = () => {
    if (savingAction) {
      return;
    }

    setModalMode(null);
    setCandidate(null);
    setEditingId(null);
    setForm(createDestinationForm());
  };

  const saveDestination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const action = modalMode;
    if (!action) {
      return;
    }

    setSavingAction(action);
    const result =
      action === "add"
        ? addDestinationRecord(destinations, form)
        : updateDestinationRecord(destinations, {
            ...form,
            id: editingId ?? "",
          });

    if (result.error || !result.destinations) {
      const message = result.error ?? (action === "add" ? "Destination could not be saved." : "Destination could not be updated.");
      setMessage(message);
      setSavingAction(null);
      notify({ tone: "error", title: action === "add" ? "Destination not saved" : "Destination not updated", message });
      return;
    }

    if (candidate && result.destination) {
      const error = onCreateReviewedPlace ? await onCreateReviewedPlace(result.destination, candidate.reports.slice(0, 100).map((report) => report.id)) : placeText(locale, "admin");
      if (error) { setMessage(error); setSavingAction(null); return; }
    } else onChange(result.destinations);
    setMessage(action === "add" ? "Destination saved." : "Destination updated.");
    setSavingAction(null);
    setModalMode(null);
    setCandidate(null);
    setEditingId(null);
    setForm(createDestinationForm());
    notify({
      tone: "success",
      title: action === "add" ? "Destination saved" : "Destination updated",
      message: `${form.name.trim()} was ${action === "add" ? "added to" : "updated in"} the destination list.`,
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setSavingAction("delete");
    const result = deleteDestinationRecord(destinations, deleteTarget.id);
    if (result.error || !result.destinations) {
      const message = result.error ?? "Destination could not be deleted.";
      setMessage(message);
      setSavingAction(null);
      notify({ tone: "error", title: "Destination not deleted", message });
      return;
    }

    onChange(result.destinations);
    setMessage("Destination deleted.");
    setSavingAction(null);
    notify({ tone: "success", title: "Destination deleted", message: `${deleteTarget.name} was removed from the destination list.` });
    if (editingId === deleteTarget.id) {
      setEditingId(null);
      setModalMode(null);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      {onReview && <UnlistedPlaceReview checkIns={checkIns} destinations={destinations} locale={locale} onReview={onReview} onRefresh={onRefreshReports} refreshing={refreshingReports} onToggleSamples={onToggleSamples} placeQueueState={placeQueueState} onCreate={(group) => {
        setCandidate(group); setEditingId(null); setModalMode("add"); setMessage(null);
        setForm({ ...createDestinationForm(), name: group.place.name, city: group.place.city, state: group.place.state ?? "", address: group.place.address, category: group.place.category, latitude: group.latitude === undefined ? "" : String(group.latitude), longitude: group.longitude === undefined ? "" : String(group.longitude) });
      }} />}
      <section className="destination-management-panel">
        <div className="section-heading">
          <div>
            <h2>{text("Destinations")}</h2>
            <p>{text("{count} Malaysian tourist destination records available for recommendation and movement analysis.", { count: destinations.length })}</p>
          </div>
          <button className="primary-action compact-action" type="button" onClick={openAddModal}>
            <MapPinned size={17} />
            {text("Add")}
          </button>
        </div>

        {message && <p className="status-message">{text(message)}</p>}

        <div className="destination-filter-toolbar">
          <label>
            {text("Find destination")}
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={text("Search name, city or category")} />
          </label>
          <label>
            {translate(locale, "common.category")}
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as DestinationCategory | "all")}>
              <option value="all">{text("All categories")}</option>
              {destinationCategories.map((category) => (
                <option key={category} value={category}>
                  {translate(locale, `category.${category}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-action compact-action" type="button" onClick={resetDestinationFilters} disabled={!searchTerm && categoryFilter === "all"}>
            <RotateCcw size={16} />
            {text("Reset")}
          </button>
        </div>

        <section className="destination-admin-grid">
          {(showAllDestinations ? filteredDestinations : filteredDestinations.slice(0, 6)).map((destination) => (
            <article className="destination-card editable" key={destination.id}>
              <DestinationVisual destination={destination} compact locale={locale} />
              <div className="destination-admin-title">
                <strong>{destination.name}</strong>
                <span>{localizeCity(destination.city, locale)}</span>
              </div>
              <p className="destination-admin-description">{localizeDestination(destination, locale).description}</p>
              {destination.address && <p className="destination-admin-address"><MapPin size={16} aria-hidden="true" /><span>{destination.address}</span></p>}
              <div className="destination-admin-footer">
                <span className={`destination-admin-category category-${destination.category}`}><Tag size={15} aria-hidden="true" />{translate(locale, `category.${destination.category}`)}</span>
                <div className="card-actions">
                <button className="secondary-action icon-action" onClick={() => startEdit(destination)} type="button" title={text("Edit destination")}>
                  <Pencil size={16} />
                </button>
                <button
                  className="secondary-action icon-action danger"
                  onClick={() => setDeleteTarget(destination)}
                  type="button"
                  title={text("Delete destination")}
                  disabled={destinations.length <= 1}
                >
                  <Trash2 size={16} />
                </button>
                </div>
              </div>
            </article>
          ))}
          {filteredDestinations.length === 0 && <EmptyState text={text("No destination records match the current search and category filter.")} />}
        </section>
        {filteredDestinations.length > 6 && <div className="list-limit-footer"><span>{showAllDestinations ? filteredDestinations.length : 6} / {filteredDestinations.length}</span><button className="secondary-action compact-action" type="button" onClick={() => setShowAllDestinations(!showAllDestinations)}>{text(showAllDestinations ? "Show fewer" : "Show more")}</button></div>}
      </section>

      {modalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={text(modalMode === "add" ? "Add destination" : "Edit destination")}>
          <form className="modal-card destination-modal destination-form-modal" onSubmit={saveDestination}>
            <div className="modal-heading">
              <div>
                <span>{text("Destination Management")}</span>
                <h2>{text(modalMode === "add" ? "Add destination" : "Edit destination")}</h2>
              </div>
              <button className="secondary-action icon-action" type="button" onClick={closeFormModal} title={text("Close destination form")} disabled={Boolean(savingAction)}>
                <X size={18} />
              </button>
            </div>

            {candidate && <p className="status-message">{placeText(locale, "publishNote")}</p>}
            {message && <p className="status-message" role="alert">{text(message)}</p>}

            <label>
              {text("Name")}
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              {text("City")}
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
            </label>
            <label>{translate(locale, "tourist.events.state")}<select required value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value as MalaysianState | "" })}><option value="">{translate(locale, "tourist.events.state")}</option>{discoveryStates.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
            <label>
              {translate(locale, "common.address")}
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Concubine Lane, Lorong Panglima, 30000 Ipoh, Perak" />
            </label>
            <label>
              {translate(locale, "common.category")}
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DestinationCategory })}>
                {destinationCategories.map((category) => (
                  <option key={category} value={category}>
                    {translate(locale, `category.${category}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-pair">
              <label>
                {text("Latitude")}
                <input type="number" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required />
              </label>
              <label>
                {text("Longitude")}
                <input type="number" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required />
              </label>
            </div>
            <label>
              {text("Average visit minutes")}
              <input type="number" min="1" value={form.averageVisitMinutes} onChange={(event) => setForm({ ...form, averageVisitMinutes: event.target.value })} required />
            </label>
            <label>
              {translate(locale, "common.openingHours")}
              <input value={form.openingHours} onChange={(event) => setForm({ ...form, openingHours: event.target.value })} placeholder={text("Example: Usually daily; check public holiday hours")} />
            </label>
            <label>
              {translate(locale, "common.feeNote")}
              <input value={form.feeNote} onChange={(event) => setForm({ ...form, feeNote: event.target.value })} placeholder={text("Example: Entry is normally free; activities may vary")} />
            </label>
            <label>
              {text("Image URL")}
              <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder={text("Optional licensed image URL")} />
            </label>
            <label>
              {text("Image description")}
              <input value={form.imageAlt} onChange={(event) => setForm({ ...form, imageAlt: event.target.value })} placeholder={text("Example: Front view of Batu Caves temple steps")} />
            </label>
            <label>
              {text("Visit tips")}
              <textarea value={form.visitTips} onChange={(event) => setForm({ ...form, visitTips: event.target.value })} placeholder={text("Add one tip per line")} />
            </label>
            <label>
              {text("Description")}
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            </label>
            <button className="primary-action" type="submit" disabled={Boolean(savingAction)}>
              <Save size={18} />
              {text(savingAction ? "Saving" : modalMode === "add" ? "Save destination" : "Save changes")}
            </button>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`${text("Delete destination")}: ${deleteTarget.name}`}>
          <section className="modal-card destination-modal confirm-modal">
            <div className="modal-heading">
              <div>
                <span>{text("Delete destination")}</span>
                <h2>{deleteTarget.name}</h2>
              </div>
              <button className="secondary-action icon-action" type="button" onClick={() => setDeleteTarget(null)} title={text("Cancel delete")} disabled={Boolean(savingAction)}>
                <X size={18} />
              </button>
            </div>
            <p>{text("This will remove {name} from the destination list and refresh recommendation results that depend on destination data.", { name: deleteTarget.name })}</p>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(savingAction)}>
                {text("Cancel")}
              </button>
              <button className="primary-action danger" type="button" onClick={confirmDelete} disabled={Boolean(savingAction)}>
                <Trash2 size={18} />
                {text(savingAction === "delete" ? "Deleting" : "Delete destination")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
