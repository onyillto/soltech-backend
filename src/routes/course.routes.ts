import { Router } from "express";
import { body } from "express-validator";
import { courseController } from "../controllers/course.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", courseController.list);
router.get("/:id", courseController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("category")
      .isIn(["sustainable_cooling", "solar_energy", "food_preservation", "business_skills"])
      .withMessage("Invalid category"),
    body("durationHours").isFloat({ min: 0 }).withMessage("durationHours must be a positive number"),
  ],
  validate,
  courseController.create
);

router.patch("/:id", authorize("admin", "staff"), courseController.update);
router.delete("/:id", authorize("admin"), courseController.remove);

export default router;
