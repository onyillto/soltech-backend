import { Router } from "express";
import { body } from "express-validator";
import { moduleController } from "../controllers/module.controller";
import { protect, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);

router.get("/", moduleController.list);
router.get("/:id", moduleController.getOne);

router.post(
  "/",
  authorize("admin", "staff"),
  [
    body("course").isMongoId().withMessage("A valid course id is required"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("content").trim().notEmpty().withMessage("Content is required"),
  ],
  validate,
  moduleController.create
);

router.patch("/:id", authorize("admin", "staff"), moduleController.update);
router.delete("/:id", authorize("admin"), moduleController.remove);

export default router;
