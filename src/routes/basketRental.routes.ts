import { Router } from "express";
import { body } from "express-validator";
import { basketRentalController } from "../controllers/basketRental.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", basketRentalController.list);
router.get("/summary", basketRentalController.summary);
router.get("/:id", basketRentalController.getOne);

router.post(
  "/",
  authorize("admin", "staff", "farmer", "market_woman", "trader"),
  [
    body("basket").isMongoId().withMessage("A valid basket id is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one produce item is required"),
    body("items.*.produceType").trim().notEmpty().withMessage("Each item needs a produce type"),
    body("items.*.quantityKg")
      .isFloat({ min: 0.01 })
      .withMessage("Each item needs a weight greater than 0"),
  ],
  validate,
  basketRentalController.create
);

router.patch("/:id/close", basketRentalController.close);
router.delete("/:id", authorize("admin", "staff"), basketRentalController.remove);

export default router;
