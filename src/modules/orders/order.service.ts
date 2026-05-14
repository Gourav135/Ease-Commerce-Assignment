import { CourierInteractionType } from "@prisma/client";

import { AppError } from "../../utils/appError";
import { CourierRegistry } from "../couriers/courierRegistry";

import { CourierInteractionRepository } from "./courierInteraction.repository";
import {
  CancelOrderResponseDto,
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  OrderRecord,
} from "./order.types";
import { OrderRepository } from "./order.repository";

interface AuditContext {
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown> | null;
  errorPayload: Record<string, unknown>;
}

const FINAL_OR_ACTIVE_STATUSES = new Set([
  "CREATED",
  "created",
  "IN_TRANSIT",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export class OrderService {
  constructor(
    private readonly courierRegistry = new CourierRegistry(),
    private readonly orderRepository = new OrderRepository(),
    private readonly interactionRepository = new CourierInteractionRepository(),
  ) {}

  async createOrder(order: CreateOrderRequestDto): Promise<CreateOrderResponseDto> {
    const adapter = this.courierRegistry.getAdapter(order.courier_partner);
    const existing = await this.orderRepository.findByOrderIdAndCourier(
      order.order_id,
      adapter.courierId,
    );

    if (existing && FINAL_OR_ACTIVE_STATUSES.has(existing.current_status)) {
      return this.toCreateResponse(existing, adapter.partnerCode, "Order already exists. Returning idempotent response.");
    }

    const ordersRow =
      existing ??
      (await this.orderRepository.createPending({
        orderId: order.order_id,
        courierId: adapter.courierId,
        requestPayloadRaw: {},
      }));

    try {
      const result = await adapter.createOrder(order);

      const updated = await this.orderRepository.markCreated({
        id: ordersRow.id,
        courierOrderId: result.normalizedResponse.courier_order_id,
        awbNumber: result.normalizedResponse.awb_number,
        currentStatus: result.normalizedResponse.status,
        requestPayloadRaw: result.rawRequest,
        responsePayloadRaw: result.rawResponse,
      });

      await this.interactionRepository.log({
        orderRefId: updated.id,
        interactionType: CourierInteractionType.CREATE,
        requestRaw: result.rawRequest,
        responseRaw: result.rawResponse,
      });

      return result.normalizedResponse;
    } catch (err) {
      const audit = this.extractAuditFromError(err, { order_id: order.order_id });
      await this.orderRepository.markFailed(ordersRow.id, audit.rawRequest);
      await this.interactionRepository.log({
        orderRefId: ordersRow.id,
        interactionType: CourierInteractionType.CREATE,
        requestRaw: audit.rawRequest,
        responseRaw: audit.rawResponse,
        errorPayload: audit.errorPayload,
      });
      throw err;
    }
  }

  async cancelOrder(orderId: string): Promise<CancelOrderResponseDto> {
    const orderRecord = await this.getOrderOrThrow(orderId);
    const adapter = this.courierRegistry.getAdapterByCourierId(orderRecord.courier_id);

    try {
      const result = await adapter.cancelOrder(orderRecord);

      await this.orderRepository.updateCancellation(
        orderRecord.id,
        result.normalizedResponse.status,
        result.rawResponse,
      );

      await this.interactionRepository.log({
        orderRefId: orderRecord.id,
        interactionType: CourierInteractionType.CANCEL,
        requestRaw: result.rawRequest,
        responseRaw: result.rawResponse,
      });

      return result.normalizedResponse;
    } catch (err) {
      const audit = this.extractAuditFromError(err, { order_id: orderId });
      await this.interactionRepository.log({
        orderRefId: orderRecord.id,
        interactionType: CourierInteractionType.CANCEL,
        requestRaw: audit.rawRequest,
        responseRaw: audit.rawResponse,
        errorPayload: audit.errorPayload,
      });
      throw err;
    }
  }

  async getOrderOrThrow(orderId: string): Promise<OrderRecord> {
    const orderRecord = await this.orderRepository.findLatestByOrderId(orderId);

    if (!orderRecord) {
      throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    return orderRecord;
  }

  private toCreateResponse(
    orderRecord: OrderRecord,
    partnerCode: string,
    message: string,
  ): CreateOrderResponseDto {
    return {
      order_id: orderRecord.order_id,
      courier_partner: partnerCode,
      courier_order_id: orderRecord.courier_order_id,
      awb_number: orderRecord.awb_number,
      status: orderRecord.current_status,
      message,
    };
  }

  private extractAuditFromError(err: unknown, fallback: Record<string, unknown>): AuditContext {
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
