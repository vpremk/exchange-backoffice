import { Router } from "express";
import { prisma } from "../db";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.use(authorize("SUPERVISOR", "VALIDATOR"));

/**
 * GET /api/metrics/overview
 * Dashboard summary: counts by status, SLA risk, recent activity.
 */
router.get("/overview", async (req, res) => {
  const [statusCounts, docTypeCounts, slaAtRisk, recentReviews, totalDocs] = await Promise.all([
    prisma.document.groupBy({ by: ["status"], _count: true }),
    prisma.document.groupBy({ by: ["docType"], _count: true }),
    prisma.document.count({
      where: {
        status: "PENDING_REVIEW",
        slaDeadline: { lte: new Date(Date.now() + 60 * 60 * 1000) }, // within 1 hour
      },
    }),
    prisma.review.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: { select: { name: true } },
        document: { select: { fileName: true, docType: true } },
      },
    }),
    prisma.document.count(),
  ]);

  res.json({
    totalDocuments: totalDocs,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    docTypeCounts: Object.fromEntries(docTypeCounts.map((d) => [d.docType, d._count])),
    slaAtRisk,
    recentReviews,
  });
});

/**
 * GET /api/metrics/validator-productivity
 * Reviews per validator in the last 7 days.
 */
router.get("/validator-productivity", async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const productivity = await prisma.review.groupBy({
    by: ["reviewerId"],
    where: { createdAt: { gte: since } },
    _count: true,
  });

  // Enrich with user names
  const userIds = productivity.map((p) => p.reviewerId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const result = productivity.map((p) => ({
    reviewerId: p.reviewerId,
    reviewerName: nameMap[p.reviewerId] || "Unknown",
    reviewCount: p._count,
  }));

  res.json(result);
});

/**
 * GET /api/metrics/error-reasons
 * Top error reasons for failed documents.
 */
router.get("/error-reasons", async (req, res) => {
  const errors = await prisma.document.findMany({
    where: { status: "ERROR", errorReason: { not: null } },
    select: { errorReason: true },
  });

  const counts: Record<string, number> = {};
  for (const e of errors) {
    const reason = e.errorReason || "Unknown";
    counts[reason] = (counts[reason] || 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));

  res.json(sorted);
});

/**
 * GET /api/metrics/sla-performance
 * SLA adherence: how many docs were reviewed before deadline.
 */
router.get("/sla-performance", async (req, res) => {
  const reviewed = await prisma.document.findMany({
    where: { status: { in: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"] }, slaDeadline: { not: null } },
    select: { slaDeadline: true, updatedAt: true, docType: true },
  });

  let metSla = 0;
  let missedSla = 0;
  const byType: Record<string, { met: number; missed: number }> = {};

  for (const doc of reviewed) {
    const met = doc.slaDeadline! >= doc.updatedAt;
    if (met) metSla++;
    else missedSla++;

    if (!byType[doc.docType]) byType[doc.docType] = { met: 0, missed: 0 };
    if (met) byType[doc.docType].met++;
    else byType[doc.docType].missed++;
  }

  res.json({
    total: reviewed.length,
    metSla,
    missedSla,
    adherenceRate: reviewed.length > 0 ? metSla / reviewed.length : 0,
    byType,
  });
});

/**
 * GET /api/metrics/audit-log
 * Recent audit entries.
 */
router.get("/audit-log", authorize("SUPERVISOR"), async (req, res) => {
  const { page = "1", limit = "50", documentId } = req.query;
  const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
  const take = parseInt(limit as string, 10);

  const where: Record<string, unknown> = {};
  if (documentId) where.documentId = documentId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ data: logs, total, page: parseInt(page as string, 10), limit: take });
});

export default router;
