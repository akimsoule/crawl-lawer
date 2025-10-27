import prisma from '../db/prisma';

function asInt(n: any): number | null { const x = Number(n); return Number.isFinite(x) ? x : null; }

/**
 * Compacte les entrées CrawlUrl.status = 'not_found' en plages NotFoundRange par année.
 * - Groupe les index consécutifs (year/index non nuls)
 * - Étend une plage existante si elle finit à startIndex-1
 * - Crée une nouvelle plage sinon
 * - Supprime les lignes CrawlUrl consommées
 * Retourne { rangesCreated, rangesExtended, rowsDeleted }
 */
export async function compactNotFoundForYears(years: number[], maxRowsPerYear = 500) {
  let rangesCreated = 0;
  let rangesExtended = 0;
  let rowsDeleted = 0;

  for (const year of years) {
    // Lire un lot d'entries not_found pour l'année, triées par index asc
    const rows = await prisma.crawlUrl.findMany({
      where: { status: 'not_found', year: { not: null, equals: year }, index: { not: null } },
      orderBy: { index: 'asc' },
      take: maxRowsPerYear,
      select: { id: true, year: true, index: true },
    });
    if (rows.length === 0) continue;

    // Construire des runs consécutifs
    type Item = { id: number; idx: number };
    const items: Item[] = rows
      .map((r) => ({ id: r.id, idx: asInt(r.index)! }))
      .filter((r) => r.idx != null)
      .sort((a, b) => a.idx - b.idx);

    let i = 0;
    while (i < items.length) {
      const startIdx = items[i].idx;
      let endIdx = startIdx;
      const ids: number[] = [items[i].id];
      i++;
      while (i < items.length && items[i].idx === endIdx + 1) {
        endIdx = items[i].idx;
        ids.push(items[i].id);
        i++;
      }

      // Étendre une plage existante si contiguë
      const prev = await prisma.notFoundRange.findFirst({ where: { year, endIndex: startIdx - 1 } });
      if (prev) {
        await prisma.notFoundRange.update({ where: { id: prev.id }, data: { endIndex: endIdx, count: endIdx - prev.startIndex + 1 } });
        rangesExtended++;
      } else {
            await prisma.notFoundRange.create({ data: { year, startIndex: startIdx, endIndex: endIdx, count: endIdx - startIdx + 1 } });
        rangesCreated++;
      }

      // Supprimer les lignes CrawlUrl de ce run
      const del = await prisma.crawlUrl.deleteMany({ where: { id: { in: ids } } });
      rowsDeleted += del.count ?? 0;
    }
  }

  return { rangesCreated, rangesExtended, rowsDeleted };
}
