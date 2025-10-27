import prisma from "../../core/src/db/prisma";

function pct(n: number, d: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10; // one decimal
}

export default async function handler(req: Request): Promise<Response> {
  const method = req.method.toUpperCase();
  if (method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  // Date ranges: current month and previous month
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));

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

  // Trends month-over-month
  const [docsCurr, docsPrev] = await Promise.all([
    prisma.document.count({ where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } } }),
    prisma.document.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
  ]);
  const docsTrendVal = (() => {
    if (docsPrev <= 0) return docsCurr > 0 ? 100 : 0;
    return Math.round(((docsCurr - docsPrev) / docsPrev) * 1000) / 10;
  })();
  const docsTrendPos = docsCurr >= docsPrev;

  const [urlsCurr, urlsPrev] = await Promise.all([
    prisma.crawlUrl.count({ where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth } } }),
    prisma.crawlUrl.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
  ]);
  const urlsTrendVal = (() => {
    if (urlsPrev <= 0) return urlsCurr > 0 ? 100 : 0;
    return Math.round(((urlsCurr - urlsPrev) / urlsPrev) * 1000) / 10;
  })();
  const urlsTrendPos = urlsCurr >= urlsPrev;

  const [succCurr, errCurr, nfCurr, succPrev, errPrev, nfPrev] = await Promise.all([
    prisma.crawlUrl.count({ where: { status: 'success', updatedAt: { gte: startOfMonth, lt: startOfNextMonth } } }),
    prisma.crawlUrl.count({ where: { status: 'error', updatedAt: { gte: startOfMonth, lt: startOfNextMonth } } }),
    prisma.crawlUrl.count({ where: { status: 'not_found', updatedAt: { gte: startOfMonth, lt: startOfNextMonth } } }),
    prisma.crawlUrl.count({ where: { status: 'success', updatedAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
    prisma.crawlUrl.count({ where: { status: 'error', updatedAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
    prisma.crawlUrl.count({ where: { status: 'not_found', updatedAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
  ]);
  const attCurr = succCurr + errCurr + nfCurr;
  const attPrev = succPrev + errPrev + nfPrev;
  const srCurr = pct(succCurr, attCurr);
  const srPrev = pct(succPrev, attPrev);
  const srTrendVal = Math.round((srCurr - srPrev) * 10) / 10;
  const srTrendPos = srTrendVal >= 0;

  return new Response(JSON.stringify({
    stats: {
      totalDocuments,
      totalUrls,
      successRate,
      pendingUrls: pendingCount,
    },
    trends: {
      documents: { value: Math.abs(docsTrendVal), isPositive: docsTrendPos },
      urls: { value: Math.abs(urlsTrendVal), isPositive: urlsTrendPos },
      successRate: { value: Math.abs(srTrendVal), isPositive: srTrendPos },
    },
    recent: recentItems,
    providers,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
