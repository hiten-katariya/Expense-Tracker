import type { ImportedRow, Category } from '@/types';

/** Parse a CSV file into a 2D array of strings. Handles quoted fields. */
export async function parseCSV(file: File): Promise<string[][]> {
  const text = await file.text();
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let inQuote = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    rows.push(cols);
  }
  return rows;
}

export interface ColumnMapping {
  title: number | null;
  amount: number | null;
  expense_date: number | null;
  category_name: number | null;
  payment_method: number | null;
  notes: number | null;
  tags: number | null;
}

/** Convert a raw CSV row into an ImportedRow using the column mapping. */
export function mapRow(
  rawRow: string[],
  mapping: ColumnMapping,
  rowIndex: number,
  categories: Category[]
): ImportedRow {
  const errors: string[] = [];

  const title = mapping.title != null ? rawRow[mapping.title]?.trim() : '';
  if (!title) errors.push('Title is required');

  const rawAmount = mapping.amount != null ? rawRow[mapping.amount] : '';
  const amount = parseFloat(rawAmount?.replace(/[^0-9.-]/g, '') || '');
  if (isNaN(amount) || amount <= 0) errors.push('Amount must be a positive number');

  const rawDate = mapping.expense_date != null ? rawRow[mapping.expense_date]?.trim() : '';
  const parsedDate = rawDate ? parseDate(rawDate) : null;
  if (!parsedDate) errors.push('Date is required and must be YYYY-MM-DD, DD/MM/YYYY or MM/DD/YYYY');

  const rawCategoryName = mapping.category_name != null ? rawRow[mapping.category_name]?.trim() : '';
  const matchedCategory = rawCategoryName
    ? categories.find((c) => c.name.toLowerCase() === rawCategoryName.toLowerCase())
    : null;

  const rawPayment = mapping.payment_method != null ? rawRow[mapping.payment_method]?.trim().toLowerCase() : '';
  const validPayments = ['cash', 'card', 'upi', 'netbanking', 'other'];
  const payment_method = validPayments.includes(rawPayment) ? rawPayment : 'other';

  const notes = mapping.notes != null ? rawRow[mapping.notes]?.trim() || null : null;
  const rawTags = mapping.tags != null ? rawRow[mapping.tags]?.trim() : '';
  const tags = rawTags ? rawTags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [];

  return {
    _rowIndex: rowIndex,
    title: title || '',
    amount: isNaN(amount) ? 0 : amount,
    expense_date: parsedDate || new Date().toISOString().split('T')[0],
    category_id: matchedCategory?.id ?? null,
    payment_method,
    notes,
    tags,
    _valid: errors.length === 0,
    _errors: errors,
    _duplicateScore: 0,
    _skip: errors.length > 0,
  };
}

/** Parse various date formats to YYYY-MM-DD */
function parseDate(raw: string): string | null {
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or MM/DD/YYYY
  const parts = raw.split(/[\/\-.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    // Assume YYYY last
    if (parts[2].length === 4) {
      const year = c;
      // Day/Month — validate month <= 12
      if (b <= 12) return `${year}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
    }
    // YYYY first
    if (parts[0].length === 4) {
      return `${a}-${String(b).padStart(2,'0')}-${String(c).padStart(2,'0')}`;
    }
  }
  // Try native Date parse as last resort
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

/** Compute a 0–1 duplicate confidence score between an imported row and existing expenses. */
export function computeDuplicateScore(
  row: ImportedRow,
  existing: { title: string; amount: number; expense_date: string; category_id: string | null }[]
): number {
  for (const e of existing) {
    let score = 0;
    if (e.expense_date === row.expense_date) score += 0.4;
    if (Math.abs(e.amount - row.amount) < 0.01) score += 0.4;
    if (e.title.toLowerCase().trim() === row.title.toLowerCase().trim()) score += 0.15;
    if (row.category_id && e.category_id === row.category_id) score += 0.05;
    if (score >= 0.8) return score;
  }
  return 0;
}

/** Download an array of objects as a CSV file. */
export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
