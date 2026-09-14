import { useState } from "react";
import type { FormEvent } from "react";
import { useResource } from "../lib/useResource";
import { useToast } from "../state/ToastContext";
import { CoolingUnitsApi, TelemetryApi } from "../api/resources";
import { Badge, Field, PageHeader, Panel, Spinner, StatCard } from "../components/ui";
import { DataTable } from "../components/DataTable";
import { BarChart } from "../components/BarChart";
import { ApiError } from "../api/client";
import { formatDate, refName } from "../lib/format";
import { batteryTone, temperatureTone } from "../lib/coldChain";
import type { ApiEnvelope, TelemetryReading, TelemetrySummary } from "../api/types";

const WINDOW_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

/** "14 Sep 09:00" for a 24h window, "14 Sep" beyond that — keeps the chart's x-axis readable either way. */
function formatPoint(iso: string, hours: number): string {
  const d = new Date(iso);
  return d.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    ...(hours <= 48 ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function SimulateReadingForm({ unit, unitLabel, onSent }: { unit: string; unitLabel: string; onSent: () => void }) {
  const { notify } = useToast();
  const [deviceKey, setDeviceKey] = useState("");
  const [temperatureC, setTemperatureC] = useState("5");
  const [batteryPercent, setBatteryPercent] = useState("80");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!unit || !deviceKey.trim()) return;
    setSubmitting(true);
    try {
      await TelemetryApi.simulate(unit, deviceKey.trim(), Number(temperatureC), batteryPercent === "" ? undefined : Number(batteryPercent));
      notify(`Reading sent for ${unitLabel}`, "success");
      onSent();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Failed to send reading", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="hint" style={{ marginTop: 0 }}>
        No hardware needed — push a reading as if the device on <strong>{unitLabel || "this unit"}</strong> sent it.
        The device key is shown once when a unit is created or its key is rotated (also in{" "}
        <code className="mono">TEST_CREDENTIALS.md</code> for the seeded unit).
      </p>
      <div className="form-grid">
        <Field label="Device key">
          <input value={deviceKey} onChange={(e) => setDeviceKey(e.target.value)} placeholder="x-device-key" autoComplete="off" />
        </Field>
        <Field label="Temperature (°C)">
          <input type="number" step="0.1" value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} />
        </Field>
        <Field label="Battery (%)">
          <input type="number" min={0} max={100} value={batteryPercent} onChange={(e) => setBatteryPercent(e.target.value)} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={submitting || !unit || !deviceKey.trim()}>
          {submitting ? "Sending…" : "Send reading"}
        </button>
      </div>
    </form>
  );
}

export function TelemetryPage() {
  const [unit, setUnit] = useState("");
  const [hours, setHours] = useState(24);

  const unitsRes = useResource(() => CoolingUnitsApi.list(), []);
  const units = unitsRes.data?.data ?? [];
  const activeUnit = unit || units[0]?._id || "";
  const activeUnitLabel = units.find((u) => u._id === activeUnit)?.unitCode ?? "";

  const latestRes = useResource(
    () =>
      activeUnit
        ? TelemetryApi.latest(activeUnit)
        : Promise.resolve<ApiEnvelope<TelemetryReading | null>>({ success: true, data: null }),
    [activeUnit]
  );
  const summaryRes = useResource(
    () =>
      activeUnit
        ? TelemetryApi.summary(activeUnit, hours)
        : Promise.resolve<ApiEnvelope<TelemetrySummary | null>>({ success: true, data: null }),
    [activeUnit, hours]
  );
  const listRes = useResource(
    () =>
      activeUnit
        ? TelemetryApi.list({ unit: activeUnit, limit: 60 })
        : Promise.resolve<ApiEnvelope<TelemetryReading[]>>({ success: true, data: [] }),
    [activeUnit]
  );

  const refreshAll = () => {
    latestRes.reload();
    summaryRes.reload();
    listRes.reload();
  };

  const latest = latestRes.data?.data ?? null;
  const summary = summaryRes.data?.data;
  const readings = listRes.data?.data ?? []; // newest -> oldest, as the API returns them
  const chronological = [...readings].reverse(); // oldest -> newest, for the chart

  const tempSeries = chronological.map((r) => ({
    key: r._id,
    displayLabel: formatPoint(r.recordedAt, hours),
    value: Math.round(r.temperatureC * 10) / 10,
  }));

  if (unitsRes.loading) return <Spinner />;

  if (units.length === 0) {
    return (
      <>
        <PageHeader title="Telemetry" lede="Live sensor readings from each cooling unit." />
        <p className="hint">No cooling units yet — create one on the backend to start sending readings.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Telemetry"
        lede="Live temperature, humidity, and battery readings from the device on each cooling unit."
        action={
          <select value={activeUnit} onChange={(e) => setUnit(e.target.value)} style={{ minWidth: 160 }}>
            {units.map((u) => (
              <option key={u._id} value={u._id}>
                {u.unitCode}
              </option>
            ))}
          </select>
        }
      />

      {latestRes.loading ? (
        <Spinner />
      ) : latest ? (
        <div className="stat-grid section">
          <StatCard
            label={`Temperature ${latest.humidityPercent !== undefined ? "& humidity" : ""}`}
            value={
              <>
                {latest.temperatureC.toFixed(1)}°C{" "}
                <Badge tone={temperatureTone(latest.temperatureC)}>{temperatureTone(latest.temperatureC) === "red" ? "warm" : "ok"}</Badge>
              </>
            }
            accent={temperatureTone(latest.temperatureC) === "red" ? "red" : "green"}
          />
          {latest.humidityPercent !== undefined && <StatCard label="Humidity" value={`${latest.humidityPercent}%`} accent="teal" />}
          <StatCard label="Battery" value={<Badge tone={batteryTone(latest.batteryPercent)}>{latest.batteryPercent ?? "—"}%</Badge>} accent="amber" />
          <StatCard label="Solar input" value={latest.solarInputWatts !== undefined ? `${latest.solarInputWatts}W` : "—"} accent="teal" />
          <StatCard label="Last reading" value={formatDate(latest.recordedAt)} accent="amber" />
        </div>
      ) : (
        <p className="hint">No readings yet for {activeUnitLabel || "this unit"} — send one below to see it here.</p>
      )}

      <div className="section" style={{ display: "flex", gap: 8 }}>
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={opt.hours}
            type="button"
            className={`btn btn--sm ${hours === opt.hours ? "btn--primary" : "btn--ghost"}`}
            onClick={() => setHours(opt.hours)}
          >
            Last {opt.label}
          </button>
        ))}
      </div>

      {summaryRes.loading ? (
        <Spinner />
      ) : summary ? (
        <div className="stat-grid section">
          <StatCard label="Min temperature" value={summary.minTemperatureC !== null ? `${summary.minTemperatureC.toFixed(1)}°C` : "—"} accent="teal" />
          <StatCard label="Avg temperature" value={summary.avgTemperatureC !== null ? `${summary.avgTemperatureC.toFixed(1)}°C` : "—"} accent="amber" />
          <StatCard label="Max temperature" value={summary.maxTemperatureC !== null ? `${summary.maxTemperatureC.toFixed(1)}°C` : "—"} accent="red" />
          <StatCard label="Avg battery" value={summary.avgBatteryPercent !== null ? `${summary.avgBatteryPercent.toFixed(0)}%` : "—"} accent="green" />
          <StatCard label="Readings" value={summary.readingCount} accent="teal" />
        </div>
      ) : null}

      <div className="section">
        <Panel title={`Temperature — last ${readings.length} reading${readings.length === 1 ? "" : "s"}`}>
          {listRes.loading ? (
            <Spinner />
          ) : tempSeries.length > 0 ? (
            <BarChart data={tempSeries} color="var(--brand)" valueLabel="°C" formatValue={(v) => `${v}°C`} />
          ) : (
            <p className="hint" style={{ margin: 0 }}>
              No readings yet.
            </p>
          )}
        </Panel>
      </div>

      <div className="section">
        <Panel title="Recent readings">
          {listRes.loading ? (
            <Spinner />
          ) : (
            <DataTable
              rows={readings}
              rowKey={(r) => r._id}
              emptyText="No readings yet."
              columns={[
                { header: "When", render: (r) => formatDate(r.recordedAt) },
                { header: "Temp", render: (r) => `${r.temperatureC.toFixed(1)}°C` },
                { header: "Humidity", render: (r) => (r.humidityPercent !== undefined ? `${r.humidityPercent}%` : "—") },
                { header: "Battery", render: (r) => (r.batteryPercent !== undefined ? `${r.batteryPercent}%` : "—") },
                { header: "Solar", render: (r) => (r.solarInputWatts !== undefined ? `${r.solarInputWatts}W` : "—") },
                { header: "Source", render: (r) => <Badge tone={r.source === "sensor" ? "teal" : "muted"}>{r.source}</Badge> },
                { header: "Unit", render: (r) => refName(r.unit) },
              ]}
            />
          )}
        </Panel>
      </div>

      <div className="section">
        <Panel title="Simulate a device reading">
          <SimulateReadingForm unit={activeUnit} unitLabel={activeUnitLabel} onSent={refreshAll} />
        </Panel>
      </div>
    </>
  );
}
