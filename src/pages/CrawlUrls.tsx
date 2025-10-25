import { useState } from "react";
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

export default function CrawlUrls() {
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data
  const crawlUrls = [
    {
      id: 1,
      url: "https://example.com/document-2024-123.pdf",
      status: "completed",
      httpStatus: 200,
      attempts: 1,
      lastVisitedAt: "2024-01-15 14:30",
      year: 2024,
      index: 123,
    },
    {
      id: 2,
      url: "https://example.com/document-2024-124.pdf",
      status: "pending",
      httpStatus: null,
      attempts: 0,
      lastVisitedAt: null,
      year: null,
      index: null,
    },
    {
      id: 3,
      url: "https://example.com/document-2024-125.pdf",
      status: "failed",
      httpStatus: 404,
      attempts: 3,
      lastVisitedAt: "2024-01-15 12:15",
      lastError: "Page not found",
      year: null,
      index: null,
    },
    {
      id: 4,
      url: "https://example.com/document-2024-126.pdf",
      status: "processing",
      httpStatus: 200,
      attempts: 1,
      lastVisitedAt: "2024-01-15 15:45",
      year: 2024,
      index: 126,
    },
  ];

  const filteredUrls = crawlUrls.filter((url) =>
    statusFilter === "all" ? true : url.status === statusFilter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 text-warning animate-spin" />;
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
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rafraîchir
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="processing">En cours</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
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
                  <TableCell>{getStatusIcon(crawlUrl.status)}</TableCell>
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
                    <StatusBadge status={crawlUrl.status} />
                    {crawlUrl.httpStatus && (
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
                    {crawlUrl.lastVisitedAt || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
