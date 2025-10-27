import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCreateFilter, useDeleteFilter, useFilters } from "@/hooks/useFilters";

export default function Filters() {
  const { data, isLoading } = useFilters();
  const items = data?.items ?? [];
  const [pattern, setPattern] = useState("");
  const [field, setField] = useState("text");
  const [mode, setMode] = useState("contains");
  const [type, setType] = useState("exclude");
  const { toast } = useToast();

  const createMutation = useCreateFilter();
  const deleteMutation = useDeleteFilter();

  const add = async () => {
    if (!pattern.trim()) return;
    try {
      await createMutation.mutateAsync({ pattern, field: field as any, mode: mode as any, type: type as any, active: true });
      toast({ title: "Filtre ajouté" });
      setPattern("");
    } catch (e: any) {
      toast({ title: "Échec de l'ajout", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Filtres</h1>
  <p className="text-muted-foreground">Gérez les filtres d'exclusion (crawl) et de protection (purge)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un filtre</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          <Select value={field} onValueChange={setField}>
            <SelectTrigger><SelectValue placeholder="Champ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Titre</SelectItem>
              <SelectItem value="text">Texte</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="tag">Tag</SelectItem>
              <SelectItem value="category">Catégorie</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="contains">Contient</SelectItem>
              <SelectItem value="startsWith">Commence par</SelectItem>
              <SelectItem value="endsWith">Finit par</SelectItem>
              <SelectItem value="regex">Regex</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="exclude">Exclure</SelectItem>
              <SelectItem value="include">Inclure</SelectItem>
              <SelectItem value="protect">Protéger (anti-purge)</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Motif" value={pattern} onChange={(e) => setPattern(e.target.value)} />
          <Button onClick={add}>Ajouter</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtres existants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {items.map((f) => (
              <div key={f.id} className="flex items-center justify-between border rounded-md p-2">
                <div className="text-sm">
                  <div className="font-medium">[{f.type}] {f.field} {f.mode} "{f.pattern}"</div>
                  <div className="text-muted-foreground">créé le {new Date(f.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Button variant="outline" onClick={() => remove(f.id)}>Supprimer</Button>
                </div>
              </div>
            ))}
            {items.length === 0 && !isLoading && <div className="text-sm text-muted-foreground">Aucun filtre</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
