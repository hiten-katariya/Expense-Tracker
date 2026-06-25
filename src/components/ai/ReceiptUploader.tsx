import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Scan, Loader2, Sparkles, FileText } from 'lucide-react';
import { Button } from '../Button';
import { toast } from 'sonner';

interface ReceiptUploaderProps {
  onParsed: (data: {
    merchant: string | null;
    amount: number | null;
    date: string | null;
    currency: string | null;
    paymentMethod: string | null;
    categoryName: string | null;
    notes: string | null;
  }) => void;
  isScanning: boolean;
  onScanFile: (base64Image: string) => Promise<any>;
}

export function ReceiptUploader({ onParsed, isScanning, onScanFile }: ReceiptUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [scanStep, setScanStep] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type. Please upload a receipt image (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = (reader.result as string).split(',')[1];
      setScanStep('Running OCR Engine...');
      try {
        setScanStep('Tesseract OCR scan active...');
        const result = await onScanFile(base64Str);
        setScanStep('Gemini Cleanup & classification...');
        if (result.parsedData) {
          onParsed(result.parsedData);
          toast.success('Receipt scanned and fields autofilled!');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to scan receipt image.');
      } finally {
        setScanStep(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
        dragActive
          ? 'border-primary-500 bg-primary-500/5'
          : 'border-foreground/15 bg-foreground/[0.01] hover:border-foreground/30'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {isScanning ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-secondary-500 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">AI Receipt Processing</p>
            <p className="text-xs text-foreground/60 mt-1">{scanStep || 'Extracting parameters...'}</p>
          </div>
          <div className="w-48 bg-foreground/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-full w-2/3 animate-[pulse_1.5s_infinite]" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-foreground/5 flex items-center justify-center text-foreground/50 border border-foreground/5 group-hover:scale-105 transition-all">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Scan physical receipt with AI</p>
            <p className="text-xs text-foreground/45 mt-1">Drag receipt image here, or browse computer</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Scan className="h-4 w-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Select Receipt Image
          </Button>
        </div>
      )}
    </div>
  );
}
export default ReceiptUploader;
