import { useState } from "react";
import type { FormEvent } from "react";
import { useResource } from "../lib/useResource";
import { useToast } from "../state/ToastContext";
import { BasketRentalsApi, BasketsApi, ClientsApi, CoolingUnitsApi } from "../api/resources";
import { DataTable, type Column } from "../components/DataTable";
import { Badge, Field, PageHeader, Panel, Spinner } from "../components/ui";
import { Modal } from "../components/Modal";
import { ApiError } from "../api/client";
import { formatDate, formatNaira, refName } from "../lib/format";
import { dailyRateNairaForWeight } from "../lib/pricing";
import type { BasketRental, Client } from "../api/types";

function basketTone(status: string) {
  if (status === "available") return "green" as const;
  if (status === "occupied") return "amber" as const;
  return "muted" as const;
}

function rentalTone(status: string) {
  if (status === "active") return "green" as const;
  if (status === "closed") return "teal" as const;
  return "muted" as const;
}

function NewBasketForm({ units, onCreated }: { units: { _id: string; unitCode: string }[]; onCreated: () => void }) {
  const { notify } = useToast();
  const [unit, setUnit] = useState(units[0]?._id ?? "");
  const [basketNumber, setBasketNumber] = useState(1);
  const [capacityKg, setCapacityKg] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!unit) return notify("Create a cooling unit first", "error");
    setSubmitting(true);
    try {
      await BasketsApi.create({ unit, basketNumber, capacityKg });
      notify(`Basket #${basketNumber} added`, "success");
      onCreated();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to create basket", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="Unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => (
              <option key={u._id} value={u._id}>
                {u.unitCode}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Basket number">
          <input type="number" min={1} value={basketNumber} onChange={(e) => setBasketNumber(Number(e.target.value))} />
        </Field>
        <Field label="Capacity (kg)">
          <input type="number" min={0} value={capacityKg} onChange={(e) => setCapacityKg(Number(e.target.value))} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={submitting || !unit}>
          {submitting ? "Adding…" : "Add basket"}
        </button>
      </div>
    </form>
  );
}

interface ItemRow {
  produceType: string;
  quantityKg: string;
}

const EMPTY_ITEM: ItemRow = { produceType: "", quantityKg: "" };

/** Starting a rental: pick an available basket, pick which client it's for, list every
 * produce item going in (weighed on the scale you already have), and see the price
 * before confirming. */
function RentBasketModal({
  availableBaskets,
  clients,
  onClose,
  onCreated,
  onClientRegistered,
}: {
  availableBaskets: { _id: string; basketNumber: number; capacityKg?: number }[];
  clients: Client[];
  onClose: () => void;
  onCreated: () => void;
  onClientRegistered: () => void;
}) {
  const { notify } = useToast();
  const [basket, setBasket] = useState(availableBaskets[0]?._id ?? "");
  const [client, setClient] = useState(clients[0]?._id ?? "");
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [registeringClient, setRegisteringClient] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const selectedBasket = availableBaskets.find((b) => b._id === basket);
  const totalKg = items.reduce((sum, item) => sum + (Number(item.quantityKg) || 0), 0);
  const overCapacity = !!selectedBasket?.capacityKg && totalKg > selectedBasket.capacityKg;
  const dailyRateNaira = totalKg > 0 ? dailyRateNairaForWeight(totalKg) : 0;

  const hasValidItems = items.some((item) => item.produceType.trim() && Number(item.quantityKg) > 0);
  const canConfirm = !!basket && !!client && hasValidItems && !overCapacity && !submitting;

  async function registerClient() {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setRegisteringClient(true);
    try {
      const res = await ClientsApi.create({ name: newClientName.trim(), phone: newClientPhone.trim() });
      notify(`${res.data.name} registered`, "success");
      onClientRegistered();
      setClient(res.data._id);
      setAddingClient(false);
      setNewClientName("");
      setNewClientPhone("");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to register client", "error");
    } finally {
      setRegisteringClient(false);
    }
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function confirm() {
    const payloadItems = items
      .filter((item) => item.produceType.trim() && Number(item.quantityKg) > 0)
      .map((item) => ({ produceType: item.produceType.trim(), quantityKg: Number(item.quantityKg) }));

    if (!basket || !client || payloadItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await BasketRentalsApi.create({ basket, client, items: payloadItems });
      notify(`Rental started — ${formatNaira(res.data.rateKoboPerDay)}/day from now`, "success");
      onCreated();
      onClose();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to start rental", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Rent a basket"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" disabled={!canConfirm} onClick={confirm}>
            {submitting ? "Starting…" : totalKg > 0 ? `Confirm — ₦${dailyRateNaira}/day` : "Confirm"}
          </button>
        </>
      }
    >
      <Field label="Available basket">
        <select value={basket} onChange={(e) => setBasket(e.target.value)}>
          {availableBaskets.length === 0 && <option value="">No baskets available</option>}
          {availableBaskets.map((b) => (
            <option key={b._id} value={b._id}>
              Basket #{b.basketNumber}
              {b.capacityKg ? ` (max ${b.capacityKg}kg)` : ""}
            </option>
          ))}
        </select>
      </Field>

      {addingClient ? (
        <div className="form-grid" style={{ marginTop: 12, gridTemplateColumns: "1fr 1fr" }}>
          <Field label="New client name">
            <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Farida Farmer" />
          </Field>
          <Field label="Phone">
            <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="+2348012345678" />
          </Field>
          <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!newClientName.trim() || !newClientPhone.trim() || registeringClient}
              onClick={registerClient}
            >
              {registeringClient ? "Registering…" : "Register & select"}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddingClient(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Field label="Client">
          <div style={{ display: "flex", gap: 8 }}>
            <select value={client} onChange={(e) => setClient(e.target.value)} style={{ flex: 1 }}>
              {clients.length === 0 && <option value="">No clients registered</option>}
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddingClient(true)}>
              + New
            </button>
          </div>
        </Field>
      )}

      <div className="section-title" style={{ marginTop: 16 }}>
        Produce going in
      </div>
      {items.map((item, i) => (
        <div key={i} className="form-grid" style={{ marginBottom: 6, gridTemplateColumns: "1fr 1fr auto" }}>
          <Field label={i === 0 ? "Produce" : ""}>
            <input
              value={item.produceType}
              onChange={(e) => updateItem(i, { produceType: e.target.value })}
              placeholder="Tomatoes"
            />
          </Field>
          <Field label={i === 0 ? "Weight (kg) — from your scale" : ""}>
            <input
              type="number"
              min={0}
              step="0.1"
              value={item.quantityKg}
              onChange={(e) => updateItem(i, { quantityKg: e.target.value })}
              placeholder="e.g. 12"
            />
          </Field>
          <div style={{ display: "flex", alignItems: i === 0 ? "flex-end" : "center", paddingBottom: i === 0 ? 1 : 0 }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => removeItem(i)}
              disabled={items.length === 1}
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={addItem} style={{ marginBottom: 16 }}>
        + Add another produce
      </button>

      <div className="rental-price-preview">
        <div>
          <div className="rental-price-preview-total">{totalKg}kg total</div>
          {selectedBasket?.capacityKg && (
            <div className="hint" style={{ marginTop: 0 }}>
              basket capacity {selectedBasket.capacityKg}kg
            </div>
          )}
        </div>
        <div className="rental-price-preview-rate">{totalKg > 0 ? `₦${dailyRateNaira}/day` : "—"}</div>
      </div>
      {overCapacity && (
        <p className="error-text">
          Total weight ({totalKg}kg) exceeds this basket's capacity ({selectedBasket?.capacityKg}kg).
        </p>
      )}
    </Modal>
  );
}

function rentalColumns(onClose: (id: string) => void): Column<BasketRental>[] {
  return [
    {
      header: "Produce",
      render: (r) => (
        <div className="rental-items">
          {r.items.map((item, i) => (
            <span key={i}>
              {item.produceType} {item.quantityKg}kg
            </span>
          ))}
        </div>
      ),
    },
    { header: "Total kg", render: (r) => `${r.totalQuantityKg}kg` },
    { header: "Basket", render: (r) => refName(r.basket) },
    { header: "Client", render: (r) => refName(r.client) },
    { header: "Started", render: (r) => formatDate(r.startAt) },
    {
      header: "Bill",
      render: (r) =>
        r.status === "active" ? `${formatNaira(r.estimatedAmountDueKobo)} est.` : formatNaira(r.amountDueKobo),
    },
    { header: "Status", render: (r) => <Badge tone={rentalTone(r.status)}>{r.status}</Badge> },
    {
      header: "",
      render: (r) =>
        r.status === "active" ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onClose(r._id)}>
            Close
          </button>
        ) : null,
    },
  ];
}

export function BasketsPage() {
  const { notify } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const unitsRes = useResource(() => CoolingUnitsApi.list(), []);
  const basketsRes = useResource(() => BasketsApi.list(), []);
  const clientsRes = useResource(() => ClientsApi.list(), []);
  const rentalsRes = useResource(() => BasketRentalsApi.list(), []);

  async function closeRental(id: string) {
    try {
      const res = await BasketRentalsApi.close(id);
      notify(`Rental closed — total ${formatNaira(res.data.amountDueKobo)}`, "success");
      rentalsRes.reload();
      basketsRes.reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to close rental", "error");
    }
  }

  const availableBaskets = (basketsRes.data?.data ?? [])
    .filter((b) => b.status === "available")
    .map((b) => ({ _id: b._id, basketNumber: b.basketNumber, capacityKg: b.capacityKg }));

  const refreshAll = () => {
    basketsRes.reload();
    rentalsRes.reload();
  };

  return (
    <>
      <PageHeader
        title="Baskets & Rentals"
        lede="Modular cold baskets, rented pay-per-use by weight. Close a rental to compute the final bill and free the basket."
        action={
          <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)} disabled={basketsRes.loading}>
            Rent a basket
          </button>
        }
      />

      {modalOpen && (
        <RentBasketModal
          availableBaskets={availableBaskets}
          clients={clientsRes.data?.data ?? []}
          onClose={() => setModalOpen(false)}
          onCreated={refreshAll}
          onClientRegistered={clientsRes.reload}
        />
      )}

      <div className="section">
        <Panel title="All rentals">
          {rentalsRes.loading ? (
            <Spinner />
          ) : (
            <DataTable
              rows={rentalsRes.data?.data ?? []}
              rowKey={(r) => r._id}
              emptyText="No rentals yet."
              columns={rentalColumns(closeRental)}
            />
          )}
        </Panel>
      </div>

      <div className="section">
        <Panel title="Baskets">
          {basketsRes.loading ? (
            <Spinner />
          ) : (
            <>
              <DataTable
                rows={basketsRes.data?.data ?? []}
                rowKey={(b) => b._id}
                emptyText="No baskets yet."
                columns={[
                  { header: "Unit", render: (b) => refName(b.unit) },
                  { header: "#", render: (b) => b.basketNumber },
                  { header: "Capacity", render: (b) => (b.capacityKg ? `${b.capacityKg}kg` : "—") },
                  { header: "Status", render: (b) => <Badge tone={basketTone(b.status)}>{b.status}</Badge> },
                ]}
              />
              <div style={{ marginTop: 18, borderTop: "1px solid var(--border-soft)", paddingTop: 16 }}>
                <NewBasketForm
                  units={(unitsRes.data?.data ?? []).map((u) => ({ _id: u._id, unitCode: u.unitCode }))}
                  onCreated={basketsRes.reload}
                />
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
