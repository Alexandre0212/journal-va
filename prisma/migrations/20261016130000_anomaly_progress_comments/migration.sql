ALTER TYPE "AnomalyStatus" ADD VALUE 'progress';

ALTER TABLE "Anomaly" ADD COLUMN "assigneeId" TEXT;

ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Anomaly_assigneeId_idx" ON "Anomaly"("assigneeId");

CREATE TABLE "AnomalyComment" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnomalyComment_anomalyId_createdAt_idx" ON "AnomalyComment"("anomalyId", "createdAt");

ALTER TABLE "AnomalyComment" ADD CONSTRAINT "AnomalyComment_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "Anomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnomalyComment" ADD CONSTRAINT "AnomalyComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
