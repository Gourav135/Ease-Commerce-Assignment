import { CreateOrderRequestDto } from "../orders/order.types";

export interface BulkOrderJobData {
  batchId: string;
  order: CreateOrderRequestDto;
}
