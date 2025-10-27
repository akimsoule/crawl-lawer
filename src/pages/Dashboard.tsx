import { FileText, Link, CheckCircle2, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverview } from "@/hooks/useOverview";

export default function Dashboard() {
  const { data } = useOverview();
  const stats = data?.stats ?? { totalDocuments: 0, totalUrls: 0, successRate: 0, pendingUrls: 0 };
  const trends = data?.trends;
  const recent = data?.recent ?? [];
  const providers = data?.providers ?? [];
  const skipKnown404 = data?.skipKnown404;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre système de crawling</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Documents totaux"
          value={stats.totalDocuments}
          icon={FileText}
          trend={trends?.documents}
        />
        <StatCard
          title="URLs crawlées"
          value={stats.totalUrls}
          icon={Link}
          trend={trends?.urls}
        />
        <StatCard
          title="Taux de succès"
          value={`${stats.successRate}%`}
          icon={CheckCircle2}
          trend={trends?.successRate}
        />
        <StatCard
          title="URLs en attente"
          value={stats.pendingUrls}
          icon={AlertCircle}
        />
        <StatCard
          title="Sauts 404 (24h)"
          value={skipKnown404?.recentTotal ?? 0}
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Documents traités cette semaine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent.map((item) => {
                let color = 'bg-warning';
                if (item.status === 'success') color = 'bg-success';
                else if (item.status === 'failed') color = 'bg-destructive';
                return (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.time).toLocaleString()}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                  </div>
                );
              })}
              {recent.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucune activité récente</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Providers OCR</CardTitle>
            <CardDescription>Répartition par provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{provider.name}</span>
                    <span className="text-muted-foreground">{provider.count} documents</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${provider.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {providers.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucune donnée provider</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
