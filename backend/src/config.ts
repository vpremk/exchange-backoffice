import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL!,
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET || "documents",
    useSSL: process.env.MINIO_USE_SSL === "true",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    expiresIn: "8h",
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  slaHours: {
    TRADE_CONFIRMATION: 2,
    SETTLEMENT_INSTRUCTION: 4,
    KYC_DOCUMENT: 24,
    REGULATORY_FILING: 1,
    UNKNOWN: 4,
  } as Record<string, number>,
};
