import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await context.params;
  const anomaly = await prisma.anomaly.findUnique({ where: { id }, include: { file: true } });
  if (!anomaly?.file || anomaly.file.unavailable || !anomaly.file.storagePath) {
    return new Response("Fichier indisponible", { status: 404 });
  }
  const root = path.join(process.cwd(), "storage", "anomalies");
  const resolved = path.resolve(anomaly.file.storagePath);
  if (!resolved.startsWith(root)) return new Response("Fichier indisponible", { status: 404 });
  const bytes = await readFile(resolved);
  return new Response(bytes, {
    headers: {
      "Content-Type": anomaly.file.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${anomaly.file.name ?? "fichier"}"`,
    },
  });
}
