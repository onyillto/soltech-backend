/**
 * Creates the main admin account — safe to run against a real, populated
 * database, unlike `npm run seed` (which wipes everything first). Refuses to
 * run if a main admin already exists, so it can't be used to mint a second
 * one by accident.
 *
 * Usage:
 *   npm run create-admin -- --name="Ada Admin" --email=admin@soltech.example --password="a-strong-password"
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User } from "../models/User";

function argValue(flag: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${flag}=`))?.split("=").slice(1).join("=");
}

async function main() {
  const name = argValue("name");
  const email = argValue("email")?.toLowerCase().trim();
  const password = argValue("password");

  if (!name || !email || !password) {
    console.error(
      '[create-admin] usage: npm run create-admin -- --name="Ada Admin" --email=admin@example.com --password="..."'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("[create-admin] password must be at least 8 characters");
    process.exit(1);
  }

  await connectDB();

  const existingMainAdmin = await User.findOne({ isMainAdmin: true });
  if (existingMainAdmin) {
    console.error(
      `[create-admin] a main admin already exists (${existingMainAdmin.email}) — refusing to create another. ` +
        "Create additional admins by having an existing admin do it, not this script."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    console.error(`[create-admin] an account with ${email} already exists`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const admin = await User.create({ name, email, password, role: "admin", isMainAdmin: true });
  console.log(`[create-admin] created main admin ${admin.email} (${admin._id})`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[create-admin] failed", err);
  process.exit(1);
});
