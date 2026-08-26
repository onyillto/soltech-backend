import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../state/AuthContext";
import { useResource } from "../lib/useResource";
import { useToast } from "../state/ToastContext";
import { BasketRentalsApi, BasketsApi, CoolingUnitsApi } from "../api/resources";
import { DataTable, type Column } from "../components/DataTable";
import { Badge, Field, PageHeader, Panel, Spinner } from "../components/ui";
import { Modal } from "../components/Modal";
import { ApiError } from "../api/client";
import { formatDate, formatNaira, refId, refName } from "../lib/format";
import { dailyRateNairaForWeight } from "../lib/pricing";
import type { BasketRental } from "../api/types";

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

/** Starting a rental: pick an available basket, list every produce item going in (weighed
 * on the scale you already have), and see the price before confirming. */
function RentBasketModal({
  availableBaskets,
  onClose,
  onCreated,
}: {
  availableBaskets: { _id: string; basketNumber: number; capacityKg?: number }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const [basket, setBasket] = useState(availableBaskets[0]?._id ?? "");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const selectedBasket = availableBaskets.find((b) => b._id === basket);
  const totalKg = items.reduce((sum, item) => sum + (Number(item.quantityKg) || 0), 0);
  const overCapacity = !!selectedBasket?.capacityKg && totalKg > selectedBasket.capacityKg;
  const dailyRateNaira = totalKg > 0 ? dailyRateNairaForWeight(totalKg) : 0;

  const hasValidItems = items.some((item) => item.produceType.trim() && Number(item.quantityKg) > 0);
  const canConfirm = !!basket && hasValidItems && !overCapacity && !submitting;

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

    if (!basket || payloadItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await BasketRentalsApi.create({ basket, items: payloadItems });
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

function rentalColumns(
  canManage: boolean,
  currentUserId: string | undefined,
  onClose: (id: string) => void
): Column<BasketRental>[] {
  const columns: Column<BasketRental>[] = [
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
  ];

  if (canManage) {
    columns.push({ header: "Renter", render: (r) => refName(r.renter) });
  }

  columns.push(
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
        r.status === "active" && (canManage || refId(r.renter) === currentUserId) ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onClose(r._id)}>
            Close
          </button>
        ) : null,
    }
  );

  return columns;
}

export function BasketsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const canManage = user?.role === "admin" || user?.role === "staff";
  const canRent = canManage || user?.role === "farmer" || user?.role === "market_woman" || user?.role === "trader";
  const [modalOpen, setModalOpen] = useState(false);

  const unitsRes = useResource(() => CoolingUnitsApi.list(), []);
  const basketsRes = useResource(() => BasketsApi.list(), []);
  const rentalsRes = useResource(
    () => (canManage ? BasketRentalsApi.list() : BasketRentalsApi.list({ renter: user?._id })),
    [canManage, user?._id]
  );

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
          canRent && (
            <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)} disabled={basketsRes.loading}>
              Rent a basket
            </button>
          )
        }
      />

      {modalOpen && (
        <RentBasketModal availableBaskets={availableBaskets} onClose={() => setModalOpen(false)} onCreated={refreshAll} />
      )}

      <div className="section">
        <Panel title={canManage ? "All rentals" : "Your rentals"}>
          {rentalsRes.loading ? (
            <Spinner />
          ) : (
            <DataTable
              rows={rentalsRes.data?.data ?? []}
              rowKey={(r) => r._id}
              emptyText="No rentals yet."
              columns={rentalColumns(canManage, user?._id, closeRental)}
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
              {canManage && (
                <div style={{ marginTop: 18, borderTop: "1px solid var(--border-soft)", paddingTop: 16 }}>
                  <NewBasketForm
                    units={(unitsRes.data?.data ?? []).map((u) => ({ _id: u._id, unitCode: u.unitCode }))}
                    onCreated={basketsRes.reload}
                  />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
