import prisma from "../../core/src/db/prisma";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  try {
    if (method === "GET") {
      const items = await prisma.filter.findMany({ orderBy: { createdAt: "desc" } });
      return new Response(JSON.stringify({ items }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { type = 'exclude', field = 'text', mode = 'contains', pattern, active = true } = body ?? {};
      if (!pattern || typeof pattern !== 'string') return new Response(JSON.stringify({ error: 'pattern required' }), { status: 400 });
      const created = await prisma.filter.create({ data: { type, field, mode, pattern, active: Boolean(active) } as any });
      return new Response(JSON.stringify({ ok: true, id: created.id }), { status: 201, headers: { "content-type": "application/json" } });
    }

    if (method === "DELETE") {
      const idParam = url.searchParams.get("id");
      if (!idParam) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
      const id = Number(idParam);
      await prisma.filter.delete({ where: { id } });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
}
