import { Job, Worker } from "bullmq";

const { BULK_ORDER_QUEUE, BULK_ORDER_CONCURRENCY, queueConnection } = require("./config");
import { AppError } from "./utils/appError";
import { BulkRepository } from "./modules/bulk/bulk.repository";
import { BulkOrderJobData } from "./modules/bulk/bulk.types";
import { OrderService } from "./modules/orders/order.service";

export const startWorker = (): Worker<BulkOrderJobData> => {
  const orderService = new OrderService();
  const bulkRepository = new BulkRepository();

  const worker = new Worker<BulkOrderJobData>(
    BULK_ORDER_QUEUE,
    async (job: Job<BulkOrderJobData>) => {
      try {
        const result = await orderService.createOrder(job.data.order);
        await bulkRepository.markItemSuccess(
          job.data.batchId,
          job.data.order.order_id,
          result as unknown as Record<string, unknown>,
        );
      } catch (error) {
        const normalizedError =
          error instanceof AppError
            ? {
                message: error.message,
                name: "AppError",
                code: error.code,
                statusCode: error.statusCode,
                details: error.details,
              }
            : error instanceof Error
              ? { message: error.message, name: error.name }
              : { message: "Unknown worker failure" };

        await bulkRepository.markItemFailure(
          job.data.batchId,
          job.data.order.order_id,
          normalizedError,
        );
      } finally {
        await bulkRepository.refreshBatchStatus(job.data.batchId);
      }
    },
    {
      connection: queueConnection,
      concurrency: BULK_ORDER_CONCURRENCY,
    },
  );

  worker.on("ready", () => {
    console.log(`Bulk order worker is ready. Queue: ${BULK_ORDER_QUEUE}`);
  });

  worker.on("failed", (job, error) => {
    console.error("Bulk order job failed", { jobId: job?.id, error });
  });

  return worker;
};
