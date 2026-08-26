import { Request, Response } from "express";
import { crudFactory } from "../utils/crudFactory";
import { ColdBoxLog } from "../models/ColdBoxLog";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { parseColdBoxDateTime, parseDoorDuration } from "../utils/parsing";

const base = crudFactory(ColdBoxLog, {
  populate: "unit loggedBy",
  filterableFields: ["unit", "eventType", "produceType"],
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const log = await ColdBoxLog.create({ ...req.body, loggedBy: req.user?.id });
  res.status(201).json({ success: true, data: log });
});

interface RawEntry {
  eventType: "load" | "unload";
  produceType: string;
  quantityKg?: number;
  crateSizeKg?: 15 | 25;
  occurredAt?: string; // ISO
  occurredAtRaw?: string; // e.g. "22/1/2023 18:10pm"
  doorOpenSeconds?: number;
  doorOpenRaw?: string; // e.g. "2:30mins"
  comments?: string;
}

/**
 * Imports a batch of load/unload entries in one call, accepting either
 * pre-structured fields or the raw strings as they appear on the field
 * data sheets (occurredAtRaw, doorOpenRaw) — each row is validated and
 * reported independently so one bad row doesn't fail the whole batch.
 */
const bulkCreate = asyncHandler(async (req: Request, res: Response) => {
  const { unit, entries } = req.body as { unit?: string; entries?: RawEntry[] };

  if (!unit) throw ApiError.badRequest("unit is required");
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest("entries must be a non-empty array");
  }

  const created: unknown[] = [];
  const errors: { index: number; message: string }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      if (!entry.eventType || !["load", "unload"].includes(entry.eventType)) {
        throw new Error('eventType must be "load" or "unload"');
      }
      if (!entry.produceType) throw new Error("produceType is required");

      const occurredAt = entry.occurredAt
        ? new Date(entry.occurredAt)
        : parseColdBoxDateTime(entry.occurredAtRaw);
      if (!occurredAt || Number.isNaN(occurredAt.getTime())) {
        throw new Error("occurredAt (or a parseable occurredAtRaw) is required");
      }

      const quantityKg = entry.quantityKg;
      if (quantityKg === undefined || quantityKg < 0) {
        throw new Error("quantityKg is required and must be >= 0");
      }

      const doorOpenSeconds =
        entry.doorOpenSeconds ?? parseDoorDuration(entry.doorOpenRaw);

      const log = await ColdBoxLog.create({
        unit,
        eventType: entry.eventType,
        produceType: entry.produceType,
        quantityKg,
        crateSizeKg: entry.crateSizeKg,
        doorOpenSeconds,
        occurredAt,
        comments: entry.comments,
        loggedBy: req.user?.id,
      });
      created.push(log);
    } catch (err) {
      errors.push({ index: i, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  res.status(errors.length ? 207 : 201).json({
    success: errors.length === 0,
    data: { createdCount: created.length, created, errors },
  });
});

export const coldBoxLogController = { ...base, create, bulkCreate };
