import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Statistics() {
  // Mock data
  const stats = {
    byYear: [
      { year: 2024, documents: 456, urls: 1234, successRate: 89 },
      { year: 2023, documents: 523, urls: 1456, successRate: 87 },
      { year: 2022, documents: 268, urls: 831, successRate: 85 },
    ],
    byProvider: [
      { name: "Tesseract", documents: 567, avgConfidence: 92.3 },
      { name: "Google Vision", documents: 423, avgConfidence: 96.8 },
      { name: "Azure OCR", documents: 257, avgConfidence: 94.1 },
    ],
    byTag: [
      { tag: "rapport", count: 234 },
      { tag: "documentation", count: 189 },
      { tag: "technique", count: 145 },
      { tag: "legal", count: 98 },
      { tag: "financier", count: 76 },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
        <p className="text-muted-foreground">Analyse détaillée de vos données</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documents par année</CardTitle>
            <CardDescription>Répartition chronologique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.byYear.map((yearData) => (
              <div key={yearData.year} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{yearData.year}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{yearData.documents} documents</p>
                    <p className="text-xs text-muted-foreground">{yearData.urls} URLs</p>
                  </div>
                </div>
                <Progress value={yearData.successRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Taux de succès: {yearData.successRate}%
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Providers OCR</CardTitle>
            <CardDescription>Performance par provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.byProvider.map((provider) => (
              <div key={provider.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{provider.name}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{provider.documents} docs</p>
                    <p className="text-xs text-success">
                      Confiance moy.: {provider.avgConfidence}%
                    </p>
                  </div>
                </div>
                <Progress value={provider.avgConfidence} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Documents par tag</CardTitle>
            <CardDescription>Catégorisation des documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.byTag.map((tagData) => (
                <div
                  key={tagData.tag}
                  className="text-center p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <p className="text-2xl font-bold text-primary">{tagData.count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{tagData.tag}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Métriques de performance</CardTitle>
            <CardDescription>Indicateurs clés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Temps moyen de crawl</p>
                <p className="text-2xl font-bold">3.2s</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Temps moyen OCR</p>
                <p className="text-2xl font-bold">12.5s</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taille moyenne</p>
                <p className="text-2xl font-bold">243 KB</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Confiance moyenne</p>
                <p className="text-2xl font-bold text-success">94.3%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
