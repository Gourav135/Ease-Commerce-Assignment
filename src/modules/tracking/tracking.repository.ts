import { Prisma, PrismaClient } from "@prisma/client";

const { prisma }: { prisma: PrismaClient } = require("../../config");

export class TrackingRepository {
  async create(input: {
    orderRefId: number;
    status: string;
    statusTimestamp: string;
    payloadRaw: Record<string, unknown>;
  }): Promise<void> {
    await prisma.tracking_history.create({
      data: {
        order_ref_id: input.orderRefId,
        status: input.status,
        status_timestamp: new Date(input.statusTimestamp),
        payload_raw: input.payloadRaw as Prisma.InputJsonValue,
      },
    });
  }
}
