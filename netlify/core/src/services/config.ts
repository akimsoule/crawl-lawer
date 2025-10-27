import prisma from '../db/prisma';

type AnyObj = Record<string, any>;

export async function getCronConfig<T extends AnyObj>(name: 'latest' | 'backfill' | 'purge', defaults: T): Promise<{ enabled: boolean; params: T }>{
  const row = await prisma.cronConfig.findUnique({ where: { name } }).catch(() => null);
  if (!row) return { enabled: true, params: defaults };
  const enabled = row.enabled ?? true;
  let params: T;
  try {
    params = { ...defaults, ...(row.params as AnyObj) } as T;
  } catch {
    params = defaults;
  }
  return { enabled, params };
}

export async function upsertCronParams(name: 'latest' | 'backfill' | 'purge', changes: AnyObj) {
  const existing = await prisma.cronConfig.findUnique({ where: { name } }).catch(() => null);
  if (!existing) {
    const row = await prisma.cronConfig.create({ data: { name, enabled: true, params: changes } });
    return row.params as AnyObj;
  }
  const merged = { ...(existing.params as AnyObj), ...changes };
  const row = await prisma.cronConfig.update({ where: { name }, data: { params: merged } });
  return row.params as AnyObj;
}

// Helpers pour défauts typés
export function defaultsLatest() {
  return {
    batch: 3,
    concurrency: 1,
    gapLimit: 10,
    limitPerYear: 3,
    timeoutMs: 8000,
    headCheck: true,
    language: 'fre',
    maxOcrKB: 1024,
  };
}

export function defaultsBackfill() {
  return {
    yearsCount: 2, // N-1, N-2
    batchPerYear: 3,
    needQuietRuns: 4, // nombre de runs 'latest' consécutifs sans nouveaux téléchargements avant d'activer le backfill
    concurrency: 1,
    gapLimit: 20,
    timeoutMs: 8000,
    headCheck: true,
    language: 'fre',
    maxOcrKB: 1024,
  };
}

export function defaultsPurge() {
  return {
    maxBytes: Math.floor(0.5 * 1024 * 1024 * 1024),
    maxDeletesPerRun: 100,
  };
}
