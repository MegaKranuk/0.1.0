import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/api-error";
import { IS_DEV } from "../config";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(IS_DEV ? { stack: err.stack } : {}),
      },
    });
  }

  console.error("[ErrorHandler]", err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      ...(IS_DEV && err instanceof Error ? { details: err.message, stack: err.stack } : {}),
    },
  });
};
