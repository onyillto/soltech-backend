import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import organizationRoutes from "./organization.routes";
import coolingHubRoutes from "./coolingHub.routes";
import coolingUnitRoutes from "./coolingUnit.routes";
import coldBoxLogRoutes from "./coldBoxLog.routes";
import basketRoutes from "./basket.routes";
import basketRentalRoutes from "./basketRental.routes";
import paymentRoutes from "./payment.routes";
import telemetryRoutes from "./telemetry.routes";
import courseRoutes from "./course.routes";
import moduleRoutes from "./module.routes";
import enrollmentRoutes from "./enrollment.routes";
import alertRoutes from "./alert.routes";

const router = Router();

router.get("/health", (_req, res) => res.status(200).json({ success: true, message: "OK" }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/organizations", organizationRoutes);
router.use("/cooling-hubs", coolingHubRoutes);
router.use("/cooling-units", coolingUnitRoutes);
router.use("/cold-box-logs", coldBoxLogRoutes);
router.use("/baskets", basketRoutes);
router.use("/basket-rentals", basketRentalRoutes);
router.use("/payments", paymentRoutes);
router.use("/telemetry", telemetryRoutes);
router.use("/courses", courseRoutes);
router.use("/modules", moduleRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/alerts", alertRoutes);

export default router;
