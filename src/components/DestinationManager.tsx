import { useMemo, useState, type FormEvent } from "react";
import { MapPinned, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import type { Destination, DestinationCategory } from "../types";
import { addDestinationRecord, deleteDestinationRecord, destinationCategories, updateDestinationRecord } from "../services/destinationManagement";
import { EmptyState } from "./SummaryCards";
import type { NotifyFn } from "./ToastViewport";

type DestinationFormState = {
  name: string;
  city: string;
  address: string;
  category: DestinationCategory;
  latitude: string;
  longitude: string;
  averageVisitMinutes: string;
  openingHours: string;
  feeNote: string;
  visitTips: string;
  description: string;
};

function createDestinationForm(destination?: Destination): DestinationFormState {
  return {
    name: destination?.name ?? "",
    city: destination?.city ?? "",
    address: destination?.address ?? "",
    category: destination?.category ?? "cultural",
    latitude: destination ? String(destination.latitude) : "3.1478",
    longitude: destination ? String(destination.longitude) : "101.6937",
    averageVisitMinutes: destination ? String(destination.averageVisitMinutes) : "60",
    openingHours: destination?.openingHours ?? "",
    feeNote: destination?.feeNote ?? "",
    visitTips: destination?.visitTips?.join("\n") ?? "",
    description: destination?.description ?? "",
  };
}

export function DestinationManager({ destinations, onChange, notify }: { destinations: Destination[]; onChange: (destinations: Destination[]) => void; notify: NotifyFn }) {
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationFormState>(() => createDestinationForm());
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [savingAction, setSavingAction] = useState<"add" | "edit" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DestinationCategory | "all">("all");

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
    setForm(createDestinationForm());
    setEditingId(null);
    setModalMode("add");
    setMessage(null);
  };

  const startEdit = (destination: Destination) => {
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
    setEditingId(null);
    setForm(createDestinationForm());
  };

  const saveDestination = (event: FormEvent<HTMLFormElement>) => {
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

    onChange(result.destinations);
    setMessage(action === "add" ? "Destination saved." : "Destination updated.");
    setSavingAction(null);
    setModalMode(null);
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
      <section className="destination-management-panel">
        <div className="section-heading">
          <div>
            <h2>Destinations</h2>
            <p>{destinations.length} Malaysian tourist destination records available for recommendation and movement analysis.</p>
          </div>
          <button className="primary-action compact-action" type="button" onClick={openAddModal}>
            <MapPinned size={17} />
            Add
          </button>
        </div>

        {message && <p className="status-message">{message}</p>}

        <div className="destination-filter-toolbar">
          <label>
            Find destination
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search name, city or category" />
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as DestinationCategory | "all")}>
              <option value="all">All categories</option>
              {destinationCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-action compact-action" type="button" onClick={resetDestinationFilters} disabled={!searchTerm && categoryFilter === "all"}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <section className="destination-admin-grid">
          {filteredDestinations.map((destination) => (
            <article className="destination-card editable" key={destination.id}>
              <div>
                <strong>{destination.name}</strong>
                <span>{destination.city}</span>
              </div>
              <p>{destination.description}</p>
              <div className="tag-row">
                <small>{destination.category}</small>
                <small>{destination.averageVisitMinutes} min visit</small>
                {destination.openingHours && <small>visit info</small>}
              </div>
              <div className="card-actions">
                <button className="secondary-action icon-action" onClick={() => startEdit(destination)} type="button" title="Edit destination">
                  <Pencil size={16} />
                </button>
                <button
                  className="secondary-action icon-action danger"
                  onClick={() => setDeleteTarget(destination)}
                  type="button"
                  title="Delete destination"
                  disabled={destinations.length <= 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {filteredDestinations.length === 0 && <EmptyState text="No destination records match the current search and category filter." />}
        </section>
      </section>

      {modalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={modalMode === "add" ? "Add destination" : "Edit destination"}>
          <form className="modal-card destination-modal destination-form-modal" onSubmit={saveDestination}>
            <div className="modal-heading">
              <div>
                <span>Destination Management</span>
                <h2>{modalMode === "add" ? "Add Destination" : "Edit Destination"}</h2>
              </div>
              <button className="secondary-action icon-action" type="button" onClick={closeFormModal} title="Close destination form" disabled={Boolean(savingAction)}>
                <X size={18} />
              </button>
            </div>

            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              City
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Example: Concubine Lane, Lorong Panglima, 30000 Ipoh, Perak" />
            </label>
            <label>
              Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DestinationCategory })}>
                {destinationCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-pair">
              <label>
                Latitude
                <input type="number" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required />
              </label>
              <label>
                Longitude
                <input type="number" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required />
              </label>
            </div>
            <label>
              Average visit minutes
              <input type="number" min="1" value={form.averageVisitMinutes} onChange={(event) => setForm({ ...form, averageVisitMinutes: event.target.value })} required />
            </label>
            <label>
              Opening hours
              <input value={form.openingHours} onChange={(event) => setForm({ ...form, openingHours: event.target.value })} placeholder="Example: Usually daily; check public holiday hours" />
            </label>
            <label>
              Fee note
              <input value={form.feeNote} onChange={(event) => setForm({ ...form, feeNote: event.target.value })} placeholder="Example: Entry is normally free; activities may vary" />
            </label>
            <label>
              Visit tips
              <textarea value={form.visitTips} onChange={(event) => setForm({ ...form, visitTips: event.target.value })} placeholder="Add one tip per line" />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            </label>
            <button className="primary-action" type="submit">
              <Save size={18} />
              {savingAction ? "Saving" : modalMode === "add" ? "Save destination" : "Save changes"}
            </button>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Delete ${deleteTarget.name}`}>
          <section className="modal-card destination-modal confirm-modal">
            <div className="modal-heading">
              <div>
                <span>Delete Destination</span>
                <h2>{deleteTarget.name}</h2>
              </div>
              <button className="secondary-action icon-action" type="button" onClick={() => setDeleteTarget(null)} title="Cancel delete" disabled={Boolean(savingAction)}>
                <X size={18} />
              </button>
            </div>
            <p>This will remove {deleteTarget.name} from the destination list and refresh recommendation results that depend on destination data.</p>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(savingAction)}>
                Cancel
              </button>
              <button className="primary-action danger" type="button" onClick={confirmDelete} disabled={Boolean(savingAction)}>
                <Trash2 size={18} />
                {savingAction === "delete" ? "Deleting" : "Delete destination"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
