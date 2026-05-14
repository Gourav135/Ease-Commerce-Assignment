import { NextFunction, Request, Response } from "express";

import { AppError } from "./appError";

export const errorMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  const requestId = response.locals.requestId || "unknown-request-id";

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      status: false,
      code: error.code,
      message: error.message,
      details: error.details,
      request_id: requestId,
    });
    return;
  }

  console.error("Unhandled error", { requestId, error });

  response.status(500).json({
    status: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    request_id: requestId,
  });
};
