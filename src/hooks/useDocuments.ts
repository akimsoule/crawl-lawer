import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listDocuments, updateDocument, type DocumentItem, type ListDocumentsParams } from "@/services/api";

export function useDocuments(params: ListDocumentsParams) {
  const key = ["documents", params];
  const query = useQuery({
    queryKey: key,
    queryFn: () => listDocuments(params),
  });
  return query;
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text, title }: { id: number; text?: string; title?: string }) => updateDocument(id, { text, title }),
    onSuccess: (_data, vars) => {
      // Invalidate all docs queries
      qc.invalidateQueries({ queryKey: ["documents"] });
      // Or optimistically update cache entries
      qc.setQueriesData<{ items: DocumentItem[]; total: number; page: number; pageSize: number }>(
        { queryKey: ["documents"] },
        (old) => {
          if (!old) return old;
          const items = old.items.map((it) => (it.id === vars.id ? { ...it, ...(vars.text ? { text: vars.text } : {}), ...(vars.title ? { title: vars.title } : {}) } : it));
          return { ...old, items };
        }
      );
    },
  });
}
