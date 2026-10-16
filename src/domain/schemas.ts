import { z } from "zod";

export const phaseSchema = z.number().int().min(0).max(6);
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const statusSchema = z.enum(["todo", "doing", "blocked", "done"]);
export const prioritySchema = z.enum(["low", "normal", "high"]).nullable();

export const taskWriteSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  projectId: z.string().min(1),
  phase: phaseSchema,
  okrId: z.string().min(1).nullable(),
  assigneeId: z.string().min(1).nullable(),
  due: daySchema.nullable(),
  date: daySchema.nullable(),
  status: statusSchema,
  priority: prioritySchema,
  blocker: z.string().trim().max(600).nullable(),
});

export const okrWriteSchema = z.object({
  id: z.string().min(1).optional(),
  projectId: z.string().min(1),
  phase: phaseSchema,
  title: z.string().trim().min(1).max(160),
  due: daySchema.nullable(),
  keyResults: z.array(z.object({
    id: z.string().min(1),
    label: z.string().trim().min(1).max(240),
    target: z.number().finite(),
    current: z.number().finite(),
    unit: z.string().max(40),
  })).min(0),
});

export const kpiWriteSchema = z.object({
  id: z.string().min(1).optional(),
  projectId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  unit: z.string().max(30),
  target: z.number().finite().nullable(),
});

export const kpiValueSchema = z.object({
  kpiId: z.string().min(1),
  date: daySchema,
  value: z.number().finite().nullable(),
});

export const infoWriteSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  source: z.string().trim().max(120).nullable(),
  channel: z.enum(["WhatsApp", "Appel", "Email", "SMS", "Teams (chat)", "En personne", "Autre"]),
  projectId: z.string().min(1),
  date: daySchema,
});

export const courseWriteSchema = z.object({
  projectId: z.string().min(1),
  date: daySchema,
  fromPlace: z.string().trim().max(80).nullable(),
  toPlace: z.string().trim().max(80).nullable(),
  km: z.number().finite().min(0).nullable(),
  app: z.number().finite().min(0).nullable(),
  yango: z.number().finite().min(0).nullable(),
  liv: z.number().finite().min(0).nullable(),
  driver: z.string().trim().max(60).nullable(),
  note: z.string().trim().max(200).nullable(),
}).refine((value) => value.app != null || value.yango != null || value.liv != null, {
  message: "Renseignez au moins un prix.",
});

export const anomalyWriteSchema = z.object({
  projectId: z.string().min(1),
  date: daySchema,
  text: z.string().trim().min(1).max(300),
  severity: z.enum(["minor", "major", "blocking"]),
});

export const anomalyStatusSchema = z.enum(["open", "progress", "resolved"]);

export const anomalyUpdateSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  text: z.string().trim().min(1).max(300),
  severity: z.enum(["minor", "major", "blocking"]),
  status: anomalyStatusSchema,
  assigneeId: z.string().min(1).nullable(),
  fileAction: z.enum(["keep", "remove", "replace"]),
});

export const anomalyCommentSchema = z.string().trim().min(1).max(1000);

export const memberRoleSchema = z.enum(["ADMIN", "VENTURE_ARCHITECT"]);

export const memberWriteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  title: z.string().trim().min(2).max(80),
  role: memberRoleSchema,
});

export const memberUpdateSchema = memberWriteSchema.extend({
  id: z.string().min(1),
  active: z.boolean(),
});

export const projectPhaseChangeSchema = z.object({
  id: z.string().min(1),
  phase: phaseSchema,
});

export const projectWriteSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  phase: phaseSchema,
  coursesEnabled: z.boolean(),
  anomaliesEnabled: z.boolean(),
  leadId: z.string().min(1).nullable(),
  participantIds: z.array(z.string()),
});

export const notesWriteSchema = z.object({
  projectId: z.string().min(1),
  hot: z.string().trim().max(400).nullable(),
  sofar: z.string().trim().max(400).nullable(),
  keep: z.string().trim().max(400).nullable(),
});

export const mgmtWriteSchema = z.object({
  text: z.string().trim().min(1).max(200),
  status: z.enum(["todo", "doing", "done"]),
  date: daySchema,
});

export const meetingWriteSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160),
  date: daySchema,
  start: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  participants: z.array(z.string().trim().min(1).max(80)).max(30),
  cr: z.string().max(20000),
  projectIds: z.array(z.string()),
});

export const moveTaskSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  blocker: z.string().trim().max(600).nullable(),
});

export const trashEntitySchema = z.enum(["task", "okr", "kpi", "info", "course"]);

export const trashItemSchema = z.object({
  entity: trashEntitySchema,
  id: z.string().trim().min(1),
});
