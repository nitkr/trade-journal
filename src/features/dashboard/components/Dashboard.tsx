import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/shared/KpiCard';
import { useTrades } from '@/hooks/useTrades';
import { calculateDetailedStats, getEquityCurveData, formatCurrency, calculateConsecutiveTradeRuns, calculateCapitalMetrics } from '@/lib/calculations';
import type { Trade } from '@/types';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Calendar, Trophy, AlertTriangle, TrendingUp, TrendingDown, ListOrdered, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

function CalendarHeatmapContent({ year, month, trades }: { year: number; month: number; trades: Trade[] }) {
  const { colors } = useTheme();
  const dailyPnlMap = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t: Trade) => {
      const existing = map.get(t.date) || 0;
      map.set(t.date, existing + t.pnl);
    });
    return map;
  }, [trades]);

  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const pnlValues = Array.from(dailyPnlMap.values());
  const maxPnl = Math.max(0, ...pnlValues);
  const minPnl = Math.min(0, ...pnlValues);
  const range = maxPnl - minPnl || 1;

  const getColor = (pnl: number): string => {
    if (pnl === 0) return 'bg-muted';
    const intensity = Math.abs(pnl) / range;
    const alpha = 0.2 + intensity * 0.6;
    if (pnl > 0) return `rgba(${parseInt(colors.chartGreen.slice(1, 3), 16)}, ${parseInt(colors.chartGreen.slice(3, 5), 16)}, ${parseInt(colors.chartGreen.slice(5, 7), 16)}, ${alpha})`;
    return `rgba(${parseInt(colors.chartRed.slice(1, 3), 16)}, ${parseInt(colors.chartRed.slice(3, 5), 16)}, ${parseInt(colors.chartRed.slice(5, 7), 16)}, ${alpha})`;
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <>
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-[10px] text-muted-foreground text-center">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {weeks.map((week) =>
          week.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const pnl = dailyPnlMap.get(dateStr) || 0;
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div
                key={dateStr}
                className={`
                  h-7 rounded-sm flex items-center justify-center text-[10px] font-medium
                  ${isCurrentMonth ? '' : 'opacity-30'}
                  ${isSameDay(day, new Date()) ? 'ring-1 ring-primary' : ''}
                `}
                style={{ backgroundColor: pnl !== 0 ? getColor(pnl) : undefined }}
                title={isCurrentMonth ? `${format(day, 'dd MMM')}: ${formatCurrency(pnl)}` : ''}
              >
                <span className={isCurrentMonth ? '' : 'text-muted-foreground'}>
                  {format(day, 'd')}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `${colors.chartRed}80` }} />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span>None</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: `${colors.chartGreen}80` }} />
          <span>Profit</span>
        </div>
      </div>
    </>
  );
}

export function Dashboard() {
  const { trades, isLoading } = useTrades();
  const { colors } = useTheme();

  const [dateRange, setDateRange] = useState<'all' | '1m' | '3m' | '6m' | '1y'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    title: string;
    trades: Array<{ date: string; symbol: string; direction: string; pnl: number; segment: string; strategy?: string }>;
  }>({ open: false, title: '', trades: [] });

  const [calendarDate, setCalendarDate] = useState(new Date());

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (startDate) result = result.filter((t) => t.date >= startDate);
    if (endDate) result = result.filter((t) => t.date <= endDate);
    return result;
  }, [trades, startDate, endDate]);

  const handleDateRangeChange = (value: 'all' | '1m' | '3m' | '6m' | '1y') => {
    setDateRange(value);
    if (value !== 'all') {
      const now = new Date();
      let start: Date;
      switch (value) {
        case '1m': start = subMonths(now, 1); break;
        case '3m': start = subMonths(now, 3); break;
        case '6m': start = subMonths(now, 6); break;
        case '1y': start = subMonths(now, 12); break;
        default: start = new Date(0);
      }
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const metadata = useLiveQuery(async () => {
    const realizedPnl = await db.getMetadata('totalRealizedPnl');
    const charges = await db.getMetadata('totalCharges');
    const hasOpenPositions = await db.getMetadata('hasOpenPositions');
    return { realizedPnl: realizedPnl ?? 0, charges: charges ?? 0, hasOpenPositions: hasOpenPositions === 1 };
  }, []);

  const stats = useMemo(() => calculateDetailedStats(filteredTrades), [filteredTrades]);
  const equityCurveData = useMemo(() => getEquityCurveData(filteredTrades, metadata?.charges), [filteredTrades, metadata?.charges]);
  const tradeRuns = useMemo(() => calculateConsecutiveTradeRuns(filteredTrades), [filteredTrades]);
  const capitalMetrics = useMemo(() => calculateCapitalMetrics(filteredTrades, metadata?.hasOpenPositions), [filteredTrades, metadata?.hasOpenPositions]);
  const dailyData = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    const dailyMap = new Map<string, { date: string; pnl: number; charges: number; trades: number }>();
    filteredTrades.forEach((t) => {
      const existing = dailyMap.get(t.date) || { date: t.date, pnl: 0, charges: 0, trades: 0 };
      existing.pnl += t.pnl;
      existing.charges += t.charges;
      existing.trades++;
      dailyMap.set(t.date, existing);
    });
    return Array.from(dailyMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTrades]);

  const recentTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [filteredTrades]);

  const netRealizedPnl = metadata ? metadata.realizedPnl - metadata.charges : 0;

  const getBestStreakTrades = () => {
    if (filteredTrades.length === 0) return [];
    const dailyMap = new Map<string, { date: string; pnl: number; trades: Trade[] }>();
    filteredTrades.forEach((t) => {
      const existing = dailyMap.get(t.date) || { date: t.date, pnl: 0, trades: [] };
      existing.pnl += t.pnl;
      existing.trades.push(t);
      dailyMap.set(t.date, existing);
    });
    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let bestStreakLength = 0, bestStreakStart = 0, currentStreakLength = 0, currentStreakStart = 0;
    for (let i = 0; i < dailyStats.length; i++) {
      if (dailyStats[i].pnl > 0) {
        if (currentStreakLength === 0) currentStreakStart = i;
        currentStreakLength++;
        if (currentStreakLength > bestStreakLength) { bestStreakLength = currentStreakLength; bestStreakStart = currentStreakStart; }
      } else { currentStreakLength = 0; }
    }
    if (bestStreakLength === 0) return [];
    return dailyStats.slice(bestStreakStart, bestStreakStart + bestStreakLength).flatMap((d) => d.trades);
  };

  const getWorstStreakTrades = () => {
    if (filteredTrades.length === 0) return [];
    const dailyMap = new Map<string, { date: string; pnl: number; trades: Trade[] }>();
    filteredTrades.forEach((t) => {
      const existing = dailyMap.get(t.date) || { date: t.date, pnl: 0, trades: [] };
      existing.pnl += t.pnl;
      existing.trades.push(t);
      dailyMap.set(t.date, existing);
    });
    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let worstStreakLength = 0, worstStreakStart = 0, currentStreakLength = 0, currentStreakStart = 0;
    for (let i = 0; i < dailyStats.length; i++) {
      if (dailyStats[i].pnl < 0) {
        if (currentStreakLength === 0) currentStreakStart = i;
        currentStreakLength++;
        if (currentStreakLength > worstStreakLength) { worstStreakLength = currentStreakLength; worstStreakStart = currentStreakStart; }
      } else { currentStreakLength = 0; }
    }
    if (worstStreakLength === 0) return [];
    return dailyStats.slice(worstStreakStart, worstStreakStart + worstStreakLength).flatMap((d) => d.trades);
  };

  const getMaxProfitDayTrades = () => {
    if (filteredTrades.length === 0) return [];
    const dailyMap = new Map<string, { date: string; pnl: number; trades: Trade[] }>();
    filteredTrades.forEach((t) => {
      const existing = dailyMap.get(t.date) || { date: t.date, pnl: 0, trades: [] };
      existing.pnl += t.pnl;
      existing.trades.push(t);
      dailyMap.set(t.date, existing);
    });
    const dailyStats = Array.from(dailyMap.values());
    return dailyStats.reduce((best, d) => (d.pnl > best.pnl ? d : best), dailyStats[0]).trades;
  };

  const getMaxLossDayTrades = () => {
    if (filteredTrades.length === 0) return [];
    const dailyMap = new Map<string, { date: string; pnl: number; trades: Trade[] }>();
    filteredTrades.forEach((t) => {
      const existing = dailyMap.get(t.date) || { date: t.date, pnl: 0, trades: [] };
      existing.pnl += t.pnl;
      existing.trades.push(t);
      dailyMap.set(t.date, existing);
    });
    const dailyStats = Array.from(dailyMap.values());
    return dailyStats.reduce((worst, d) => (d.pnl < worst.pnl ? d : worst), dailyStats[0]).trades;
  };

  const getBestConsecutiveRunTrades = () => {
    if (filteredTrades.length === 0) return [];
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let maxWinRun = 0, maxWinRunEnd = 0, currentWinRun = 0, currentWinRunStart = 0;
    for (let i = 0; i < sortedTrades.length; i++) {
      if (sortedTrades[i].pnl > 0) {
        if (currentWinRun === 0) currentWinRunStart = i;
        currentWinRun++;
        if (currentWinRun > maxWinRun) { maxWinRun = currentWinRun; maxWinRunEnd = i; }
      } else { currentWinRun = 0; }
    }
    if (maxWinRun === 0) return [];
    const start = maxWinRunEnd - maxWinRun + 1;
    return sortedTrades.slice(start, maxWinRunEnd + 1);
  };

  const getWorstConsecutiveRunTrades = () => {
    if (filteredTrades.length === 0) return [];
    const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let maxLossRun = 0, maxLossRunEnd = 0, currentLossRun = 0, currentLossRunStart = 0;
    for (let i = 0; i < sortedTrades.length; i++) {
      if (sortedTrades[i].pnl < 0) {
        if (currentLossRun === 0) currentLossRunStart = i;
        currentLossRun++;
        if (currentLossRun > maxLossRun) { maxLossRun = currentLossRun; maxLossRunEnd = i; }
      } else { currentLossRun = 0; }
    }
    if (maxLossRun === 0) return [];
    const start = maxLossRunEnd - maxLossRun + 1;
    return sortedTrades.slice(start, maxLossRunEnd + 1);
  };

  // Chart style with theme-aware colors
  const chartColors = useMemo(() => ({
    grid: colors.chartGrid,
    text: colors.chartText,
    tooltipBg: colors.chartTooltipBg,
    tooltipBorder: colors.chartTooltipBorder,
    primary: colors.chartBlue,
    primaryFill: `${colors.chartBlue}30`,
    green: colors.chartGreen,
    red: colors.chartRed,
  }), [colors]);

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center h-full"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Your trading performance at a glance</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1m">Last 1 Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setDateRange('all'); }} className="w-[140px]" />
            <span className="text-muted-foreground self-center">-</span>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDateRange('all'); }} className="w-[140px]" />
          </div>
          {(startDate || endDate || dateRange !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setDateRange('all'); }}>Clear</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Realized P&L (from Zerodha)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Realized P&L</p>
                <p className="text-2xl font-bold" style={{ color: colors.chartGreen }}>{metadata ? formatCurrency(metadata.realizedPnl) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Charges & Taxes</p>
                <p className="text-2xl font-bold" style={{ color: colors.chartRed }}>{metadata ? `-${formatCurrency(metadata.charges)}` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Realized P&L</p>
                <p className={`text-2xl font-bold ${netRealizedPnl >= 0 ? '' : ''}`} style={{ color: netRealizedPnl >= 0 ? colors.chartGreen : colors.chartRed }}>{metadata ? formatCurrency(netRealizedPnl) : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <KpiCard title="Net P&L (Calculated)" value={formatCurrency(stats.netPnl)} subtitle={`${stats.totalTrades} trades • ${stats.tradingDays} days`} trend={stats.netPnl !== 0 ? { value: stats.winRate, isPositive: stats.netPnl > 0 } : undefined} />
        <KpiCard title="Maximum DrawDown" value={formatCurrency(stats.maxDrawdown)} subtitle={stats.maxDrawdownPercent > 0 ? `${stats.maxDrawdownPercent.toFixed(2)}% of peak` : 'No drawdown'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setDetailDialog({ open: true, title: `All Trades - ${stats.totalTrades}`, trades: filteredTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.totalTrades}</span>
            <p className="text-sm text-muted-foreground">{stats.winningTrades}W / {stats.losingTrades}L / {stats.breakevenTrades}B</p>
          </CardContent>
        </Card>
        <KpiCard title="Win Rate" value={`${stats.winRate.toFixed(2)}%`} subtitle={`${stats.winningTrades} winning trades`} />
        <KpiCard title="Profit Factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} subtitle={`Avg Win: ${formatCurrency(stats.averageWin)} | Avg Loss: ${formatCurrency(stats.averageLoss)}`} />
        <KpiCard title="Expectancy" value={formatCurrency(stats.expectancy)} subtitle="Per trade" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setDetailDialog({ open: true, title: `Trading Days - ${stats.tradingDays} days`, trades: filteredTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4" /> Trading Days</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.tradingDays}</span>
            <p className="text-sm text-muted-foreground">{stats.winDays} win • {stats.lossDays} loss</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><ListOrdered className="h-4 w-4" /> Back-to-Back Trades</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="cursor-pointer hover:bg-accent/50 transition-colors rounded p-1 -m-1" onClick={() => { const runTrades = getBestConsecutiveRunTrades(); setDetailDialog({ open: true, title: `Best Consecutive Run - ${tradeRuns.maxWinRun} trades`, trades: runTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
                <p className="text-sm text-muted-foreground">Best Consecutive Run</p>
                <p className="text-xl font-bold" style={{ color: colors.chartGreen }}>{tradeRuns.maxWinRun} trades</p>
              </div>
              <div className="cursor-pointer hover:bg-accent/50 transition-colors rounded p-1 -m-1" onClick={() => { const runTrades = getWorstConsecutiveRunTrades(); setDetailDialog({ open: true, title: `Worst Consecutive Run - ${tradeRuns.maxLossRun} trades`, trades: runTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
                <p className="text-sm text-muted-foreground">Worst Consecutive Run</p>
                <p className="text-xl font-bold" style={{ color: colors.chartRed }}>{tradeRuns.maxLossRun} trades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streaks & Extremes Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { const streakTrades = getBestStreakTrades(); setDetailDialog({ open: true, title: `Best Streak - ${stats.maxConsecutiveWins} days`, trades: streakTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Trophy className="h-4 w-4" style={{ color: colors.chartGreen }} /> Best Streak</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold" style={{ color: colors.chartGreen }}>{stats.maxConsecutiveWins}</span><p className="text-sm text-muted-foreground">consecutive wins</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { const streakTrades = getWorstStreakTrades(); setDetailDialog({ open: true, title: `Worst Streak - ${stats.maxConsecutiveLosses} days`, trades: streakTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4" style={{ color: colors.chartRed }} /> Worst Streak</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold" style={{ color: colors.chartRed }}>{stats.maxConsecutiveLosses}</span><p className="text-sm text-muted-foreground">consecutive losses</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { const dayTrades = getMaxProfitDayTrades(); setDetailDialog({ open: true, title: `Best Day - ${formatCurrency(stats.maxProfit)}`, trades: dayTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" style={{ color: colors.chartGreen }} /> Max Profit</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold" style={{ color: colors.chartGreen }}>{formatCurrency(stats.maxProfit)}</span><p className="text-sm text-muted-foreground">best single day</p></CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { const dayTrades = getMaxLossDayTrades(); setDetailDialog({ open: true, title: `Worst Day - ${formatCurrency(stats.maxLoss)}`, trades: dayTrades.map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4" style={{ color: colors.chartRed }} /> Max Loss</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold" style={{ color: colors.chartRed }}>{formatCurrency(stats.maxLoss)}</span><p className="text-sm text-muted-foreground">worst single day</p></CardContent>
        </Card>
      </div>

      {/* Capital Metrics Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_repeat(auto-fit,minmax(200px,1fr))]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" /> Capital Turnover</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{formatCurrency(capitalMetrics.totalTurnover)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{capitalMetrics.totalBuyTrades} buy • {capitalMetrics.totalSellTrades} sell trades</p>
              <div className="pt-2 border-t space-y-1">
                <p className="text-sm text-muted-foreground">Avg Trade Value: <span className="font-medium text-foreground">{formatCurrency(capitalMetrics.avgTradeValue)}</span></p>
                <p
                  className="text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    const maxTrade = filteredTrades.find(t => t.quantity * t.entryPrice === capitalMetrics.maxSingleTrade);
                    if (maxTrade) {
                      setDetailDialog({
                        open: true,
                        title: `Max Trade - ${formatCurrency(capitalMetrics.maxSingleTrade)}`,
                        trades: [{ date: maxTrade.date, symbol: maxTrade.symbol, direction: maxTrade.direction, pnl: maxTrade.pnl, segment: maxTrade.segment, strategy: maxTrade.strategy }]
                      });
                    }
                  }}
                >
                  Max Trade: <span className="font-medium text-foreground">{formatCurrency(capitalMetrics.maxSingleTrade)}</span>
                  {capitalMetrics.maxSingleTradeDate && <span className="text-muted-foreground/70"> on {capitalMetrics.maxSingleTradeDate}</span>}
                </p>
              </div>
              <div className="pt-2 border-t space-y-1">
                <p className="text-sm text-muted-foreground">Buy: <span className="font-medium text-foreground">{formatCurrency(capitalMetrics.totalBuyValue)}</span></p>
                <p className="text-sm text-muted-foreground">Sell: <span className="font-medium text-foreground">{formatCurrency(capitalMetrics.totalSellValue)}</span></p>
              </div>
              <p className="text-xs text-muted-foreground/70 pt-1">All positions closed (Open Qty: 0) • Values represent historical turnover</p>
            </div>
          </CardContent>
        </Card>
        {capitalMetrics.bySegment.map((seg) => (
          <Card key={seg.segment} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setDetailDialog({ open: true, title: `${seg.segment} Trades - ${seg.tradeCount}`, trades: filteredTrades.filter((t) => t.segment === seg.segment).map((t) => ({ date: t.date, symbol: t.symbol, direction: t.direction, pnl: t.pnl, segment: t.segment, strategy: t.strategy })) }); }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{seg.segment}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                <span className="text-2xl font-bold">{formatCurrency(seg.buyValue + seg.sellValue)}</span>
                <p className="text-sm text-muted-foreground">{seg.tradeCount} trades</p>
                <p className="text-xs text-muted-foreground/70">Buy: {formatCurrency(seg.buyValue)} | Sell: {formatCurrency(seg.sellValue)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open Positions - Only show if there are open positions */}
      {capitalMetrics.openPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Open Positions at Risk
            </CardTitle>
            <CardDescription>Positions that could result in losses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {capitalMetrics.openPositions.map((pos, idx) => (
                <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: pos.direction === 'Long' ? `${colors.chartGreen}15` : `${colors.chartRed}15`, color: pos.direction === 'Long' ? colors.chartGreen : colors.chartRed }}>
                      {pos.direction === 'Long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{pos.symbol}</p>
                      <p className="text-xs text-muted-foreground">{pos.segment} • {pos.quantity} qty @ {formatCurrency(pos.entryPrice)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium`} style={{ color: pos.direction === 'Long' ? colors.chartGreen : colors.chartRed }}>{formatCurrency(pos.currentValue)}</p>
                    <Badge variant={pos.direction === 'Long' ? 'success' : 'destructive'} className="text-xs">{pos.direction}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Equity Curve vs Charges</CardTitle><CardDescription>Cumulative P&L over time {metadata?.charges > 0 && ' (charges distributed proportionally based on each trade\'s P&L share)'}</CardDescription></CardHeader>
          <CardContent>
            {equityCurveData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'dd MMM')} className="text-xs" stroke={chartColors.text} />
                    <YAxis tickFormatter={(value) => `₹${value.toLocaleString()}`} className="text-xs" stroke={chartColors.text} />
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value) || 0), '']} labelFormatter={(label) => format(new Date(label as string), 'dd MMM yyyy')} contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                    <Legend />
                    <Area type="monotone" dataKey="equity" stroke={chartColors.primary} fill={chartColors.primaryFill} strokeWidth={2} name="Equity" />
                    <Line type="monotone" dataKey="charges" stroke={chartColors.red} strokeWidth={2} dot={false} name="Charges" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No trades yet. Start logging to see your equity curve.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily P&L</CardTitle><CardDescription>P&L per trading day</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'dd MMM')} className="text-xs" stroke={chartColors.text} />
                  <YAxis tickFormatter={(value) => `₹${value}`} className="text-xs" stroke={chartColors.text} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value) || 0), 'P&L']} labelFormatter={(label) => format(new Date(label as string), 'dd MMM yyyy')} contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyData.map((entry, index) => <Cell key={index} fill={entry.pnl >= 0 ? colors.chartGreen : colors.chartRed} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Heatmap - separate section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Calendar Heatmap</CardTitle><CardDescription>Daily P&L by month</CardDescription></div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium min-w-[100px] text-center">{format(calendarDate, 'MMM yyyy')}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarHeatmapContent year={calendarDate.getFullYear()} month={calendarDate.getMonth()} trades={filteredTrades} />
        </CardContent>
      </Card>

      {stats.weeklyStats.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Weekly Breakdown</CardTitle><CardDescription>Your performance by week</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="weekLabel" className="text-xs" stroke={chartColors.text} />
                  <YAxis tickFormatter={(value) => `₹${value}`} className="text-xs" stroke={chartColors.text} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value) || 0), 'P&L']} labelFormatter={(label) => `Week of ${label}`} contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {stats.weeklyStats.map((entry, index) => <Cell key={index} fill={entry.pnl >= 0 ? colors.chartGreen : colors.chartRed} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.monthlyStats.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Monthly Breakdown</CardTitle><CardDescription>Your performance by month</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left text-sm font-medium">Month</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Trades</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Wins</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Losses</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">P&L</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Charges</th>
                    <th className="py-3 px-4 text-right text-sm font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthlyStats.map((month) => {
                    const net = month.pnl - month.charges;
                    return (
                      <tr key={month.month} className="border-b">
                        <td className="py-3 px-4 text-sm font-medium">{month.monthLabel}</td>
                        <td className="py-3 px-4 text-right text-sm">{month.trades}</td>
                        <td className="py-3 px-4 text-right text-sm" style={{ color: colors.chartGreen }}>{month.wins}</td>
                        <td className="py-3 px-4 text-right text-sm" style={{ color: colors.chartRed }}>{month.losses}</td>
                        <td className={`py-3 px-4 text-right text-sm`} style={{ color: month.pnl >= 0 ? colors.chartGreen : colors.chartRed }}>{formatCurrency(month.pnl)}</td>
                        <td className="py-3 px-4 text-right text-sm text-muted-foreground">{formatCurrency(month.charges)}</td>
                        <td className={`py-3 px-4 text-right text-sm font-medium`} style={{ color: net >= 0 ? colors.chartGreen : colors.chartRed }}>{formatCurrency(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent Trades</CardTitle><CardDescription>Your last 5 trades</CardDescription></CardHeader>
        <CardContent>
          {recentTrades.length > 0 ? (
            <div className="space-y-4">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: trade.direction === 'Long' ? `${colors.chartGreen}15` : `${colors.chartRed}15`, color: trade.direction === 'Long' ? colors.chartGreen : colors.chartRed }}>
                      {trade.direction === 'Long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{trade.symbol}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(trade.date), 'dd MMM yyyy')} • {trade.segment}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium`} style={{ color: trade.pnl >= 0 ? colors.chartGreen : colors.chartRed }}>{trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}</p>
                    <Badge variant={trade.pnl >= 0 ? 'success' : 'destructive'} className="text-xs">{trade.direction}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">No trades yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailDialog.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {detailDialog.trades.map((trade, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg`} style={{ backgroundColor: trade.direction === 'Long' ? `${colors.chartGreen}15` : `${colors.chartRed}15`, color: trade.direction === 'Long' ? colors.chartGreen : colors.chartRed }}>
                    {trade.direction === 'Long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{trade.symbol}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(trade.date), 'dd MMM yyyy')} • {trade.segment}{trade.strategy && ` • ${trade.strategy}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium`} style={{ color: trade.pnl >= 0 ? colors.chartGreen : colors.chartRed }}>{trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}</p>
                  <Badge variant={trade.pnl >= 0 ? 'success' : 'destructive'} className="text-xs">{trade.direction}</Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}