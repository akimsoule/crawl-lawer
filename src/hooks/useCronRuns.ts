import { useQuery } from "@tanstack/react-query";
import { getCronRuns } from "@/services/api";

export function useCronRuns(params?: { name?: 'latest'|'backfill'|'purge'; limit?: number; since?: string }) {
  return useQuery({ queryKey: ['cron-runs', params ?? {}], queryFn: () => getCronRuns(params) });
}
