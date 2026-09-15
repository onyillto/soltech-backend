# SOLTECH Hub — Console

A React + Vite console for the [SOLTECH Hub backend](..). Only admin/operator
accounts log in — clients (farmers, market women, traders) are registered and
managed on their behalf, not self-service users of this console. A client only
exists in the context of renting a basket, so there's no standalone Clients
page — registering one happens inline on the Baskets & Rentals page, right
where you pick the basket. Every other domain the backend exposes (cold-chain
sites, cold-box logs, payments, user management) is fully built and working
on the API — it's just not wired into this console yet. See the backend's own
README for that full route table; nothing there was removed, only its console
pages.

## Running it

From the **backend** root first:

```bash
npm install
npm run seed   # creates an admin + operator login, sample clients, and sample data, see ../TEST_CREDENTIALS.md
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

The login screen has quick-fill buttons for the seeded admin and operator
accounts — click one, then Sign in. Full credentials also live in
`TEST_CREDENTIALS.md` at the backend repo root after running `npm run seed`
there.

## What's here

- **Overview** (`/`) — accounts, registered clients, cold-chain sites, active
  rentals, and available baskets at a glance, plus recent cold-box activity.
- **Baskets & Rentals** (`/baskets`) — "Rent a basket" opens a modal: search
  every basket for the unit by number (occupied/maintenance ones show up too,
  just greyed out with why they can't be picked, and each shows its location
  if it has one), type the client's name directly — matching existing clients
  show up as you type, and anything that doesn't match is registered
  automatically (just needs a phone) the moment you confirm, no separate
  registration step — list every produce item going in with its weight (read
  off the scale you already have — add as many items as you like), and see
  the price *before* confirming (the confirm button itself is labeled with
  the rate, e.g. "Confirm — ₦300/day"). Below that, every rental with a live
  estimated bill, a Close action, and basket status, plus a full basket table
  showing each one's location and what's currently in it. Baskets themselves
  aren't created here — they're provisioned ahead of time (`npm run seed`
  creates 100 for the sample unit; see the backend's `POST /baskets/bulk` for
  provisioning more).
- **Telemetry** (`/telemetry`) — per-unit live view of the device readings:
  latest temperature/humidity/battery/solar input, a summary over a 24h/7d/30d
  window, a temperature trend chart, and the recent-readings table. A
  "Simulate a device reading" panel at the bottom sends a real `POST
  /telemetry` (with a device key) so this is testable without hardware — it
  doesn't touch how a real sensor's own POST is handled.
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
  pages/        Login, Overview, Baskets & Rentals, Telemetry, Transactions
  lib/          formatting helpers, a small data-fetching hook
  nav.ts        the nav item list, single source of truth
```

No UI framework/component library — plain CSS (`src/index.css`) with a small
design-token system, chosen deliberately over a generic dashboard template look.
