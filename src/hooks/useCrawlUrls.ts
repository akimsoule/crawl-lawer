import { useQuery } from "@tanstack/react-query";
import { listCrawlUrls } from "@/services/api";

export function useCrawlUrls(params?: { status?: string; page?: number; pageSize?: number; q?: string }) {
  return useQuery({ queryKey: ['crawl-urls', params ?? {}], queryFn: () => listCrawlUrls(params) });
}
