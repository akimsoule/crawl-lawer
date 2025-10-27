import { useEffect, useState } from "react";
import { Search, Filter, FileText, ExternalLink, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useDocuments, useUpdateDocument } from "@/hooks/useDocuments";
import type { DocumentItem } from "@/services/api";

function ocrConfidenceClass(v?: number | null) {
  if (v == null) return "text-muted-foreground";
  if (v >= 95) return "text-success";
  if (v >= 85) return "text-warning";
  return "text-destructive";
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();
  const docsQuery = useDocuments({ q: searchQuery || undefined, year: yearFilter === 'all' ? undefined : yearFilter, page, limit: pageSize });
  const items = docsQuery.data?.items ?? [];
  const total = docsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const loading = docsQuery.isLoading || docsQuery.isFetching;

  // Réinitialiser la page si la recherche/filtre change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, yearFilter]);

  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [editText, setEditText] = useState("");

  const openEdit = (doc: any) => {
    setEditDoc(doc);
    setEditText(doc.text ?? "");
    setEditOpen(true);
  };

  const updateMutation = useUpdateDocument();
  const saveEdit = async () => {
    if (!editDoc) return;
    try {
      await updateMutation.mutateAsync({ id: editDoc.id, text: editText });
      toast({ title: "Texte mis à jour" });
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: "Échec de la sauvegarde", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Gérez vos documents crawlés et analysés</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher dans les documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les années</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2022">2022</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pagination top */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {loading ? 'Chargement…' : `Total: ${total} documents`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
          <span>Page {page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {items.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {doc.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {doc.year}-{String(doc.index).padStart(4, "0")}
                    <span className="text-muted-foreground">•</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Voir source <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {doc.tag && <Badge variant="outline">{doc.tag}</Badge>}
                  <Button size="sm" variant="outline" onClick={() => openEdit(doc)}>
                    <Pencil className="h-4 w-4 mr-1" /> Éditer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{doc.text}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">OCR:</span> {doc.ocrProvider}
                </div>
                <div>
                  <span className="font-medium">Confiance:</span>{" "}
                  <span className={ocrConfidenceClass(doc.ocrConfidence)}>
                    {doc.ocrConfidence == null ? "N/A" : `${doc.ocrConfidence}%`}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Taille:</span>{" "}
                  {(doc.bytes / 1024).toFixed(1)} KB
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun document trouvé</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination bottom */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {loading ? 'Chargement…' : `Total: ${total} documents`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
          <span>Page {page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Éditer le texte OCR</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground break-all">{editDoc?.url}</p>
            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={16} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={saveEdit}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
