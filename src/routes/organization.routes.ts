import { Router } from "express";
import { body } from "express-validator";
import { organizationController } from "../controllers/organization.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", organizationController.list);
router.get("/:id", organizationController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("type")
      .isIn(["cooperative", "community_group", "training_center", "market_association", "ngo"])
      .withMessage("Invalid organization type"),
  ],
  validate,
  organizationController.create
);

router.patch("/:id", authorize("admin", "staff"), organizationController.update);
router.delete("/:id", authorize("admin"), organizationController.remove);

export default router;
