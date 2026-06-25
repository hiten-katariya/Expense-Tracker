import { Card, CardContent } from '../Card';
import { Button } from '../Button';
import { Sparkles, TrendingUp, TrendingDown, Target } from 'lucide-react';
import type { BudgetRecommendation } from '@/types';

interface BudgetRecommendationCardProps {
  recommendation: BudgetRecommendation;
  onApply: (rec: BudgetRecommendation) => void;
  isApplying?: boolean;
}

export function BudgetRecommendationCard({
  recommendation,
  onApply,
  isApplying = false,
}: BudgetRecommendationCardProps) {
  const isIncrease = recommendation.recommendedLimit > recommendation.currentLimit;

  return (
    <Card className="relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-primary-500/5">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500">
                <Target className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-foreground">{recommendation.categoryName}</span>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              isIncrease 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isIncrease ? 'Increase' : 'Optimize'}
            </span>
          </div>

          {/* Current vs average vs recommended */}
          <div className="grid grid-cols-3 gap-2 bg-foreground/5 p-3 rounded-2xl mb-3 text-center">
            <div>
              <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">Current</p>
              <p className="text-xs font-bold text-foreground/80 mt-0.5">
                {recommendation.currentLimit > 0 ? `₹${recommendation.currentLimit}` : 'None'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-wider">Avg Spend</p>
              <p className="text-xs font-bold text-foreground/80 mt-0.5">₹{recommendation.averageSpend}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-purple-500/80 uppercase tracking-wider">Suggested</p>
              <p className="text-xs font-black text-purple-600 dark:text-purple-400 mt-0.5">₹{recommendation.recommendedLimit}</p>
            </div>
          </div>

          <p className="text-xs text-foreground/75 leading-relaxed italic mt-1.5 mb-4">
            "{recommendation.reason}"
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => onApply(recommendation)}
          disabled={isApplying}
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          className="w-full bg-gradient-to-r from-purple-600 to-primary-600 hover:from-purple-500 hover:to-primary-500 border-none text-white font-bold"
        >
          Set Limit to ₹{recommendation.recommendedLimit}
        </Button>
      </CardContent>
    </Card>
  );
}
export default BudgetRecommendationCard;
