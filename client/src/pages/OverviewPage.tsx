import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useResource } from "../lib/useResource";
import {
  BasketRentalsApi,
  BasketsApi,
  ColdBoxLogsApi,
  CoolingHubsApi,
  CoursesApi,
  EnrollmentsApi,
  UsersApi,
} from "../api/resources";
import { useToast } from "../state/ToastContext";
import { ApiError } from "../api/client";
import { PageHeader, Spinner, StatCard } from "../components/ui";
import { DataTable } from "../components/DataTable";
import { formatDate, formatItems, formatNaira, refName } from "../lib/format";

function AdminOverview() {
  const { data, loading, error } = useResource(
    () =>
      Promise.all([
        UsersApi.list(),
        CoolingHubsApi.list(),
        BasketRentalsApi.list({ status: "active" }),
        BasketsApi.list({ status: "available" }),
        CoursesApi.list(),
        ColdBoxLogsApi.list(),
      ]),
    []
  );

  if (loading) return <Spinner />;
  if (error || !data) return <p className="error-text">{error ?? "Failed to load"}</p>;

  const [users, hubs, activeRentals, availableBaskets, courses, logs] = data;
  const recentLogs = [...logs.data].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)).slice(0, 6);

  return (
    <>
      <div className="stat-grid section">
        <StatCard label="Registered users" value={users.pagination?.total ?? users.data.length} accent="teal" />
        <StatCard label="Cold-chain sites" value={hubs.pagination?.total ?? hubs.data.length} accent="amber" />
        <StatCard label="Active rentals" value={activeRentals.pagination?.total ?? activeRentals.data.length} accent="green" />
        <StatCard label="Available baskets" value={availableBaskets.pagination?.total ?? availableBaskets.data.length} accent="teal" />
        <StatCard label="Published courses" value={courses.data.filter((c) => c.isPublished).length} accent="amber" />
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

function RenterOverview() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, error, reload } = useResource(
    () => BasketRentalsApi.list({ renter: user!._id }),
    [user?._id]
  );

  if (loading) return <Spinner />;
  if (error || !data) return <p className="error-text">{error ?? "Failed to load"}</p>;

  const active = data.data.filter((r) => r.status === "active");
  const closed = data.data.filter((r) => r.status !== "active");

  async function closeRental(id: string) {
    try {
      const res = await BasketRentalsApi.close(id);
      notify(`Rental closed — total ${formatNaira(res.data.amountDueKobo)}`, "success");
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to close rental", "error");
    }
  }

  return (
    <>
      <div className="section" style={{ marginBottom: 22 }}>
        <Link to="/baskets" className="btn btn--primary">
          Rent a basket
        </Link>
      </div>
      <div className="stat-grid section">
        <StatCard label="Active rentals" value={active.length} accent="green" />
        <StatCard label="Past rentals" value={closed.length} accent="teal" />
      </div>
      <div className="section">
        <div className="section-title">Your active baskets</div>
        <div className="panel">
          <div className="panel-body">
            <DataTable
              rows={active}
              rowKey={(r) => r._id}
              emptyText="No basket currently rented yet — use Rent a basket above to start one."
              columns={[
                { header: "Produce", render: (r) => formatItems(r.items) },
                { header: "Total kg", render: (r) => `${r.totalQuantityKg}kg` },
                { header: "Basket", render: (r) => refName(r.basket) },
                { header: "Since", render: (r) => formatDate(r.startAt) },
                { header: "Rate", render: (r) => `₦${(r.rateKoboPerDay / 100).toFixed(0)}/day` },
                {
                  header: "",
                  render: (r) => (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => closeRental(r._id)}>
                      Close
                    </button>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function LearnerOverview() {
  const { user } = useAuth();
  const { data, loading, error } = useResource(() => EnrollmentsApi.list({ learner: user!._id }), [user?._id]);

  if (loading) return <Spinner />;
  if (error || !data) return <p className="error-text">{error ?? "Failed to load"}</p>;

  const inProgress = data.data.filter((e) => e.status === "in_progress").length;
  const completed = data.data.filter((e) => e.status === "completed").length;

  return (
    <>
      <div className="stat-grid section">
        <StatCard label="Courses in progress" value={inProgress} accent="amber" />
        <StatCard label="Courses completed" value={completed} accent="green" />
      </div>
      <div className="section">
        <div className="section-title">Your enrollments</div>
        <div className="panel">
          <div className="panel-body">
            <DataTable
              rows={data.data}
              rowKey={(e) => e._id}
              emptyText="Not enrolled in anything yet — see the Training tab."
              columns={[
                { header: "Course", render: (e) => refName(e.course) },
                { header: "Progress", render: (e) => `${e.progressPercent}%` },
                { header: "Status", render: (e) => e.status.replace("_", " ") },
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
      {(user?.role === "admin" || user?.role === "staff") && <AdminOverview />}
      {(user?.role === "farmer" || user?.role === "market_woman" || user?.role === "trader") && <RenterOverview />}
      {user?.role === "learner" && <LearnerOverview />}
    </>
  );
}
