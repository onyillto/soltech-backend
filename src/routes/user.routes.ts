import { Router } from "express";
import { body } from "express-validator";
import { userController } from "../controllers/user.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ROLES } from "../constants/roles";

const router = Router();

router.use(protect);

router.get("/", authorize("admin", "operator"), userController.list);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create an admin or operator account
 *     description: >
 *       Admin-only. There is no public registration — every account is
 *       provisioned this way, by `npm run create-admin`, or by `npm run seed`.
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string, example: "Sam Operator" }
 *               email: { type: string, format: email, example: "sam@soltech.test" }
 *               password: { type: string, format: password, minLength: 8, example: "a-strong-password" }
 *               phone: { type: string, example: "+2348012345678" }
 *               role: { type: string, enum: [admin, operator] }
 *               organization: { type: string, description: "Organization id" }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       409:
 *         description: An account with this email already exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post(
  "/",
  authorize("admin"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role").isIn(ROLES).withMessage("role must be admin or operator"),
  ],
  validate,
  userController.create
);

router.get("/:id", userController.getOne);
router.patch("/:id", authorize("admin"), userController.update);
router.delete("/:id", authorize("admin"), userController.remove);

export default router;
