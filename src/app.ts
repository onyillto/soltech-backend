import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { env, isProduction } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { renderSwaggerHtml } from "./config/swaggerHtml";

const app = express();

// Mounted before helmet() so its CSP never applies here — the page's inline
// init script and CDN-loaded bundle would otherwise be blocked by the
// default CSP. Serves the UI as a hand-rendered HTML page loading Swagger UI
// from a CDN (see swaggerHtml.ts for why), with the raw spec at its own
// JSON endpoint — no local static files involved, so nothing for a
// serverless deploy's dependency tracing to miss.
app.get("/api-docs/openapi.json", (_req, res) => res.json(swaggerSpec));
app.get(["/api-docs", "/api-docs/"], (_req, res) => {
  res.type("html").send(renderSwaggerHtml("/api-docs/openapi.json"));
});

app.use(helmet());
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",") }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (!isProduction) app.use(morgan("dev"));

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
