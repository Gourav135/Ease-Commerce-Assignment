import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { AppError } from "./utils/appError";
import { errorMiddleware } from "./utils/errorMiddleware";
import { requestContext } from "./utils/requestContext";
import { orderRouter } from "./modules/orders/order.controller";

const { bulkOrderQueue } = require("./config");

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(requestContext);

  app.get("/", (_request, response) => {
    response.status(200).json({
      status: true,
      message: "Ease Commerce backend service is running",
    });
  });

  const bullBoardAdapter = new ExpressAdapter();
  bullBoardAdapter.setBasePath("/jobs");
  createBullBoard({
    queues: [new BullMQAdapter(bulkOrderQueue)],
    serverAdapter: bullBoardAdapter,
  });
  app.use("/jobs", bullBoardAdapter.getRouter());

  app.use("/api/v1", orderRouter);

  app.use((request, _response, next) => {
    next(
      new AppError(
        404,
        "NOT_FOUND",
        `Route not found: ${request.method} ${request.originalUrl}`,
      ),
    );
  });

  app.use(errorMiddleware);

  return app;
};
