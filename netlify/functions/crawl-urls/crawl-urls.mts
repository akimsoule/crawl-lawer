import prisma from "../../core/src/db/prisma";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  if (method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  const status = url.searchParams.get('status') || 'all';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get('pageSize') || '20')));
  const q = (url.searchParams.get('q') || '').trim();

  const where: any = {};
  if (status && status !== 'all') {
    // UI statuses mapping: completed->success, failed->error|not_found, processing->pending (attempts>0)
    if (status === 'completed') where.status = 'success';
    else if (status === 'failed') where.status = { in: ['error', 'not_found'] };
    else if (status === 'pending' || status === 'processing') where.status = 'pending';
    else where.status = status; // pass-through for raw statuses
  }
  if (q) {
    where.url = { contains: q, mode: 'insensitive' };
  }

  const [total, items] = await Promise.all([
    prisma.crawlUrl.count({ where }),
    prisma.crawlUrl.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, url: true, status: true, httpStatus: true, attempts: true, lastVisitedAt: true, year: true, index: true, updatedAt: true },
    }),
  ]);

  // derive uiStatus to match page rendering
  const withUiStatus = items.map((it) => {
    let uiStatus: 'pending'|'processing'|'completed'|'failed'|string;
    if (it.status === 'success') uiStatus = 'completed';
    else if (it.status === 'error' || it.status === 'not_found') uiStatus = 'failed';
    else if (it.status === 'pending' && (it.attempts ?? 0) > 0) uiStatus = 'processing';
    else if (it.status === 'pending') uiStatus = 'pending';
    else uiStatus = it.status;
    return { ...it, uiStatus };
  });

  return new Response(JSON.stringify({ items: withUiStatus, total, page, pageSize }), { status: 200, headers: { 'content-type': 'application/json' } });
}
