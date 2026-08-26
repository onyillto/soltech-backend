import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { isProduction } from "../config/env";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Mongoose duplicate key error
  if (typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with these details already exists",
      details: (err as { keyValue?: unknown }).keyValue,
    });
  }

  // Mongoose validation error
  if (err instanceof Error && err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
