import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { BasketRental, IBasketRentalItem } from "../models/BasketRental";
import { Basket } from "../models/Basket";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { assertOwnerOrPrivileged } from "../utils/ownership";
import { dailyRateKoboForWeight } from "../constants/billing";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const base = crudFactory(BasketRental, {
  populate: "basket renter",
  filterableFields: ["basket", "renter", "status"],
});

/** Days elapsed since start, billed as whole days (any partial day counts as a full day). */
function billedDays(startAt: Date, endAt: Date): number {
  return Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / MS_PER_DAY));
}

/** Starts a rental: the basket must be available, and is marked occupied for the duration. */
const create = asyncHandler(async (req: Request, res: Response) => {
  const basket = await Basket.findById(req.body.basket);
  if (!basket) throw ApiError.notFound("Basket not found");
  if (basket.status !== "available") throw ApiError.conflict("This basket is not available");

  const items: IBasketRentalItem[] = req.body.items ?? [];
  const totalQuantityKg = items.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0);

  if (basket.capacityKg && totalQuantityKg > basket.capacityKg) {
    throw ApiError.badRequest(
      `Total weight (${totalQuantityKg}kg) exceeds this basket's capacity (${basket.capacityKg}kg)`
    );
  }

  const canActOnBehalf = req.user?.role === "admin" || req.user?.role === "staff";
  const renter = canActOnBehalf && req.body.renter ? req.body.renter : req.user?.id;

  const rental = await BasketRental.create({
    basket: basket.id,
    renter,
    items,
    totalQuantityKg,
    startAt: req.body.startAt ?? new Date(),
    rateKoboPerDay: req.body.rateKoboPerDay ?? dailyRateKoboForWeight(totalQuantityKg),
    notes: req.body.notes,
  });

  basket.status = "occupied";
  await basket.save();

  res.status(201).json({ success: true, data: rental });
});

/** Adds a live billing estimate for still-open rentals rather than persisting a moving target. */
const getOne = asyncHandler(async (req: Request, res: Response) => {
  const rental = await BasketRental.findById(req.params.id).populate("basket renter");
  if (!rental) throw ApiError.notFound("Rental not found");

  const data = rental.toObject();
  if (rental.status === "active") {
    const days = billedDays(rental.startAt, new Date());
    Object.assign(data, {
      estimatedDays: days,
      estimatedAmountDueKobo: days * rental.rateKoboPerDay,
    });
  }

  res.status(200).json({ success: true, data });
});

/** Closes a rental: computes the final bill and frees the basket back to available. */
const close = asyncHandler(async (req: Request, res: Response) => {
  const rental = await BasketRental.findById(req.params.id);
  if (!rental) throw ApiError.notFound("Rental not found");
  assertOwnerOrPrivileged(req, rental.renter);
  if (rental.status !== "active") throw ApiError.badRequest("This rental is already closed");

  const endAt = req.body.endAt ? new Date(req.body.endAt) : new Date();
  const totalDays = billedDays(rental.startAt, endAt);

  rental.endAt = endAt;
  rental.totalDays = totalDays;
  rental.amountDueKobo = totalDays * rental.rateKoboPerDay;
  rental.status = "closed";
  await rental.save();

  await Basket.findByIdAndUpdate(rental.basket, { status: "available" });

  res.status(200).json({ success: true, data: rental });
});

/**
 * Aggregate view of everything that has gone through the system — totals plus
 * a daily series (transaction count, weight, and realized revenue from closed
 * rentals) for the requested window, feeding the Transactions page's chart.
 */
const summary = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [result] = await BasketRental.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalTransactions: { $sum: 1 },
              totalWeightKg: { $sum: "$totalQuantityKg" },
              totalRevenueKobo: {
                $sum: { $cond: [{ $eq: ["$status", "closed"] }, "$amountDueKobo", 0] },
              },
              activeCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
              closedCount: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
              cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            },
          },
        ],
        daily: [
          { $match: { startAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$startAt" } },
              transactions: { $sum: 1 },
              weightKg: { $sum: "$totalQuantityKg" },
              revenueKobo: {
                $sum: { $cond: [{ $eq: ["$status", "closed"] }, "$amountDueKobo", 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const totals = result?.totals?.[0] ?? {
    totalTransactions: 0,
    totalWeightKg: 0,
    totalRevenueKobo: 0,
    activeCount: 0,
    closedCount: 0,
    cancelledCount: 0,
  };

  const daily = (result?.daily ?? []).map((d: { _id: string; transactions: number; weightKg: number; revenueKobo: number }) => ({
    date: d._id,
    transactions: d.transactions,
    weightKg: d.weightKg,
    revenueKobo: d.revenueKobo,
  }));

  res.status(200).json({ success: true, data: { windowDays: days, totals, daily } });
});

export const basketRentalController = { ...base, create, getOne, close, summary };
