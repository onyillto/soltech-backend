import { useAuth } from "../state/AuthContext";
import { useResource } from "../lib/useResource";
import { BasketRentalsApi, BasketsApi, ClientsApi, ColdBoxLogsApi, CoolingHubsApi, UsersApi } from "../api/resources";
import { PageHeader, Spinner, StatCard } from "../components/ui";
import { DataTable } from "../components/DataTable";
import { formatDate } from "../lib/format";

function AdminOverview() {
  const { data, loading, error } = useResource(
    () =>
      Promise.all([
        UsersApi.list(),
        ClientsApi.list(),
        CoolingHubsApi.list(),
        BasketRentalsApi.list({ status: "active" }),
        BasketsApi.list({ status: "available" }),
        ColdBoxLogsApi.list(),
      ]),
    []
  );

  if (loading) return <Spinner />;
  if (error || !data) return <p className="error-text">{error ?? "Failed to load"}</p>;

  const [users, clients, hubs, activeRentals, availableBaskets, logs] = data;
  const recentLogs = [...logs.data].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)).slice(0, 6);

  return (
    <>
      <div className="stat-grid section">
        <StatCard label="Admin/operator accounts" value={users.pagination?.total ?? users.data.length} accent="teal" />
        <StatCard label="Registered clients" value={clients.pagination?.total ?? clients.data.length} accent="amber" />
        <StatCard label="Cold-chain sites" value={hubs.pagination?.total ?? hubs.data.length} accent="amber" />
        <StatCard label="Active rentals" value={activeRentals.pagination?.total ?? activeRentals.data.length} accent="green" />
        <StatCard label="Available baskets" value={availableBaskets.pagination?.total ?? availableBaskets.data.length} accent="teal" />
      </div>

      <div className="section">
        <div className="section-title">Recent cold-box activity</div>
        <div className="panel">
          <div className="panel-body">
            <DataTable
              rows={recentLogs}
              rowKey={(r) => r._id}
              emptyText="No load/unload events recorded yet."
              columns={[
                { header: "Produce", render: (r) => r.produceType },
                { header: "Event", render: (r) => (r.eventType === "load" ? "Loaded" : "Unloaded") },
                { header: "Kg", render: (r) => r.quantityKg },
                { header: "When", render: (r) => formatDate(r.occurredAt) },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export function OverviewPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name?.split(" ")[0] ?? "there"}`} lede="A quick snapshot of what's happening in SOLTECH Hub right now." />
      <AdminOverview />
    </>
  );
}
