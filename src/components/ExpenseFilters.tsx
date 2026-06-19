import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, BookmarkPlus, Bookmark, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { ExpenseFilters, FilterPreset } from '@/types';
import { PAYMENT_METHODS } from '@/types';
import { Button } from './Button';
import { cn } from '@/lib/utils';

const PRESET_STORAGE_KEY = 'expense-filter-presets';

function loadPresets(): FilterPreset[] {
  try { return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function savePresets(presets: FilterPreset[]) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

interface ExpenseFiltersProps {
  filters: ExpenseFilters & { sort_field?: string; sort_dir?: 'asc' | 'desc' };
  onChange: (f: ExpenseFilters & { sort_field?: string; sort_dir?: 'asc' | 'desc' }) => void;
}

function countActiveFilters(f: ExpenseFilters & { sort_field?: string; sort_dir?: 'asc' | 'desc' }): number {
  let n = 0;
  if (f.category_id) n++;
  if (f.payment_method) n++;
  if (f.amount_min != null) n++;
  if (f.amount_max != null) n++;
  if (f.expense_scope) n++;
  if (f.date_from) n++;
  if (f.date_to) n++;
  if (f.is_recurring) n++;
  if (f.import_source) n++;
  if (f.has_notes) n++;
  if (f.has_ai_categorized) n++;
  if (f.tags?.length) n++;
  return n;
}

export function AdvancedExpenseFilters({ filters, onChange }: ExpenseFiltersProps) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);

  const activeCount = countActiveFilters(filters);

  const update = useCallback(<K extends keyof typeof filters>(key: K, value: (typeof filters)[K] | undefined) => {
    onChange({ ...filters, [key]: value });
  }, [filters, onChange]);

  const clear = () => onChange({});

  const savePreset = () => {
    if (!presetName.trim()) return;
    const p: FilterPreset = {
      id: crypto.randomUUID(),
      name: presetName.trim(),
      filters,
      createdAt: new Date().toISOString(),
    };
    const updated = [...presets, p];
    setPresets(updated);
    savePresets(updated);
    setPresetName('');
    setShowPresetInput(false);
  };

  const loadPreset = (p: FilterPreset) => { onChange(p.filters); };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresets(updated);
  };

  return (
    <div className="space-y-2">
      {/* Trigger bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all duration-200',
            open || activeCount > 0
              ? 'border-primary-500/40 bg-primary-500/8 text-primary-600 dark:text-primary-400'
              : 'border-foreground/10 bg-card text-foreground/60 hover:text-foreground hover:border-foreground/20'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-500 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
        </button>

        {/* Sort */}
        <select
          value={`${filters.sort_field || 'expense_date'}:${filters.sort_dir || 'desc'}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split(':');
            onChange({ ...filters, sort_field: field, sort_dir: dir as 'asc' | 'desc' });
          }}
          className="px-3 py-2 rounded-xl border border-foreground/10 bg-card text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="expense_date:desc">Date ↓ Newest</option>
          <option value="expense_date:asc">Date ↑ Oldest</option>
          <option value="amount:desc">Amount ↓ Highest</option>
          <option value="amount:asc">Amount ↑ Lowest</option>
          <option value="payment_method:asc">Payment Method A–Z</option>
        </select>

        {/* Presets dropdown */}
        {presets.length > 0 && (
          <div className="relative group">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-foreground/10 bg-card text-sm text-foreground/60 hover:text-foreground hover:border-foreground/20 transition-all">
              <Bookmark className="h-4 w-4" />
              Presets
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-card border border-foreground/10 rounded-xl shadow-xl z-30 py-1.5 hidden group-hover:block">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-foreground/5 rounded-lg mx-1">
                  <button className="flex-1 text-left text-sm text-foreground" onClick={() => loadPreset(p)}>
                    {p.name}
                  </button>
                  <button onClick={() => deletePreset(p.id)} className="text-foreground/30 hover:text-red-500 ml-2">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCount > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border border-foreground/10 rounded-2xl bg-card/60 backdrop-blur-sm p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select
                    value={filters.payment_method || ''}
                    onChange={(e) => update('payment_method', e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">All methods</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Expense Type */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Expense Type</label>
                  <select
                    value={filters.expense_scope || ''}
                    onChange={(e) => update('expense_scope', (e.target.value as 'personal' | 'family') || undefined)}
                    className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">All types</option>
                    <option value="personal">Personal</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                {/* Import Source */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Source</label>
                  <select
                    value={filters.import_source || ''}
                    onChange={(e) => update('import_source', (e.target.value as 'manual' | 'csv' | 'ai') || undefined)}
                    className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">All sources</option>
                    <option value="manual">Manual entry</option>
                    <option value="csv">CSV import</option>
                    <option value="ai">AI categorized</option>
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Amount Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.amount_min ?? ''}
                      onChange={(e) => update('amount_min', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <span className="text-foreground/30 shrink-0">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.amount_max ?? ''}
                      onChange={(e) => update('amount_max', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Date Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.date_from || ''}
                      onChange={(e) => update('date_from', e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <span className="text-foreground/30 shrink-0">–</span>
                    <input
                      type="date"
                      value={filters.date_to || ''}
                      onChange={(e) => update('date_to', e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Tags</label>
                  <input
                    type="text"
                    placeholder="e.g. food, travel"
                    value={filters.tags?.join(', ') || ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                      update('tags', tags.length ? tags : undefined);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              {/* Toggle filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'is_recurring' as const,         label: '🔁 Recurring only' },
                  { key: 'has_notes' as const,             label: '📝 Has notes' },
                  { key: 'has_ai_categorized' as const,    label: '🤖 AI categorized' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => update(key, filters[key] ? undefined : true)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all duration-200',
                      filters[key]
                        ? 'border-primary-500/40 bg-primary-500/10 text-primary-600 dark:text-primary-400'
                        : 'border-foreground/10 text-foreground/55 hover:border-foreground/25 hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Save preset */}
              <div className="flex items-center gap-3 pt-1 border-t border-foreground/5">
                {showPresetInput ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setShowPresetInput(false); }}
                      className="flex-1 px-3 py-2 rounded-xl border border-foreground/10 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    <Button size="sm" onClick={savePreset} disabled={!presetName.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowPresetInput(false)}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPresetInput(true)}
                    className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    Save as preset
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
