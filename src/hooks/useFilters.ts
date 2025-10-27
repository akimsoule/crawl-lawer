import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFilter, deleteFilter, listFilters } from "@/services/api";

export function useFilters() {
  return useQuery({ queryKey: ["filters"], queryFn: () => listFilters() });
}

export function useCreateFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFilter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}

export function useDeleteFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFilter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}
