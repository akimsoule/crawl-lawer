import { crawl } from "../../core/src/services/crawler";
import prisma from "../../core/src/db/prisma";
import { enforceStorageBudget, getTotalStorageBytes } from "../../core/src/services/purge";

const MAX_BYTES = Math.floor(0.5 * 1024 * 1024 * 1024); // 0.5 GB

async function runScheduledCrawl() {
  const now = new Date();
  const year = now.getFullYear();

  const apiEnv = process.env.OCR_API_KEY || "";
  const apiKeys = apiEnv
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (apiKeys.length === 0) {
    console.warn("OCR_API_KEY manquant – arrêt du cron crawl");
    return { ok: false, reason: "missing_api_key" } as const;
  }

  // Trouver l'index déjà max pour cette année (succès only)
  const maxIdxRow = await prisma.crawlUrl.findFirst({
    where: { year, status: "success", index: { not: null } },
    orderBy: { index: "desc" },
    select: { index: true },
  });
  const startIndex = (maxIdxRow?.index ?? 0) + 1;
  const endIndex = startIndex + 300; // tenter ~300 nouveaux décrets potentiels

  // Phase 1: crawl très récent pour l'année courante
  const recent = await crawl({
    startYear: year,
    endYear: year,
    startIndex,
    endIndex,
    concurrency: 4,
    gapLimit: 50,
    limitPerYear: 0,
    headCheck: true,
    language: "fre",
    apiKeys,
    maxOcrKB: 1024,
  });

  // Phase 2: backfill léger pour années récentes (2 dernières années inclus l'année courante)
  const backfill = await crawl({
    startYear: year - 1,
    endYear: year,
    startIndex: 1,
    endIndex: 2000,
    concurrency: 3,
    gapLimit: 80,
    limitPerYear: 40,
    headCheck: true,
    language: "fre",
    apiKeys,
    maxOcrKB: 1024,
  });

  // Purge si dépassement
  const before = await getTotalStorageBytes();
  const purge = await enforceStorageBudget(MAX_BYTES);
  const after = purge.totalAfter;

  return { ok: true as const, recent, backfill, before, purge, after };
}

async function handler(req: Request) {
  const evt = await req.json().catch(() => ({}));
  const result = await runScheduledCrawl();
  return new Response(JSON.stringify({ event: evt, result }), { status: 200, headers: { "content-type": "application/json" } });
}

export default handler;
