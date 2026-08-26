import { Router } from "express";
import { body } from "express-validator";
import { adminLogin, login, me, register } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { protect } from "../middleware/auth";
import { SELF_SERVICE_ROLES } from "../constants/roles";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new account
 *     description: >
 *       Self-service registration for farmers, market women, traders, and
 *       learners only. There is no public registration for admin or staff —
 *       those accounts are provisioned by an existing admin or the seed
 *       script, never through this endpoint.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Amaka Trader" }
 *               email: { type: string, format: email, example: "amaka@example.com" }
 *               password: { type: string, format: password, minLength: 8, example: "a-strong-password" }
 *               phone: { type: string, example: "+2348012345678" }
 *               role:
 *                 type: string
 *                 enum: [farmer, market_woman, trader, learner]
 *                 default: learner
 *               organization: { type: string, description: "Organization id" }
 *     responses:
 *       201:
 *         description: Account created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
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
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(SELF_SERVICE_ROLES)
      .withMessage("Invalid role — admin/staff accounts aren't created through registration"),
  ],
  validate,
  register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in (any role)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "farmer@soltech.test" }
 *               password: { type: string, format: password, example: "Soltech@2026" }
 *     responses:
 *       200:
 *         description: Signed in
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       403:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     summary: Admin-only login
 *     description: >
 *       Same credential check as /auth/login, but only succeeds for accounts
 *       with role=admin. There is no admin registration endpoint — a
 *       non-admin account, a wrong password, or a nonexistent email all
 *       return the identical generic error below, so this endpoint can't be
 *       used to enumerate which emails are admins.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "admin@soltech.test" }
 *               password: { type: string, format: password, example: "Soltech@2026" }
 *     responses:
 *       200:
 *         description: Signed in
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         description: Invalid email or password (also returned for a correct password on a non-admin account)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       403:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post(
  "/admin/login",
  [
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  adminLogin
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the signed-in user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: The current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get("/me", protect, me);

export default router;
