import axios, { AxiosInstance } from "axios";
import * as https from "node:https";
import pLimit from "p-limit";
import prisma from "../db/prisma";
import { extractTextFromPDFBufferSmartWithKeys } from "./ocrSpace";

export type CrawlOptions = {
  startYear: number;
  endYear: number;
  concurrency?: number;
  limitYears?: number;
  limitPerYear?: number;
  gapLimit?: number;
  userAgent?: string;
  startIndex?: number;
  endIndex?: number;
  timeoutMs?: number;
  headCheck?: boolean;
  language?: string;
  maxOcrKB?: number;
};

export type ResultStats = {
  attempted: number;
  downloaded: number;
  notFound: number;
  errors: number;
  skipped: number;
  skippedKnown404?: number;
};

const DEFAULTS = {
  concurrency: 5,
  gapLimit: 100,
  timeoutMs: 10000,
  headCheck: true,
};

function buildUrl(year: number, index: number): string {
  return `https://sgg.gouv.bj/doc/decret-${year}-${index}/download`;
}

function pfx(year: number, index: number) {
  return `[${year}-${index}]`;
}

async function headExists(
  axiosGet: AxiosInstance,
  url: string,
  userAgent: string,
  timeoutMs: number
): Promise<boolean> {
  try {
    const res = await axiosGet.head(url, {
      headers: { "User-Agent": userAgent },
      validateStatus: (s: number) =>
        (s >= 200 && s < 400) || s === 404 || s === 405,
      maxRedirects: 5,
      timeout: Math.min(timeoutMs, 5000),
    });
    if (res.status === 404) return false;
    return true; // 200-399, or 405 (HEAD not allowed)
  } catch {
    return false;
  }
}

export async function crawl(
  opt: CrawlOptions & { apiKeys: string[] }
): Promise<ResultStats> {
  const stats: ResultStats = {
    attempted: 0,
    downloaded: 0,
    notFound: 0,
    errors: 0,
    skipped: 0,
    skippedKnown404: 0,
  };
  const limit = pLimit(opt.concurrency ?? DEFAULTS.concurrency);

  const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: (opt.concurrency ?? DEFAULTS.concurrency) * 2,
  });
  const axiosGet = axios.create({
    httpsAgent,
    validateStatus: (s: number) => (s >= 200 && s < 400) || s === 404,
  });

  const years: number[] = [];
  if (opt.limitYears && opt.limitYears > 0) {
    for (let y = opt.endYear - opt.limitYears + 1; y <= opt.endYear; y++)
      years.push(y);
  } else {
    for (let y = opt.startYear; y <= opt.endYear; y++) years.push(y);
  }

  const startIdx = opt.startIndex && opt.startIndex > 0 ? opt.startIndex : 1;
  const endIdx =
    opt.endIndex && opt.endIndex > 0 ? opt.endIndex : Number.MAX_SAFE_INTEGER;

  // Charger les filtres actifs une fois pour toutes
  const activeFilters = await prisma.filter.findMany({
    where: { active: true },
  });

  const shouldExclude = (ctx: {
    title?: string | null;
    text?: string;
    url: string;
    tag?: string | null;
    category?: string | null;
  }) => {
    const title = (ctx.title ?? "").toLowerCase();
    const text = (ctx.text ?? "").toLowerCase();
    const url = (ctx.url ?? "").toLowerCase();
    const tag = (ctx.tag ?? "").toLowerCase();
    const category = (ctx.category ?? "").toLowerCase();

    // Exclusion systematique: nominations
    const nominationPatterns = [
      "nomination",
      "portant nomination",
      "portant nominations",
      "nommé",
      "nommée",
      "est nommé",
      "sont nommés",
    ];
    const isNomination = nominationPatterns.some(
      (p) => title.includes(p) || text.includes(p)
    );
    if (isNomination) return { exclude: true, category: "nomination" as const };

    // Filtres dynamiques
    for (const f of activeFilters) {
      let source: string | undefined;
      switch (f.field) {
        case "title":
          source = title;
          break;
        case "text":
          source = text;
          break;
        case "url":
          source = url;
          break;
        case "tag":
          source = tag;
          break;
        case "category":
          source = category;
          break;
        default:
          source = undefined;
      }
      if (!source) continue;
      let matched = false;
      switch (f.mode) {
        case "contains":
          matched = source.includes(f.pattern.toLowerCase());
          break;
        case "startsWith":
          matched = source.startsWith(f.pattern.toLowerCase());
          break;
        case "endsWith":
          matched = source.endsWith(f.pattern.toLowerCase());
          break;
        case "regex":
          try {
            const re = new RegExp(f.pattern, "i");
            matched = re.test(source);
          } catch {
            matched = false;
          }
          break;
      }
      if (matched) {
        if (f.type === "exclude")
          return { exclude: true as const, category: undefined };
        // type include → ne rien faire de spécial pour l'instant
      }
    }
    return { exclude: false as const, category: undefined };
  };

  for (const year of years) {
    let consecutiveNotFound = 0;
    let foundThisYear = 0;
    const tasks: Array<Promise<void>> = [];
    // Charger les plages not_found connues pour cet année et les utiliser pour skipper proactivement
    const nfRanges = await prisma.notFoundRange.findMany({
      where: { year },
      orderBy: { startIndex: "asc" },
      select: { startIndex: true, endIndex: true },
    });
    let rIdx = 0; // pointeur courant dans les plages triées

    let i = startIdx;
    while (i <= endIdx) {
      if (opt.limitPerYear && foundThisYear >= opt.limitPerYear) break;
      if (consecutiveNotFound >= (opt.gapLimit ?? DEFAULTS.gapLimit)) break;
      // Avancer le pointeur de plage tant que la plage finit avant i
      while (rIdx < nfRanges.length && nfRanges[rIdx].endIndex < i) rIdx++;
      // Si i tombe dans une plage [startIndex, endIndex], skipper en un seul saut
      if (rIdx < nfRanges.length) {
        const r = nfRanges[rIdx];
        if (i >= r.startIndex && i <= r.endIndex) {
          const jump = Math.min(r.endIndex, endIdx) - i + 1;
          console.log(
            `${pfx(year, i)} ⏭️ plage not_found connue ${year}[${
              r.startIndex
            }-${r.endIndex}] → skip ${jump} index`
          );
          stats.skipped += jump;
          stats.skippedKnown404 = (stats.skippedKnown404 ?? 0) + jump;
          // Ces positions sont connues comme 404; on les compte dans la continuité pour respecter gapLimit
          consecutiveNotFound += jump;
          i = r.endIndex + 1; // reprendre juste après la fin de la plage
          continue;
        }
      }

      const index = i;
      const url = buildUrl(year, index);
      stats.attempted++;

      const t = limit(async () => {
        const now = new Date();
        // Skip if already saved as Document (source of truth) or CrawlUrl marked success
        const existingDoc = await prisma.document.findUnique({
          where: { url },
        });
        if (existingDoc) {
          console.log(
            `${pfx(year, index)} ⏭️ déjà en base (Document.id=${
              existingDoc.id
            }), on ignore`
          );
          stats.skipped++;
          return;
        }
        const existing = await prisma.crawlUrl.findUnique({ where: { url } });
        if (existing && existing.status === "success") {
          console.log(
            `${pfx(
              year,
              index
            )} ⏭️ déjà traité avec succès (CrawlUrl.status=success), on ignore`
          );
          stats.skipped++;
          return;
        }

        // Create or update CrawlUrl attempt status to pending
        await prisma.crawlUrl.upsert({
          where: { url },
          update: {
            attempts: { increment: 1 },
            lastVisitedAt: now,
            status: "pending",
            year,
            index,
          },
          create: {
            url,
            attempts: 1,
            lastVisitedAt: now,
            status: "pending",
            year,
            index,
          },
        });

        try {
          // If HEAD says not found, try GET once to confirm
          if (opt.headCheck ?? DEFAULTS.headCheck) {
            console.log(`${pfx(year, index)} 🔎 HEAD ${url}`);
            const exists = await headExists(
              axiosGet,
              url,
              opt.userAgent ?? "Mozilla/5.0",
              opt.timeoutMs ?? DEFAULTS.timeoutMs
            );
            if (!exists) {
              console.log(
                `${pfx(
                  year,
                  index
                )} ⚠️ HEAD indique 404, tentative GET de confirmation`
              );
              const resTry = await axiosGet.get<ArrayBuffer>(url, {
                responseType: "arraybuffer",
                headers: {
                  "User-Agent":
                    opt.userAgent ??
                    "Mozilla/5.0 (compatible; decrets-crawler/0.1)",
                },
                timeout: opt.timeoutMs ?? DEFAULTS.timeoutMs,
                maxRedirects: 5,
              });
              if (resTry.status === 404) {
                console.log(
                  `${pfx(year, index)} 🚫 404 confirmé (GET) → not_found`
                );
                consecutiveNotFound++;
                stats.notFound++;
                await prisma.crawlUrl.update({
                  where: { url },
                  data: { status: "not_found", httpStatus: 404 },
                });
                return;
              }
              // Process with this response
              const pdfBuffer = Buffer.from(resTry.data);
              console.log(
                `${pfx(year, index)} ⬇️ GET ${url} → ${resTry.status} (${
                  pdfBuffer.byteLength
                } o)`
              );
              console.log(`${pfx(year, index)} 🧠 OCR en cours...`);
              const { text, meta } =
                await extractTextFromPDFBufferSmartWithKeys(
                  pdfBuffer,
                  opt.apiKeys,
                  {
                    language: opt.language ?? "fre",
                    detectOrientation: true,
                    scale: true,
                    isTable: false,
                    OCREngine: 2,
                  },
                  opt.maxOcrKB ?? 1024,
                  3
                );
              console.log(
                `${pfx(year, index)} 🧠 OCR ok (${text.length} caractères)`
              );
              // Classification & filtres
              const excl0 = shouldExclude({
                title: undefined,
                text,
                url,
                tag: undefined,
              });
              if (excl0.exclude) {
                console.log(
                  `${pfx(year, index)} 🧹 Exclu par règle (${
                    excl0.category ?? "filter"
                  }) → pas d'enregistrement`
                );
                await prisma.crawlUrl.update({
                  where: { url },
                  data: { status: "excluded", httpStatus: resTry.status },
                });
                stats.skipped++;
                return;
              }

              const doc = await prisma.document.upsert({
                where: { url },
                update: {
                  text,
                  bytes: pdfBuffer.byteLength,
                  ocrProvider: meta.provider,
                  year,
                  index,
                  category: undefined,
                  isExcluded: false,
                },
                create: {
                  url,
                  year,
                  index,
                  text,
                  bytes: pdfBuffer.byteLength,
                  ocrProvider: meta.provider,
                  category: undefined,
                  isExcluded: false,
                },
              });
              console.log(
                `${pfx(year, index)} 💾 Document enregistré (id=${doc.id})`
              );
              await prisma.crawlUrl.update({
                where: { url },
                data: {
                  status: "success",
                  httpStatus: resTry.status,
                  documentId: doc.id,
                },
              });
              foundThisYear++;
              consecutiveNotFound = 0;
              stats.downloaded++;
              return;
            }
          }

          // HEAD ok or disabled: proceed with GET
          console.log(`${pfx(year, index)} ⬇️ GET ${url}`);
          const res = await axiosGet.get<ArrayBuffer>(url, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent":
                opt.userAgent ??
                "Mozilla/5.0 (compatible; decrets-crawler/0.1)",
            },
            timeout: opt.timeoutMs ?? DEFAULTS.timeoutMs,
            maxRedirects: 5,
          });
          if (res.status === 404) {
            console.log(`${pfx(year, index)} 🚫 GET 404 → not_found`);
            consecutiveNotFound++;
            stats.notFound++;
            await prisma.crawlUrl.update({
              where: { url },
              data: { status: "not_found", httpStatus: 404 },
            });
            return;
          }

          const pdfBuffer = Buffer.from(res.data);
          console.log(
            `${pfx(year, index)} ⬇️ GET ok → ${res.status} (${
              pdfBuffer.byteLength
            } o)`
          );

          // OCR
          console.log(`${pfx(year, index)} 🧠 OCR en cours...`);
          const { text, meta } = await extractTextFromPDFBufferSmartWithKeys(
            pdfBuffer,
            opt.apiKeys,
            {
              language: opt.language ?? "fre",
              detectOrientation: true,
              scale: true,
              isTable: false,
              OCREngine: 2,
            },
            opt.maxOcrKB ?? 1024,
            3
          );
          console.log(
            `${pfx(year, index)} 🧠 OCR ok (${text.length} caractères)`
          );

          // Classification & filtres
          const excl = shouldExclude({
            title: undefined,
            text,
            url,
            tag: undefined,
          });
          if (excl.exclude) {
            console.log(
              `${pfx(year, index)} 🧹 Exclu par règle (${
                excl.category ?? "filter"
              }) → pas d'enregistrement`
            );
            await prisma.crawlUrl.update({
              where: { url },
              data: { status: "excluded", httpStatus: res.status },
            });
            stats.skipped++;
            return;
          }

          // Save document
          const doc = await prisma.document.upsert({
            where: { url },
            update: {
              text,
              bytes: pdfBuffer.byteLength,
              ocrProvider: meta.provider,
              year,
              index,
              category: undefined,
              isExcluded: false,
            },
            create: {
              url,
              year,
              index,
              text,
              bytes: pdfBuffer.byteLength,
              ocrProvider: meta.provider,
              category: undefined,
              isExcluded: false,
            },
          });
          console.log(
            `${pfx(year, index)} 💾 Document enregistré (id=${doc.id})`
          );

          await prisma.crawlUrl.update({
            where: { url },
            data: {
              status: "success",
              httpStatus: res.status,
              documentId: doc.id,
            },
          });
          console.log(`${pfx(year, index)} ✅ Terminé`);

          foundThisYear++;
          consecutiveNotFound = 0;
          stats.downloaded++;
        } catch (e: any) {
          stats.errors++;
          console.error(`${pfx(year, index)} ❌ Erreur:`, e?.message ?? e);
          await prisma.crawlUrl.update({
            where: { url },
            data: {
              status: "error",
              lastError: String(e?.message ?? e),
              httpStatus: undefined,
            },
          });
        }
      });
      tasks.push(t);

      if (tasks.length % 200 === 0) {
        await Promise.all(tasks.splice(0));
      }
      i++;
    }

    await Promise.all(tasks);
  }

  return stats;
}
