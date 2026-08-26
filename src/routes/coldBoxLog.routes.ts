import { Router } from "express";
import { body } from "express-validator";
import { coldBoxLogController } from "../controllers/coldBoxLog.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", coldBoxLogController.list);
router.get("/:id", coldBoxLogController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("unit").isMongoId().withMessage("A valid unit id is required"),
    body("eventType").isIn(["load", "unload"]).withMessage('eventType must be "load" or "unload"'),
    body("produceType").trim().notEmpty().withMessage("produceType is required"),
    body("quantityKg").isFloat({ min: 0 }).withMessage("quantityKg must be a positive number"),
    body("occurredAt").isISO8601().withMessage("occurredAt must be a valid date"),
    body("crateSizeKg").optional().isIn([15, 25]).withMessage("crateSizeKg must be 15 or 25"),
  ],
  validate,
  coldBoxLogController.create
);

router.post(
  "/bulk",
  authorize("admin", "staff"),
  [
    body("unit").isMongoId().withMessage("A valid unit id is required"),
    body("entries").isArray({ min: 1 }).withMessage("entries must be a non-empty array"),
  ],
  validate,
  coldBoxLogController.bulkCreate
);

router.patch("/:id", authorize("admin", "staff"), coldBoxLogController.update);
router.delete("/:id", authorize("admin", "staff"), coldBoxLogController.remove);

export default router;
