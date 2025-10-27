import prisma from "../../core/src/db/prisma";

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const name = url.searchParams.get('name'); // optional filter
  const limit = Math.min(toInt(url.searchParams.get('limit'), 10), 100);
  const sinceParam = url.searchParams.get('since');
  const since = sinceParam ? new Date(sinceParam) : undefined;

  const names: Array<'latest'|'backfill'|'purge'> = name ? [name as any] : ['latest','backfill','purge'];

  const result: Record<string, any> = {};

  for (const nm of names) {
    const where: any = { name: nm };
    if (!Number.isNaN(since?.getTime())) where.startedAt = { gte: since };

    const items = await prisma.cronRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: { id: true, startedAt: true, durationSec: true, attempted: true, downloaded: true, notFound: true, errors: true, skipped: true, extra: true },
    });

    const agg = items.reduce(
      (s, r) => {
        s.count++;
        s.durationSum += r.durationSec ?? 0;
        s.errorSum += r.errors ?? 0;
        s.attempted += r.attempted ?? 0;
        s.downloaded += r.downloaded ?? 0;
        s.notFound += r.notFound ?? 0;
        s.skipped += r.skipped ?? 0;
        return s;
      },
      { count: 0, durationSum: 0, errorSum: 0, attempted: 0, downloaded: 0, notFound: 0, skipped: 0 }
    );
    const avgDuration = agg.count ? agg.durationSum / agg.count : 0;
    const avgErrors = agg.count ? agg.errorSum / agg.count : 0;

    result[nm] = { items, aggregates: { avgDuration, avgErrors, ...agg } };
  }

  // Global docs/stockage
  const [docAgg, purgeCfg] = await Promise.all([
    prisma.document.aggregate({ _count: { _all: true }, _sum: { bytes: true } }),
    prisma.cronConfig.findUnique({ where: { name: 'purge' } })
  ]);

  const storageBudget = Number((purgeCfg?.params as any)?.maxBytes ?? Math.floor(0.5 * 1024 * 1024 * 1024));
  const totalBytes = Number(docAgg._sum.bytes ?? 0);
  const totalDocs = Number(docAgg._count._all ?? 0);

  const payload = { runs: result, storage: { totalDocs, totalBytes, storageBudget } };
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
}
