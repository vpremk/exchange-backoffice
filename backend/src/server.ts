import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { ensureBucket } from "./storage";
import { validateDocument } from "./services/validation";
import authRoutes from "./routes/auth";
import documentRoutes from "./routes/documents";
import metricsRoutes from "./routes/metrics";

const app = express();

app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:3000"], credentials: true }));
app.use(express.json());
app.use(morgan("short"));

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Test-only endpoint for validation rule testing (no auth required)
app.post("/api/validate-test", (req, res) => {
  const { docType, fields } = req.body;
  const errors = validateDocument(docType, fields);
  res.json(errors);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/metrics", metricsRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await ensureBucket();
    console.log("[server] MinIO bucket ready");
  } catch (e) {
    console.warn("[server] MinIO not available, uploads will fail:", (e as Error).message);
  }

  app.listen(config.port, () => {
    console.log(`[server] Exchange Back-Office API running on http://localhost:${config.port}`);
  });
}

start();
