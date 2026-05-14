import {
  CancelOrderResponseDto,
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  OrderRecord,
  TrackOrderResponseDto,
} from "../../orders/order.types";

export interface CreateOrderAdapterResult {
  normalizedResponse: CreateOrderResponseDto;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
}

export interface TrackOrderAdapterResult {
  normalizedResponse: TrackOrderResponseDto;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
}

export interface CancelOrderAdapterResult {
  normalizedResponse: CancelOrderResponseDto;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
}

export interface CourierAdapter {
  readonly partnerCode: string;
  readonly courierId: number;
  createOrder(order: CreateOrderRequestDto): Promise<CreateOrderAdapterResult>;
  trackOrder(orderRecord: OrderRecord): Promise<TrackOrderAdapterResult>;
  cancelOrder(orderRecord: OrderRecord): Promise<CancelOrderAdapterResult>;
}
