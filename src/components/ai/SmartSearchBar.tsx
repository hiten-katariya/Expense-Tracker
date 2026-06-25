import { useState, FormEvent } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { Input } from '../Input';
import { toast } from 'sonner';

interface SmartSearchBarProps {
  userId: string;
  onSearchMatches: (expenseIds: string[] | null) => void;
  placeholder?: string;
}

export function SmartSearchBar({
  userId,
  onSearchMatches,
  placeholder = 'Search expenses with tags or keywords...',
}: SmartSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      onSearchMatches(null);
      return;
    }

    if (!isSmartSearch) {
      // Standard regular filter callback (handled by parent through search text string)
      onSearchMatches(null); // Fallback to parent's text filter
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, queryText: query, limit: 20 }),
      });

      if (!response.ok) throw new Error('Semantic search failed');
      const data = await response.json();
      
      onSearchMatches(data.expenseIds || []);
      if (data.expenseIds?.length === 0) {
        toast.info('No semantic matches found.');
      } else {
        toast.success(`Found ${data.expenseIds?.length} matches!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('AI search is currently offline.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearchMatches(null);
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative flex items-center w-full">
        <div className="relative flex-1">
          <Input
            placeholder={isSmartSearch ? 'Ask AI: "Food expenses from last month" or "Uber rides"...' : placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`pr-10 pl-10 ${
              isSmartSearch 
                ? 'border-primary-500/40 focus:border-primary-500 bg-primary-500/[0.01]' 
                : 'bg-foreground/[0.02]'
            }`}
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/45 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
            ) : isSmartSearch ? (
              <Sparkles className="h-4.5 w-4.5 text-primary-500 animate-pulse" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-0.5 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Toggle AI semantic search search badge */}
        <button
          type="button"
          onClick={() => {
            setIsSmartSearch(!isSmartSearch);
            onSearchMatches(null);
          }}
          className={`ml-2 h-10 px-3.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs select-none transition-all active:scale-95 ${
            isSmartSearch
              ? 'bg-gradient-to-r from-primary-500/15 to-secondary-500/10 border-primary-500/35 text-primary-600 dark:text-primary-400 shadow-sm shadow-primary-500/10'
              : 'bg-foreground/5 hover:bg-foreground/10 border-foreground/5 text-foreground/60'
          }`}
          title="Toggle AI Semantic Search"
        >
          <Sparkles className={`h-4 w-4 ${isSmartSearch ? 'text-primary-500 animate-pulse' : ''}`} />
          <span className="hidden sm:inline">AI Search</span>
        </button>
      </div>
    </form>
  );
}
export default SmartSearchBar;
