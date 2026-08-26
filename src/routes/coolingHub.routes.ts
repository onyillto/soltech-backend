import { Router } from "express";
import { body } from "express-validator";
import { coolingHubController } from "../controllers/coolingHub.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", coolingHubController.list);
router.get("/:id", coolingHubController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("community").trim().notEmpty().withMessage("Community is required"),
    body("state").trim().notEmpty().withMessage("State is required"),
  ],
  validate,
  coolingHubController.create
);

router.patch("/:id", authorize("admin", "staff"), coolingHubController.update);

/**
 * @swagger
 * /cooling-hubs/{id}/assign:
 *   patch:
 *     summary: Assign a hub to an admin or staff user
 *     description: >
 *       They become "in control" of the hub, and the fallback recipient for
 *       cold-chain temperature alerts on its units. Admin only. The target
 *       user must have role admin or staff.
 *     tags: [Cooling Hubs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, description: "Id of the admin/staff user to assign" }
 *     responses:
 *       200: { description: Hub assigned }
 *       400: { description: Target user isn't admin/staff, or invalid input }
 *       404: { description: Hub or user not found }
 */
router.patch(
  "/:id/assign",
  authorize("admin"),
  [body("userId").isMongoId().withMessage("A valid user id is required")],
  validate,
  coolingHubController.assign
);
router.delete("/:id", authorize("admin"), coolingHubController.remove);

export default router;
