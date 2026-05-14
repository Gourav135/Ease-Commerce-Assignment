import { Request, Response, Router } from "express";

import { asyncHandler } from "../../utils/asyncHandler";

import { OrderService } from "./order.service";
import {
  validateBulkCreateOrdersRequest,
  validateCreateOrderRequest,
} from "./order.validator";
import { BulkOrderService } from "../bulk/bulk.service";
import { TrackingService } from "../tracking/tracking.service";

const orderService = new OrderService();
const trackingService = new TrackingService();
const bulkOrderService = new BulkOrderService();

export const orderRouter = Router();

orderRouter.post(
  "/orders",
  asyncHandler(async (request: Request, response: Response) => {
    const payload = validateCreateOrderRequest(request.body);
    const result = await orderService.createOrder(payload);
    response.status(201).json(result);
  }),
);

orderRouter.get(
  "/orders/:orderId/track",
  asyncHandler(async (request: Request, response: Response) => {
    const result = await trackingService.trackOrder(String(request.params.orderId));
    response.status(200).json(result);
  }),
);

orderRouter.post(
  "/orders/:orderId/cancel",
  asyncHandler(async (request: Request, response: Response) => {
    const result = await orderService.cancelOrder(String(request.params.orderId));
    response.status(200).json(result);
  }),
);

orderRouter.post(
  "/orders/bulk",
  asyncHandler(async (request: Request, response: Response) => {
    const payload = validateBulkCreateOrdersRequest(request.body);
    const result = await bulkOrderService.createBatch(payload);
    response.status(202).json(result);
  }),
);

orderRouter.get(
  "/batches/:batchId",
  asyncHandler(async (request: Request, response: Response) => {
    const result = await bulkOrderService.getBatch(String(request.params.batchId));
    response.status(200).json(result);
  }),
);
