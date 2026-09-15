import { useState } from "react";
import { useResource } from "../lib/useResource";
import { useToast } from "../state/ToastContext";
import { BasketRentalsApi, BasketsApi, ClientsApi } from "../api/resources";
import { DataTable, type Column } from "../components/DataTable";
import { Badge, Field, PageHeader, Pager, Panel, Spinner, StatCard } from "../components/ui";
import { Modal } from "../components/Modal";
import { Combobox, type ComboboxOption } from "../components/Combobox";
import { ApiError } from "../api/client";
import { formatDate, formatItems, formatNaira, refId, refName } from "../lib/format";
import { dailyRateNairaForWeight } from "../lib/pricing";
import type { Basket, BasketRental, Client } from "../api/types";

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

/**
 * Starting a rental: pick a basket — only the ones actually free to use show up
 * here, a basket that's occupied or under maintenance never appears in this list
 * at all — then take the client's name, phone, and a description + weight of
 * what's going in, and see the price before confirming.
 */
function RentBasketModal({
  baskets,
  clients,
  onClose,
  onCreated,
  onClientRegistered,
}: {
  baskets: Basket[];
  clients: Client[];
  onClose: () => void;
  onCreated: () => void;
  onClientRegistered: () => void;
}) {
  const { notify } = useToast();
  const availableBaskets = baskets.filter((b) => b.status === "available").sort((a, b) => a.basketNumber - b.basketNumber);

  const [basket, setBasket] = useState(availableBaskets[0]?._id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const basketOptions: ComboboxOption[] = availableBaskets.map((b) => ({
    value: b._id,
    label: `Basket #${b.basketNumber}${b.capacityKg ? ` (max ${b.capacityKg}kg)` : ""}`,
    meta: b.location,
  }));

  const selectedBasket = availableBaskets.find((b) => b._id === basket);
  const weight = Number(weightKg) || 0;
  const overCapacity = !!selectedBasket?.capacityKg && weight > selectedBasket.capacityKg;
  const dailyRateNaira = weight > 0 ? dailyRateNairaForWeight(weight) : 0;

  const canConfirm =
    !!basket && !!clientName.trim() && !!clientPhone.trim() && !!description.trim() && weight > 0 && !overCapacity && !submitting;

  async function confirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      // Reuse an existing client with this exact phone rather than creating a duplicate record.
      const existing = clients.find((c) => c.phone.trim() === clientPhone.trim());
      let clientId = existing?._id;
      if (!clientId) {
        const clientRes = await ClientsApi.create({ name: clientName.trim(), phone: clientPhone.trim() });
        clientId = clientRes.data._id;
        onClientRegistered();
      }

      const res = await BasketRentalsApi.create({
        basket,
        client: clientId,
        items: [{ produceType: description.trim(), quantityKg: weight }],
      });
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
            {submitting ? "Starting…" : weight > 0 ? `Confirm — ₦${dailyRateNaira}/day` : "Confirm"}
          </button>
        </>
      }
    >
      <Field label="Basket">
        <Combobox
          options={basketOptions}
          value={basket}
          onChange={setBasket}
          placeholder="Select an available basket"
          searchPlaceholder="Search by basket #…"
          emptyText="No available baskets."
        />
      </Field>
      {availableBaskets.length === 0 && (
        <p className="error-text">Every basket is currently occupied or under maintenance.</p>
      )}

      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field label="Client name">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Farida Farmer" />
        </Field>
        <Field label="Phone number">
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+2348012345678" />
        </Field>
      </div>

      <div className="form-grid">
        <Field label="Description of goods">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tomatoes and pepper" />
        </Field>
        <Field label="Weight (kg) — from your scale">
          <input type="number" min={0} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 12" />
        </Field>
      </div>

      <div className="rental-price-preview">
        <div>
          <div className="rental-price-preview-total">{weight}kg total</div>
          {selectedBasket?.capacityKg && (
            <div className="hint" style={{ marginTop: 0 }}>
              basket capacity {selectedBasket.capacityKg}kg
            </div>
          )}
        </div>
        <div className="rental-price-preview-rate">{weight > 0 ? `₦${dailyRateNaira}/day` : "—"}</div>
      </div>
      {overCapacity && (
        <p className="error-text">
          Weight ({weight}kg) exceeds this basket's capacity ({selectedBasket?.capacityKg}kg).
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
  const [basketsPage, setBasketsPage] = useState(1);
  const [rentalsPage, setRentalsPage] = useState(1);

  // The visible, paginated tables (20 per page, like every other list in the app).
  const basketsRes = useResource(() => BasketsApi.list({ page: basketsPage }), [basketsPage]);
  const rentalsRes = useResource(() => BasketRentalsApi.list({ page: rentalsPage }), [rentalsPage]);

  // Separate, un-paginated fetches (capped at 100 — the backend's own per-request max) for things
  // that need the *whole* set regardless of which table page you're looking at: which baskets the
  // "Rent a basket" modal can offer, which rental currently occupies each basket, and the
  // available/occupied/maintenance counts in the stat row above.
  const availableBasketsRes = useResource(() => BasketsApi.list({ status: "available", limit: 100 }), []);
  const occupiedCountRes = useResource(() => BasketsApi.list({ status: "occupied", limit: 1 }), []);
  const maintenanceCountRes = useResource(() => BasketsApi.list({ status: "maintenance", limit: 1 }), []);
  const activeRentalsRes = useResource(() => BasketRentalsApi.list({ status: "active", limit: 100 }), []);
  const clientsRes = useResource(() => ClientsApi.list({ limit: 100 }), []);

  async function closeRental(id: string) {
    try {
      const res = await BasketRentalsApi.close(id);
      notify(`Rental closed — total ${formatNaira(res.data.amountDueKobo)}`, "success");
      refreshAll();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to close rental", "error");
    }
  }

  const baskets = basketsRes.data?.data ?? [];
  const availableCount = availableBasketsRes.data?.pagination?.total ?? 0;
  const occupiedCount = occupiedCountRes.data?.pagination?.total ?? 0;
  const maintenanceCount = maintenanceCountRes.data?.pagination?.total ?? 0;

  // Which rental currently has each basket, so the table can show what's inside it.
  const activeRentalByBasket = new Map((activeRentalsRes.data?.data ?? []).map((r) => [refId(r.basket), r]));

  function refreshAll() {
    basketsRes.reload();
    rentalsRes.reload();
    availableBasketsRes.reload();
    occupiedCountRes.reload();
    maintenanceCountRes.reload();
    activeRentalsRes.reload();
  }

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

      <div className="stat-grid section">
        <StatCard label="Available baskets" value={availableCount} accent="green" />
        <StatCard label="Occupied" value={occupiedCount} accent="amber" />
        <StatCard label="Under maintenance" value={maintenanceCount} accent="red" />
        <StatCard label="Total baskets" value={availableCount + occupiedCount + maintenanceCount} accent="teal" />
      </div>

      {modalOpen && (
        <RentBasketModal
          baskets={availableBasketsRes.data?.data ?? []}
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
            <>
              <DataTable
                rows={rentalsRes.data?.data ?? []}
                rowKey={(r) => r._id}
                emptyText="No rentals yet."
                columns={rentalColumns(closeRental)}
              />
              <Pager
                page={rentalsRes.data?.pagination?.page ?? 1}
                pages={rentalsRes.data?.pagination?.pages ?? 1}
                total={rentalsRes.data?.pagination?.total}
                onPageChange={setRentalsPage}
              />
            </>
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
                rows={baskets}
                rowKey={(b) => b._id}
                emptyText="No baskets yet."
                columns={[
                  { header: "Unit", render: (b) => refName(b.unit) },
                  { header: "#", render: (b) => b.basketNumber },
                  { header: "Location", render: (b) => b.location ?? "—" },
                  { header: "Capacity", render: (b) => (b.capacityKg ? `${b.capacityKg}kg` : "—") },
                  { header: "Status", render: (b) => <Badge tone={basketTone(b.status)}>{b.status}</Badge> },
                  {
                    header: "Current rental",
                    render: (b) => {
                      if (b.status === "maintenance") return <span className="hint">Under maintenance</span>;
                      const rental = activeRentalByBasket.get(b._id);
                      if (!rental) return "—";
                      return (
                        <span>
                          {refName(rental.client)} — {formatItems(rental.items)}
                          <span className="hint" style={{ marginLeft: 6 }}>
                            since {formatDate(rental.startAt)}
                          </span>
                        </span>
                      );
                    },
                  },
                ]}
              />
              <Pager
                page={basketsRes.data?.pagination?.page ?? 1}
                pages={basketsRes.data?.pagination?.pages ?? 1}
                total={basketsRes.data?.pagination?.total}
                onPageChange={setBasketsPage}
              />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
