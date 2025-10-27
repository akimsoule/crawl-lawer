import prisma from "../../core/src/db/prisma";

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  try {
    if (method === "GET") {
      const search = (url.searchParams.get("q") || "").trim();
      const year = url.searchParams.get("year");
      const page = toInt(url.searchParams.get("page"), 1);
      const pageSize = Math.min(toInt(url.searchParams.get("limit"), 20), 100);
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (year && /^\d{4}$/.test(year)) where.year = Number(year);
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { text: { contains: search, mode: "insensitive" } },
          { url: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.document.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: { id: true, year: true, index: true, title: true, url: true, text: true, ocrProvider: true, ocrConfidence: true, tag: true, bytes: true, createdAt: true, category: true },
        }),
        prisma.document.count({ where }),
      ]);

      return new Response(JSON.stringify({ items, total, page, pageSize }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (method === "PUT") {
      const idParam = url.searchParams.get("id");
      if (!idParam) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
      const id = Number(idParam);
      const body = await req.json().catch(() => ({}));
      const text = typeof body.text === "string" ? body.text : undefined;
      const title = typeof body.title === "string" ? body.title : undefined;
      if (!text && !title) return new Response(JSON.stringify({ error: "No fields to update" }), { status: 400 });

      const updated = await prisma.document.update({ where: { id }, data: { ...(text ? { text } : {}), ...(title ? { title } : {}), userEdited: true } });
      return new Response(JSON.stringify({ ok: true, id: updated.id }), { status: 200, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
}
