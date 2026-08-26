import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { env, isProduction } from "./config/env";
import { swaggerSpec } from "./config/swagger";

const app = express();

// Mounted before helmet() so its CSP never applies here — swagger-ui's page
// relies on inline styles/scripts that a default CSP blocks.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet());
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",") }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (!isProduction) app.use(morgan("dev"));

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
