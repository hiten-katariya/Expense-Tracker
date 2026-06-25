import { Card, CardContent, CardHeader, CardTitle } from '../Card';
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Wallet, PiggyBank, BarChart3 } from 'lucide-react';
import { IconButton } from '../Button';
import type { AIInsight } from '@/types';

interface AIInsightCardProps {
  insights: AIInsight | null;
  isLoading: boolean;
  onRefresh?: () => void;
  monthName: string;
}

export function AIInsightCard({ insights, isLoading, onRefresh, monthName }: AIInsightCardProps) {
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border border-primary-500/10 bg-card">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-foreground/60">Analyzing monthly metrics with Gemini AI...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="relative overflow-hidden border border-foreground/5 bg-card">
        <CardContent className="p-8 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-foreground/50">No insights loaded for {monthName}.</p>
          {onRefresh && (
            <IconButton onClick={onRefresh} className="mx-auto text-primary-500 bg-primary-500/5 p-2 rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </IconButton>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border border-primary-500/20 bg-gradient-to-tr from-primary-500/[0.03] via-transparent to-secondary-500/[0.02] shadow-glass backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-purple-500 to-secondary-500" />
      <CardHeader className="flex flex-row items-center justify-between border-b border-foreground/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-500/10 text-primary-500">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <CardTitle className="text-base font-bold text-foreground">AI Spending Insights - {monthName}</CardTitle>
        </div>
        {onRefresh && (
          <IconButton 
            onClick={onRefresh}
            className="text-foreground/50 hover:text-foreground hover:bg-foreground/5 p-1.5 rounded-xl transition-all"
            title="Regenerate Insights"
          >
            <RefreshCw className="h-4 w-4" />
          </IconButton>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Spent Summary */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground/45 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Executive Summary
          </h4>
          <p className="text-sm text-foreground/90 leading-relaxed bg-foreground/[0.01] border border-foreground/5 p-4 rounded-2xl">
            {insights.summary}
          </p>
        </div>

        {/* Savings Opportunities */}
        {insights.savings_opportunities && insights.savings_opportunities.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/45 uppercase tracking-wider flex items-center gap-1.5">
              <PiggyBank className="h-3.5 w-3.5" /> Savings Opportunities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.savings_opportunities.map((opp, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-foreground">{opp.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        Save ₹{opp.expected_saving}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/75 leading-relaxed">{opp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Trends */}
        {insights.category_trends && insights.category_trends.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/45 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Category Trends
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {insights.category_trends.map((trend, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border ${
                    trend.trend === 'up'
                      ? 'bg-rose-500/[0.02] border-rose-500/10'
                      : trend.trend === 'down'
                      ? 'bg-emerald-500/[0.02] border-emerald-500/10'
                      : 'bg-foreground/[0.02] border-foreground/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {trend.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-rose-500" />
                    ) : trend.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-foreground/45" />
                    )}
                    <span className="text-xs font-bold text-foreground">{trend.category}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ml-auto ${
                      trend.trend === 'up'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : trend.trend === 'down'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-foreground/10 text-foreground/60'
                    }`}>
                      {trend.trend}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/70 leading-relaxed mt-1">{trend.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default AIInsightCard;
