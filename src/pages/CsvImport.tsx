import { useState, useRef, useCallback, Fragment, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCategories, useImportExpenses, useExpenses } from '@/hooks/useQueries';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { parseCSV, mapRow, computeDuplicateScore, downloadCSV, type ColumnMapping } from '@/lib/csvParser';
import type { ImportedRow } from '@/types';
import {
  Upload, ArrowLeft, ArrowRight, Check, X, AlertTriangle, FileText,
  DownloadCloud, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Upload', 'Map Columns', 'Preview & Validate', 'Import'] as const;
type Step = 0 | 1 | 2 | 3;

const EXPENSE_FIELDS = [
  { key: 'title', label: 'Title *', required: true },
  { key: 'amount', label: 'Amount *', required: true },
  { key: 'expense_date', label: 'Date *', required: true },
  { key: 'category_name', label: 'Category (name)', required: false },
  { key: 'payment_method', label: 'Payment Method', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'tags', label: 'Tags (comma-sep.)', required: false },
] as const;

export function CsvImportPage() {
  const navigate = useNavigate();
  const { workspace, profile } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const { data: categories = [] } = useCategories(workspaceId);
  const { data: expenseData } = useExpenses(workspaceId, {}, 1, 500);
  const importExpenses = useImportExpenses();

  const [step, setStep] = useState<Step>(0);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    title: null, amount: null, expense_date: null,
    category_name: null, payment_method: null, notes: null, tags: null,
  });
  const [previewRows, setPreviewRows] = useState<ImportedRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; failedRows: unknown[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────────
  // STEP 1: Upload
  // ──────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
      addNotification({ type: 'error', title: 'Invalid file', message: 'Please upload a .csv file.' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      addNotification({ type: 'error', title: 'File too large', message: 'CSV must be under 5 MB.' });
      return;
    }
    const parsed = await parseCSV(f);
    if (parsed.length < 2) {
      addNotification({ type: 'error', title: 'Empty file', message: 'CSV has no data rows.' });
      return;
    }
    setFile(f);
    setHeaders(parsed[0]);
    setRawRows(parsed.slice(1));
    // Auto-detect mapping by header name
    const autoMap: ColumnMapping = { title: null, amount: null, expense_date: null, category_name: null, payment_method: null, notes: null, tags: null };
    parsed[0].forEach((h, i) => {
      const lower = h.toLowerCase();
      if (/title|name|description|desc/.test(lower)) autoMap.title = i;
      else if (/amount|price|cost|total/.test(lower)) autoMap.amount = i;
      else if (/date|day/.test(lower)) autoMap.expense_date = i;
      else if (/categ/.test(lower)) autoMap.category_name = i;
      else if (/payment|method|mode/.test(lower)) autoMap.payment_method = i;
      else if (/note|remark|comment/.test(lower)) autoMap.notes = i;
      else if (/tag/.test(lower)) autoMap.tags = i;
    });
    setMapping(autoMap);
    setStep(1);
  }, [addNotification]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ──────────────────────────────────────────────
  // STEP 2 → 3: Build preview
  // ──────────────────────────────────────────────
  const buildPreview = () => {
    const existing = expenseData?.data ?? [];
    const rows = rawRows.map((raw, i) => {
      const row = mapRow(raw, mapping, i, categories);
      row._duplicateScore = computeDuplicateScore(row, existing.map((e) => ({
        title: e.title, amount: e.amount, expense_date: e.expense_date, category_id: e.category_id,
      })));
      if (row._duplicateScore >= 0.8) row._skip = true;
      return row;
    });
    setPreviewRows(rows);
    setStep(2);
  };

  // ──────────────────────────────────────────────
  // STEP 3 → 4: Import
  // ──────────────────────────────────────────────
  const handleImport = async () => {
    if (!workspaceId || !profile?.id) return;
    setStep(3);
    const toImport = previewRows
      .filter((r) => !r._skip && r._valid)
      .map((r) => ({
        title: r.title,
        amount: r.amount,
        expense_date: r.expense_date,
        category_id: r.category_id || null,
        payment_method: (r.payment_method || 'other') as 'cash' | 'card' | 'upi' | 'netbanking' | 'other',
        notes: r.notes || null,
        tags: r.tags || [],
        expense_scope: 'personal' as const,
        currency_code: workspace?.default_currency_code || 'INR',
        is_recurring: false,
        is_flagged: false,
        is_deleted: false,
      }));

    const toastId = toast.loading("Importing expenses...");
    try {
      const result = await importExpenses.mutateAsync({ rows: toImport, workspaceId, userId: profile.id });
      setImportResult(result);
      toast.success("✅ Import Complete", {
        id: toastId,
        description: `Expenses imported successfully. ${result.imported} imported, ${result.failed} failed.`
      });
    } catch (err: unknown) {
      const e = err as Error;
      toast.error("❌ Import Failed", {
        id: toastId,
        description: e.message || 'Unknown error'
      });
      addNotification({ type: 'error', title: 'Import failed', message: e.message || 'Unknown error' });
      setStep(2);
    }
  };

  const toggleRowSkip = (idx: number) => {
    setPreviewRows((prev) => prev.map((r, i) => i === idx ? { ...r, _skip: !r._skip } : r));
  };

  const validCount = previewRows.filter((r) => !r._skip && r._valid).length;
  const dupCount   = previewRows.filter((r) => r._duplicateScore >= 0.8).length;
  const errorCount = previewRows.filter((r) => !r._valid).length;

  const requiredMapped = mapping.title != null && mapping.amount != null && mapping.expense_date != null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <IconButton variant="ghost" onClick={() => navigate('/expenses')}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Expenses</h1>
          <p className="text-foreground/55 text-sm">Upload a CSV file to bulk import expenses</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <Fragment key={label}>
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              i < step ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400' :
              i === step ? 'bg-primary-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]' :
              'bg-foreground/5 text-foreground/35'
            )}>
              {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-foreground/20 shrink-0" />}
          </Fragment>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 0 && (
        <Card>
          <CardContent className="p-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
                dragOver ? 'border-primary-500 bg-primary-500/5' : 'border-foreground/15 hover:border-primary-500/40 hover:bg-foreground/[0.02]'
              )}
            >
              <div className="h-16 w-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-primary-500" />
              </div>
              <p className="font-semibold text-foreground text-lg mb-1">Drop your CSV file here</p>
              <p className="text-foreground/50 text-sm mb-4">or click to browse · Max 5 MB · .csv only</p>
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Choose file
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>
            <div className="mt-6 rounded-xl border border-foreground/10 bg-foreground/[0.01] p-4">
              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">Expected format</p>
              <code className="text-xs text-foreground/60 font-mono">Title, Amount, Date, Category, Payment Method, Notes</code>
              <br />
              <code className="text-xs text-foreground/40 font-mono">Groceries, 450.00, 2024-06-01, Food, cash, Big Bazaar</code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Column Mapping ── */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-primary-500" />
              <div>
                <p className="font-semibold text-foreground">{file?.name}</p>
                <p className="text-xs text-foreground/50">{rawRows.length} data rows detected</p>
              </div>
            </div>

            <p className="text-sm text-foreground/60">Map your CSV columns to expense fields. Fields marked * are required.</p>

            <div className="space-y-3">
              {EXPENSE_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className={cn('text-sm w-44 shrink-0', key === 'title' || key === 'amount' || key === 'expense_date' ? 'font-medium text-foreground' : 'text-foreground/60')}>
                    {label}
                  </span>
                  <select
                    value={mapping[key as keyof ColumnMapping] ?? ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value !== '' ? Number(e.target.value) : null }))}
                    className="flex-1 px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">— skip —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h} (col {i + 1})</option>
                    ))}
                  </select>
                  {/* Sample value */}
                  <span className="text-xs text-foreground/35 w-32 truncate hidden sm:block">
                    {mapping[key as keyof ColumnMapping] != null ? rawRows[0]?.[mapping[key as keyof ColumnMapping]!] : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setStep(0)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
              <Button onClick={buildPreview} disabled={!requiredMapped} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Preview {rawRows.length} rows
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Preview ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Will import', value: validCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/8' },
              { label: 'Duplicates (skipped)', value: dupCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/8' },
              { label: 'Invalid rows', value: errorCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/8' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl p-4 ${bg} border border-foreground/5 text-center`}>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/[0.01]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/40 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/40 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/40 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground/40 uppercase tracking-wider">Import</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {previewRows.slice(0, 100).map((row, i) => (
                    <tr key={i} className={cn('transition-colors', row._skip ? 'opacity-45' : 'hover:bg-foreground/[0.015]')}>
                      <td className="px-4 py-3 text-foreground/35 text-xs">{row._rowIndex + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground truncate max-w-[160px]">{row.title || <span className="text-red-500 italic">missing</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{row.amount > 0 ? `₹${row.amount.toFixed(2)}` : <span className="text-red-500 italic">invalid</span>}</td>
                      <td className="px-4 py-3 text-foreground/60 hidden sm:table-cell">{row.expense_date}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {!row._valid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <X className="h-3 w-3" />{row._errors[0]}
                          </span>
                        ) : row._duplicateScore >= 0.8 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />{Math.round(row._duplicateScore * 100)}% duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" />Ready
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleRowSkip(i)}
                          title={row._skip ? 'Click to include' : 'Click to skip'}
                          className={cn(
                            'h-5 w-5 rounded border-2 flex items-center justify-center mx-auto transition-all',
                            !row._skip ? 'border-primary-500 bg-primary-500 text-white' : 'border-foreground/20 bg-transparent'
                          )}
                        >
                          {!row._skip && <Check className="h-3 w-3" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 100 && (
                <p className="px-6 py-3 text-xs text-foreground/40 text-center border-t border-foreground/5">
                  Showing first 100 of {previewRows.length} rows. All rows will be imported.
                </p>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            <Button onClick={handleImport} disabled={validCount === 0} isLoading={importExpenses.isPending}>
              Import {validCount} expense{validCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Result ── */}
      {step === 3 && (
        <Card>
          <CardContent className="p-10 text-center space-y-6">
            {importExpenses.isPending ? (
              <>
                <div className="h-14 w-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-foreground/60 font-medium">Importing expenses in batches…</p>
              </>
            ) : importResult ? (
              <>
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Import Complete!</h2>
                  <p className="text-foreground/55 mt-1">{importResult.imported} expenses imported successfully</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto text-left">
                  <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.imported}</p>
                    <p className="text-xs text-foreground/50">Imported</p>
                  </div>
                  <div className="rounded-xl bg-red-500/8 border border-red-500/15 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{importResult.failed}</p>
                    <p className="text-xs text-foreground/50">Failed</p>
                  </div>
                </div>
                {importResult.failed > 0 && (
                  <Button
                    variant="secondary"
                    leftIcon={<DownloadCloud className="h-4 w-4" />}
                    onClick={() => downloadCSV(importResult.failedRows as Record<string, unknown>[], 'failed-imports.csv')}
                  >
                    Download failed rows
                  </Button>
                )}
                <Button onClick={() => navigate('/expenses')}>Go to Expenses</Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
