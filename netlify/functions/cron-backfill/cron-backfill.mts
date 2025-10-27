import type { Config } from "@netlify/functions";
import prisma from "../../core/src/db/prisma";
import { crawl } from "../../core/src/services/crawler";
import { getCronConfig, defaultsBackfill, upsertCronParams } from "../../core/src/services/config";
import { logCronRun, pruneCronRuns } from "../../core/src/services/metrics";

export const config: Config = { schedule: "*/15 * * * *" };

export default async function handler(_req: Request): Promise<Response> {
  const now = new Date();
  const cy = now.getFullYear();

  const apiEnv = process.env.OCR_API_KEY || "";
  const apiKeys = apiEnv.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  if (apiKeys.length === 0) return new Response(JSON.stringify({ ok: false, error: "missing OCR_API_KEY" }), { status: 200 });

  const cfg = await getCronConfig('backfill', defaultsBackfill());
  if (!cfg.enabled) return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { status: 200 });
  const p = cfg.params;
  // Garde‑fou: n'activer le backfill que quand 'latest' est au repos
  const quietRuns = Math.max(1, Number((p as any).needQuietRuns ?? 4));
  const latestRuns = await prisma.cronRun.findMany({ where: { name: 'latest' }, orderBy: { startedAt: 'desc' }, take: quietRuns });
  const sumDownloaded = latestRuns.reduce((s, r) => s + (r.downloaded ?? 0), 0);
  if (latestRuns.length < quietRuns || sumDownloaded > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: 'waiting_latest_to_catch_up', reason: { quietRuns, seen: latestRuns.length, sumDownloaded } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  let years: number[];
  if (Array.isArray((p as any).years)) {
    years = (p as any).years.filter((y: any) => Number.isFinite(y)).map(Number);
  } else {
    const count = Math.max(0, Number((p as any).yearsCount ?? 2));
    years = Array.from({ length: count }, (_, i) => cy - (i + 1)).filter((y) => y > 2000);
  }
  const results: any[] = [];
  const startedAt = new Date();
  const t0 = Date.now();
  for (const year of years) {
    const maxIdxRow = await prisma.crawlUrl.findFirst({
      where: { year, status: "success", index: { not: null } },
      orderBy: { index: "desc" },
      select: { index: true },
    });
    const startIndex = (maxIdxRow?.index ?? 0) + 1;
    const endIndex = startIndex + Math.max(0, (p.batchPerYear ?? 3) - 1);
    const stats = await crawl({
      startYear: year,
      endYear: year,
      startIndex,
      endIndex,
      concurrency: p.concurrency ?? 1,
      gapLimit: p.gapLimit ?? 20,
      limitPerYear: p.batchPerYear ?? 3,
      headCheck: p.headCheck ?? true,
      timeoutMs: p.timeoutMs ?? 8000,
      language: p.language ?? 'fre',
      apiKeys,
      maxOcrKB: p.maxOcrKB ?? 1024,
    });
    results.push({ year, startIndex, endIndex, stats });
  }
  const dt = (Date.now() - t0) / 1000;

  // Auto-tuning: ajuster batchPerYear selon durée/erreurs cumulées
  const totalErrors = results.reduce((s, r) => s + (r.stats?.errors ?? 0), 0);
  const prevBatch = Number(p.batchPerYear ?? 3);
  let nextBatch = prevBatch;
  if (dt < 6 && totalErrors === 0) nextBatch = Math.min(prevBatch + 1, 5);
  if (dt > 9 || totalErrors > 0) nextBatch = Math.max(prevBatch - 1, 1);

  await upsertCronParams('backfill', {
    batchPerYear: nextBatch,
    lastRunAt: new Date().toISOString(),
    lastDurationSec: dt,
    lastResults: results,
  });

  // Agrégation pour log
  const agg = results.reduce(
    (s, r) => ({
      attempted: (s.attempted ?? 0) + (r.stats?.attempted ?? 0),
      downloaded: (s.downloaded ?? 0) + (r.stats?.downloaded ?? 0),
      notFound: (s.notFound ?? 0) + (r.stats?.notFound ?? 0),
      errors: (s.errors ?? 0) + (r.stats?.errors ?? 0),
      skipped: (s.skipped ?? 0) + (r.stats?.skipped ?? 0),
    }),
    {} as any
  );
  await logCronRun('backfill', { startedAt, durationSec: dt, stats: agg, extra: { years, batchPrev: prevBatch, batchNext: nextBatch } });
  await pruneCronRuns('backfill', 5);

  return new Response(JSON.stringify({ ok: true, results, durationSec: dt, batchPerYear: { prev: prevBatch, next: nextBatch } }), { status: 200, headers: { 'content-type': 'application/json' } });
}
