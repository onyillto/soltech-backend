import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { DataTable } from "./DataTable";
import { niceCeil } from "../lib/chartMath";

export interface LineChartDatum {
  /** Stable key, e.g. a reading id or ISO timestamp. */
  key: string;
  /** What's shown on the x-axis / table / tooltip. */
  displayLabel: string;
  value: number;
}

const VIEW_W = 720;
const CHART_H = 190;
const LEFT_MARGIN = 46;
const RIGHT_PAD = 44; // room for the end-of-line value label
const LABEL_ROW_H = 24;

/**
 * A single-series trend line — the right form for a sensor reading over time
 * (see references/choosing-a-form.md: "trend over time -> line"). 2px line, a
 * 10%-opacity area wash under it, an end-dot with its value directly labeled,
 * and a crosshair + tooltip that snaps to the nearest reading. No legend — one
 * series needs none; the panel title already names what's plotted.
 */
export function LineChart({
  data,
  color,
  valueLabel,
  formatValue = (v) => v.toLocaleString(),
}: {
  data: LineChartDatum[];
  color: string;
  valueLabel: string;
  formatValue?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (showTable) {
    return (
      <div>
        <DataTable
          rows={data}
          rowKey={(d) => d.key}
          columns={[
            { header: "When", render: (d) => d.displayLabel },
            { header: valueLabel, render: (d) => formatValue(d.value) },
          ]}
        />
        <button type="button" className="btn btn--ghost btn--sm chart-toggle" onClick={() => setShowTable(false)}>
          View as chart
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        No readings yet.
      </p>
    );
  }

  const maxValue = niceCeil(Math.max(...data.map((d) => d.value), 1));
  const innerW = VIEW_W - LEFT_MARGIN - RIGHT_PAD;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const x = (i: number) => LEFT_MARGIN + i * stepX;
  const y = (v: number) => CHART_H - (maxValue > 0 ? (v / maxValue) * CHART_H : 0);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f));
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${CHART_H} L ${x(0)} ${CHART_H} Z`;

  const lastIndex = data.length - 1;
  const lastX = x(lastIndex);
  const lastY = Math.min(Math.max(y(data[lastIndex].value), 10), CHART_H - 4);

  function nearestIndex(clientX: number, svg: SVGSVGElement): number {
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * VIEW_W;
    const i = stepX > 0 ? Math.round((relX - LEFT_MARGIN) / stepX) : 0;
    return Math.min(Math.max(i, 0), lastIndex);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    setHovered(nearestIndex(e.clientX, e.currentTarget));
  }

  const hoveredPoint = hovered !== null ? data[hovered] : null;

  return (
    <div className="line-chart-wrap">
      <svg
        viewBox={`0 0 ${VIEW_W} ${CHART_H + LABEL_ROW_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`${valueLabel} over time`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
      >
        {yTicks.map((tick) => {
          const ty = y(tick);
          return (
            <g key={tick}>
              <line x1={LEFT_MARGIN} x2={VIEW_W} y1={ty} y2={ty} stroke="var(--border)" strokeWidth={1} />
              <text x={LEFT_MARGIN - 8} y={ty + 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={color} fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text key={d.key} x={x(i)} y={CHART_H + 18} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
              {d.displayLabel}
            </text>
          ) : null
        )}

        {hovered !== null && (
          <line x1={x(hovered)} x2={x(hovered)} y1={0} y2={CHART_H} stroke="var(--border-soft)" strokeWidth={1} />
        )}
        {hovered !== null && (
          <>
            <circle cx={x(hovered)} cy={y(data[hovered].value)} r={7} fill="var(--surface)" />
            <circle cx={x(hovered)} cy={y(data[hovered].value)} r={5} fill={color} />
          </>
        )}

        {/* End-of-line marker + direct value label, per spec: "Lines -> value at the end." */}
        <circle cx={lastX} cy={y(data[lastIndex].value)} r={7} fill="var(--surface)" />
        <circle cx={lastX} cy={y(data[lastIndex].value)} r={5} fill={color} />
        <text x={lastX + 9} y={lastY + 3} fontSize="10" fontWeight={700} fill="var(--text)">
          {formatValue(data[lastIndex].value)}
        </text>

        <line x1={LEFT_MARGIN} x2={VIEW_W} y1={CHART_H} y2={CHART_H} stroke="var(--border-soft)" strokeWidth={1} />
      </svg>

      {hoveredPoint && (
        <div className="chart-tooltip" style={{ left: `${(x(hovered!) / VIEW_W) * 100}%` }}>
          <div className="chart-tooltip-value">{formatValue(hoveredPoint.value)}</div>
          <div className="chart-tooltip-label">{hoveredPoint.displayLabel}</div>
        </div>
      )}

      <button type="button" className="btn btn--ghost btn--sm chart-toggle" onClick={() => setShowTable(true)}>
        View as table
      </button>
    </div>
  );
}
