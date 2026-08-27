/**
 * Vercel serverless entry point. server.ts (app.listen() + connectDB(), which
 * exits the process on a DB failure) is for a persistent host (the Droplet,
 * via PM2) and is NOT used here — Vercel invokes this file per-request
 * instead, so the app is exported as a plain request handler and the DB
 * connection is established (or reused, if this instance is warm) on each
 * invocation via connectDBServerless(). See vercel.json for the rewrite that
 * routes every path here.
 */
import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/app";
import { connectDBServerless } from "../src/config/db";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await connectDBServerless();
  } catch (err) {
    console.error("[vercel] failed to connect to MongoDB", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Database connection failed" }));
    return;
  }

  // An Express app instance is itself a valid (req, res) request handler.
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
