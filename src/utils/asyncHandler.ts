import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(handler: AsyncRouteHandler) {
  return async function wrappedHandler(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}
