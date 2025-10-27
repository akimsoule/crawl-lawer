import { useMemo, useState } from "react";
import { Link, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrawlUrls } from "@/hooks/useCrawlUrls";
import { Input } from "@/components/ui/input";

export default function CrawlUrls() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, refetch, isFetching } = useCrawlUrls({ status: statusFilter === 'all' ? undefined : statusFilter, page, pageSize, q: q.trim() || undefined });
  const crawlUrls = data?.items ?? [];
  const filteredUrls = useMemo(() => crawlUrls, [crawlUrls]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
      case "error":
      case "not_found":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 text-warning animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "excluded":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">URLs à crawler</h1>
          <p className="text-muted-foreground">Gérez la file d'attente de crawling</p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {isFetching ? 'Chargement...' : 'Rafraîchir'}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <Input placeholder="Rechercher par URL" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="success">Succès</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
            <SelectItem value="not_found">Introuvable</SelectItem>
            <SelectItem value="excluded">Exclu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
            <div>Résultats: {data?.total ?? 0}</div>
            <div>Page {data?.page ?? page} / {Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))}</div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Tentatives</TableHead>
                <TableHead>Dernière visite</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUrls.map((crawlUrl) => (
                <TableRow key={crawlUrl.id}>
                  <TableCell>{getStatusIcon((crawlUrl as any).uiStatus ?? crawlUrl.status)}</TableCell>
                  <TableCell className="font-mono text-xs max-w-md truncate">
                    <a
                      href={crawlUrl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {crawlUrl.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={(crawlUrl as any).uiStatus ?? crawlUrl.status} />
                    {!!crawlUrl.httpStatus && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        HTTP {crawlUrl.httpStatus}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {crawlUrl.year && crawlUrl.index ? (
                      <span className="text-sm font-mono">
                        {crawlUrl.year}-{String(crawlUrl.index).padStart(4, "0")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        crawlUrl.attempts > 2
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {crawlUrl.attempts}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {crawlUrl.lastVisitedAt ? new Date(crawlUrl.lastVisitedAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>Précédent</Button>
        <div className="text-sm text-muted-foreground">Page {page} / {Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))}</div>
        <Button variant="outline" onClick={() => setPage((p) => (p < Math.ceil((data?.total ?? 0) / pageSize) ? p + 1 : p))} disabled={isFetching || page >= Math.ceil((data?.total ?? 0) / pageSize)}>Suivant</Button>
      </div>

      {filteredUrls.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune URL trouvée</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
