import { Router } from "express";
import { body } from "express-validator";
import { telemetryController } from "../controllers/telemetry.controller";
import { protect } from "../middleware/auth";
import { deviceAuth } from "../middleware/deviceAuth";
import { validate } from "../middleware/validate";

const router = Router();

/**
 * @swagger
 * /telemetry:
 *   post:
 *     summary: Push a sensor reading (device only — no user login)
 *     description: >
 *       This is the one endpoint a sensor/device integrates with. It does
 *       NOT use a Bearer token — it authenticates with the target unit's own
 *       device key via the `x-device-key` header (get the unit id and its
 *       device key from whoever manages the units; the key is shown once, at
 *       creation or rotation, and never again). Store this reading, and it
 *       also feeds the cold-chain temperature alerting: a unit that stays at
 *       or above the alert threshold with produce in it triggers an Alert.
 *
 *       temperatureC is the primary/representative reading alerting keys off
 *       of. The nine ambientC/evaporatorInC/.../rightNearDoorC fields are all
 *       optional, for a sensor rig that reports a full multi-point grid
 *       (ambient air, evaporator coil in/out, six positions inside the
 *       storage compartment) rather than a single probe.
 *     tags: [Telemetry]
 *     security: [{ deviceKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit, temperatureC]
 *             properties:
 *               unit: { type: string, description: "Cooling unit id", example: "66f1a2b3c4d5e6f7a8b9c0d1" }
 *               temperatureC: { type: number, description: "Primary reading — what alerting/summary key off", example: 4.6 }
 *               ambientC: { type: number, description: "Outside air temperature" }
 *               evaporatorInC: { type: number, description: "Refrigerant temperature into the evaporator coil" }
 *               evaporatorOutC: { type: number, description: "Refrigerant temperature out of the evaporator coil" }
 *               leftInsideC: { type: number, description: "Storage compartment, left interior" }
 *               rightInsideC: { type: number, description: "Storage compartment, right interior" }
 *               leftMiddleC: { type: number, description: "Storage compartment, left middle" }
 *               rightMiddleC: { type: number, description: "Storage compartment, right middle" }
 *               leftNearDoorC: { type: number, description: "Storage compartment, left near the door" }
 *               rightNearDoorC: { type: number, description: "Storage compartment, right near the door" }
 *               batteryPercent: { type: number, minimum: 0, maximum: 100, example: 82 }
 *               solarInputWatts: { type: number, minimum: 0, example: 140 }
 *               energyConsumedWh: { type: number, minimum: 0, example: 18.4 }
 *               recordedAt: { type: string, format: date-time, description: "Defaults to now if omitted" }
 *     responses:
 *       201:
 *         description: Reading stored
 *       400:
 *         description: Validation failed (missing unit/temperatureC)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       401:
 *         description: Missing or wrong x-device-key
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
  deviceAuth,
  telemetryController.create
);

// Everything else is read access for authenticated app users (a user login, not a device key).
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
