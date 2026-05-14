import type { orders } from "@prisma/client";

export type CourierPartner = "urbanebolt";

export type OrderRecord = orders;

export interface ContactAddress {
  name: string;
  email: string;
  mobile: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  addressType: string;
}

export interface PackageDimensions {
  length: number;
  breadth: number;
  height: number;
  weight: number;
  pieces: number;
}

export interface OrderItem {
  sku?: string;
  hsn?: string;
  description: string;
  quantity: number;
  declaredValue: number;
}

export interface CreateOrderRequestDto {
  order_id: string;
  courier_partner: CourierPartner;
  payment_mode: "COD" | "PPD";
  cod_amount: number;
  service_type: string;
  invoice_number: string;
  invoice_date: string;
  invoice_value: number;
  pickup_address: ContactAddress;
  return_address?: ContactAddress;
  delivery_address: ContactAddress;
  package_dimensions: PackageDimensions;
  items: OrderItem[];
}

export interface CreateOrderResponseDto {
  order_id: string;
  courier_partner: string;
  courier_order_id: string | null;
  awb_number: string | null;
  status: string;
  message: string;
}

export interface TrackingEventDto {
  status: string;
  status_timestamp: string;
  location?: string;
  remarks?: string;
  raw_event: Record<string, unknown>;
}

export interface TrackOrderResponseDto {
  order_id: string;
  courier_partner: string;
  awb_number: string | null;
  current_status: string;
  tracking_events: TrackingEventDto[];
}

export interface CancelOrderResponseDto {
  order_id: string;
  courier_partner: string;
  awb_number: string | null;
  status: string;
  message: string;
}

export interface BulkCreateOrdersRequestDto {
  orders: CreateOrderRequestDto[];
}

export interface BulkOrderBatchResponseDto {
  batch_id: string;
  status: string;
  total_count: number;
}

