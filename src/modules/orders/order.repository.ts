import { Prisma, PrismaClient, orders } from "@prisma/client";

const { prisma }: { prisma: PrismaClient } = require("../../config");

interface CreatePendingInput {
  orderId: string;
  courierId: number;
  requestPayloadRaw: Record<string, unknown>;
}

interface MarkCreatedInput {
  id: number;
  courierOrderId: string | null;
  awbNumber: string | null;
  currentStatus: string;
  requestPayloadRaw: Record<string, unknown>;
  responsePayloadRaw: Record<string, unknown>;
}

export class OrderRepository {
  async findByOrderIdAndCourier(orderId: string, courierId: number): Promise<orders | null> {
    return prisma.orders.findUnique({
      where: { order_id_courier_id: { order_id: orderId, courier_id: courierId } },
    });
  }

  async findLatestByOrderId(orderId: string): Promise<orders | null> {
    return prisma.orders.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: "desc" },
    });
  }

  async createPending(input: CreatePendingInput): Promise<orders> {
    return prisma.orders.create({
      data: {
        order_id: input.orderId,
        courier_id: input.courierId,
        current_status: "PENDING",
        request_payload_raw: input.requestPayloadRaw as Prisma.InputJsonValue,
      },
    });
  }

  async markCreated(input: MarkCreatedInput): Promise<orders> {
    return prisma.orders.update({
      where: { id: input.id },
      data: {
        courier_order_id: input.courierOrderId,
        awb_number: input.awbNumber,
        current_status: input.currentStatus,
        request_payload_raw: input.requestPayloadRaw as Prisma.InputJsonValue,
        response_payload_raw: input.responsePayloadRaw as Prisma.InputJsonValue,
      },
    });
  }

  async markFailed(id: number, requestPayloadRaw: Record<string, unknown>): Promise<orders> {
    return prisma.orders.update({
      where: { id },
      data: {
        current_status: "FAILED",
        request_payload_raw: requestPayloadRaw as Prisma.InputJsonValue,
      },
    });
  }

  async updateStatusAndTracking(
    id: number,
    currentStatus: string,
    latestTrackingPayloadRaw: Record<string, unknown>,
  ): Promise<void> {
    await prisma.orders.update({
      where: { id },
      data: {
        current_status: currentStatus,
        latest_tracking_payload_raw: latestTrackingPayloadRaw as Prisma.InputJsonValue,
      },
    });
  }

  async updateCancellation(
    id: number,
    currentStatus: string,
    responsePayloadRaw: Record<string, unknown>,
  ): Promise<void> {
    await prisma.orders.update({
      where: { id },
      data: {
        current_status: currentStatus,
        response_payload_raw: responsePayloadRaw as Prisma.InputJsonValue,
      },
    });
  }
}
