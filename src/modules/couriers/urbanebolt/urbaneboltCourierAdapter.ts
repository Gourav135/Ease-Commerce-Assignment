import { config } from "../../../config";
import { AppError } from "../../../utils/appError";
import {
  CancelOrderResponseDto,
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  OrderRecord,
  TrackOrderResponseDto,
  TrackingEventDto,
} from "../../orders/order.types";
import { BaseCourierAdapter } from "../base/baseCourierAdapter";
import {
  CancelOrderAdapterResult,
  CourierAdapter,
  CreateOrderAdapterResult,
  TrackOrderAdapterResult,
} from "../base/courier.types";

interface UrbaneBoltTokenResponse {
  token?: string;
  access?: string;
  access_token?: string;
}

export class UrbaneBoltCourierAdapter
  extends BaseCourierAdapter
  implements CourierAdapter
{
  readonly partnerCode = "urbanebolt";
  readonly courierId = config.urbanebolt.courierId;
  private authToken: string | null = null;

  async createOrder(order: CreateOrderRequestDto): Promise<CreateOrderAdapterResult> {
    await this.ensureAuthenticated();

    const payload = [this.transformCreateOrderRequest(order)];
    const rawRequest = payload[0];
    let rawResponse: Record<string, unknown> | null = null;

    try {
      rawResponse = await this.executeJsonRequest<Record<string, unknown>>(
        `${config.urbanebolt.baseUrl}${config.urbanebolt.manifestEndpoint}`,
        {
          method: "POST",
          headers: this.getAuthorizedHeaders(),
          body: JSON.stringify(payload),
        },
      );

      return {
        normalizedResponse: this.transformCreateOrderResponse(order, rawResponse),
        rawRequest,
        rawResponse,
      };
    } catch (err) {
      this.attachAuditContext(err, rawRequest, rawResponse);
      throw err;
    }
  }

  async trackOrder(orderRecord: OrderRecord): Promise<TrackOrderAdapterResult> {
    await this.ensureAuthenticated();

    if (!orderRecord.awb_number) {
      throw new AppError(400, "VALIDATION_ERROR", "Cannot track order without awb_number");
    }

    const url = new URL(`${config.urbanebolt.baseUrl}${config.urbanebolt.trackingEndpoint}`);
    url.searchParams.set("awb", orderRecord.awb_number);

    const rawRequest = { method: "GET", url: url.toString(), awb: orderRecord.awb_number };
    let rawResponse: Record<string, unknown> | null = null;

    try {
      rawResponse = await this.executeJsonRequest<Record<string, unknown>>(url, {
        method: "GET",
        headers: this.getAuthorizedHeaders(),
      });

      return {
        normalizedResponse: this.transformTrackOrderResponse(orderRecord, rawResponse),
        rawRequest,
        rawResponse,
      };
    } catch (err) {
      this.attachAuditContext(err, rawRequest, rawResponse);
      throw err;
    }
  }

  async cancelOrder(orderRecord: OrderRecord): Promise<CancelOrderAdapterResult> {
    await this.ensureAuthenticated();

    if (!orderRecord.awb_number) {
      throw new AppError(400, "VALIDATION_ERROR", "Cannot cancel order without awb_number");
    }

    const rawRequest = { awbs: orderRecord.awb_number };
    let rawResponse: Record<string, unknown> | null = null;

    try {
      rawResponse = await this.executeJsonRequest<Record<string, unknown>>(
        `${config.urbanebolt.baseUrl}${config.urbanebolt.cancelEndpoint}`,
        {
          method: "POST",
          headers: this.getAuthorizedHeaders(),
          body: JSON.stringify(rawRequest),
        },
      );

      return {
        normalizedResponse: this.transformCancelOrderResponse(orderRecord, rawResponse),
        rawRequest,
        rawResponse,
      };
    } catch (err) {
      this.attachAuditContext(err, rawRequest, rawResponse);
      throw err;
    }
  }

  protected async refreshAuthentication(): Promise<void> {
    this.authToken = null;
    await this.ensureAuthenticated();
  }

  protected getRetryConfig() {
    return config.urbanebolt.retries;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken) {
      return;
    }

    const parsed = await this.executeJsonRequestWithoutAuthRetry<UrbaneBoltTokenResponse>(
      `${config.urbanebolt.baseUrl}${config.urbanebolt.tokenEndpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: config.urbanebolt.username,
          password: config.urbanebolt.password,
        }),
      },
    );

    const token = parsed.access_token;

    if (!token) {
      throw new AppError(502, "COURIER_AUTH_FAILURE", "Failed to authenticate with UrbaneBolt", parsed);
    }

    this.authToken = token;
  }

  private getAuthorizedHeaders(): Record<string, string> {
    if (!this.authToken) {
      throw new AppError(500, "INTERNAL_ERROR", "Courier token is not available");
    }

    return {
      Authorization: `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };
  }

  private transformCreateOrderRequest(order: CreateOrderRequestDto): Record<string, unknown> {
    const primaryItem = order.items[0];
    const returnAddress = order.return_address || order.pickup_address;

    return {
      customerCode: config.urbanebolt.customerCode,
      orderNumber: order.order_id,
      declaredValue: primaryItem.declaredValue,
      itemDescription: primaryItem.description,
      collectableValue: order.cod_amount,
      height: order.package_dimensions.height,
      length: order.package_dimensions.length,
      pieces: order.package_dimensions.pieces,
      weight: order.package_dimensions.weight,
      breadth: order.package_dimensions.breadth,
      serviceType: order.service_type,
      payMode: order.payment_mode,
      rtnCity: returnAddress.city,
      rtnName: returnAddress.name,
      consCity: order.delivery_address.city,
      consName: order.delivery_address.name,
      rtnEmail: returnAddress.email,
      rtnState: returnAddress.state,
      shprCity: order.pickup_address.city,
      shprName: order.pickup_address.name,
      consEmail: order.delivery_address.email,
      consState: order.delivery_address.state,
      rtnMobile: Number(returnAddress.mobile),
      shprEmail: order.pickup_address.email,
      shprState: order.pickup_address.state,
      consMobile: Number(order.delivery_address.mobile),
      rtnAddress: returnAddress.addressLine,
      rtnAddressType: returnAddress.addressType,
      rtnCountry: returnAddress.country,
      rtnPincode: Number(returnAddress.pincode),
      shprMobile: Number(order.pickup_address.mobile),
      consAddress: order.delivery_address.addressLine,
      consAddressType: order.delivery_address.addressType,
      consCountry: order.delivery_address.country,
      consPincode: Number(order.delivery_address.pincode),
      invoiceNumber: order.invoice_number,
      invoiceDate: order.invoice_date,
      shprAddress: order.pickup_address.addressLine,
      shprAddressType: order.pickup_address.addressType,
      shprCountry: order.pickup_address.country,
      shprPincode: Number(order.pickup_address.pincode),
      invoiceValue: order.invoice_value,
      itemQuantity: primaryItem.quantity,
      itemSku: primaryItem.sku,
      itemHsn: primaryItem.hsn,
    };
  }

  private transformCreateOrderResponse(
    order: CreateOrderRequestDto,
    rawResponse: Record<string, unknown>,
  ): CreateOrderResponseDto {
    const successItems = Array.isArray(rawResponse.successResponse)
      ? (rawResponse.successResponse as Record<string, unknown>[])
      : [];
    const errorItems = Array.isArray(rawResponse.errorResponse)
      ? (rawResponse.errorResponse as Record<string, unknown>[])
      : [];

    if (successItems.length === 0 && errorItems.length > 0) {
      throw new AppError(
        422,
        "COURIER_BUSINESS_ERROR",
        "Courier rejected the order",
        { errorResponse: errorItems, orderNumber: order.order_id },
      );
    }

    const item: Record<string, unknown> =
      successItems[0] || errorItems[0] || rawResponse;

    const awbNumber = this.pickFirstDefinedScalar(item, [
      "awb",
      "awbNumber",
      "awb_number",
    ]);
    const courierOrderId = this.pickFirstDefinedScalar(item, [
      "orderNumber",
      "order_number",
      "courierOrderId",
      "courier_order_id",
    ]);
    const message =
      this.pickFirstDefinedString(item, ["message", "detail"]) || "Order created";
    const status =
      this.pickFirstDefinedString(item, ["status", "current_status"]) || "created";

    return {
      order_id: order.order_id,
      courier_partner: order.courier_partner,
      courier_order_id: courierOrderId ?? order.order_id,
      awb_number: awbNumber,
      status,
      message,
    };
  }

  private transformTrackOrderResponse(
    orderRecord: OrderRecord,
    rawResponse: Record<string, unknown>,
  ): TrackOrderResponseDto {
    const eventsSource = this.extractArray(rawResponse);
    const trackingEvents: TrackingEventDto[] = eventsSource.map((event) => {
      const typedEvent = event as Record<string, unknown>;
      const status =
        this.pickFirstDefinedString(typedEvent, ["status", "shipment_status", "scan"]) ||
        "unknown";
      const statusTimestamp =
        this.pickFirstDefinedString(typedEvent, ["status_timestamp", "datetime", "date"]) ||
        new Date().toISOString();

      return {
        status,
        status_timestamp: statusTimestamp,
        location: this.pickFirstDefinedString(typedEvent, ["location", "city"]) || undefined,
        remarks: this.pickFirstDefinedString(typedEvent, ["remarks", "comment"]) || undefined,
        raw_event: typedEvent,
      };
    });

    return {
      order_id: orderRecord.order_id,
      courier_partner: this.partnerCode,
      awb_number: orderRecord.awb_number,
      current_status:
        trackingEvents[0]?.status ||
        this.pickFirstDefinedString(rawResponse, ["status", "current_status"]) ||
        orderRecord.current_status,
      tracking_events: trackingEvents,
    };
  }

  private transformCancelOrderResponse(
    orderRecord: OrderRecord,
    rawResponse: Record<string, unknown>,
  ): CancelOrderResponseDto {
    return {
      order_id: orderRecord.order_id,
      courier_partner: this.partnerCode,
      awb_number: orderRecord.awb_number,
      status: this.pickFirstDefinedString(rawResponse, ["status"]) || "cancelled",
      message: this.pickFirstDefinedString(rawResponse, ["message", "detail"]) || "Order cancelled",
    };
  }

  private pickFirstDefinedString(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  }

  private pickFirstDefinedScalar(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }

    return null;
  }

  private extractArray(rawResponse: Record<string, unknown>): unknown[] {
    if (Array.isArray(rawResponse)) {
      return rawResponse;
    }

    const keys = ["data", "results", "tracking", "history", "events"];

    for (const key of keys) {
      const value = rawResponse[key];

      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }
}
