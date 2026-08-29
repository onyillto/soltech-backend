import { Router } from "express";
import { body } from "express-validator";
import { humidityController } from "../controllers/humidity.controller";
import { validate } from "../middleware/validate";

const router = Router();

/**
 * @swagger
 * /humidity:
 *   post:
 *     summary: Ingest a humidity reading
 *     description: >
 *       Public endpoint, no auth. Any caller with a valid unit id can post.
 *
 *       humidityPercent is relative humidity, 0-100.
 *
 *       Example uses a live unit (TRL-001, Garki hub) — Execute as-is
 *       returns 201. Update the id if that unit is ever recreated.
 *     tags: [Humidity]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit, humidityPercent]
 *             properties:
 *               unit: { type: string, description: "Cooling unit id" }
 *               humidityPercent: { type: number, minimum: 0, maximum: 100 }
 *               recordedAt: { type: string, format: date-time, description: "Defaults to now if omitted" }
 *           example:
 *             unit: "6a902454481962452192348c"
 *             humidityPercent: 88
 *     responses:
 *       201:
 *         description: Reading stored
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       404:
 *         description: Unit not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post(
  "/",
  [
    body("unit").isMongoId().withMessage("A valid unit id is required"),
    body("humidityPercent").isFloat({ min: 0, max: 100 }).withMessage("humidityPercent must be 0-100"),
  ],
  validate,
  humidityController.create
);

// Everything below is public too — no login anywhere on this router, by design.

/**
 * @swagger
 * /humidity:
 *   get:
 *     summary: List readings
 *     tags: [Humidity]
 *     parameters:
 *       - in: query
 *         name: unit
 *         schema: { type: string }
 *     responses:
 *       200: { description: A page of readings }
 */
router.get("/", humidityController.list);

/**
 * @swagger
 * /humidity/latest:
 *   get:
 *     summary: Most recent reading for a unit
 *     tags: [Humidity]
 *     parameters:
 *       - in: query
 *         name: unit
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The latest reading, or null if none yet }
 *       400: { description: unit query param is required }
 */
router.get("/latest", humidityController.latest);

/**
 * @swagger
 * /humidity/summary:
 *   get:
 *     summary: Aggregate stats for a unit over a time window
 *     tags: [Humidity]
 *     parameters:
 *       - in: query
 *         name: unit
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: hours
 *         schema: { type: integer, minimum: 1, maximum: 720, default: 24 }
 *     responses:
 *       200: { description: min/max/avg humidity, reading count }
 *       400: { description: A valid unit query param is required }
 */
router.get("/summary", humidityController.summary);

/**
 * @swagger
 * /humidity/{id}:
 *   get:
 *     summary: Get one reading
 *     tags: [Humidity]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The reading }
 *       404: { description: Not found }
 */
router.get("/:id", humidityController.getOne);

export default router;
