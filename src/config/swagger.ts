import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

/**
 * Builds the OpenAPI spec by scanning `@swagger` JSDoc blocks in the route
 * files. Points at both .ts (dev, via ts-node-dev) and .js (the compiled
 * build) so this works identically either way — TS comments survive into
 * dist/*.js by default (removeComments isn't set in tsconfig.json).
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "SOLTECH Hub API",
      version: "0.1.0",
      description:
        "Off-grid cold-chain and VET training API for SOLTECH Hub. " +
        "Send the JWT from /auth/login or /auth/admin/login as `Authorization: Bearer <token>`.",
    },
    servers: [
      ...(env.publicApiUrl ? [{ url: env.publicApiUrl, description: "Production" }] : []),
      { url: `http://localhost:${env.port}/api/v1`, description: "Local" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        deviceKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-device-key",
          description:
            "The cooling unit's own secret (shown once, when the unit is created or its key is " +
            "rotated) — not a user login. This is how a sensor device authenticates itself, distinct from bearerAuth.",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "66f1a2b3c4d5e6f7a8b9c0d1" },
            name: { type: "string", example: "Ada Admin" },
            email: { type: "string", format: "email", example: "admin@soltech.test" },
            phone: { type: "string", nullable: true },
            role: {
              type: "string",
              enum: ["admin", "staff", "farmer", "market_woman", "trader", "learner"],
            },
            organization: { type: "string", nullable: true, description: "Organization id" },
            location: {
              type: "object",
              nullable: true,
              properties: {
                community: { type: "string" },
                state: { type: "string" },
                country: { type: "string" },
              },
            },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthPayload: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            token: { type: "string", description: "JWT — send as Authorization: Bearer <token>" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/AuthPayload" },
          },
        },
        ApiErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Invalid email or password" },
            details: { nullable: true, description: "Validation error details, when applicable" },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/*.ts"), path.join(__dirname, "../routes/*.js")],
};

const fullSpec = swaggerJsdoc(options) as {
  paths?: Record<string, Record<string, unknown>>;
  tags?: { name: string }[];
  [key: string]: unknown;
};

/**
 * The client only contracted for `POST /telemetry`, so the published docs
 * expose that one operation and nothing else. Every other route still works
 * if called directly — it's just not advertised here. To surface more later,
 * add its `path:method` to EXPOSED_OPERATIONS.
 */
const EXPOSED_OPERATIONS: Record<string, string[]> = {
  "/telemetry": ["post"],
};

const paths: Record<string, Record<string, unknown>> = {};
for (const [routePath, methods] of Object.entries(EXPOSED_OPERATIONS)) {
  const source = fullSpec.paths?.[routePath];
  if (!source) continue;
  paths[routePath] = {};
  for (const method of methods) {
    if (source[method]) paths[routePath][method] = source[method];
  }
}

const exposedTags = new Set(
  Object.values(paths)
    .flatMap((methods) => Object.values(methods) as { tags?: string[] }[])
    .flatMap((op) => op.tags ?? [])
);

export const swaggerSpec = {
  ...fullSpec,
  paths,
  tags: (fullSpec.tags ?? []).filter((tag) => exposedTags.has(tag.name)),
};
