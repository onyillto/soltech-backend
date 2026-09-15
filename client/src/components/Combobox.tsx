import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Small secondary text next to the label, e.g. "12kg max" or a phone number. */
  meta?: string;
  /** When set, the option is shown (so it's clear it exists) but can't be picked — this text explains why, e.g. "occupied". */
  disabledReason?: string;
}

/**
 * A searchable single-select dropdown — a plain <select> gets unwieldy once
 * there are dozens+ options (baskets can easily run to 100+ per unit).
 * Options with `disabledReason` stay visible but unpickable, so it's obvious
 * *why* something can't be selected rather than it just being absent.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = options.findIndex((o) => o.value === value);
    setHighlighted(Math.max(idx, 0));
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, options, value]);

  function pick(option: ComboboxOption) {
    if (option.disabledReason) return;
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) pick(opt);
    }
  }

  return (
    <div className="combobox" ref={rootRef}>
      <button
        type="button"
        className="combobox-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? undefined : "combobox-placeholder"}>{selected ? selected.label : placeholder}</span>
        <span className="combobox-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="combobox-panel" role="listbox">
          <input
            ref={searchRef}
            className="combobox-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
          />
          <div className="combobox-options">
            {filtered.length === 0 && <div className="combobox-empty">{emptyText}</div>}
            {filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                disabled={!!o.disabledReason}
                className={
                  "combobox-option" +
                  (o.disabledReason ? " combobox-option--disabled" : "") +
                  (i === highlighted ? " combobox-option--highlighted" : "") +
                  (o.value === value ? " combobox-option--selected" : "")
                }
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => pick(o)}
              >
                <span>{o.label}</span>
                {(o.meta || o.disabledReason) && <span className="combobox-option-meta">{o.disabledReason ?? o.meta}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
