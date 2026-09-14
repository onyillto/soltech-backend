import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { Client } from "../models/Client";
import { asyncHandler } from "../utils/asyncHandler";

const base = crudFactory(Client, {
  populate: "organization createdBy",
  filterableFields: ["organization"],
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const client = await Client.create({ ...req.body, createdBy: req.user?.id });
  res.status(201).json({ success: true, data: client });
});

export const clientController = { ...base, create };
