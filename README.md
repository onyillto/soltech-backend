# SOLTECH Hub — Backend

Backend API for **SOLTECH Hub**: AI-enabled Vocational Education Training (VET) in
sustainable cooling, and off-grid cold-chain energy access for smallholder farmers,
market women, and traders in local farming communities in Nigeria — supporting SDG 2
(zero hunger / food security) and SDG 7 (affordable, clean energy).

## Stack

- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT (email/password) authentication with role-based access control

## Domains covered

- **Users & organizations** — accounts for admins, staff, farmers, market women,
  traders, and learners; cooperatives/community groups/training centers.
- **Cold-chain tracking** — off-grid cooling hubs, individual cooling units (including
  mobile solar trailers), and cold-box load/unload logs (produce type, kg, crate size,
  door-opening duration), matching the field data sheets used to record cold-box activity.
- **Basket rentals & billing** — the pay-per-use model from the investor deck: modular
  cold baskets inside a unit, rented by farmers/traders at a weight-tiered daily rate
  (₦200/day up to 10kg, +₦100/day per additional 10kg — see `constants/billing.ts`),
  with payment records against each rental.
- **IoT telemetry** — temperature/battery/solar readings ingested from a device on each
  unit, authenticated by a per-unit device key rather than a user login, plus a summary
  endpoint (min/max/avg temperature, energy use) over a time window.
- **VET training & learning outcomes** — courses, modules, and enrollments with
  progress tracking toward course completion.

## Getting started

```bash
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET as needed
npm run dev             # starts on http://localhost:4000 with hot reload
```

Requires a running MongoDB instance (local `mongod`, Docker, or Atlas) reachable at
`MONGO_URI`.

```bash
npm run build   # compile TypeScript -> dist/
npm start        # run the compiled build
```

## Test data & the client console

`npm run seed` wipes the connected database and creates one user per role (admin,
staff, farmer, market_woman, trader, learner — all with password `Soltech@2026`),
plus a sample cold-chain site, baskets, an active rental with a payment, cold-box
logs, telemetry readings, and a course with an enrollment in progress. It writes
the full credential list to `TEST_CREDENTIALS.md` in the repo root (gitignored,
regenerate any time by re-running the seed).

```bash
npm run seed
```

### Telemetry history

The seed only creates a handful of telemetry readings. To get realistic history
for charts/dashboards — one simulated reading every 10 minutes, temperature
cycling around a 4°C cold-chain target with a daylight/battery curve and
occasional door-open spikes — backfill it separately:

```bash
npm run telemetry:backfill                              # April 1 (this year) -> now, every unit
npm run telemetry:backfill -- --from=2026-04-01 --to=2026-08-01
npm run telemetry:backfill -- --unit=<coolingUnitId>     # just one unit
```

Re-running it is safe — it clears existing readings in the same window first.
~5 months at 10-minute resolution is ~21k readings per unit and takes a few
seconds. To keep new readings arriving every 10 minutes while you're actively
testing (e.g. watching the Telemetry page update), run the live simulator
alongside the API in a separate terminal:

```bash
npm run telemetry:live                                   # real-time, every 10 minutes
npm run telemetry:live -- --interval-seconds=10           # fast demo mode
```

It continues from each unit's most recent reading (battery included) rather
than resetting, so switching from backfill to live — or stopping and
restarting it — doesn't create a discontinuity. Ctrl+C to stop.

### Creating a real admin (not via seed)

`npm run seed` wipes the database, so it's dev-only. For a real deployment,
bootstrap the first ("main") admin with a separate, non-destructive script —
it refuses to run again once a main admin exists:

```bash
npm run create-admin -- --name="Ada Admin" --email=admin@soltech.example --password="a-strong-password"
```

The main admin is the fallback recipient for cold-chain alerts on any hub
that hasn't been assigned to a specific admin/staff yet (see `PATCH
/cooling-hubs/:id/assign` below). Additional admins beyond the main one are
created by an existing admin, not by this script.

### Cold-chain temperature monitoring

Every `POST /telemetry` reading is checked against `src/constants/monitoring.ts`
(`src/services/coldChainMonitor.ts` does the work): if a unit has been at or
above **8°C for 25+ minutes** *and* it currently has produce in it (an active
`BasketRental` on one of its baskets), an `Alert` is created — routed to the
unit's hub's assigned manager (`managedBy`), or the main admin if the hub
isn't assigned to anyone. A brief door-open blip won't trigger it (the 25-minute
sustained requirement), and an empty unit warming up won't either (the
occupancy check). Only one open alert per unit at a time — a live incident
doesn't spam a new alert on every subsequent reading. See `/alerts` below.

A React + Vite console that consumes this whole API lives in [client/](client) —
role-aware navigation, cold-chain site/unit management, basket rentals & billing,
telemetry (with a "simulate a device reading" panel, since real hardware isn't
required to test it), payments, and VET training. See [client/README.md](client/README.md)
to run it; the login screen has one-click quick-fill buttons for each seeded account.

## API

All routes are namespaced under `/api/v1`. Health check: `GET /api/v1/health`.

**Interactive docs: `GET /api-docs`** (e.g. http://localhost:4000/api-docs) — a
Swagger UI generated from `@swagger` JSDoc blocks on the route files
(`src/config/swagger.ts` builds the spec). Currently `/auth`, `/alerts`,
`/cooling-hubs/:id/assign`, and `/baskets/available`+`/baskets/bulk` are fully
documented there; the rest of the table below follows the same pattern
whenever it's worth adding.

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/auth` | `POST /register` (self-service roles only — farmer, market_woman, trader, learner), `POST /login` (any role), `POST /admin/login` (admin only — a non-admin account or wrong password both return the same generic error), `GET /me` |
| Users | `/users` | admin/staff list; self or admin read/update/delete |
| Organizations | `/organizations` | cooperatives, community groups, training centers |
| Cooling hubs | `/cooling-hubs` | off-grid cold-chain hub sites; `PATCH /:id/assign` (admin only) assigns a hub to an admin/staff user — they become the alert recipient for its units |
| Alerts | `/alerts` | admin/staff only, system-generated (see Cold-chain temperature monitoring above) — `GET /` (filter by `unit`/`status`), `GET /:id`, `PATCH /:id/acknowledge` |
| Cooling units | `/cooling-units` | individual units within a hub; `PATCH /:id/rotate-device-key` reissues the IoT device secret |
| Cold-box logs | `/cold-box-logs` | `POST` for a single load/unload event, `POST /bulk` to import a batch (accepts either structured fields or the raw `occurredAtRaw`/`doorOpenRaw` strings from the field sheets) |
| Baskets | `/baskets` | individual cold baskets within a unit; `GET /available` (optionally `?unit=`) for baskets ready to rent; `POST /bulk` provisions every basket for a unit at once (`count` defaults to the unit's `basketCapacity`, e.g. 110 — idempotent, safe to re-run) |
| Basket rentals | `/basket-rentals` | `POST` to start a rental (basket must be `available`; `items: [{produceType, quantityKg}]` — one or more produce entries, total capped at the basket's `capacityKg`) — the daily rate is auto-computed from total weight unless overridden; `PATCH /:id/close` to end it and compute the bill; `GET /:id` on an open rental includes a live `estimatedAmountDueKobo`; `GET /summary?days=30` returns totals + a daily transaction/weight/revenue series for reporting |
| Payments | `/payments` | records a payment (cash/transfer/mobile money/card) against a rental — admin/staff only |
| Telemetry | `/telemetry` | `POST` ingests a reading, authenticated via `x-device-key` header (no user JWT); `GET /latest?unit=` and `GET /summary?unit=&hours=24` for monitoring |
| Courses | `/courses` | VET course catalog |
| Modules | `/modules` | lessons within a course |
| Enrollments | `/enrollments` | `POST` to enroll, `PATCH /:id/complete-module` to record progress |

Send the JWT from login/register as `Authorization: Bearer <token>` on subsequent
requests. Roles: `admin`, `staff`, `farmer`, `market_woman`, `trader`, `learner`.

## Project structure

```
src/
  config/      env + MongoDB connection
  constants/   shared enums (roles)
  models/      Mongoose schemas
  controllers/ request handlers (built on a shared CRUD factory)
  routes/      Express routers + validation + auth guards
  middleware/  auth, validation, error handling
  services/    coldChainMonitor (temperature alert detection, runs on telemetry ingestion)
  utils/       ApiError, asyncHandler, JWT helpers, CRUD factory, field-sheet parsers
  app.ts       Express app wiring
  server.ts    entry point (DB connect + listen)
```

## Notes / next steps

This is a working scaffold, not a finished product. Reasonable next additions:

- Refresh tokens / token revocation (current JWT is a single long-lived access token).
- Self-service profile updates (currently user updates are admin-only).
- Daily reconciliation reporting (total loaded vs. unloaded per cold-box per day,
  spoilage/loss estimates) — the field sheets note this by hand today; it can be
  computed from `ColdBoxLog` via an aggregation endpoint rather than stored per event.
- File uploads for course resources and certificates.
- Seed script + integration tests.
- Rate limiting on `/auth` endpoints (and on `/telemetry` device ingestion).
- Payment reconciliation (tracking outstanding balance per rental across partial
  payments) — currently `Payment` records are independent entries against a rental,
  not reconciled against `amountDueKobo` automatically.
- Real payment gateway integration (Paystack/Flutterwave) instead of manually
  recorded cash/transfer entries.
