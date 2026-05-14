import { CourierInteractionType } from "@prisma/client";

import { AppError } from "../../utils/appError";
import { CourierRegistry } from "../couriers/courierRegistry";
import { CourierInteractionRepository } from "../orders/courierInteraction.repository";
import { OrderService } from "../orders/order.service";
import { TrackOrderResponseDto } from "../orders/order.types";

import { OrderRepository } from "../orders/order.repository";
import { TrackingRepository } from "./tracking.repository";

export class TrackingService {
  constructor(
    private readonly orderService = new OrderService(),
    private readonly courierRegistry = new CourierRegistry(),
    private readonly orderRepository = new OrderRepository(),
    private readonly trackingRepository = new TrackingRepository(),
    private readonly interactionRepository = new CourierInteractionRepository(),
  ) {}

  async trackOrder(orderId: string): Promise<TrackOrderResponseDto> {
    const orderRecord = await this.orderService.getOrderOrThrow(orderId);
    const adapter = this.courierRegistry.getAdapterByCourierId(orderRecord.courier_id);

    try {
      const result = await adapter.trackOrder(orderRecord);

      await this.orderRepository.updateStatusAndTracking(
        orderRecord.id,
        result.normalizedResponse.current_status,
        result.rawResponse,
      );

      for (const event of result.normalizedResponse.tracking_events) {
        await this.trackingRepository.create({
          orderRefId: orderRecord.id,
          status: event.status,
          statusTimestamp: event.status_timestamp,
          payloadRaw: event.raw_event,
        });
      }

      await this.interactionRepository.log({
        orderRefId: orderRecord.id,
        interactionType: CourierInteractionType.TRACK,
        requestRaw: result.rawRequest,
        responseRaw: result.rawResponse,
      });

      return result.normalizedResponse;
    } catch (err) {
      const audit = this.extractAuditFromError(err, { order_id: orderId });
      await this.interactionRepository.log({
        orderRefId: orderRecord.id,
        interactionType: CourierInteractionType.TRACK,
        requestRaw: audit.rawRequest,
        responseRaw: audit.rawResponse,
        errorPayload: audit.errorPayload,
      });
      throw err;
    }
  }

  private extractAuditFromError(
    err: unknown,
    fallback: Record<string, unknown>,
  ): {
    rawRequest: Record<string, unknown>;
    rawResponse: Record<string, unknown> | null;
    errorPayload: Record<string, unknown>;
  } {
    const isAppError = err instanceof AppError;
    const rawRequest = isAppError ? (err.audit?.raw_request ?? fallback) : fallback;
    const rawResponse = isAppError ? (err.audit?.raw_response ?? null) : null;

    const errorPayload: Record<string, unknown> = isAppError
      ? {
          code: err.code,
          message: err.message,
          status_code: err.statusCode,
          details: err.details ?? null,
        }
      : {
          message: err instanceof Error ? err.message : "Unknown failure",
          name: err instanceof Error ? err.name : "Unknown",
        };

    return { rawRequest, rawResponse, errorPayload };
  }
}
