import { crawl } from './services/crawler';

type CLIOptions = {
  startYear?: number;
  endYear?: number;
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
};

const DEFAULTS = {
  concurrency: 5,
  gapLimit: 100,
  timeoutMs: 10000,
  headCheck: true,
  language: 'fre',
};

function parseArgs(argv: string[]): Required<CLIOptions> {
  const args = new Map<string, string | boolean>();
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.split('=');
      const key = k.replace(/^--/, '');
      if (v === undefined) {
        const next = argv[i + 1];
        if (next && !next.startsWith('-')) {
          args.set(key, next);
          i++;
        } else {
          args.set(key, true);
        }
      } else {
        args.set(key, v);
      }
    }
  }

  const now = new Date();
  const startYear = Number(args.get('start-year') ?? now.getFullYear());
  const endYear = Number(args.get('end-year') ?? now.getFullYear());
  const concurrency = Number(args.get('concurrency') ?? DEFAULTS.concurrency);
  const limitYears = args.get('limit-years') ? Number(args.get('limit-years')) : 0;
  const limitPerYear = args.get('limit-per-year') ? Number(args.get('limit-per-year')) : 0;
  const gapLimit = Number(args.get('gap-limit') ?? DEFAULTS.gapLimit);
  const userAgent = String(args.get('user-agent') ?? 'Mozilla/5.0 (compatible; decrets-crawler/0.1)');
  const startIndex = args.get('start-index') ? Number(args.get('start-index')) : 1;
  const endIndex = args.get('end-index') ? Number(args.get('end-index')) : Number.MAX_SAFE_INTEGER;
  const timeoutMs = Number(args.get('timeout-ms') ?? DEFAULTS.timeoutMs);
  const headCheck = args.get('head-check') === undefined ? DEFAULTS.headCheck : Boolean(args.get('head-check'));
  const language = String(args.get('language') ?? DEFAULTS.language);

  return { startYear, endYear, concurrency, limitYears, limitPerYear, gapLimit, userAgent, startIndex, endIndex, timeoutMs, headCheck, language };
}

async function main() {
  const opt = parseArgs(process.argv);
  const apiEnv = process.env.OCR_API_KEY;
  if (!apiEnv) {
    throw new Error('OCR_API_KEY manquant dans .env');
  }
  const apiKeys = apiEnv
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (apiKeys.length === 0) {
    throw new Error('Aucune clé OCR_API_KEY valide trouvée');
  }

  console.log(`Crawl ${opt.startYear} -> ${opt.endYear} (concurrency=${opt.concurrency})`);
  const stats = await crawl({
    ...opt,
    apiKeys,
  });

  console.log(`\nRésumé: ${stats.downloaded} OCR ok, ${stats.notFound} 404, ${stats.errors} erreurs, ${stats.skipped} ignorés (tentatives=${stats.attempted})`);
}

main().catch((e) => {
  console.error('Erreur fatale', e);
  process.exit(1);
});
