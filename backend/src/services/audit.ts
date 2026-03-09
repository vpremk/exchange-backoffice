import { prisma } from "../db";

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string;
  documentId?: string;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue as any,
      newValue: params.newValue as any,
      userId: params.userId,
      documentId: params.documentId,
      ipAddress: params.ipAddress,
    },
  });
}
