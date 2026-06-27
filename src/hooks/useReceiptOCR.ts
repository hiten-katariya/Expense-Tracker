import { useMutation } from '@tanstack/react-query';

interface ReceiptOCRResult {
  ocrText: string;
  parsedData: {
    merchant: string | null;
    amount: number | null;
    date: string | null;
    currency: string | null;
    paymentMethod: string | null;
    categoryName: string | null;
    notes: string | null;
  };
  cached: boolean;
  hash: string;
}

export function useReceiptOCR() {
  const scanMutation = useMutation({
    mutationFn: async (payload: {
      image: string; // Base64 representation of image
      userId: string;
      categories: Array<{ id: string; name: string }>;
    }): Promise<ReceiptOCRResult> => {
      const API = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API}/api/ai/scan-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('OCR parsing failed. Ensure file is an image.');
      }

      return response.json();
    },
  });

  return {
    scan: scanMutation.mutateAsync,
    isScanning: scanMutation.isPending,
    error: scanMutation.error,
  };
}
