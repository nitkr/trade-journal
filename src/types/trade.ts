export type Segment = 'Equity' | 'Futures' | 'Options' | 'Currency';
export type Direction = 'Long' | 'Short';

export interface Trade {
  id?: number;
  date: string;
  symbol: string;
  segment: Segment;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  lotSize?: number;
  charges: number;
  pnl: number;
  tags: string[];
  emotion?: number;
  strategy?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TradeInput {
  date: string;
  symbol: string;
  segment: Segment;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  lotSize?: number;
  charges: number;
  tags: string[];
  emotion?: number;
  strategy?: string;
  notes?: string;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalCharges: number;
  netPnl: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  maxDrawdown: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface DetailedStats {
  // Basic counts
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;

  // Trading days
  tradingDays: number;
  winDays: number;
  lossDays: number;
  breakevenDays: number;

  // P&L metrics
  totalPnl: number;
  netPnl: number;
  totalCharges: number;
  grossPnl: number;
  maxProfit: number;          // Best day's net P&L (sum of all trades that day)
  maxLoss: number;            // Worst day's net P&L
  maxSingleTradeProfit: number;  // Best single trade P&L
  maxSingleTradeLoss: number;    // Worst single trade P&L
  avgDailyPnl: number;
  avgProfitOnWinDays: number;
  avgLossOnLossDays: number;

  // Rate metrics
  winRate: number;
  winDayRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;

  // Streaks
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'none';

  // Drawdown
  maxDrawdown: number;
  maxDrawdownPercent: number;

  // Time breakdowns
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
}

export interface WeeklyStats {
  weekStart: string;
  weekLabel: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
}

export interface MonthlyStats {
  month: string;
  monthLabel: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
  charges: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  pnl: number;
  charges: number;
  netPnl: number;
  wins: number;
  losses: number;
}

export interface DayOfWeekStats {
  dayOfWeek: string;
  dayLabel: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
}

export interface TimeOfDayStats {
  timeOfDay: string;
  timeLabel: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
}

export interface StrategyStats {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface CapitalMetrics {
  totalCapitalDeployed: number;
  totalProceeds: number;
  totalTurnover: number;
  maxSingleTrade: number;
  maxSingleTradeDate: string;
  avgTradeValue: number;
  totalBuyTrades: number;
  totalSellTrades: number;
  totalBuyValue: number;
  totalSellValue: number;
  bySegment: {
    segment: string;
    capitalDeployed: number;
    proceeds: number;
    tradeCount: number;
    buyValue: number;
    sellValue: number;
  }[];
  openPositions: {
    symbol: string;
    segment: string;
    direction: Direction;
    quantity: number;
    entryPrice: number;
    currentValue: number;
  }[];
  hasOpenPositions: boolean;
}