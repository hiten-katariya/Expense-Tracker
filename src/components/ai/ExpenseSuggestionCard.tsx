import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Check, X, Sparkles, AlertCircle } from 'lucide-react';
import type { AICategorization } from '@/types';

interface ExpenseSuggestionCardProps {
  suggestion: AICategorization;
  onAccept: (suggestion: AICategorization) => void;
  onReject: (suggestion: AICategorization) => void;
  isProcessing?: boolean;
}

export function ExpenseSuggestionCard({
  suggestion,
  onAccept,
  onReject,
  isProcessing = false,
}: ExpenseSuggestionCardProps) {
  const percentage = Math.round(suggestion.confidence * 100);

  return (
    <Card className="relative overflow-hidden border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5 shadow-glass backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500" />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary-500/10 text-primary-500">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground/50">AI Category Suggestion</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                Apply <span className="text-primary-600 dark:text-primary-400 font-extrabold">{suggestion.suggested_category}</span>
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/25 text-[10px] font-extrabold text-primary-600 dark:text-primary-400">
            {percentage}% Match
          </span>
        </div>

        {suggestion.reasoning && (
          <p className="text-xs text-foreground/75 leading-relaxed bg-foreground/5 p-2 rounded-xl mb-3 flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-foreground/45 flex-shrink-0" />
            <span>{suggestion.reasoning}</span>
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<X className="h-3 w-3" />}
            onClick={() => onReject(suggestion)}
            disabled={isProcessing}
            className="text-xs hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400 border-none bg-transparent"
          >
            Ignore
          </Button>
          <Button
            size="sm"
            leftIcon={<Check className="h-3 w-3" />}
            onClick={() => onAccept(suggestion)}
            disabled={isProcessing}
            className="text-xs shadow-[0_0_12px_rgba(99,102,241,0.2)] bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 border-none text-white font-bold"
          >
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export default ExpenseSuggestionCard;

