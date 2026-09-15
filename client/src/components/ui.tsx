import type { ReactNode } from "react";

export function Badge({ tone, children }: { tone: "green" | "amber" | "teal" | "red" | "muted"; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function StatCard({
  label,
  value,
  accent = "amber",
}: {
  label: string;
  value: ReactNode;
  accent?: "amber" | "teal" | "green" | "red";
}) {
  const colorVar = { amber: "var(--accent)", teal: "var(--teal)", green: "var(--green)", red: "var(--red)" }[accent];
  return (
    <div className="stat-card" style={{ ["--stat-accent" as string]: colorVar }}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export function PageHeader({ title, lede, action }: { title: string; lede?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

/** Prev/Next pager for a list backed by the API's {page, pages, total} pagination. Renders nothing for a single page. */
export function Pager({
  page,
  pages,
  total,
  onPageChange,
}: {
  page: number;
  pages: number;
  total?: number;
  onPageChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button type="button" className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ← Prev
      </button>
      <span className="pager-status">
        Page {page} of {pages}
        {total !== undefined ? ` (${total} total)` : ""}
      </span>
      <button type="button" className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        Next →
      </button>
    </div>
  );
}
