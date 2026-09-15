/**
 * Local dev/test seed: wipes the connected database and repopulates it with
 * an admin + operator account, a sample cold-chain site, baskets, a few
 * clients, a rental, cold-box logs, and telemetry — then writes
 * TEST_CREDENTIALS.md to the repo root so the login credentials don't have
 * to be hunted down in this file.
 *
 * Run with: npm run seed
 * Refuses to run when NODE_ENV=production.
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { env } from "../config/env";
import { User } from "../models/User";
import { Organization } from "../models/Organization";
import { Client } from "../models/Client";
import { CoolingHub } from "../models/CoolingHub";
import { CoolingUnit } from "../models/CoolingUnit";
import { Basket } from "../models/Basket";
import { BasketRental } from "../models/BasketRental";
import { Payment } from "../models/Payment";
import { ColdBoxLog } from "../models/ColdBoxLog";
import { TelemetryReading } from "../models/TelemetryReading";
import { dailyRateKoboForWeight } from "../constants/billing";

// Kept in sync with client/src/testCredentials.ts — change one, change the other.
const TEST_PASSWORD = "Soltech@2026";

// Fixed so the id is stable across seed runs — the `@swagger` examples for
// POST /telemetry (and /humidity) hardcode it so "Execute as-is" works after
// any `npm run seed`. Keep these three in sync.
const SEED_UNIT_ID = "6a902454481962452192348c";

const SEED_USERS = [
  { name: "Ada Admin", email: "admin@soltech.test", role: "admin" as const },
  { name: "Sam Operator", email: "operator@soltech.test", role: "operator" as const },
];

const SEED_CLIENTS = [
  { name: "Farida Farmer", phone: "+2348011111111" },
  { name: "Maryam Market", phone: "+2348022222222" },
  { name: "Tunde Trader", phone: "+2348033333333" },
];

async function seed() {
  if (env.nodeEnv === "production") {
    console.error("[seed] refusing to run with NODE_ENV=production");
    process.exit(1);
  }

  await connectDB();
  console.log("[seed] connected — clearing existing data...");

  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Client.deleteMany({}),
    CoolingHub.deleteMany({}),
    CoolingUnit.deleteMany({}),
    Basket.deleteMany({}),
    BasketRental.deleteMany({}),
    Payment.deleteMany({}),
    ColdBoxLog.deleteMany({}),
    TelemetryReading.deleteMany({}),
  ]);

  console.log("[seed] creating users...");
  const users = await User.create(
    SEED_USERS.map((u) => ({
      name: u.name,
      email: u.email,
      password: TEST_PASSWORD,
      role: u.role,
      isMainAdmin: u.role === "admin",
      location: { community: "Garki", state: "FCT", country: "Nigeria" },
    }))
  );
  const [admin, operator] = users;

  console.log("[seed] creating organization...");
  const org = await Organization.create({
    name: "Garki Ultra-Modern Market Traders Association",
    type: "market_association",
    community: "Garki",
    state: "FCT",
    contactPerson: operator._id,
    memberCount: 3,
  });
  await User.updateMany({ _id: operator._id }, { organization: org._id });

  console.log("[seed] creating clients...");
  const clients = await Client.insertMany(
    SEED_CLIENTS.map((c) => ({
      name: c.name,
      phone: c.phone,
      organization: org._id,
      location: { community: "Garki", state: "FCT", country: "Nigeria" },
      createdBy: operator._id,
    }))
  );
  const [farmer] = clients;

  console.log("[seed] creating cold-chain site...");
  const hub = await CoolingHub.create({
    name: "Garki Ultra-Modern Market Hub",
    organization: org._id,
    community: "Garki",
    state: "FCT",
    energySource: "solar",
    status: "operational",
    managedBy: operator._id,
  });

  const unit = await CoolingUnit.create({
    _id: new mongoose.Types.ObjectId(SEED_UNIT_ID),
    hub: hub._id,
    unitCode: "TRL-001",
    type: "mobile_trailer",
    capacityKg: 2500,
    basketCapacity: 110,
    status: "active",
  });
  const unitWithKey = await CoolingUnit.findById(unit._id).select("+deviceKey");

  console.log("[seed] creating baskets...");
  const BASKET_COUNT = 100;
  const BASKETS_PER_ROW = 10;
  const basketDocs = await Basket.insertMany(
    Array.from({ length: BASKET_COUNT }, (_, i) => {
      const basketNumber = i + 1;
      const row = Math.ceil(basketNumber / BASKETS_PER_ROW);
      const position = ((basketNumber - 1) % BASKETS_PER_ROW) + 1;
      return {
        unit: unit._id,
        basketNumber,
        capacityKg: 20,
        location: `Row ${row}, Position ${position}`,
      };
    })
  );

  console.log("[seed] creating a sample rental + payment...");
  const rental = await BasketRental.create({
    basket: basketDocs[0]._id,
    client: farmer._id,
    items: [
      { produceType: "Tomatoes", quantityKg: 12 },
      { produceType: "Pepper", quantityKg: 6 },
    ],
    totalQuantityKg: 18,
    rateKoboPerDay: dailyRateKoboForWeight(18),
    startAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });
  await Basket.findByIdAndUpdate(basketDocs[0]._id, { status: "occupied" });
  await Payment.create({
    rental: rental._id,
    amountKobo: 40000,
    method: "cash",
    status: "paid",
    recordedBy: operator._id,
  });

  console.log("[seed] creating cold-box logs...");
  await ColdBoxLog.insertMany([
    {
      unit: unit._id,
      eventType: "load",
      produceType: "Tomatoes",
      quantityKg: 450,
      crateSizeKg: 25,
      occurredAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      loggedBy: operator._id,
    },
    {
      unit: unit._id,
      eventType: "unload",
      produceType: "Tomatoes",
      quantityKg: 400,
      crateSizeKg: 25,
      doorOpenSeconds: 143,
      occurredAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      loggedBy: operator._id,
    },
  ]);

  console.log("[seed] creating telemetry readings...");
  await TelemetryReading.insertMany(
    Array.from({ length: 6 }, (_, i) => ({
      unit: unit._id,
      recordedAt: new Date(Date.now() - i * 60 * 60 * 1000),
      temperatureC: 4 + Math.random() * 2,
      batteryPercent: 80 - i,
      solarInputWatts: 120,
      source: "sensor" as const,
    }))
  );

  const credentialsPath = path.join(__dirname, "../../TEST_CREDENTIALS.md");
  const lines = [
    "# SOLTECH Hub — Test Credentials",
    "",
    "Generated by `npm run seed`. Local testing only — never use these in production.",
    "",
    "| Role | Email | Password |",
    "|---|---|---|",
    ...SEED_USERS.map((u) => `| ${u.role} | ${u.email} | ${TEST_PASSWORD} |`),
    "",
    "## Sample clients",
    "",
    "Clients don't log in — they're managed by an admin/operator through the API.",
    "",
    "| Name | Phone | Id |",
    "|---|---|---|",
    ...clients.map((c, i) => `| ${SEED_CLIENTS[i].name} | ${SEED_CLIENTS[i].phone} | \`${c._id}\` |`),
    "",
    "## Sample data",
    "",
    `- Organization: Garki Ultra-Modern Market Traders Association (\`${org._id}\`)`,
    `- Cooling unit: TRL-001 (\`${unit._id}\`), device key for telemetry testing (\`x-device-key\` header):`,
    `  \`${unitWithKey?.deviceKey}\``,
    `- ${BASKET_COUNT} baskets provisioned (#1-${BASKET_COUNT}), each with a location (Row/Position, ${BASKETS_PER_ROW} baskets per row)`,
    `- Basket #1 has an active rental by Farida Farmer (12kg tomatoes + 6kg pepper, 18kg total), with one ₦400 cash payment recorded`,
    "",
  ];
  fs.writeFileSync(credentialsPath, lines.join("\n"));
  console.log(`[seed] wrote ${credentialsPath}`);

  console.log("[seed] done.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
