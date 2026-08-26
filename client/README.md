# SOLTECH Hub — Console

A React + Vite console for the [SOLTECH Hub backend](..). Market women are the
only real users of the system right now, so the console is scoped to exactly
their flow: see what's rented, rent a basket, close it out. Every other domain
the backend exposes (cold-chain sites, cold-box logs, telemetry, VET training,
payments, user management) is fully built and working on the API — it's just
not wired into this console yet. See the backend's own README for that full
route table; nothing there was removed, only its console pages.

## Running it

From the **backend** root first:

```bash
npm install
npm run seed   # creates one test user per role + sample data, see ../TEST_CREDENTIALS.md
npm run dev    # API on http://localhost:4000
```

Then, from this directory:

```bash
npm install
npm run dev    # console on http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:4000` (see [vite.config.ts](vite.config.ts)),
so the console and API share an origin in the browser and there's nothing to
configure for CORS.

## Signing in

The login screen has quick-fill buttons for each seeded role — click one, then
Sign in. Only **Market Woman** leads anywhere useful in this console right now;
the others land on the same two pages with less to do. Full credentials also
live in `TEST_CREDENTIALS.md` at the backend repo root after running
`npm run seed` there.

## What's here

- **Overview** (`/`) — a "Rent a basket" button front and center, active/past
  rental stats, and a table of your active baskets with a Close action right
  there.
- **Baskets & Rentals** (`/baskets`) — "Rent a basket" opens a modal: pick an
  available basket, list every produce item going in with its weight (read off
  the scale you already have — add as many items as you like), and see the
  price *before* confirming (the confirm button itself is labeled with the
  rate, e.g. "Confirm — ₦300/day"). Below that, all rentals (yours, or
  everyone's if you're staff/admin) with a live estimated bill, a Close action,
  and basket status. Staff/admin get a form to add baskets to a unit.
- **Transactions** (`/transactions`) — everything that's gone through the
  system: totals (transaction count, weight moved, revenue), a day-range
  picker (7/30/90 days), two charts (transactions/day, revenue/day — each with
  a "view as table" fallback), and the full record of every rental.

## Structure

```
src/
  api/          fetch client, typed endpoint functions, shared types for the
                whole backend API — kept complete even where the console
                doesn't have a page for a resource yet
  state/        auth context (JWT + current user), toast notifications
  components/   Shell (sidebar/topbar), DataTable, Modal, BarChart, form/status
                building blocks
  pages/        Login, Overview, Baskets & Rentals, Transactions
  lib/          formatting helpers, a small data-fetching hook
  nav.ts        the nav item list, single source of truth
```

No UI framework/component library — plain CSS (`src/index.css`) with a small
design-token system, chosen deliberately over a generic dashboard template look.
