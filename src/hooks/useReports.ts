import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi } from '@/api/reports';
import { toast } from 'sonner';

export const useReports = () => {
  const getInsightsQuery = (month?: string, year?: string) => useQuery({
    queryKey: ['reports', 'insights', month, year],
    queryFn: () => reportsApi.getMonthlyInsights({ month, year }),
  });

  const exportMutation = useMutation({
    mutationFn: reportsApi.exportReport,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report exported successfully');
    },
  });

  return {
    useInsights: getInsightsQuery,
    exportReport: exportMutation.mutateAsync,
    isExporting: exportMutation.isPending,
  };
};
