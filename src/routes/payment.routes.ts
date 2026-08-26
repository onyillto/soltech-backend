import { Router } from "express";
import { body } from "express-validator";
import { paymentController } from "../controllers/payment.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", authorize("admin", "staff"), paymentController.list);
router.get("/:id", authorize("admin", "staff"), paymentController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("rental").isMongoId().withMessage("A valid rental id is required"),
    body("amountKobo").isInt({ min: 0 }).withMessage("amountKobo must be a non-negative integer"),
    body("method").isIn(["cash", "transfer", "mobile_money", "card"]).withMessage("Invalid payment method"),
  ],
  validate,
  paymentController.create
);

router.delete("/:id", authorize("admin"), paymentController.remove);

export default router;
