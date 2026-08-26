import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { protect, authorize } from "../middleware/auth";

const router = Router();

router.use(protect);

router.get("/", authorize("admin", "staff"), userController.list);
router.get("/:id", userController.getOne);
router.patch("/:id", authorize("admin"), userController.update);
router.delete("/:id", authorize("admin"), userController.remove);

export default router;
