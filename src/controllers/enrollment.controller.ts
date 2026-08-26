import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { Enrollment } from "../models/Enrollment";
import { Module } from "../models/Module";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { assertOwnerOrPrivileged } from "../utils/ownership";

const base = crudFactory(Enrollment, {
  populate: "learner course completedModules",
  filterableFields: ["learner", "course", "status"],
});

/** Enrolls a learner in a course, defaulting to the authenticated user. */
const create = asyncHandler(async (req: Request, res: Response) => {
  const canActOnBehalf = req.user?.role === "admin" || req.user?.role === "staff";
  const learner = canActOnBehalf && req.body.learner ? req.body.learner : req.user?.id;

  const existing = await Enrollment.findOne({ learner, course: req.body.course });
  if (existing) throw ApiError.conflict("This learner is already enrolled in this course");

  const enrollment = await Enrollment.create({ ...req.body, learner });
  res.status(201).json({ success: true, data: enrollment });
});

/** Marks a module complete for an enrollment and recalculates progress/learning outcome. */
const completeModule = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId } = req.body;
  if (!moduleId) throw ApiError.badRequest("moduleId is required");

  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) throw ApiError.notFound("Enrollment not found");
  assertOwnerOrPrivileged(req, enrollment.learner);

  const totalModules = await Module.countDocuments({ course: enrollment.course });
  if (totalModules === 0) throw ApiError.badRequest("This course has no modules yet");

  const alreadyCompleted = enrollment.completedModules.some((m) => m.toString() === moduleId);
  if (!alreadyCompleted) {
    enrollment.completedModules.push(moduleId);
  }

  enrollment.progressPercent = Math.round((enrollment.completedModules.length / totalModules) * 100);

  if (enrollment.progressPercent >= 100) {
    enrollment.status = "completed";
    enrollment.completedAt = enrollment.completedAt ?? new Date();
  }

  await enrollment.save();
  res.status(200).json({ success: true, data: enrollment });
});

export const enrollmentController = { ...base, create, completeModule };
