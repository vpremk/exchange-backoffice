import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { config } from "./config";

const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });

export const documentQueue = new Queue("document-pipeline", { connection });

export function createWorker(
  name: string,
  processor: (job: Job) => Promise<void>,
) {
  return new Worker("document-pipeline", processor, {
    connection: new IORedis(config.redis.url, { maxRetriesPerRequest: null }),
    concurrency: 3,
  });
}

export type PipelineJobData = {
  documentId: string;
  step: "ocr" | "extract" | "validate";
};
