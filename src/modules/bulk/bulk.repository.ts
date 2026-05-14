import { Prisma, PrismaClient, bulk_batches } from "@prisma/client";

const { prisma }: { prisma: PrismaClient } = require("../../config");

export type BatchRecord = bulk_batches;

export class BulkRepository {
  async createBatch(batchId: string, totalCount: number): Promise<bulk_batches> {
    return prisma.bulk_batches.create({
      data: {
        batch_id: batchId,
        status: "queued",
        total_count: totalCount,
      },
    });
  }

  async createBatchItems(
    batchRefId: number,
    items: Array<{ orderId: string; courierPartner: string }>,
  ): Promise<void> {
    await prisma.bulk_batch_items.createMany({
      data: items.map((item) => ({
        batch_ref_id: batchRefId,
        order_id: item.orderId,
        courier_partner: item.courierPartner,
        status: "queued",
      })),
    });
  }

  async markItemSuccess(
    batchId: string,
    orderId: string,
    resultPayload: Record<string, unknown>,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.bulk_batches.findUnique({
        where: { batch_id: batchId },
        select: { id: true },
      });

      if (!batch) {
        return;
      }

      await tx.bulk_batch_items.update({
        where: {
          batch_ref_id_order_id: { batch_ref_id: batch.id, order_id: orderId },
        },
        data: {
          status: "success",
          result_payload: resultPayload as Prisma.InputJsonValue,
        },
      });

      await tx.bulk_batches.update({
        where: { id: batch.id },
        data: {
          success_count: { increment: 1 },
          status: "processing",
        },
      });
    });
  }

  async markItemFailure(
    batchId: string,
    orderId: string,
    errorPayload: Record<string, unknown>,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.bulk_batches.findUnique({
        where: { batch_id: batchId },
        select: { id: true },
      });

      if (!batch) {
        return;
      }

      await tx.bulk_batch_items.update({
        where: {
          batch_ref_id_order_id: { batch_ref_id: batch.id, order_id: orderId },
        },
        data: {
          status: "failed",
          error_payload: errorPayload as Prisma.InputJsonValue,
        },
      });

      await tx.bulk_batches.update({
        where: { id: batch.id },
        data: {
          failure_count: { increment: 1 },
          status: "processing",
        },
      });
    });
  }

  async refreshBatchStatus(batchId: string): Promise<void> {
    const batch = await prisma.bulk_batches.findUnique({
      where: { batch_id: batchId },
    });

    if (!batch) {
      return;
    }

    const processedCount = batch.success_count + batch.failure_count;
    const nextStatus = processedCount >= batch.total_count ? "completed" : "processing";

    await prisma.bulk_batches.update({
      where: { batch_id: batchId },
      data: { status: nextStatus },
    });
  }

  async findBatchByBatchId(batchId: string): Promise<bulk_batches | null> {
    return prisma.bulk_batches.findUnique({ where: { batch_id: batchId } });
  }
}
