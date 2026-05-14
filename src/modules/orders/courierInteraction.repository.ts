import { CourierInteractionType, Prisma, PrismaClient } from "@prisma/client";

const { prisma }: { prisma: PrismaClient } = require("../../config");

export interface LogInteractionInput {
  orderRefId: number;
  interactionType: CourierInteractionType;
  httpStatus?: number | null;
  requestRaw: Record<string, unknown>;
  responseRaw?: Record<string, unknown> | null;
  errorPayload?: Record<string, unknown> | null;
  attempt?: number;
}

export class CourierInteractionRepository {
  async log(input: LogInteractionInput): Promise<void> {
    await prisma.courier_interactions.create({
      data: {
        order_ref_id: input.orderRefId,
        interaction_type: input.interactionType,
        http_status: input.httpStatus ?? null,
        request_raw: input.requestRaw as Prisma.InputJsonValue,
        response_raw:
          (input.responseRaw as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        error_payload:
          (input.errorPayload as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        attempt: input.attempt ?? 1,
      },
    });
  }
}
