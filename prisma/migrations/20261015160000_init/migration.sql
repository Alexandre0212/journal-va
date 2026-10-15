-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENTURE_ARCHITECT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'doing', 'blocked', 'done');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('minor', 'major', 'blocking');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "MgmtStatus" AS ENUM ('todo', 'doing', 'done');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "phase" INTEGER NOT NULL,
    "coursesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "anomaliesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectParticipant" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectParticipant_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "ProjectNote" (
    "projectId" TEXT NOT NULL,
    "hot" TEXT,
    "sofar" TEXT,
    "keep" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectNote_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "Okr" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "due" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Okr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "okrId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("okrId","id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "okrId" TEXT,
    "assigneeId" TEXT,
    "due" TEXT,
    "date" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" TEXT,
    "blocker" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "doneAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "byId" TEXT,

    CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "target" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiValue" (
    "kpiId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "KpiValue_pkey" PRIMARY KEY ("kpiId","date")
);

-- CreateTable
CREATE TABLE "Info" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT,
    "channel" TEXT NOT NULL,
    "projectId" TEXT,
    "byId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "fromPlace" TEXT,
    "toPlace" TEXT,
    "km" DOUBLE PRECISION,
    "app" DOUBLE PRECISION,
    "yango" DOUBLE PRECISION,
    "liv" DOUBLE PRECISION,
    "driver" TEXT,
    "note" TEXT,
    "byId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "status" "AnomalyStatus" NOT NULL DEFAULT 'open',
    "byId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyFile" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "mimeType" TEXT,
    "storagePath" TEXT,
    "unavailable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnomalyFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MgmtItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "MgmtStatus" NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "byId" TEXT,

    CONSTRAINT "MgmtItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT,
    "participants" TEXT[],
    "cr" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingProject" (
    "meetingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "MeetingProject_pkey" PRIMARY KEY ("meetingId","projectId")
);

-- CreateTable
CREATE TABLE "MeetingAction" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "taskId" TEXT,

    CONSTRAINT "MeetingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "imported" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT,
    "before" TEXT,
    "after" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Okr_projectId_phase_idx" ON "Okr"("projectId", "phase");

-- CreateIndex
CREATE INDEX "Okr_deletedAt_idx" ON "Okr"("deletedAt");

-- CreateIndex
CREATE INDEX "Task_projectId_phase_status_idx" ON "Task"("projectId", "phase", "status");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex
CREATE INDEX "Task_date_idx" ON "Task"("date");

-- CreateIndex
CREATE INDEX "TaskHistory_taskId_at_idx" ON "TaskHistory"("taskId", "at");

-- CreateIndex
CREATE INDEX "Kpi_projectId_idx" ON "Kpi"("projectId");

-- CreateIndex
CREATE INDEX "Kpi_deletedAt_idx" ON "Kpi"("deletedAt");

-- CreateIndex
CREATE INDEX "Info_projectId_date_idx" ON "Info"("projectId", "date");

-- CreateIndex
CREATE INDEX "Info_deletedAt_idx" ON "Info"("deletedAt");

-- CreateIndex
CREATE INDEX "Course_projectId_date_idx" ON "Course"("projectId", "date");

-- CreateIndex
CREATE INDEX "Course_deletedAt_idx" ON "Course"("deletedAt");

-- CreateIndex
CREATE INDEX "Anomaly_projectId_status_idx" ON "Anomaly"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyFile_anomalyId_key" ON "AnomalyFile"("anomalyId");

-- CreateIndex
CREATE INDEX "MgmtItem_date_idx" ON "MgmtItem"("date");

-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "Meeting"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Summary_date_key" ON "Summary"("date");

-- CreateIndex
CREATE INDEX "ActivityLog_entity_entityId_idx" ON "ActivityLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_at_idx" ON "ActivityLog"("at");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectParticipant" ADD CONSTRAINT "ProjectParticipant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectParticipant" ADD CONSTRAINT "ProjectParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Okr" ADD CONSTRAINT "Okr_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "Okr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "Okr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiValue" ADD CONSTRAINT "KpiValue_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Info" ADD CONSTRAINT "Info_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Info" ADD CONSTRAINT "Info_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFile" ADD CONSTRAINT "AnomalyFile_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "Anomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MgmtItem" ADD CONSTRAINT "MgmtItem_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingProject" ADD CONSTRAINT "MeetingProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAction" ADD CONSTRAINT "MeetingAction_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
