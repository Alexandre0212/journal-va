import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { anomalyStorage } from "@/server/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await context.params;
  const anomaly = await prisma.anomaly.findUnique({ where: { id }, include: { file: true } });
  if (!anomaly?.file || anomaly.file.unavailable || !anomaly.file.storagePath) {
    return new Response("Fichier indisponible", { status: 404 });
  }
  const bytes = await anomalyStorage().read(anomaly.file.storagePath);
  if (!bytes) return new Response("Fichier indisponible", { status: 404 });
  return new Response(bytes, {
    headers: {
      "Content-Type": anomaly.file.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${anomaly.file.name ?? "fichier"}"`,
    },
  });
}
