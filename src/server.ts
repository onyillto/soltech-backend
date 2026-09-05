import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[server] SOLTECH backend listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
