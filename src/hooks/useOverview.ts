import { useQuery } from "@tanstack/react-query";
import { getOverview } from "@/services/api";

export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: () => getOverview() });
}
