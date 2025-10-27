import type { Config } from "@netlify/functions";
import { enforceStorageBudget, getTotalStorageBytes } from "../../core/src/services/purge";
import { getCronConfig, defaultsPurge, upsertCronParams } from "../../core/src/services/config";
import { logCronRun, pruneCronRuns } from "../../core/src/services/metrics";

export const config: Config = { schedule: "*/15 * * * *" };

export default async function handler(_req: Request): Promise<Response> {
  const cfg = await getCronConfig('purge', defaultsPurge());
  if (!cfg.enabled) return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), { status: 200 });
  const p = cfg.params;

  const startedAt = new Date();
  const before = await getTotalStorageBytes();
  // Auto-tuning du nombre de suppressions selon le dépassement
  const ratio = before / p.maxBytes;
  let deletes = p.maxDeletesPerRun ?? 100;
  if (ratio > 1.2) deletes = Math.min(400, Math.max(deletes, 300));
  else if (ratio > 1.05) deletes = Math.min(300, Math.max(deletes, 200));
  else if (ratio > 1) deletes = Math.min(200, Math.max(deletes, 150));
  else if (ratio < 0.85) deletes = Math.max(50, Math.min(deletes, 80));

  // Limiter les suppressions par run pour tenir sous 10s
  const t0 = Date.now();
  const purge = await enforceStorageBudget(p.maxBytes, deletes);
  const dt = (Date.now() - t0) / 1000;
  const after = purge.totalAfter;
  await upsertCronParams('purge', {
    maxDeletesPerRun: deletes,
    lastRunAt: new Date().toISOString(),
    lastBefore: before,
    lastAfter: after,
    lastDeleted: purge.deleted,
  });
  await logCronRun('purge', { startedAt, durationSec: dt, extra: { before, after, ratio, deletes, deleted: purge.deleted, freedBytes: purge.freedBytes } });
  await pruneCronRuns('purge', 5);
  return new Response(JSON.stringify({ ok: true, before, purge, after, tunedDeletes: deletes }), { status: 200, headers: { 'content-type': 'application/json' } });
}
