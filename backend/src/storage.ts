import * as Minio from "minio";
import { config } from "./config";

const minioClient = new Minio.Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(config.minio.bucket);
  if (!exists) {
    await minioClient.makeBucket(config.minio.bucket);
    console.log(`Bucket '${config.minio.bucket}' created`);
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  await minioClient.putObject(config.minio.bucket, key, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  return minioClient.presignedGetObject(config.minio.bucket, key, 3600);
}

export async function getPresignedUploadUrl(key: string, mimeType: string): Promise<string> {
  return minioClient.presignedPutObject(config.minio.bucket, key, 3600);
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const stream = await minioClient.getObject(config.minio.bucket, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
