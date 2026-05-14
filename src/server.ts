import { createApp } from "./app";
import { config } from "./config";
import { startWorker } from "./worker";

const app = createApp();

app.listen(config.port, () => {
  console.log(`API server listening on port ${config.port}`);
  startWorker();
  console.log("Bulk worker started in-process");
});
