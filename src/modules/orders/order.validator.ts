import { AppError } from "../../utils/appError";

import {
  BulkCreateOrdersRequestDto,
  ContactAddress,
  CreateOrderRequestDto,
  OrderItem,
  PackageDimensions,
} from "./order.types";

const assertString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a non-empty string`);
  }
};

const assertNumber = (value: unknown, field: string) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a valid number`);
  }
};

const validateAddress = (value: unknown, field: string): ContactAddress => {
  if (!value || typeof value !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be an object`);
  }

  const address = value as Record<string, unknown>;

  assertString(address.name, `${field}.name`);
  assertString(address.email, `${field}.email`);
  assertString(address.mobile, `${field}.mobile`);
  assertString(address.addressLine, `${field}.addressLine`);
  assertString(address.city, `${field}.city`);
  assertString(address.state, `${field}.state`);
  assertString(address.country, `${field}.country`);
  assertString(address.pincode, `${field}.pincode`);
  assertString(address.addressType, `${field}.addressType`);

  return address as unknown as ContactAddress;
};

const validatePackageDimensions = (
  value: unknown,
  field: string,
): PackageDimensions => {
  if (!value || typeof value !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be an object`);
  }

  const dimensions = value as Record<string, unknown>;

  assertNumber(dimensions.length, `${field}.length`);
  assertNumber(dimensions.breadth, `${field}.breadth`);
  assertNumber(dimensions.height, `${field}.height`);
  assertNumber(dimensions.weight, `${field}.weight`);
  assertNumber(dimensions.pieces, `${field}.pieces`);

  return dimensions as unknown as PackageDimensions;
};

const validateItems = (items: unknown): OrderItem[] => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "items must be a non-empty array");
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      throw new AppError(400, "VALIDATION_ERROR", `items[${index}] must be an object`);
    }

    const typedItem = item as Record<string, unknown>;

    assertString(typedItem.description, `items[${index}].description`);
    assertNumber(typedItem.quantity, `items[${index}].quantity`);
    assertNumber(typedItem.declaredValue, `items[${index}].declaredValue`);

    if (typedItem.sku !== undefined) {
      assertString(typedItem.sku, `items[${index}].sku`);
    }

    if (typedItem.hsn !== undefined) {
      assertString(typedItem.hsn, `items[${index}].hsn`);
    }
  });

  return items as OrderItem[];
};

export const validateCreateOrderRequest = (
  payload: unknown,
): CreateOrderRequestDto => {
  if (!payload || typeof payload !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", "Request body must be an object");
  }

  const body = payload as Record<string, unknown>;

  assertString(body.order_id, "order_id");
  assertString(body.courier_partner, "courier_partner");
  assertString(body.payment_mode, "payment_mode");
  assertString(body.service_type, "service_type");
  assertString(body.invoice_number, "invoice_number");
  assertString(body.invoice_date, "invoice_date");
  assertNumber(body.invoice_value, "invoice_value");
  assertNumber(body.cod_amount, "cod_amount");
  validateAddress(body.pickup_address, "pickup_address");
  validateAddress(body.delivery_address, "delivery_address");

  if (body.return_address !== undefined) {
    validateAddress(body.return_address, "return_address");
  }

  validatePackageDimensions(body.package_dimensions, "package_dimensions");
  validateItems(body.items);

  return body as unknown as CreateOrderRequestDto;
};

export const validateBulkCreateOrdersRequest = (
  payload: unknown,
): BulkCreateOrdersRequestDto => {
  if (!payload || typeof payload !== "object") {
    throw new AppError(400, "VALIDATION_ERROR", "Request body must be an object");
  }

  const body = payload as Record<string, unknown>;

  if (!Array.isArray(body.orders) || body.orders.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "orders must be a non-empty array");
  }

  if (body.orders.length > 100) {
    throw new AppError(400, "VALIDATION_ERROR", "orders cannot exceed 100 items");
  }

  body.orders = body.orders.map((order) => validateCreateOrderRequest(order));

  return body as unknown as BulkCreateOrdersRequestDto;
};
