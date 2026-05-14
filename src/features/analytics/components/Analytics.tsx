import { useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTrades } from '@/hooks/useTrades';
import { useLiveQuery } from 'dexie-react-hooks';
import { tradeRepository } from '@/lib/repositories';
import {
  calculateTradeStats,
  calculateDayOfWeekStats,
  calculateStrategyStats,
  formatCurrency,
} from '@/lib/calculations';
import { calculateDetailedStats } from '@/lib/calculations';
import { exportToPdf } from '@/lib/exportPdf';
import { FileDown } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const SEGMENT_COLORS_LIGHT: Record<string, string> = {
  Equity: '#2563eb',
  Futures: '#ea580c',
  Options: '#7c3aed',
  Currency: '#16a34a',
};

const DAY_COLORS_LIGHT = ['#2563eb', '#16a34a', '#ea580c', '#eab308', '#7c3aed', '#ec4899', '#0d9488'];

export function Analytics() {
  const { trades } = useTrades();
  const { colors } = useTheme();

  // Filters
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '1m' | '3m' | '6m' | '1y'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get available filters
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(trades.map((t) => t.symbol));
    return Array.from(symbols).sort();
  }, [trades]);

  const uniqueStrategies = useLiveQuery(() => tradeRepository.getAllStrategies(), []);
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    trades.forEach((t) => t.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [trades]);

  // Filter trades
  const filteredTrades = useMemo(() => {
    let result = trades;

    // Symbol filter
    if (selectedSymbol && selectedSymbol !== '__all__') {
      result = result.filter((t) => t.symbol === selectedSymbol);
    }

    // Strategy filter
    if (selectedStrategy && selectedStrategy !== '__all__') {
      result = result.filter((t) => t.strategy === selectedStrategy);
    }

    // Tag filter
    if (selectedTag && selectedTag !== '__all__') {
      result = result.filter((t) => t.tags.includes(selectedTag));
    }

    // Date range filter
    if (startDate) {
      result = result.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      result = result.filter((t) => t.date <= endDate);
    }

    return result;
  }, [trades, selectedSymbol, selectedStrategy, selectedTag, startDate, endDate]);

  const stats = useMemo(() => calculateTradeStats(filteredTrades), [filteredTrades]);
  const dayOfWeekStats = useMemo(() => calculateDayOfWeekStats(filteredTrades), [filteredTrades]);
  const strategyStats = useMemo(() => calculateStrategyStats(filteredTrades), [filteredTrades]);

  const segmentData = useMemo(() => {
    const segmentMap = new Map<string, number>();
    filteredTrades.forEach((trade) => {
      const current = segmentMap.get(trade.segment) || 0;
      segmentMap.set(trade.segment, current + trade.pnl);
    });
    return Array.from(segmentMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredTrades]);

  const directionData = useMemo(() => {
    const longTrades = filteredTrades.filter((t) => t.direction === 'Long');
    const shortTrades = filteredTrades.filter((t) => t.direction === 'Short');
    return [
      { name: 'Long', wins: longTrades.filter((t) => t.pnl > 0).length, losses: longTrades.filter((t) => t.pnl < 0).length },
      { name: 'Short', wins: shortTrades.filter((t) => t.pnl > 0).length, losses: shortTrades.filter((t) => t.pnl < 0).length },
    ];
  }, [filteredTrades]);

  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    filteredTrades.forEach((trade) => {
      const month = format(new Date(trade.date), 'MMM yyyy');
      const current = monthlyMap.get(month) || 0;
      monthlyMap.set(month, current + trade.pnl);
    });
    return Array.from(monthlyMap.entries())
      .map(([month, pnl]) => ({ month, pnl }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [filteredTrades]);

  const symbolPerformance = useMemo(() => {
    const symbolMap = new Map<string, { pnl: number; trades: number }>();
    filteredTrades.forEach((trade) => {
      const current = symbolMap.get(trade.symbol) || { pnl: 0, trades: 0 };
      symbolMap.set(trade.symbol, {
        pnl: current.pnl + trade.pnl,
        trades: current.trades + 1,
      });
    });
    return Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

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

  // Theme-aware chart colors
  const chartColors = useMemo(() => ({
    grid: colors.chartGrid,
    text: colors.chartText,
    tooltipBg: colors.chartTooltipBg,
    tooltipBorder: colors.chartTooltipBorder,
    primary: colors.chartBlue,
    green: colors.chartGreen,
    red: colors.chartRed,
    orange: colors.chartOrange,
    purple: colors.chartPurple,
    teal: colors.chartTeal,
  }), [colors]);

  // Segment colors mapped to theme
  const segmentColors = useMemo(() => ({
    Equity: colors.chartBlue,
    Futures: colors.chartOrange,
    Options: colors.chartPurple,
    Currency: colors.chartGreen,
  }), [colors]);

  // Day colors for strategy chart
  const dayColors = useMemo(() => [
    colors.chartBlue,
    colors.chartGreen,
    colors.chartOrange,
    '#eab308',
    colors.chartPurple,
    '#ec4899',
    colors.chartTeal,
  ], [colors]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">
            Deep insights into your trading performance
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Symbol</label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Symbols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Symbols</SelectItem>
                  {uniqueSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Strategy</label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Strategies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Strategies</SelectItem>
                  {(uniqueStrategies || []).map((strategy) => (
                    <SelectItem key={strategy} value={strategy}>
                      {strategy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tag</label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Tags</SelectItem>
                  {uniqueTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1m">Last 1 Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last 1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateRange('all');
                  }}
                  className="w-full"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateRange('all');
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Active filters display */}
          {(selectedSymbol || selectedStrategy || selectedTag || startDate || endDate) && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {selectedSymbol && (
                <Badge variant="secondary" className="gap-1">
                  Symbol: {selectedSymbol}
                  <button onClick={() => setSelectedSymbol('')} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {selectedStrategy && (
                <Badge variant="secondary" className="gap-1">
                  Strategy: {selectedStrategy}
                  <button onClick={() => setSelectedStrategy('')} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {selectedTag && (
                <Badge variant="secondary" className="gap-1">
                  Tag: {selectedTag}
                  <button onClick={() => setSelectedTag('')} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {(startDate || endDate) && (
                <Badge variant="secondary" className="gap-1">
                  {startDate || '...'} to {endDate || '...'}
                  <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedSymbol('');
                setSelectedStrategy('');
                setSelectedTag('');
                setStartDate('');
                setEndDate('');
                setDateRange('all');
              }}>
                Clear All
              </Button>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const detailedStats = calculateDetailedStats(filteredTrades);
                const dateStr = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time';
                await exportToPdf(filteredTrades, detailedStats, {
                  title: `Trading Report - ${dateStr}`,
                });
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold`} style={{ color: stats.netPnl >= 0 ? colors.chartGreen : colors.chartRed }}>
              {formatCurrency(stats.netPnl)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{filteredTrades.length} trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit Factor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expectancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-bold`} style={{ color: stats.expectancy >= 0 ? colors.chartGreen : colors.chartRed }}>
              {formatCurrency(stats.expectancy)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Strategy */}
      {strategyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Strategy</CardTitle>
            <CardDescription>Your P&L broken down by trading strategy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strategyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="strategy" tick={{ fontSize: 12, fill: chartColors.text }} />
                  <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 12, fill: chartColors.text }} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'P&L']} contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {strategyStats.map((_, index) => (
                      <Cell key={index} fill={dayColors[index % dayColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium">Strategy</th>
                    <th className="py-2 px-3 text-right font-medium">Trades</th>
                    <th className="py-2 px-3 text-right font-medium">Wins</th>
                    <th className="py-2 px-3 text-right font-medium">Losses</th>
                    <th className="py-2 px-3 text-right font-medium">Win Rate</th>
                    <th className="py-2 px-3 text-right font-medium">P&L</th>
                    <th className="py-2 px-3 text-right font-medium">Avg P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyStats.map((s) => (
                    <tr key={s.strategy} className="border-b">
                      <td className="py-2 px-3 font-medium">{s.strategy}</td>
                      <td className="py-2 px-3 text-right">{s.trades}</td>
                      <td className="py-2 px-3 text-right" style={{ color: colors.chartGreen }}>{s.wins}</td>
                      <td className="py-2 px-3 text-right" style={{ color: colors.chartRed }}>{s.losses}</td>
                      <td className="py-2 px-3 text-right">{s.winRate.toFixed(1)}%</td>
                      <td className={`py-2 px-3 text-right font-medium`} style={{ color: s.pnl >= 0 ? colors.chartGreen : colors.chartRed }}>
                        {formatCurrency(s.pnl)}
                      </td>
                      <td className={`py-2 px-3 text-right`} style={{ color: s.avgPnl >= 0 ? colors.chartGreen : colors.chartRed }}>
                        {formatCurrency(s.avgPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by Day of Week */}
      {dayOfWeekStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Day of Week</CardTitle>
            <CardDescription>Your trading performance by weekday</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="dayLabel" tick={{ fill: chartColors.text }} />
                  <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fill: chartColors.text }} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'P&L']} contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dayOfWeekStats.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? colors.chartGreen : colors.chartRed} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-7 gap-2 mt-4">
              {dayOfWeekStats.map((day) => (
                <div key={day.dayOfWeek} className="p-3 rounded-lg border text-center">
                  <p className="text-sm font-medium">{day.dayLabel}</p>
                  <p className={`text-lg font-bold`} style={{ color: day.pnl >= 0 ? colors.chartGreen : colors.chartRed }}>
                    {formatCurrency(day.pnl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {day.trades} trades • {day.winRate.toFixed(0)}% WR
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>P&L by Month</CardTitle>
            <CardDescription>Monthly profit/loss breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: chartColors.text }}
                      tickFormatter={(value) => format(new Date(value), 'MMM')}
                    />
                    <YAxis tickFormatter={(value) => `₹${value}`} tick={{ fontSize: 12, fill: chartColors.text }} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value as number), 'P&L']}
                      labelFormatter={(label) => format(new Date(label), 'MMMM yyyy')}
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}
                    />
                    <Bar dataKey="pnl" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>P&L by Segment</CardTitle>
            <CardDescription>Segment-wise performance</CardDescription>
          </CardHeader>
          <CardContent>
            {segmentData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {segmentData.map((entry) => (
                        <Cell key={entry.name} fill={segmentColors[entry.name] || colors.chartPurple} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Win/Loss by Direction</CardTitle>
            <CardDescription>Long vs Short performance</CardDescription>
          </CardHeader>
          <CardContent>
            {directionData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={directionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="name" tick={{ fill: chartColors.text }} />
                    <YAxis tick={{ fill: chartColors.text }} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }} />
                    <Bar dataKey="wins" fill={colors.chartGreen} name="Wins" />
                    <Bar dataKey="losses" fill={colors.chartRed} name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by Symbol</CardTitle>
            <CardDescription>Top symbols by P&L</CardDescription>
          </CardHeader>
          <CardContent>
            {symbolPerformance.length > 0 ? (
              <div className="space-y-4">
                {symbolPerformance.slice(0, 10).map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.symbol}</span>
                      <Badge variant="secondary">{item.trades} trades</Badge>
                    </div>
                    <span className={`font-medium`} style={{ color: item.pnl >= 0 ? colors.chartGreen : colors.chartRed }}>
                      {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}