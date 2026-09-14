import { Router } from "express";
import { body } from "express-validator";
import { adminLogin, login, me } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { protect } from "../middleware/auth";

const router = Router();

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
 *               email: { type: string, format: email, example: "operator@soltech.test" }
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
