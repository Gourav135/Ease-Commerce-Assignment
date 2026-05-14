import { randomUUID } from "crypto";

import { NextFunction, Request, Response } from "express";

export const requestContext = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const requestId = request.header("x-request-id") || randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
};
