import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EMOTION_LEVELS } from '@/lib/constants';
import type { JournalEntryInput, JournalEntry } from '@/types';
import { journalRepository } from '@/lib/repositories';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar, Trash2, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { formatCurrency } from '@/lib/calculations';

const journalSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  preMarketBias: z.string().optional(),
  postMarketReview: z.string().optional(),
  emotion: z.number().min(1).max(10),
  lessons: z.string().optional(),
  marketConditions: z.string().optional(),
});

type JournalFormData = z.infer<typeof journalSchema>;

export function JournalEntryForm({
  entry,
  onSave,
}: {
  entry?: JournalEntry;
  onSave?: () => void;
}) {
  const isEditing = !!entry?.id;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      preMarketBias: '',
      postMarketReview: '',
      emotion: 5,
      lessons: '',
      marketConditions: '',
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      reset({
        date: entry.date,
        preMarketBias: entry.preMarketBias || '',
        postMarketReview: entry.postMarketReview || '',
        emotion: entry.emotion,
        lessons: entry.lessons || '',
        marketConditions: entry.marketConditions || '',
      });
    } else {
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        preMarketBias: '',
        postMarketReview: '',
        emotion: 5,
        lessons: '',
        marketConditions: '',
      });
    }
  }, [entry, reset]);

  const values = watch();
  const selectedEmotion = EMOTION_LEVELS.find((e) => e.value === values.emotion);

  const onSubmit = async (data: JournalFormData) => {
    try {
      const input: JournalEntryInput = {
        date: data.date,
        preMarketBias: data.preMarketBias,
        postMarketReview: data.postMarketReview,
        emotion: data.emotion,
        lessons: data.lessons,
        marketConditions: data.marketConditions,
      };

      if (isEditing && entry?.id) {
        await journalRepository.update(entry.id, input);
        toast.success('Journal entry updated');
      } else {
        await journalRepository.create(input);
        toast.success('Journal entry created');
      }
      onSave?.();
    } catch {
      toast.error('Failed to save journal entry');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Emotion (1-10)</Label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              {...register('emotion', { valueAsNumber: true })}
              className="flex-1"
            />
            {selectedEmotion && (
              <span className="text-2xl">{selectedEmotion.emoji}</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preMarketBias">Pre-Market Bias</Label>
        <Textarea
          id="preMarketBias"
          placeholder="What's your market view for today?"
          {...register('preMarketBias')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="marketConditions">Market Conditions</Label>
        <Textarea
          id="marketConditions"
          placeholder="Describe the market environment..."
          {...register('marketConditions')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="postMarketReview">Post-Market Review</Label>
        <Textarea
          id="postMarketReview"
          placeholder="How did your trades go today?"
          {...register('postMarketReview')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lessons">Lessons Learned</Label>
        <Textarea
          id="lessons"
          placeholder="What did you learn today?"
          {...register('lessons')}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1">
          {isEditing ? 'Update Entry' : 'Create Entry'}
        </Button>
        {isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onSave?.();
            }}
          >
            Cancel Edit
          </Button>
        )}
      </div>
    </form>
  );
}

export function Journal() {
  const entries = useLiveQuery(() => journalRepository.getAll(), []);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | undefined>();

  const sortedEntries = useMemo(() => {
    if (!entries) return [];
    return [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [entries]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await journalRepository.delete(id);
      toast.success('Entry deleted');
      if (selectedEntry?.id === id) {
        setSelectedEntry(undefined);
      }
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const handleNewEntry = () => {
    setSelectedEntry(undefined);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Trading Journal</h2>
        <p className="text-muted-foreground">
          Track your trading psychology and daily reflections
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Entry list */}
        <Card className="lg:col-span-1">
          <CardContent>
            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No journal entries yet. Create your first entry!
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {sortedEntries.map((entry) => {
                  const emotion = EMOTION_LEVELS.find(
                    (e) => e.value === entry.emotion
                  );
                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedEntry?.id === entry.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {emotion && <span className="text-lg">{emotion.emoji}</span>}
                          <button
                            onClick={(e) => entry.id && handleDelete(entry.id, e)}
                            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {entry.preMarketBias && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Bias: {entry.preMarketBias}
                        </p>
                      )}
                      {entry.postMarketReview && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          Review: {entry.postMarketReview}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>
                {selectedEntry ? 'Edit Entry' : 'New Entry'}
              </CardTitle>
              {selectedEntry && (
                <Badge variant="secondary">Editing</Badge>
              )}
            </div>
            <CardDescription>
              {selectedEntry
                ? `Editing entry for ${format(new Date(selectedEntry.date), 'dd MMM yyyy')}`
                : 'Create a new journal entry'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JournalEntryForm
              entry={selectedEntry}
              onSave={() => setSelectedEntry(undefined)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Psychology Insights */}
      <PsychologyInsights />

      {/* Emotion Scale Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Emotion Scale</CardTitle>
          <CardDescription>Reference for tracking your emotional state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {EMOTION_LEVELS.map((level) => (
              <div
                key={level.value}
                className="flex items-center gap-2 p-2 rounded-lg border"
              >
                <span className="text-xl">{level.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{level.label}</p>
                  <p className="text-xs text-muted-foreground">Level {level.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface Insight {
  type: 'positive' | 'negative' | 'info';
  title: string;
  description: string;
  icon: React.ReactNode;
  metric?: string;
}

function PsychologyInsights() {
  const { trades } = useTrades();
  const journalEntries = useLiveQuery(() => journalRepository.getAll(), []);

  const insights = useMemo<Insight[]>(() => {
    if (!trades || trades.length < 5) return [];

    const result: Insight[] = [];

    // 1. Emotion vs Win Rate Analysis
    const emotionStats = new Map<number, { wins: number; total: number; pnl: number }>();
    trades.forEach((trade) => {
      const emotion = trade.emotion || 5;
      const existing = emotionStats.get(emotion) || { wins: 0, total: 0, pnl: 0 };
      existing.total++;
      if (trade.pnl > 0) existing.wins++;
      existing.pnl += trade.pnl;
      emotionStats.set(emotion, existing);
    });

    // High emotion trades (7+)
    const highEmotionTrades = trades.filter((t) => (t.emotion || 5) >= 7);
    const highEmotionWinRate = highEmotionTrades.length > 0
      ? (highEmotionTrades.filter((t) => t.pnl > 0).length / highEmotionTrades.length) * 100
      : 0;

    // Low emotion trades (1-3)
    const lowEmotionTrades = trades.filter((t) => (t.emotion || 5) <= 3);
    const lowEmotionWinRate = lowEmotionTrades.length > 0
      ? (lowEmotionTrades.filter((t) => t.pnl > 0).length / lowEmotionTrades.length) * 100
      : 0;

    if (highEmotionTrades.length >= 3 && lowEmotionTrades.length >= 3) {
      if (highEmotionWinRate < lowEmotionWinRate - 10) {
        result.push({
          type: 'negative',
          title: 'High Emotion = Lower Performance',
          description: `Your win rate drops to ${highEmotionWinRate.toFixed(0)}% when emotions are high (7+), compared to ${lowEmotionWinRate.toFixed(0)}% when calm. Consider taking breaks when feeling stressed.`,
          icon: <AlertCircle className="h-5 w-5" />,
          metric: `${highEmotionWinRate.toFixed(0)}% vs ${lowEmotionWinRate.toFixed(0)}%`,
        });
      } else if (highEmotionWinRate > lowEmotionWinRate + 10) {
        result.push({
          type: 'positive',
          title: 'You Trade Well Under Pressure',
          description: `Interesting! Your win rate is actually higher (${highEmotionWinRate.toFixed(0)}%) during high-emotion sessions. You may thrive under pressure.`,
          icon: <TrendingUp className="h-5 w-5" />,
          metric: `${highEmotionWinRate.toFixed(0)}% vs ${lowEmotionWinRate.toFixed(0)}%`,
        });
      }
    }

    // 2. Average P&L by emotion level
    const emotionAverages: { emotion: number; avgPnl: number }[] = [];
    emotionStats.forEach((stats, emotion) => {
      emotionAverages.push({ emotion, avgPnl: stats.pnl / stats.total });
    });
    const sortedByEmotion = emotionAverages.sort((a, b) => a.emotion - b.emotion);

    const bestEmotion = sortedByEmotion.reduce((best, curr) =>
      curr.avgPnl > best.avgPnl ? curr : best
    );
    const worstEmotion = sortedByEmotion.reduce((worst, curr) =>
      curr.avgPnl < worst.avgPnl ? curr : worst
    );

    if (bestEmotion.emotion !== worstEmotion.emotion) {
      const bestEmotionLabel = EMOTION_LEVELS.find((e) => e.value === bestEmotion.emotion);
      result.push({
        type: 'positive',
        title: 'Best Emotion Level for Trading',
        description: `You perform best when feeling ${bestEmotionLabel?.label || `Level ${bestEmotion.emotion}`} (avg ${formatCurrency(bestEmotion.avgPnl)} per trade).`,
        icon: <Lightbulb className="h-5 w-5" />,
        metric: formatCurrency(bestEmotion.avgPnl),
      });
    }

    // 3. Journal consistency
    if (journalEntries && trades.length >= 10) {
      const journalDates = new Set(journalEntries.map((j) => j.date));
      const tradeDates = new Set(trades.map((t) => t.date));
      let matchingDays = 0;
      tradeDates.forEach((date) => {
        if (journalDates.has(date)) matchingDays++;
      });

      if (matchingDays < trades.length / 5 && trades.length > 20) {
        result.push({
          type: 'info',
          title: 'Journal More, Trade Better',
          description: `Only ${matchingDays} of your ${tradeDates.size} trading days have journal entries. Traders who journal regularly tend to improve faster.`,
          icon: <Calendar className="h-5 w-5" />,
          metric: `${matchingDays}/${tradeDates.size} days`,
        });
      } else if (matchingDays > trades.length / 3) {
        result.push({
          type: 'positive',
          title: 'Great Journaling Consistency',
          description: `You've journaled for ${matchingDays} of your ${tradeDates.size} trading days. Keep up the disciplined self-reflection!`,
          icon: <TrendingUp className="h-5 w-5" />,
          metric: `${matchingDays}/${tradeDates.size} days`,
        });
      }
    }

    // 4. Consecutive loss warning
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let maxConsecutiveLosses = 0;
    let currentLosses = 0;
    sortedTrades.forEach((t) => {
      if (t.pnl < 0) {
        currentLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      } else {
        currentLosses = 0;
      }
    });

    if (maxConsecutiveLosses >= 5) {
      result.push({
        type: 'negative',
        title: 'Watch Your Losing Streaks',
        description: `You've had ${maxConsecutiveLosses} consecutive losing trades. Consider reducing position size or taking a break to regroup.`,
        icon: <AlertCircle className="h-5 w-5" />,
        metric: `${maxConsecutiveLosses} trades`,
      });
    }

    // 5. Win rate trend by emotion bands
    const lowEmotionPnl = lowEmotionTrades.reduce((sum, t) => sum + t.pnl, 0);
    const highEmotionPnl = highEmotionTrades.reduce((sum, t) => sum + t.pnl, 0);

    if (lowEmotionTrades.length > 0 && highEmotionTrades.length > 0) {
      const lowEmotionAvg = lowEmotionPnl / lowEmotionTrades.length;
      const highEmotionAvg = highEmotionPnl / highEmotionTrades.length;

      if (lowEmotionAvg > highEmotionAvg * 1.5) {
        result.push({
          type: 'info',
          title: 'Calm Trading = Bigger Wins',
          description: `Your average win when calm is ${formatCurrency(lowEmotionAvg)}, vs ${formatCurrency(highEmotionAvg)} when stressed. Patience pays!`,
          icon: <TrendingUp className="h-5 w-5" />,
          metric: `${formatCurrency(lowEmotionAvg)} vs ${formatCurrency(highEmotionAvg)}`,
        });
      }
    }

    return result;
  }, [trades, journalEntries]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Psychology Insights
        </CardTitle>
        <CardDescription>
          Data-driven observations about your trading psychology
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                insight.type === 'positive'
                  ? 'bg-green-500/5 border-green-500/20'
                  : insight.type === 'negative'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-blue-500/5 border-blue-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    insight.type === 'positive'
                      ? 'text-green-500'
                      : insight.type === 'negative'
                      ? 'text-red-500'
                      : 'text-blue-500'
                  }`}
                >
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  {insight.metric && (
                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      {insight.metric}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}