import prisma from "../../core/src/db/prisma";

function pct(n: number, d: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10; // one decimal
}

export default async function handler(req: Request): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  const [totalDocuments, totalUrls, successCount, errorCount, notFoundCount, pendingCount] = await Promise.all([
    prisma.document.count(),
    prisma.crawlUrl.count(),
    prisma.crawlUrl.count({ where: { status: 'success' } }),
    prisma.crawlUrl.count({ where: { status: 'error' } }),
    prisma.crawlUrl.count({ where: { status: 'not_found' } }),
    prisma.crawlUrl.count({ where: { status: 'pending' } }),
  ]);
  const attempts = successCount + errorCount + notFoundCount;
  const successRate = pct(successCount, attempts);

  // recent activity from CrawlUrl
  const recent = await prisma.crawlUrl.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: { id: true, url: true, status: true, year: true, index: true, updatedAt: true, attempts: true },
  });
  const recentItems = recent.map((r) => {
    let s: 'success'|'failed'|'processing'|'pending';
    if (r.status === 'success') s = 'success';
    else if (r.status === 'error' || r.status === 'not_found') s = 'failed';
    else if (r.status === 'pending' && (r.attempts ?? 0) > 0) s = 'processing';
    else s = 'pending';
    return {
      id: r.id,
      title: r.year && r.index ? `Document ${r.year}-${String(r.index).padStart(4,'0')}` : r.url,
      time: r.updatedAt.toISOString(),
      status: s,
    };
  });

  // provider distribution from Document
  const groups = await prisma.document.groupBy({
    by: ['ocrProvider'],
    _count: { _all: true },
  });
  const totalProv = groups.reduce((s, g) => s + (g._count?._all ?? 0), 0);
  const providers = groups.map((g) => ({
    name: g.ocrProvider ?? 'Inconnu',
    count: g._count?._all ?? 0,
    percentage: totalProv > 0 ? Math.round(((g._count?._all ?? 0) / totalProv) * 100) : 0,
  })).sort((a,b) => b.count - a.count);

  return new Response(JSON.stringify({
    stats: {
      totalDocuments,
      totalUrls,
      successRate,
      pendingUrls: pendingCount,
    },
    recent: recentItems,
    providers,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
