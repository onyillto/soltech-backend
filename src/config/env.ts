import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  // 5000 collides with macOS's AirPlay Receiver (ControlCenter) — 4000 avoids that trap.
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: required("MONGO_URI", "mongodb://127.0.0.1:27017/soltech"),
  jwtSecret: required("JWT_SECRET", "dev_secret_change_me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  /** The real public URL (e.g. https://soltechhub.netuneatlantic.com/api/v1) — only used
   *  to list a working server in Swagger's "Try it out". Leave unset in local dev. */
  publicApiUrl: process.env.PUBLIC_API_URL,
};

export const isProduction = env.nodeEnv === "production";
