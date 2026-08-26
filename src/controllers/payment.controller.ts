import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { Payment } from "../models/Payment";
import { BasketRental } from "../models/BasketRental";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const base = crudFactory(Payment, {
  populate: "rental recordedBy",
  filterableFields: ["rental", "status", "method"],
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const rental = await BasketRental.findById(req.body.rental);
  if (!rental) throw ApiError.notFound("Rental not found");

  const payment = await Payment.create({ ...req.body, recordedBy: req.user?.id });
  res.status(201).json({ success: true, data: payment });
});

export const paymentController = { ...base, create };
