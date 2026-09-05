/**
 * Local dev/test seed: wipes the connected database and repopulates it with
 * one user per role, a sample cold-chain site, baskets, a rental, cold-box
 * logs, and a course — then writes TEST_CREDENTIALS.md to the repo root so
 * the login credentials don't have to be hunted down in this file.
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
import { CoolingHub } from "../models/CoolingHub";
import { CoolingUnit } from "../models/CoolingUnit";
import { Basket } from "../models/Basket";
import { BasketRental } from "../models/BasketRental";
import { Payment } from "../models/Payment";
import { ColdBoxLog } from "../models/ColdBoxLog";
import { TelemetryReading } from "../models/TelemetryReading";
import { Course } from "../models/Course";
import { Module } from "../models/Module";
import { Enrollment } from "../models/Enrollment";
import { dailyRateKoboForWeight } from "../constants/billing";

// Kept in sync with client/src/testCredentials.ts — change one, change the other.
const TEST_PASSWORD = "Soltech@2026";

// Fixed so the id is stable across seed runs — the `@swagger` examples for
// POST /telemetry (and /humidity) hardcode it so "Execute as-is" works after
// any `npm run seed`. Keep these three in sync.
const SEED_UNIT_ID = "6a902454481962452192348c";

const SEED_USERS = [
  { name: "Ada Admin", email: "admin@soltech.test", role: "admin" as const },
  { name: "Sam Staff", email: "staff@soltech.test", role: "staff" as const },
  { name: "Farida Farmer", email: "farmer@soltech.test", role: "farmer" as const },
  { name: "Maryam Market", email: "marketwoman@soltech.test", role: "market_woman" as const },
  { name: "Tunde Trader", email: "trader@soltech.test", role: "trader" as const },
  { name: "Lola Learner", email: "learner@soltech.test", role: "learner" as const },
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
    CoolingHub.deleteMany({}),
    CoolingUnit.deleteMany({}),
    Basket.deleteMany({}),
    BasketRental.deleteMany({}),
    Payment.deleteMany({}),
    ColdBoxLog.deleteMany({}),
    TelemetryReading.deleteMany({}),
    Course.deleteMany({}),
    Module.deleteMany({}),
    Enrollment.deleteMany({}),
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
  const [admin, staff, farmer, marketWoman, trader, learner] = users;

  console.log("[seed] creating organization...");
  const org = await Organization.create({
    name: "Garki Ultra-Modern Market Traders Association",
    type: "market_association",
    community: "Garki",
    state: "FCT",
    contactPerson: staff._id,
    memberCount: 3,
  });
  await User.updateMany({ _id: { $in: [staff._id, farmer._id, marketWoman._id] } }, { organization: org._id });

  console.log("[seed] creating cold-chain site...");
  const hub = await CoolingHub.create({
    name: "Garki Ultra-Modern Market Hub",
    organization: org._id,
    community: "Garki",
    state: "FCT",
    energySource: "solar",
    status: "operational",
    managedBy: staff._id,
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
  const basketDocs = await Basket.insertMany(
    Array.from({ length: 10 }, (_, i) => ({ unit: unit._id, basketNumber: i + 1, capacityKg: 20 }))
  );

  console.log("[seed] creating a sample rental + payment...");
  const rental = await BasketRental.create({
    basket: basketDocs[0]._id,
    renter: farmer._id,
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
    recordedBy: staff._id,
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
      loggedBy: staff._id,
    },
    {
      unit: unit._id,
      eventType: "unload",
      produceType: "Tomatoes",
      quantityKg: 400,
      crateSizeKg: 25,
      doorOpenSeconds: 143,
      occurredAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      loggedBy: staff._id,
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

  console.log("[seed] creating a course + modules + enrollment...");
  const course = await Course.create({
    title: "Solar Cold Chain Basics",
    description: "An introduction to operating and maintaining a solar-powered cold basket unit.",
    category: "sustainable_cooling",
    level: "beginner",
    durationHours: 6,
    instructor: staff._id,
    isPublished: true,
  });
  const modules = await Module.insertMany([
    { course: course._id, title: "Intro to Solar Cooling", content: "How PV + battery cooling works.", order: 1 },
    { course: course._id, title: "Maintaining a Cold Basket", content: "Daily checks and cleaning.", order: 2 },
  ]);
  const enrollment = await Enrollment.create({ learner: learner._id, course: course._id });
  await Enrollment.findByIdAndUpdate(enrollment._id, {
    $push: { completedModules: modules[0]._id },
    progressPercent: 50,
  });

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
    "## Sample data",
    "",
    `- Organization: Garki Ultra-Modern Market Traders Association (\`${org._id}\`)`,
    `- Cooling unit: TRL-001 (\`${unit._id}\`), device key for telemetry testing (\`x-device-key\` header):`,
    `  \`${unitWithKey?.deviceKey}\``,
    `- Course: Solar Cold Chain Basics (\`${course._id}\`) — learner is enrolled at 50% progress`,
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
