import { useState } from "react";
import { useAuth } from "../state/AuthContext";
import { useResource } from "../lib/useResource";
import { BasketRentalsApi } from "../api/resources";
import { Badge, PageHeader, Panel, Spinner, StatCard } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { BarChart } from "../components/BarChart";
import { formatDate, formatItems, formatNaira, refName } from "../lib/format";
import type { BasketRental } from "../api/types";

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function rentalTone(status: string) {
  if (status === "active") return "green" as const;
  if (status === "closed") return "teal" as const;
  return "muted" as const;
}

/** Turns a "YYYY-MM-DD" bucket key into "26 Aug" for chart/table display. */
function formatBucketDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

function transactionColumns(canManage: boolean): Column<BasketRental>[] {
  const columns: Column<BasketRental>[] = [
    { header: "Produce", render: (r) => formatItems(r.items) },
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
    { header: "Status", render: (r) => <Badge tone={rentalTone(r.status)}>{r.status}</Badge> }
  );

  return columns;
}

export function TransactionsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "staff";
  const [days, setDays] = useState(30);

  const summaryRes = useResource(() => BasketRentalsApi.summary(days), [days]);
  const rentalsRes = useResource(
    () => (canManage ? BasketRentalsApi.list({}) : BasketRentalsApi.list({ renter: user?._id })),
    [canManage, user?._id]
  );

  const totals = summaryRes.data?.data.totals;
  const daily = summaryRes.data?.data.daily ?? [];

  const transactionSeries = daily.map((d) => ({
    key: d.date,
    displayLabel: formatBucketDate(d.date),
    value: d.transactions,
  }));
  const revenueSeries = daily.map((d) => ({
    key: d.date,
    displayLabel: formatBucketDate(d.date),
    value: Math.round(d.revenueKobo / 100),
  }));

  return (
    <>
      <PageHeader
        title="Transactions"
        lede="Everything that has gone through the system — every basket rental, with totals and a daily read on volume and revenue."
      />

      <div className="section" style={{ display: "flex", gap: 8 }}>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            type="button"
            className={`btn btn--sm ${days === opt.days ? "btn--primary" : "btn--ghost"}`}
            onClick={() => setDays(opt.days)}
          >
            Last {opt.label}
          </button>
        ))}
      </div>

      {summaryRes.loading || !totals ? (
        <Spinner />
      ) : (
        <>
          <div className="stat-grid section">
            <StatCard label="Total transactions" value={totals.totalTransactions} accent="teal" />
            <StatCard label="Active now" value={totals.activeCount} accent="green" />
            <StatCard label="Closed" value={totals.closedCount} accent="teal" />
            <StatCard label="Total weight moved" value={`${totals.totalWeightKg}kg`} accent="amber" />
            <StatCard label="Total revenue (closed)" value={formatNaira(totals.totalRevenueKobo)} accent="green" />
          </div>

          <div className="section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
            <Panel title={`Transactions per day — last ${days} days`}>
              <BarChart data={transactionSeries} color="var(--brand)" valueLabel="transactions" />
            </Panel>
            <Panel title={`Revenue per day — last ${days} days`}>
              <BarChart
                data={revenueSeries}
                color="var(--chart-2)"
                valueLabel="revenue"
                formatValue={(v) => `₦${v.toLocaleString()}`}
              />
            </Panel>
          </div>
        </>
      )}

      <div className="section">
        <Panel title={canManage ? "All transactions" : "Your transactions"}>
          {rentalsRes.loading ? (
            <Spinner />
          ) : (
            <DataTable
              rows={rentalsRes.data?.data ?? []}
              rowKey={(r) => r._id}
              emptyText="Nothing recorded yet."
              columns={transactionColumns(canManage)}
            />
          )}
        </Panel>
      </div>
    </>
  );
}
