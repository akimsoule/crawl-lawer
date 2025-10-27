// Centralise les appels API côté front

export type DocumentItem = {
  id: number;
  year: number;
  index: number;
  title?: string | null;
  url: string;
  text: string;
  ocrProvider?: string | null;
  ocrConfidence?: number | null;
  tag?: string | null;
  bytes?: number | null;
  createdAt?: string;
  category?: string | null;
};

export type ListDocumentsParams = {
  q?: string;
  year?: string | number;
  page?: number;
  limit?: number;
};

export async function listDocuments(params: ListDocumentsParams = {}) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", String(params.q));
  if (params.year && params.year !== 'all') usp.set("year", String(params.year));
  usp.set("page", String(params.page ?? 1));
  usp.set("limit", String(params.limit ?? 20));

  const res = await fetch(`/api/documents?${usp.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ items: DocumentItem[]; total: number; page: number; pageSize: number }>;
}

export async function updateDocument(id: number, data: { text?: string; title?: string }) {
  const res = await fetch(`/api/documents?id=${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export type FilterItem = {
  id: number;
  type: 'exclude' | 'include' | 'protect';
  field: 'title' | 'text' | 'url' | 'tag' | 'category';
  mode: 'contains' | 'regex' | 'startsWith' | 'endsWith';
  pattern: string;
  active: boolean;
  createdAt: string;
};

export async function listFilters() {
  const res = await fetch('/api/filters');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ items: FilterItem[] }>;
}

export async function createFilter(data: Pick<FilterItem, 'type' | 'field' | 'mode' | 'pattern'> & { active?: boolean }) {
  const res = await fetch('/api/filters', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteFilter(id: number) {
  const res = await fetch(`/api/filters?id=${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export type CronRunItem = {
  id: number;
  startedAt: string;
  durationSec: number;
  attempted?: number;
  downloaded?: number;
  notFound?: number;
  errors?: number;
  skipped?: number;
  extra?: any;
};

export async function getCronRuns(params?: { name?: 'latest'|'backfill'|'purge'; limit?: number; since?: string }) {
  const usp = new URLSearchParams();
  if (params?.name) usp.set('name', params.name);
  if (params?.limit) usp.set('limit', String(params.limit));
  if (params?.since) usp.set('since', params.since);
  const res = await fetch(`/api/cron-runs?${usp.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ runs: Record<'latest'|'backfill'|'purge', { items: CronRunItem[]; aggregates: any }>; storage: { totalDocs: number; totalBytes: number; storageBudget: number } }>;
}

// Crawl URLs listing
export type CrawlUrlItem = {
  id: number;
  url: string;
  status: string;
  httpStatus?: number | null;
  attempts: number;
  lastVisitedAt?: string | null;
  year?: number | null;
  index?: number | null;
  updatedAt: string;
  uiStatus: string;
};

export async function listCrawlUrls(params?: { status?: string; page?: number; pageSize?: number; q?: string }) {
  const usp = new URLSearchParams();
  if (params?.status) usp.set('status', params.status);
  if (params?.page) usp.set('page', String(params.page));
  if (params?.pageSize) usp.set('pageSize', String(params.pageSize));
  if (params?.q) usp.set('q', params.q);
  const res = await fetch(`/api/crawl-urls?${usp.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ items: (Omit<CrawlUrlItem,'lastVisitedAt'|'updatedAt'> & { lastVisitedAt?: string | null; updatedAt: string })[]; total: number; page: number; pageSize: number }>;
}

// Overview (dashboard)
export async function getOverview() {
  const res = await fetch('/api/overview');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ stats: { totalDocuments: number; totalUrls: number; successRate: number; pendingUrls: number }, trends: { documents: { value: number; isPositive: boolean }, urls: { value: number; isPositive: boolean }, successRate: { value: number; isPositive: boolean } }, recent: { id: number; title: string; time: string; status: 'success'|'failed'|'processing'|'pending' }[], providers: { name: string; count: number; percentage: number }[] }>;
}
