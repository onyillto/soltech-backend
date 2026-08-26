import { Request, Response } from "express";
import { Model } from "mongoose";
import { ApiError } from "./ApiError";
import { asyncHandler } from "./asyncHandler";

interface CrudOptions {
  populate?: string | string[];
  /** Fields plucked from req.query and matched exactly, e.g. ["hub", "status"] */
  filterableFields?: string[];
}

/**
 * Generates standard list/get/create/update/remove handlers for a Mongoose
 * model so individual resource controllers only need to declare options.
 */
export function crudFactory<T>(model: Model<T>, options: CrudOptions = {}) {
  const { populate, filterableFields = [] } = options;

  const list = asyncHandler(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = {};
    for (const field of filterableFields) {
      if (req.query[field] !== undefined) filter[field] = req.query[field];
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    let query = model
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort("-createdAt");

    if (populate) query = query.populate(populate as string);

    const [items, total] = await Promise.all([query, model.countDocuments(filter)]);

    res.status(200).json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

  const getOne = asyncHandler(async (req: Request, res: Response) => {
    let query = model.findById(req.params.id);
    if (populate) query = query.populate(populate as string);
    const doc = await query;
    if (!doc) throw ApiError.notFound("Resource not found");
    res.status(200).json({ success: true, data: doc });
  });

  const create = asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.create(req.body);
    res.status(201).json({ success: true, data: doc });
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) throw ApiError.notFound("Resource not found");
    res.status(200).json({ success: true, data: doc });
  });

  const remove = asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.findByIdAndDelete(req.params.id);
    if (!doc) throw ApiError.notFound("Resource not found");
    res.status(204).send();
  });

  return { list, getOne, create, update, remove };
}
