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
 *       Public endpoint, no auth. Any caller with a valid unit id can post.
 *
 *       temperatureC is required; it's the primary reading alerting and
 *       summary use. The nine probe fields (ambientC, evaporatorInC,
 *       evaporatorOutC, leftInsideC, rightInsideC, leftMiddleC,
 *       rightMiddleC, leftNearDoorC, rightNearDoorC) are optional, for rigs
 *       reporting a full multi-point grid instead of one sensor.
 *
 *       Sustained high temperature with active produce in the unit raises
 *       an Alert.
 *
 *       Example uses a live unit (TRL-001, Garki hub) — Execute as-is
 *       returns 201. Update the id if that unit is ever recreated.
 *     tags: [Telemetry]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit, temperatureC]
 *             properties:
 *               unit: { type: string, description: "Cooling unit id" }
 *               temperatureC: { type: number, description: "Primary reading — what alerting/summary key off" }
 *               ambientC: { type: number, description: "Outside air temperature" }
 *               evaporatorInC: { type: number, description: "Refrigerant temperature into the evaporator coil" }
 *               evaporatorOutC: { type: number, description: "Refrigerant temperature out of the evaporator coil" }
 *               leftInsideC: { type: number, description: "Storage compartment, left interior" }
 *               rightInsideC: { type: number, description: "Storage compartment, right interior" }
 *               leftMiddleC: { type: number, description: "Storage compartment, left middle" }
 *               rightMiddleC: { type: number, description: "Storage compartment, right middle" }
 *               leftNearDoorC: { type: number, description: "Storage compartment, left near the door" }
 *               rightNearDoorC: { type: number, description: "Storage compartment, right near the door" }
 *               batteryPercent: { type: number, minimum: 0, maximum: 100 }
 *               solarInputWatts: { type: number, minimum: 0 }
 *               energyConsumedWh: { type: number, minimum: 0 }
 *               recordedAt: { type: string, format: date-time, description: "Defaults to now if omitted" }
 *           example:
 *             unit: "6a902454481962452192348c"
 *             temperatureC: 19.4
 *             ambientC: 35.9
 *             evaporatorInC: 20.5
 *             evaporatorOutC: 12.2
 *             leftInsideC: 19.4
 *             rightInsideC: 20.4
 *             leftMiddleC: 19
 *             rightMiddleC: 21.5
 *             leftNearDoorC: 17.5
 *             rightNearDoorC: 12
 *             batteryPercent: 82
 *             solarInputWatts: 140
 *             energyConsumedWh: 18.4
 *     responses:
 *       201:
 *         description: Reading stored
 *       400:
 *         description: Validation failed (missing unit/temperatureC)
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
