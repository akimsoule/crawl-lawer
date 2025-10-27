import prisma from "../db/prisma";

type StringMatcher = (val?: string | null) => boolean;

function buildMatcher(
  mode: "contains" | "startsWith" | "endsWith" | "regex",
  pattern: string
): StringMatcher {
  const patLC = pattern.toLowerCase();
  if (mode === "regex") {
    let re: RegExp | null = null;
    try {
      re = new RegExp(pattern, "i");
    } catch {
      re = null;
    }
    return (val?: string | null) => {
      if (!re) return false;
      const s = val ?? "";
      return re.test(s);
    };
  }
  return (val?: string | null) => {
    const s = (val ?? "").toLowerCase();
    switch (mode) {
      case "contains":
        return s.includes(patLC);
      case "startsWith":
        return s.startsWith(patLC);
      case "endsWith":
        return s.endsWith(patLC);
      default:
        return false;
    }
  };
}

export async function getTotalStorageBytes(): Promise<number> {
  const agg = await prisma.document.aggregate({ _sum: { bytes: true } });
  return Number(agg._sum.bytes ?? 0);
}

/**
 * Enforce a storage budget by deleting oldest Documents until under the limit.
 * Returns number of deleted documents and freed bytes.
 */
export async function enforceStorageBudget(
  maxBytes: number,
  maxDeletesPerRun: number = 200
): Promise<{ deleted: number; freedBytes: number; totalAfter: number }> {
  let total = await getTotalStorageBytes();
  if (total <= maxBytes)
    return { deleted: 0, freedBytes: 0, totalAfter: total };

  let freed = 0;
  let deleted = 0;

  // Load protected filters (by tag or category)
  const protectFilters = await prisma.filter.findMany({
    where: { active: true, type: "protect" },
  });
  const tagMatchers: StringMatcher[] = [];
  const categoryMatchers: StringMatcher[] = [];
  for (const f of protectFilters) {
    const m = buildMatcher(f.mode as any, f.pattern);
    if (f.field === "tag") tagMatchers.push(m);
    if (f.field === "category") categoryMatchers.push(m);
  }
  const isProtected = (doc: {
    tag?: string | null;
    category?: string | null;
  }) => {
    return (
      tagMatchers.some((m) => m(doc.tag)) ||
      categoryMatchers.some((m) => m(doc.category))
    );
  };

  // Fetch in small batches to avoid loading everything at once
  let cursorId: number | undefined = undefined;
  while (total - freed > maxBytes) {
    // Priorité: ne jamais supprimer les documents édités par l'utilisateur
    // Sélectionner d'abord les plus anciens non édités
    const batch: {
      id: number;
      bytes: number | null;
      tag: string | null;
      category: string | null;
    }[] = await prisma.document.findMany({
      where: { userEdited: false },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
      take: 50,
      select: { id: true, bytes: true, tag: true, category: true },
    });
    if (batch.length === 0) break;

    for (const d of batch) {
      if (isProtected({ tag: d.tag as any, category: d.category as any })) {
        continue;
      }
      // Detach CrawlUrls
      await prisma.crawlUrl.updateMany({
        where: { documentId: d.id },
        data: { documentId: null },
      });
      // Delete document
      await prisma.document.delete({ where: { id: d.id } });
      freed += Number(d.bytes ?? 0);
      deleted += 1;
      if (deleted >= maxDeletesPerRun) break;
      if (total - freed <= maxBytes) break;
    }
    cursorId = (batch.at(-1)?.id as number | undefined) ?? cursorId;
    if (deleted >= maxDeletesPerRun) break;
  }

  const totalAfter = await getTotalStorageBytes();
  return { deleted, freedBytes: freed, totalAfter };
}
