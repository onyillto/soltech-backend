import { Router } from "express";
import { body } from "express-validator";
import { clientController } from "../controllers/client.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", clientController.list);
router.get("/:id", clientController.getOne);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Register a client
 *     description: >
 *       A farmer, market woman, or trader who places produce into cold
 *       storage. Clients don't log in — an admin/operator creates and
 *       manages this record on their behalf.
 *     tags: [Clients]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string, example: "Farida Farmer" }
 *               phone: { type: string, example: "+2348012345678" }
 *               email: { type: string, format: email }
 *               organization: { type: string, description: "Organization id" }
 *     responses:
 *       201: { description: Client created }
 *       400: { description: Validation failed }
 */
router.post(
  "/",
  authorize("admin", "operator"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("email").optional().isEmail().withMessage("A valid email is required"),
  ],
  validate,
  clientController.create
);

router.patch("/:id", authorize("admin", "operator"), clientController.update);
router.delete("/:id", authorize("admin"), clientController.remove);

export default router;
