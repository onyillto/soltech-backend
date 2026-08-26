import { Router } from "express";
import { alertController } from "../controllers/alert.controller";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.use(protect, authorize("admin", "staff"));

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: List cold-chain temperature alerts
 *     description: >
 *       System-generated only — created when a unit stays at or above the
 *       temperature threshold for the configured sustained period while it
 *       has produce in it. Admin/staff only.
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, acknowledged] }
 *       - in: query
 *         name: unit
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: A page of alerts
 */
router.get("/", alertController.list);

/**
 * @swagger
 * /alerts/{id}:
 *   get:
 *     summary: Get one alert
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The alert }
 *       404: { description: Not found }
 */
router.get("/:id", alertController.getOne);

/**
 * @swagger
 * /alerts/{id}/acknowledge:
 *   patch:
 *     summary: Acknowledge an alert
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Acknowledged }
 *       400: { description: Already acknowledged }
 *       404: { description: Not found }
 */
router.patch("/:id/acknowledge", alertController.acknowledge);

router.delete("/:id", authorize("admin"), alertController.remove);

export default router;
