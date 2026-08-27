import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri);
    console.log(`[db] connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error("[db] connection failed", err);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });
}

let cachedConnection: Promise<typeof mongoose> | null = null;

/**
 * Serverless-safe connect, for the Vercel entry point (api/index.ts) only.
 * connectDB() above assumes "connect once at process startup, exit on
 * failure" — true for a persistent server (server.ts, the CLI scripts), but
 * wrong here: a serverless function has no startup phase, may run many
 * concurrent instances, and reuses a "warm" instance across requests. This
 * caches the connection (or in-flight connect attempt) across those warm
 * invocations instead of reconnecting every request, and never exits the
 * process — a failure just rejects, so the caller can return a normal 500
 * instead of killing an instance other in-flight requests may be using.
 */
export function connectDBServerless(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }
  if (!cachedConnection) {
    mongoose.set("strictQuery", true);
    cachedConnection = mongoose.connect(env.mongoUri).catch((err) => {
      cachedConnection = null; // let the next invocation retry instead of caching a permanent failure
      throw err;
    });
  }
  return cachedConnection;
}
