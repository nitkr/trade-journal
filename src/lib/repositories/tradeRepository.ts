import { db } from '@/lib/db';
import type { Trade, TradeInput } from '@/types';

export const tradeRepository = {
  async getAll(): Promise<Trade[]> {
    return db.trades.orderBy('date').reverse().toArray();
  },

  async getById(id: number): Promise<Trade | undefined> {
    return db.trades.get(id);
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Trade[]> {
    return db.trades
      .where('date')
      .between(startDate, endDate, true, true)
      .reverse()
      .toArray();
  },

  async getBySymbol(symbol: string): Promise<Trade[]> {
    return db.trades.where('symbol').equals(symbol).reverse().toArray();
  },

  async create(input: TradeInput): Promise<Trade> {
    const trade: Trade = {
      ...input,
      pnl: calculatePnl(input),
      createdAt: new Date().toISOString(),
    };
    const id = await db.trades.add(trade);
    return { ...trade, id };
  },

  async update(id: number, updates: Partial<TradeInput>): Promise<Trade | undefined> {
    const existing = await db.trades.get(id);
    if (!existing) return undefined;

    const updatedData = {
      ...existing,
      ...updates,
      pnl: updates.entryPrice !== undefined || updates.exitPrice !== undefined || updates.quantity !== undefined
        ? calculatePnl({ ...existing, ...updates } as TradeInput)
        : existing.pnl,
      updatedAt: new Date().toISOString(),
    };

    await db.trades.update(id, updatedData);
    return { ...updatedData, id };
  },

  async delete(id: number): Promise<void> {
    await db.trades.delete(id);
  },

  async bulkCreate(trades: TradeInput[]): Promise<Trade[]> {
    const insertedTrades = trades.map((input) => ({
      ...input,
      pnl: calculatePnl(input),
      createdAt: new Date().toISOString(),
    }));
    const ids = await db.trades.bulkAdd(insertedTrades, { allKeys: true });
    return insertedTrades.map((trade, index) => ({ ...trade, id: ids[index] as number }));
  },

  async getAllSymbols(): Promise<string[]> {
    const trades = await db.trades.toArray();
    const symbols = new Set(trades.map((t) => t.symbol));
    return Array.from(symbols).sort();
  },

  async getAllStrategies(): Promise<string[]> {
    const trades = await db.trades.toArray();
    const strategies = new Set(trades.map((t) => t.strategy).filter((s): s is string => !!s));
    return Array.from(strategies);
  },
};

function calculatePnl(trade: TradeInput): number {
  const { direction, entryPrice, exitPrice, quantity, charges } = trade;
  // PnL = (exitPrice - entryPrice) * quantity
  // Direction only affects how stats are aggregated (Long vs Short trades)
  // It does NOT affect the PnL calculation itself
  const grossPnl = (exitPrice - entryPrice) * quantity;
  return grossPnl - charges;
}