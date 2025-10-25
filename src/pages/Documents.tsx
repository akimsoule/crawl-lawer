import { useState } from "react";
import { Search, Filter, FileText, ExternalLink } from "lucide-react";
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

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");

  // Mock data
  const documents = [
    {
      id: 1,
      year: 2024,
      index: 123,
      title: "Rapport Annuel 2024",
      url: "https://example.com/doc-2024-123",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      ocrProvider: "Tesseract",
      ocrConfidence: 94.5,
      tag: "rapport",
      bytes: 245678,
    },
    {
      id: 2,
      year: 2024,
      index: 122,
      title: "Guide Utilisateur",
      url: "https://example.com/doc-2024-122",
      text: "Documentation complète pour l'utilisation du système...",
      ocrProvider: "Google Vision",
      ocrConfidence: 98.2,
      tag: "documentation",
      bytes: 187234,
    },
    {
      id: 3,
      year: 2023,
      index: 456,
      title: "Spécifications Techniques",
      url: "https://example.com/doc-2023-456",
      text: "Détails techniques et architecturaux du projet...",
      ocrProvider: "Azure OCR",
      ocrConfidence: 91.7,
      tag: "technique",
      bytes: 312456,
    },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === "all" || doc.year.toString() === yearFilter;
    return matchesSearch && matchesYear;
  });

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

      <div className="grid gap-4">
        {filteredDocuments.map((doc) => (
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
                {doc.tag && <Badge variant="outline">{doc.tag}</Badge>}
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
                  <span
                    className={
                      doc.ocrConfidence >= 95
                        ? "text-success"
                        : doc.ocrConfidence >= 85
                        ? "text-warning"
                        : "text-destructive"
                    }
                  >
                    {doc.ocrConfidence}%
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

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun document trouvé</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
