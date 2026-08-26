import { Router } from "express";
import { body } from "express-validator";
import { coolingUnitController } from "../controllers/coolingUnit.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", coolingUnitController.list);
router.get("/:id", coolingUnitController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("hub").isMongoId().withMessage("A valid hub id is required"),
    body("unitCode").trim().notEmpty().withMessage("unitCode is required"),
    body("type")
      .isIn(["cold_room", "evaporative_cooler", "solar_fridge", "freezer", "mobile_trailer"])
      .withMessage("Invalid unit type"),
    body("capacityKg").isFloat({ min: 0 }).withMessage("capacityKg must be a positive number"),
  ],
  validate,
  coolingUnitController.create
);

router.patch("/:id", authorize("admin", "staff"), coolingUnitController.update);
router.patch("/:id/rotate-device-key", authorize("admin", "staff"), coolingUnitController.rotateDeviceKey);
router.delete("/:id", authorize("admin"), coolingUnitController.remove);

export default router;
