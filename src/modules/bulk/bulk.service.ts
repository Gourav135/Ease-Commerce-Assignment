import { randomUUID } from "crypto";

import { AppError } from "../../utils/appError";
import {
  BulkCreateOrdersRequestDto,
  BulkOrderBatchResponseDto,
  CreateOrderRequestDto,
} from "../orders/order.types";

import { BulkRepository } from "./bulk.repository";

const { bulkOrderQueue } = require("../../config");

export class BulkOrderService {
  constructor(private readonly bulkRepository = new BulkRepository()) {}

  async createBatch(request: BulkCreateOrdersRequestDto): Promise<BulkOrderBatchResponseDto> {
    if (request.orders.length > 100) {
      throw new AppError(400, "VALIDATION_ERROR", "orders cannot exceed 100 items");
    }

    const batchId = randomUUID();
    const batchRecord = await this.bulkRepository.createBatch(batchId, request.orders.length);

    await this.bulkRepository.createBatchItems(
      batchRecord.id,
      request.orders.map((order) => ({
        orderId: order.order_id,
        courierPartner: order.courier_partner,
      })),
    );

    for (const order of request.orders) {
      await this.enqueueOrder(batchId, order);
    }

    return {
      batch_id: batchId,
      status: "queued",
      total_count: request.orders.length,
    };
  }

  async getBatch(batchId: string) {
    const batch = await this.bulkRepository.findBatchByBatchId(batchId);

    if (!batch) {
      throw new AppError(404, "BATCH_NOT_FOUND", "Batch not found");
    }

    return batch;
  }

  private async enqueueOrder(batchId: string, order: CreateOrderRequestDto): Promise<void> {
    await bulkOrderQueue.add("process-order", {
      batchId,
      order,
    });
  }
}
