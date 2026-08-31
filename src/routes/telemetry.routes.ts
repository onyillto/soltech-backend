import { Router } from "express";
import { body } from "express-validator";
import { telemetryController } from "../controllers/telemetry.controller";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

/**
 * @swagger
 * /telemetry:
 *   post:
 *     summary: Ingest a sensor reading
 *     description: >
 *       Public endpoint, no auth. Any caller with a valid unit id can post
 *       one reading: temperature and relative humidity for that unit.
 *
 *       Sustained high temperature with active produce in the unit raises
 *       an Alert.
 *
 *       The example id is the seeded unit (TRL-001) — Execute as-is returns
 *       201 after `npm run seed`.
 *     tags: [Telemetry]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit, temperatureC, humidityPercent]
 *             properties:
 *               unit: { type: string, description: "Cooling unit id" }
 *               temperatureC: { type: number, description: "Temperature reading in Celsius" }
 *               humidityPercent: { type: number, minimum: 0, maximum: 100, description: "Relative humidity, 0-100" }
 *           example:
 *             unit: "6a90219bf8ad0f55472bf900"
 *             temperatureC: 16
 *             humidityPercent: 88
 *     responses:
 *       201:
 *         description: Reading stored
 *       400:
 *         description: Validation failed (missing unit/temperatureC/humidityPercent)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       404:
 *         description: Unit not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
const PROBE_FIELDS = [
  "ambientC",
  "evaporatorInC",
  "evaporatorOutC",
  "leftInsideC",
  "rightInsideC",
  "leftMiddleC",
  "rightMiddleC",
  "leftNearDoorC",
  "rightNearDoorC",
] as const;

router.post(
  "/",
  [
    body("unit").isMongoId().withMessage("A valid unit id is required"),
    body("temperatureC").isFloat().withMessage("temperatureC is required"),
    body("humidityPercent").isFloat({ min: 0, max: 100 }).withMessage("humidityPercent must be 0-100"),
    ...PROBE_FIELDS.map((field) => body(field).optional().isFloat().withMessage(`${field} must be a number`)),
  ],
  validate,
  telemetryController.create
);

// Everything else is read access for authenticated app users.
router.use(protect);

/**
 * @swagger
 * /telemetry:
 *   get:
 *     summary: List readings
 *     tags: [Telemetry]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unit
 *         schema: { type: string }
 *       - in: query
 *         name: source
 *         schema: { type: string, enum: [sensor, manual] }
 *     responses:
 *       200: { description: A page of readings }
 */
router.get("/", telemetryController.list);

/**
 * @swagger
 * /telemetry/latest:
 *   get:
 *     summary: Most recent reading for a unit
 *     tags: [Telemetry]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unit
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The latest reading, or null if none yet }
 *       400: { description: unit query param is required }
 */
router.get("/latest", telemetryController.latest);

/**
 * @swagger
 * /telemetry/summary:
 *   get:
 *     summary: Aggregate stats for a unit over a time window
 *     tags: [Telemetry]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unit
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: hours
 *         schema: { type: integer, minimum: 1, maximum: 720, default: 24 }
 *     responses:
 *       200: { description: min/max/avg temperature, avg battery, total energy, reading count }
 *       400: { description: A valid unit query param is required }
 */
router.get("/summary", telemetryController.summary);

/**
 * @swagger
 * /telemetry/{id}:
 *   get:
 *     summary: Get one reading
 *     tags: [Telemetry]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The reading }
 *       404: { description: Not found }
 */
router.get("/:id", telemetryController.getOne);

export default router;
