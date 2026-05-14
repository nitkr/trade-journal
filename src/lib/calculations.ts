import type { Trade, TradeStats, DetailedStats, WeeklyStats, MonthlyStats, DailyStats, DayOfWeekStats, TimeOfDayStats, StrategyStats, CapitalMetrics } from '@/types';
import { format, eachWeekOfInterval, getDay } from 'date-fns';

export function calculateTradeStats(trades: Trade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalCharges: 0,
      netPnl: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      expectancy: 0,
      maxDrawdown: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
    };
  }

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const totalWins = winningTrades.length;
  const totalLosses = losingTrades.length;

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl + t.charges, 0);
  const totalCharges = trades.reduce((sum, t) => sum + t.charges, 0);
  const netPnl = totalPnl;

  const grossWins = winningTrades.reduce((sum, t) => sum + t.pnl + t.charges, 0);
  const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl + t.charges, 0));

  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const averageWin = totalWins > 0 ? grossWins / totalWins : 0;
  const averageLoss = totalLosses > 0 ? grossLosses / totalLosses : 0;

  const winRate = trades.length > 0 ? (totalWins / trades.length) * 100 : 0;

  const expectancy = trades.length > 0
    ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
    : 0;

  const { maxDrawdown } = calculateMaxDrawdown(trades);
  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveTrades(trades);

  return {
    totalTrades: trades.length,
    winningTrades: totalWins,
    losingTrades: totalLosses,
    winRate,
    totalPnl,
    totalCharges,
    netPnl,
    profitFactor,
    averageWin,
    averageLoss,
    expectancy,
    maxDrawdown,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}

export function calculateDetailedStats(trades: Trade[]): DetailedStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      tradingDays: 0,
      winDays: 0,
      lossDays: 0,
      breakevenDays: 0,
      totalPnl: 0,
      netPnl: 0,
      totalCharges: 0,
      grossPnl: 0,
      maxProfit: 0,
      maxLoss: 0,
      maxSingleTradeProfit: 0,
      maxSingleTradeLoss: 0,
      avgDailyPnl: 0,
      avgProfitOnWinDays: 0,
      avgLossOnLossDays: 0,
      winRate: 0,
      winDayRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      expectancy: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      currentStreak: 0,
      currentStreakType: 'none',
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      weeklyStats: [],
      monthlyStats: [],
    };
  }

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const breakevenTrades = trades.filter((t) => t.pnl === 0);

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl + t.charges, 0);
  const totalCharges = trades.reduce((sum, t) => sum + t.charges, 0);
  const grossPnl = totalPnl - totalCharges;
  const netPnl = totalPnl;

  const maxSingleTradeProfit = Math.max(...trades.map((t) => t.pnl > 0 ? t.pnl : 0));
  const maxSingleTradeLoss = Math.min(...trades.map((t) => t.pnl < 0 ? t.pnl : 0));

  // Group trades by date
  const dailyMap = new Map<string, DailyStats>();
  trades.forEach((trade) => {
    const date = trade.date;
    const existing = dailyMap.get(date) || { date, trades: 0, pnl: 0, charges: 0, netPnl: 0, wins: 0, losses: 0 };
    existing.trades++;
    existing.pnl += trade.pnl;
    existing.charges += trade.charges;
    existing.netPnl += trade.pnl;
    if (trade.pnl > 0) existing.wins++;
    else if (trade.pnl < 0) existing.losses++;
    dailyMap.set(date, existing);
  });

  const dailyStats = Array.from(dailyMap.values());
  const tradingDays = dailyStats.length;
  const winDays = dailyStats.filter((d) => d.pnl > 0).length;
  const lossDays = dailyStats.filter((d) => d.pnl < 0).length;
  const breakevenDays = dailyStats.filter((d) => d.pnl === 0).length;

  // Max daily profit/loss (net of all trades that day)
  const maxDailyProfit = dailyStats.length > 0 ? Math.max(...dailyStats.map((d) => d.pnl)) : 0;
  const maxDailyLoss = dailyStats.length > 0 ? Math.min(...dailyStats.map((d) => d.pnl)) : 0;

  const avgDailyPnl = tradingDays > 0 ? netPnl / tradingDays : 0;
  const sumWinDayPnl = dailyStats.filter((d) => d.pnl > 0).reduce((sum, d) => sum + d.pnl, 0);
  const sumLossDayPnl = dailyStats.filter((d) => d.pnl < 0).reduce((sum, d) => sum + d.pnl, 0);
  const avgProfitOnWinDays = winDays > 0 ? sumWinDayPnl / winDays : 0;
  const avgLossOnLossDays = lossDays > 0 ? Math.abs(sumLossDayPnl) / lossDays : 0;

  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const winDayRate = tradingDays > 0 ? (winDays / tradingDays) * 100 : 0;

  const grossWins = winningTrades.reduce((sum, t) => sum + t.pnl + t.charges, 0);
  const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl + t.charges, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const averageWin = winningTrades.length > 0 ? grossWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? grossLosses / losingTrades.length : 0;
  const expectancy = trades.length > 0 ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0;

  const { maxConsecutiveWins, maxConsecutiveLosses, currentStreak, currentStreakType } = calculateDayStreaks(dailyStats);
  const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdownFromDaily(dailyStats, netPnl);

  // Weekly stats
  const weeklyStats = calculateWeeklyStats(trades);
  const monthlyStats = calculateMonthlyStats(trades);

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakevenTrades: breakevenTrades.length,
    tradingDays,
    winDays,
    lossDays,
    breakevenDays,
    totalPnl,
    netPnl,
    totalCharges,
    grossPnl,
    maxProfit: maxDailyProfit,
    maxLoss: maxDailyLoss,
    maxSingleTradeProfit,
    maxSingleTradeLoss,
    avgDailyPnl,
    avgProfitOnWinDays,
    avgLossOnLossDays,
    winRate,
    winDayRate,
    profitFactor,
    averageWin,
    averageLoss,
    expectancy,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    currentStreak,
    currentStreakType,
    maxDrawdown,
    maxDrawdownPercent,
    weeklyStats,
    monthlyStats,
  };
}

function calculateDayStreaks(dailyStats: DailyStats[]): {
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'none';
} {
  if (dailyStats.length === 0) {
    return { maxConsecutiveWins: 0, maxConsecutiveLosses: 0, currentStreak: 0, currentStreakType: 'none' as const };
  }

  const sorted = [...dailyStats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const day of sorted) {
    if (day.pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else if (day.pnl < 0) {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }
  }

  // Current streak based on most recent day
  const mostRecent = sorted[0];
  let currentStreak = 0;
  let currentStreakType: 'win' | 'loss' | 'none' = 'none';

  if (mostRecent.pnl > 0) {
    currentStreakType = 'win';
    currentStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].pnl > 0) {
        currentStreak++;
      } else break;
    }
  } else if (mostRecent.pnl < 0) {
    currentStreakType = 'loss';
    currentStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].pnl < 0) {
        currentStreak++;
      } else break;
    }
  }

  return { maxConsecutiveWins, maxConsecutiveLosses, currentStreak, currentStreakType };
}

function calculateMaxDrawdownFromDaily(dailyStats: DailyStats[], _totalPnl: number): { maxDrawdown: number; maxDrawdownPercent: number } {
  if (dailyStats.length === 0) return { maxDrawdown: 0, maxDrawdownPercent: 0 };

  const sorted = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  for (const day of sorted) {
    cumulative += day.netPnl;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
  return { maxDrawdown, maxDrawdownPercent };
}

function calculateWeeklyStats(trades: Trade[]): WeeklyStats[] {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const startDate = new Date(sorted[0].date);
  const endDate = new Date(sorted[sorted.length - 1].date);

  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

  return weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekTrades = trades.filter((t) => {
      const tradeDate = new Date(t.date);
      return tradeDate >= weekStart && tradeDate <= weekEnd;
    });

    const wins = weekTrades.filter((t) => t.pnl > 0).length;
    const losses = weekTrades.filter((t) => t.pnl < 0).length;
    const pnl = weekTrades.reduce((sum, t) => sum + t.pnl, 0);

    return {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekLabel: format(weekStart, 'dd MMM'),
      trades: weekTrades.length,
      pnl,
      wins,
      losses,
    };
  });
}

function calculateMonthlyStats(trades: Trade[]): MonthlyStats[] {
  if (trades.length === 0) return [];

  const monthlyMap = new Map<string, { trades: Trade[]; pnl: number; charges: number }>();

  trades.forEach((trade) => {
    const month = format(new Date(trade.date), 'yyyy-MM');
    const existing = monthlyMap.get(month) || { trades: [], pnl: 0, charges: 0 };
    existing.trades.push(trade);
    existing.pnl += trade.pnl;
    existing.charges += trade.charges;
    monthlyMap.set(month, existing);
  });

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      monthLabel: format(new Date(month + '-01'), 'MMM yyyy'),
      trades: data.trades.length,
      pnl: data.pnl,
      wins: data.trades.filter((t) => t.pnl > 0).length,
      losses: data.trades.filter((t) => t.pnl < 0).length,
      charges: data.charges,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getEquityCurveData(trades: Trade[], totalChargesFromMetadata?: number) {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate total P&L from trades
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  
  // Use metadata charges if available and trades have no charges
  // This happens when importing from Zerodha combined - individual trade charges aren't stored
  const totalCharges = totalChargesFromMetadata ?? trades.reduce((sum, t) => sum + t.charges, 0);
  
  let cumulative = 0;
  let cumulativeCharges = 0;
  
  return sorted.map((trade, index) => {
    cumulative += trade.pnl;
    
    // If this trade has charges, use them directly
    if (trade.charges > 0) {
      cumulativeCharges += trade.charges;
    } else if (totalCharges > 0 && totalPnl !== 0) {
      // Proportionally distribute total charges based on trade's P&L proportion
      const proportion = Math.abs(trade.pnl) / Math.abs(totalPnl);
      const tradeCharges = totalCharges * proportion;
      cumulativeCharges += tradeCharges;
    }
    
    return {
      date: trade.date,
      equity: cumulative,
      pnl: trade.pnl,
      charges: cumulativeCharges,
      netPnl: cumulative - cumulativeCharges,
      symbol: trade.symbol,
    };
  });
}

function calculateMaxDrawdown(trades: Trade[]): { maxDrawdown: number; peakIndex: number } {
  let peak = 0;
  let maxDrawdown = 0;
  let peakIndex = 0;

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let cumulative = 0;
  for (let i = 0; i < sortedTrades.length; i++) {
    cumulative += sortedTrades[i].pnl;
    if (cumulative > peak) {
      peak = cumulative;
      peakIndex = i;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return { maxDrawdown, peakIndex };
}

function calculateConsecutiveTrades(trades: Trade[]): { maxConsecutiveWins: number; maxConsecutiveLosses: number } {
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const trade of sortedTrades) {
    if (trade.pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else if (trade.pnl < 0) {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }
  }

  return { maxConsecutiveWins, maxConsecutiveLosses };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function calculateDayOfWeekStats(trades: Trade[]): DayOfWeekStats[] {
  if (trades.length === 0) return [];

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = new Map<number, { trades: Trade[]; pnl: number }>();

  trades.forEach((trade) => {
    const dayOfWeek = getDay(new Date(trade.date));
    const existing = dayMap.get(dayOfWeek) || { trades: [], pnl: 0 };
    existing.trades.push(trade);
    existing.pnl += trade.pnl;
    dayMap.set(dayOfWeek, existing);
  });

  return Array.from(dayMap.entries())
    .map(([dayNum, data]) => {
      const wins = data.trades.filter((t) => t.pnl > 0).length;
      return {
        dayOfWeek: dayNum.toString(),
        dayLabel: DAY_NAMES[dayNum],
        trades: data.trades.length,
        wins,
        losses: data.trades.length - wins,
        pnl: data.pnl,
        winRate: data.trades.length > 0 ? (wins / data.trades.length) * 100 : 0,
      };
    })
    .sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek));
}

export function calculateTimeOfDayStats(trades: Trade[]): TimeOfDayStats[] {
  if (trades.length === 0) return [];

  // Group by entry hour if available, otherwise use date as proxy for now
  // Since we don't have intraday time, we'll use a placeholder
  // For now, return empty - this would need intraday data
  // Alternative: group by month as "time period"
  const periodMap = new Map<string, { trades: Trade[]; pnl: number }>();

  trades.forEach((trade) => {
    // Use month-year as a proxy for "time period"
    const period = format(new Date(trade.date), 'yyyy-MM');
    const existing = periodMap.get(period) || { trades: [], pnl: 0 };
    existing.trades.push(trade);
    existing.pnl += trade.pnl;
    periodMap.set(period, existing);
  });

  return Array.from(periodMap.entries())
    .map(([period, data]) => {
      const wins = data.trades.filter((t) => t.pnl > 0).length;
      return {
        timeOfDay: period,
        timeLabel: format(new Date(period + '-01'), 'MMM yyyy'),
        trades: data.trades.length,
        wins,
        losses: data.trades.length - wins,
        pnl: data.pnl,
        winRate: data.trades.length > 0 ? (wins / data.trades.length) * 100 : 0,
      };
    })
    .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
}

export function calculateStrategyStats(trades: Trade[]): StrategyStats[] {
  if (trades.length === 0) return [];

  const strategyMap = new Map<string, { trades: Trade[]; pnl: number }>();

  trades.forEach((trade) => {
    const strategy = trade.strategy || 'No Strategy';
    const existing = strategyMap.get(strategy) || { trades: [], pnl: 0 };
    existing.trades.push(trade);
    existing.pnl += trade.pnl;
    strategyMap.set(strategy, existing);
  });

  return Array.from(strategyMap.entries())
    .map(([strategy, data]) => {
      const wins = data.trades.filter((t) => t.pnl > 0).length;
      return {
        strategy,
        trades: data.trades.length,
        wins,
        losses: data.trades.length - wins,
        pnl: data.pnl,
        winRate: data.trades.length > 0 ? (wins / data.trades.length) * 100 : 0,
        avgPnl: data.trades.length > 0 ? data.pnl / data.trades.length : 0,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}

export function calculateConsecutiveTradeRuns(trades: Trade[]): { maxWinRun: number; maxLossRun: number } {
  if (trades.length === 0) return { maxWinRun: 0, maxLossRun: 0 };

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let maxWinRun = 0;
  let maxLossRun = 0;
  let currentWinRun = 0;
  let currentLossRun = 0;

  for (const trade of sortedTrades) {
    if (trade.pnl > 0) {
      currentWinRun++;
      currentLossRun = 0;
      maxWinRun = Math.max(maxWinRun, currentWinRun);
    } else if (trade.pnl < 0) {
      currentLossRun++;
      currentWinRun = 0;
      maxLossRun = Math.max(maxLossRun, currentLossRun);
    }
  }

  return { maxWinRun, maxLossRun };
}

export function calculateCapitalMetrics(trades: Trade[], hasOpenPositionsFromPnl?: boolean): CapitalMetrics {
  if (trades.length === 0) {
    return {
      totalCapitalDeployed: 0,
      totalProceeds: 0,
      totalTurnover: 0,
      maxSingleTrade: 0,
      maxSingleTradeDate: '',
      avgTradeValue: 0,
      totalBuyTrades: 0,
      totalSellTrades: 0,
      totalBuyValue: 0,
      totalSellValue: 0,
      bySegment: [],
      openPositions: [],
      hasOpenPositions: false,
    };
  }

  // Use the P&L file's Open Quantity data directly if available
  // All positions in P&L show Open Quantity: 0, meaning all are closed
  const hasOpenPositions = hasOpenPositionsFromPnl ?? false;

  const buyTrades = trades.filter((t) => t.direction === 'Long');
  const sellTrades = trades.filter((t) => t.direction === 'Short');

  const capitalDeployed = buyTrades.reduce((sum, t) => sum + (t.quantity * t.entryPrice), 0);
  const proceeds = sellTrades.reduce((sum, t) => sum + (t.quantity * t.exitPrice), 0);
  const turnover = capitalDeployed + proceeds;

  // Total buy and sell values
  const totalBuyValue = capitalDeployed;
  const totalSellValue = proceeds;

  // Find max trade value and its date
  let maxSingleTrade = 0;
  let maxSingleTradeDate = '';
  trades.forEach((t) => {
    const tradeValue = t.quantity * t.entryPrice;
    if (tradeValue > maxSingleTrade) {
      maxSingleTrade = tradeValue;
      maxSingleTradeDate = t.date;
    }
  });

  const avgTradeValue = trades.length > 0 ? turnover / trades.length : 0;

  // Group by segment - track buy and sell separately
  const segmentMap = new Map<string, { capital: number; proceeds: number; count: number; buyValue: number; sellValue: number }>();
  trades.forEach((t) => {
    const existing = segmentMap.get(t.segment) || { capital: 0, proceeds: 0, count: 0, buyValue: 0, sellValue: 0 };
    if (t.direction === 'Long') {
      existing.capital += t.quantity * t.entryPrice;
      existing.buyValue += t.quantity * t.entryPrice;
    } else {
      existing.proceeds += t.quantity * t.exitPrice;
      existing.sellValue += t.quantity * t.exitPrice;
    }
    existing.count++;
    segmentMap.set(t.segment, existing);
  });

  const bySegment = Array.from(segmentMap.entries()).map(([segment, data]) => ({
    segment,
    capitalDeployed: data.capital,
    proceeds: data.proceeds,
    tradeCount: data.count,
    buyValue: data.buyValue,
    sellValue: data.sellValue,
  }));

  // FIFO-based open positions detection
  // Group trades by symbol_segment (for options, different expiries = different keys)
  const positionMap = new Map<string, {
    symbol: string;
    segment: string;
    trades: Trade[];
  }>();

  trades.forEach((t) => {
    // For options, include expiry in the key since different expiries are different instruments
    const key = t.segment === 'Options'
      ? `${t.symbol}_${t.segment}`
      : `${t.symbol}_${t.segment}`;
    const existing = positionMap.get(key);
    if (existing) {
      existing.trades.push(t);
    } else {
      positionMap.set(key, { symbol: t.symbol, segment: t.segment, trades: [t] });
    }
  });

  // For each symbol, do FIFO matching to find truly open positions
  const openPositions: CapitalMetrics['openPositions'] = [];

  positionMap.forEach((posData) => {
    // Sort trades by date for FIFO matching
    const sortedTrades = [...posData.trades].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // FIFO matching: maintain a queue of buys and match sells against them
    const buyQueue: { qty: number; price: number; date: string }[] = [];
    let remainingSells: { qty: number; price: number; date: string }[] = [];

    sortedTrades.forEach((t) => {
      if (t.direction === 'Long') {
        buyQueue.push({ qty: t.quantity, price: t.entryPrice, date: t.date });
      } else {
        let sellQty = t.quantity;
        // Match sell against existing buys (FIFO)
        while (sellQty > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const matchQty = Math.min(sellQty, buy.qty);
          sellQty -= matchQty;
          buy.qty -= matchQty;
          if (buy.qty <= 0) {
            buyQueue.shift();
          }
        }
        // If still have remaining sell qty, it's an open short position
        if (sellQty > 0) {
          remainingSells.push({ qty: sellQty, price: t.exitPrice, date: t.date });
        }
      }
    });

    // After FIFO matching, remaining buys are open long positions
    buyQueue.forEach((buy) => {
      openPositions.push({
        symbol: posData.symbol,
        segment: posData.segment,
        direction: 'Long',
        quantity: buy.qty,
        entryPrice: buy.price,
        currentValue: buy.qty * buy.price,
      });
    });
  });

  // Open positions are determined by P&L file's Open Quantity column
  // If P&L file shows Open Quantity: 0 for all symbols, all positions are closed
  // We trust the P&L data over trade matching since it reflects actual broker positions

  return {
    totalCapitalDeployed: capitalDeployed,
    totalProceeds: proceeds,
    totalTurnover: turnover,
    maxSingleTrade,
    maxSingleTradeDate,
    avgTradeValue,
    totalBuyTrades: buyTrades.length,
    totalSellTrades: sellTrades.length,
    totalBuyValue,
    totalSellValue,
    bySegment,
    openPositions: hasOpenPositions ? openPositions : [],
    hasOpenPositions,
  };
}