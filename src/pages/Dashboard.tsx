import { FileText, Link, CheckCircle2, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  // Mock data - à remplacer par de vraies données depuis l'API
  const stats = {
    totalDocuments: 1247,
    totalUrls: 3521,
    successRate: 87.3,
    pendingUrls: 456,
  };

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
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="URLs crawlées"
          value={stats.totalUrls}
          icon={Link}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Taux de succès"
          value={`${stats.successRate}%`}
          icon={CheckCircle2}
          trend={{ value: 3.1, isPositive: true }}
        />
        <StatCard
          title="URLs en attente"
          value={stats.pendingUrls}
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
              {[
                { title: "Document 2024-0123", time: "Il y a 2 heures", status: "success" },
                { title: "Document 2024-0122", time: "Il y a 3 heures", status: "success" },
                { title: "Document 2024-0121", time: "Il y a 5 heures", status: "failed" },
                { title: "Document 2024-0120", time: "Il y a 6 heures", status: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${item.status === "success" ? "bg-success" : "bg-destructive"}`} />
                </div>
              ))}
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
              {[
                { name: "Tesseract", count: 567, percentage: 45 },
                { name: "Google Vision", count: 423, percentage: 34 },
                { name: "Azure OCR", count: 257, percentage: 21 },
              ].map((provider) => (
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
