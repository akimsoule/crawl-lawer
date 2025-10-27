import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCronRuns } from "@/hooks/useCronRuns";
import { Separator } from "@/components/ui/separator";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Statistics() {
  const [cronName, setCronName] = useState<'all'|'latest'|'backfill'|'purge'>('all');
  const [limit, setLimit] = useState(10);
  const [since, setSince] = useState<string>(""); // YYYY-MM-DD

  const params = useMemo(() => {
    const p: any = { limit };
    if (cronName !== 'all') p.name = cronName;
    if (since) {
      try {
        const iso = new Date(since).toISOString();
        p.since = iso;
      } catch {}
    }
    return p;
  }, [cronName, limit, since]);

  const { data, isLoading } = useCronRuns(params);
  const runs = data?.runs;
  const storage = data?.storage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
        <p className="text-muted-foreground">Analyse détaillée de vos données</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={cronName} onValueChange={(v) => setCronName(v as any)}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Cron" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les crons</SelectItem>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="backfill">Backfill</SelectItem>
            <SelectItem value="purge">Purge</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Limite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 derniers</SelectItem>
            <SelectItem value="20">20 derniers</SelectItem>
            <SelectItem value="50">50 derniers</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 sm:max-w-[240px]">
          <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} placeholder="Depuis le" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(cronName === 'all' || cronName === 'latest') && (
        <Card>
          <CardHeader>
            <CardTitle>Activité cron: latest</CardTitle>
            <CardDescription>Derniers runs et moyennes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {isLoading ? 'Chargement…' : (
                <>
                  <div>Moy. durée: {runs?.latest?.aggregates?.avgDuration?.toFixed?.(2)}s</div>
                  <div>Moy. erreurs: {runs?.latest?.aggregates?.avgErrors?.toFixed?.(2)}</div>
                </>
              )}
            </div>
            <Separator />
            <div className="space-y-2 max-h-64 overflow-auto">
              {(runs?.latest?.items ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</div>
                  <div className="flex items-center gap-3">
                    <span>{r.durationSec.toFixed(2)}s</span>
                    <span className={r.errors ? 'text-destructive' : 'text-muted-foreground'}>err: {r.errors ?? 0}</span>
                    <span className="text-muted-foreground">ok: {r.downloaded ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {(cronName === 'all' || cronName === 'backfill') && (
        <Card>
          <CardHeader>
            <CardTitle>Activité cron: backfill</CardTitle>
            <CardDescription>Derniers runs et moyennes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {isLoading ? 'Chargement…' : (
                <>
                  <div>Moy. durée: {runs?.backfill?.aggregates?.avgDuration?.toFixed?.(2)}s</div>
                  <div>Moy. erreurs: {runs?.backfill?.aggregates?.avgErrors?.toFixed?.(2)}</div>
                </>
              )}
            </div>
            <Separator />
            <div className="space-y-2 max-h-64 overflow-auto">
              {(runs?.backfill?.items ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</div>
                  <div className="flex items-center gap-3">
                    <span>{r.durationSec.toFixed(2)}s</span>
                    <span className={r.errors ? 'text-destructive' : 'text-muted-foreground'}>err: {r.errors ?? 0}</span>
                    <span className="text-muted-foreground">ok: {r.downloaded ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {(cronName === 'all') && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Stockage et purge</CardTitle>
            <CardDescription>Budget et usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Documents total</p>
                <p className="text-2xl font-bold">{storage?.totalDocs ?? 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taille totale</p>
                <p className="text-2xl font-bold">{(((storage?.totalBytes ?? 0) / 1024) / 1024).toFixed(2)} MB</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-2xl font-bold">{(((storage?.storageBudget ?? 0) / 1024) / 1024).toFixed(2)} MB</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Utilisation</p>
                <Progress value={Math.min(100, Math.round(((storage?.totalBytes ?? 0) / (storage?.storageBudget || 1)) * 100))} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.min(100, Math.round(((storage?.totalBytes ?? 0) / (storage?.storageBudget || 1)) * 100))}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {(cronName === 'all' || cronName === 'purge') && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Activité cron: purge</CardTitle>
            <CardDescription>Derniers runs et moyennes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {isLoading ? 'Chargement…' : (
                <>
                  <div>Moy. durée: {runs?.purge?.aggregates?.avgDuration?.toFixed?.(2)}s</div>
                  <div>Moy. erreurs: {runs?.purge?.aggregates?.avgErrors?.toFixed?.(2)}</div>
                </>
              )}
            </div>
            <Separator />
            <div className="space-y-2 max-h-64 overflow-auto">
              {(runs?.purge?.items ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">{new Date(r.startedAt).toLocaleString()}</div>
                  <div className="flex items-center gap-3">
                    <span>{r.durationSec.toFixed(2)}s</span>
                    <span className="text-muted-foreground">deleted: {r.extra?.lastDeleted ?? r.extra?.deleted ?? '-'}</span>
                    <span className="text-muted-foreground">freed: {r.extra?.freedBytes ? ((r.extra.freedBytes/1024/1024).toFixed(2) + ' MB') : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
