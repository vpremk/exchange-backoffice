import { createWorker } from "../queue";
import { processPipelineJob } from "./pipeline";

console.log("[worker] Starting document pipeline worker...");

const worker = createWorker("document-pipeline", processPipelineJob);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} (${job.name}) completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  await worker.close();
  process.exit(0);
});
