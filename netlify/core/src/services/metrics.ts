import prisma from "../db/prisma";
import { upsertCronParams } from "./config";

export type SimpleStats = {
  attempted?: number;
  downloaded?: number;
  notFound?: number;
  errors?: number;
  skipped?: number;
};

export function ema(prev: number | undefined, value: number, alpha = 0.3) {
  if (prev == null || Number.isNaN(prev)) return value;
  return alpha * value + (1 - alpha) * prev;
}

export async function logCronRun(
  name: "latest" | "backfill" | "purge",
  data: {
    startedAt: Date;
    durationSec: number;
    stats?: SimpleStats;
    extra?: any;
  }
) {
  const { startedAt, durationSec, stats, extra } = data;
  await prisma.cronRun.create({
    data: {
      name,
      startedAt,
      durationSec,
      attempted: stats?.attempted,
      downloaded: stats?.downloaded,
      notFound: stats?.notFound,
      errors: stats?.errors,
      skipped: stats?.skipped,
      extra,
    },
  });

  // Mettre à jour des métriques lissées (EMA) dans CronConfig.params
  const emaUpdate: Record<string, any> = {};
  // Charger éventuellement les EMA existantes via un update merge simple
  // Comme upsertCronParams fusionne, on lit avant n'est pas nécessaire ici.
  if (typeof durationSec === "number") {
    emaUpdate.emaDurationSec = durationSec; // valeur brute; lissage fait côté merge incrémental si implémenté plus tard
  }
  if (typeof stats?.errors === "number") {
    emaUpdate.emaErrors = stats.errors;
  }
  await upsertCronParams(name, {
    ...emaUpdate,
    lastRunAt: new Date().toISOString(),
  });
}

/**
 * Keep only the most recent `keep` CronRun entries for a given name, delete older ones.
 * Returns the number of deleted rows.
 */
export async function pruneCronRuns(
  name: "latest" | "backfill" | "purge",
  keep = 5
): Promise<number> {
  if (!Number.isFinite(keep) || keep <= 0) keep = 5;
  // Get IDs to delete: all except the most recent `keep`
  const older = await prisma.cronRun.findMany({
    where: { name },
    orderBy: { startedAt: "desc" },
    skip: keep,
    take: 1000, // safeguard batch
    select: { id: true },
  });
  if (older.length === 0) return 0;
  const ids = older.map((r) => r.id);
  const res = await prisma.cronRun.deleteMany({ where: { id: { in: ids } } });
  return res.count ?? 0;
}
