import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics';

export const useAnalytics = (month?: string, year?: string) => {
  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary', month, year],
    queryFn: () => analyticsApi.getMonthlySummary({ month, year }),
  });

  const categoryQuery = useQuery({
    queryKey: ['analytics', 'categories'],
    queryFn: () => analyticsApi.getCategoryBreakdown(),
  });

  const trendsQuery = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: () => analyticsApi.getTrends(),
  });

  const heatmapQuery = useQuery({
    queryKey: ['analytics', 'heatmap'],
    queryFn: () => analyticsApi.getHeatmap(),
  });

  return {
    summary: summaryQuery.data?.data,
    isLoadingSummary: summaryQuery.isPending,
    categories: categoryQuery.data?.data,
    trends: trendsQuery.data?.data,
    heatmap: heatmapQuery.data?.data,
  };
};
