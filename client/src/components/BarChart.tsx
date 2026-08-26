import { useState } from "react";
import { DataTable } from "./DataTable";

export interface BarChartDatum {
  /** Stable key, e.g. an ISO date. */
  key: string;
  /** What's shown on the x-axis / table. */
  displayLabel: string;
  value: number;
}

/** Rounds up to a "nice" axis maximum (1/2/5/10 × a power of ten). */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

/**
 * A single-series bar chart — sequential color (one hue), hairline recessive
 * gridlines, no per-bar value labels (they'd go unread; the axis, tooltip,
 * and table view carry the values instead). A single series needs no legend;
 * the panel title around this component names what's plotted.
 */
export function BarChart({
  data,
  color,
  valueLabel,
  formatValue = (v) => v.toLocaleString(),
}: {
  data: BarChartDatum[];
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
            { header: "Date", render: (d) => d.displayLabel },
            { header: valueLabel, render: (d) => formatValue(d.value) },
          ]}
        />
        <button type="button" className="btn btn--ghost btn--sm chart-toggle" onClick={() => setShowTable(false)}>
          View as chart
        </button>
      </div>
    );
  }

  const maxValue = niceCeil(Math.max(...data.map((d) => d.value), 1));
  const chartHeight = 190;
  const leftMargin = 46;
  const slotWidth = 34;
  const barWidth = 20;
  const width = leftMargin + Math.max(data.length, 1) * slotWidth + 10;
  const height = chartHeight + 26;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f));
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="bar-chart-wrap">
      <svg width={width} height={height} role="img" aria-label={`${valueLabel} by day`}>
        {yTicks.map((tick) => {
          const y = chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line x1={leftMargin} x2={width} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={leftMargin - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
          const x = leftMargin + i * slotWidth + (slotWidth - barWidth) / 2;
          const y = chartHeight - barHeight;
          return (
            <g key={d.key}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={4}
                fill={color}
                opacity={hovered === i ? 0.72 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${d.displayLabel}: ${formatValue(d.value)} ${valueLabel}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              />
              {i % labelStep === 0 && (
                <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
                  {d.displayLabel}
                </text>
              )}
            </g>
          );
        })}

        <line x1={leftMargin} x2={width} y1={chartHeight} y2={chartHeight} stroke="var(--border-soft)" strokeWidth={1} />
      </svg>

      {hovered !== null && data[hovered] && (
        <div className="chart-tooltip" style={{ left: leftMargin + hovered * slotWidth + slotWidth / 2 }}>
          <div className="chart-tooltip-value">{formatValue(data[hovered].value)}</div>
          <div className="chart-tooltip-label">{data[hovered].displayLabel}</div>
        </div>
      )}

      <button type="button" className="btn btn--ghost btn--sm chart-toggle" onClick={() => setShowTable(true)}>
        View as table
      </button>
    </div>
  );
}
