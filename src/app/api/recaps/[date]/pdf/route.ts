import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireUser } from "@/server/auth/session";
import { loadSummary } from "@/server/queries";

export async function GET(_request: Request, context: { params: Promise<{ date: string }> }) {
  await requireUser();
  const { date } = await context.params;
  const summary = await loadSummary(date);
  if (!summary) return new Response("Introuvable", { status: 404 });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = summary.text.normalize("NFKC").replace(/[^\u0000-\u00ff]/g, " ");
  const lines = text.split("\n");
  let page = pdf.addPage([595, 842]);
  let y = 800;
  for (const line of lines) {
    const chunks = line.match(/.{1,90}/g) ?? [""];
    for (const chunk of chunks) {
      if (y < 48) {
        page = pdf.addPage([595, 842]);
        y = 800;
      }
      page.drawText(chunk, { x: 48, y, size: 11, font, color: rgb(0.09, 0.14, 0.23) });
      y -= 16;
    }
  }
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recap-${date}.pdf"`,
    },
  });
}
