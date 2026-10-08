import { prisma } from "@restyle/db";
import { presignDownload } from "@/lib/storage";
import { visitorId } from "@/lib/visitor";

/** Step 6 of ADR 0005: the browser polls this until the job is done or failed. */
export async function GET(_request: Request, { params }: RouteContext<"/api/generations/[id]">) {
  const { id } = await params;
  const visitor = await visitorId();
  const g = await prisma.generation.findUnique({ where: { id } });
  // Someone else's job looks exactly like a missing one.
  if (!g || g.visitorId !== visitor) return Response.json({ error: "not_found" }, { status: 404 });

  const [inputUrl, outputUrl] = await Promise.all([
    presignDownload(g.inputKey),
    g.status === "done" && g.outputKey ? presignDownload(g.outputKey) : null,
  ]);
  return Response.json(
    { id: g.id, status: g.status, error: g.status === "failed" ? g.error : null, inputUrl, outputUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
