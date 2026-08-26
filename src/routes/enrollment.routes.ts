import { Router } from "express";
import { body } from "express-validator";
import { enrollmentController } from "../controllers/enrollment.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", enrollmentController.list);
router.get("/:id", enrollmentController.getOne);

router.post(
  "/",
  [body("course").isMongoId().withMessage("A valid course id is required")],
  validate,
  enrollmentController.create
);

router.patch("/:id/complete-module", enrollmentController.completeModule);
router.delete("/:id", authorize("admin", "staff"), enrollmentController.remove);

export default router;
