import { Router } from "express";
import { body } from "express-validator";
import { basketController } from "../controllers/basket.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", basketController.list);

/**
 * @swagger
 * /baskets/available:
 *   get:
 *     summary: List baskets ready to rent right now
 *     description: Equivalent to `GET /baskets?status=available`, as an explicit endpoint.
 *     tags: [Baskets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unit
 *         schema: { type: string }
 *         description: Restrict to one cooling unit
 *     responses:
 *       200: { description: Available baskets, sorted by basket number }
 */
router.get("/available", basketController.available);

router.get("/:id", basketController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("unit").isMongoId().withMessage("A valid unit id is required"),
    body("basketNumber").isInt({ min: 1 }).withMessage("basketNumber must be a positive integer"),
  ],
  validate,
  basketController.create
);

/**
 * @swagger
 * /baskets/bulk:
 *   post:
 *     summary: Provision every basket for a unit in one call
 *     description: >
 *       Creates basketNumber startNumber..startNumber+count-1 for the unit.
 *       Idempotent — numbers that already exist are skipped, not duplicated,
 *       so it's safe to re-run. If `count` is omitted, it defaults to the
 *       unit's own `basketCapacity`.
 *     tags: [Baskets]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit]
 *             properties:
 *               unit: { type: string, description: "Cooling unit id" }
 *               count: { type: integer, minimum: 1, maximum: 500, description: "Defaults to the unit's basketCapacity" }
 *               startNumber: { type: integer, minimum: 1, default: 1 }
 *               capacityKg: { type: number, description: "Applied to every basket created" }
 *     responses:
 *       201:
 *         description: Baskets created (and/or skipped, if some numbers already existed)
 *       400: { description: "count missing and unit has no basketCapacity, or count too large" }
 *       404: { description: Unit not found }
 */
router.post(
  "/bulk",
  authorize("admin", "staff"),
  [
    body("unit").isMongoId().withMessage("A valid unit id is required"),
    body("count").optional().isInt({ min: 1, max: 500 }).withMessage("count must be between 1 and 500"),
    body("startNumber").optional().isInt({ min: 1 }).withMessage("startNumber must be a positive integer"),
  ],
  validate,
  basketController.bulkCreate
);

router.patch("/:id", authorize("admin", "staff"), basketController.update);
router.delete("/:id", authorize("admin"), basketController.remove);

export default router;
