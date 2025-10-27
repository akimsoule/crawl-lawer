import type { Config } from "@netlify/functions";
import prisma from "../../core/src/db/prisma";
import { crawl } from "../../core/src/services/crawler";
import { getCronConfig, defaultsLatest, upsertCronParams } from "../../core/src/services/config";
import { logCronRun, pruneCronRuns } from "../../core/src/services/metrics";
import { compactNotFoundForYears } from "../../core/src/services/compact";

export const config: Config = { schedule: "*/15 * * * *" };

export default async function handler(_req: Request): Promise<Response> {
  const year = new Date().getFullYear();

  const apiEnv = process.env.OCR_API_KEY || "";
  const apiKeys = apiEnv.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  if (apiKeys.length === 0) return new Response(JSON.stringify({ ok: false, error: "missing OCR_API_KEY" }), { status: 200 });

  const cfg = await getCronConfig('latest', defaultsLatest());
  if (!cfg.enabled) return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { status: 200 });
  const p = cfg.params;

  const maxIdxRow = await prisma.crawlUrl.findFirst({
    where: { year, status: "success", index: { not: null } },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  const startIndex = (maxIdxRow?.index ?? 0) + 1;
  const endIndex = startIndex + Math.max(0, (p.batch ?? 3) - 1);
  const startedAt = new Date();
  const t0 = Date.now();
  const stats = await crawl({
    startYear: year,
    endYear: year,
    startIndex,
    endIndex,
    concurrency: p.concurrency ?? 1,
    gapLimit: p.gapLimit ?? 10,
    limitPerYear: p.limitPerYear ?? p.batch ?? 3,
    headCheck: p.headCheck ?? true,
    timeoutMs: p.timeoutMs ?? 8000,
    language: p.language ?? 'fre',
    apiKeys,
    maxOcrKB: p.maxOcrKB ?? 1024,
  });

  const dt = (Date.now() - t0) / 1000;

  // Auto-tuning: ajuster batch selon durée/erreurs
  const prevBatch = Number(p.batch ?? 3);
  let nextBatch = prevBatch;
  if (dt < 6 && stats.errors === 0) nextBatch = Math.min(prevBatch + 1, 6);
  if (dt > 9 || stats.errors > 0) nextBatch = Math.max(prevBatch - 1, 1);

  await upsertCronParams('latest', {
    batch: nextBatch,
    lastRunAt: new Date().toISOString(),
    lastDurationSec: dt,
    lastStats: stats,
  });

  await logCronRun('latest', { startedAt, durationSec: dt, stats, extra: { startIndex, endIndex, batchPrev: prevBatch, batchNext: nextBatch } });
  // Retention: keep only last 5 runs per cron
  await pruneCronRuns('latest', 5);
  // Compact not_found for current year in small batches
  await compactNotFoundForYears([year], 400);

  return new Response(JSON.stringify({ ok: true, year, startIndex, endIndex, stats, durationSec: dt, batch: { prev: prevBatch, next: nextBatch } }), { status: 200, headers: { 'content-type': 'application/json' } });
}
