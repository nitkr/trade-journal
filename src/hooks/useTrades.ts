import { useLiveQuery } from 'dexie-react-hooks';
import { tradeRepository } from '@/lib/repositories';
import type { TradeInput } from '@/types';

export function useTrades() {
  const trades = useLiveQuery(() => tradeRepository.getAll(), []);

  return {
    trades: trades ?? [],
    isLoading: trades === undefined,
  };
}

export function useTrade(id: number | undefined) {
  const trade = useLiveQuery(
    () => (id !== undefined ? tradeRepository.getById(id) : undefined),
    [id]
  );

  return {
    trade,
    isLoading: trade === undefined,
  };
}

export function useTradeMutations() {
  const createTrade = async (input: TradeInput) => {
    return tradeRepository.create(input);
  };

  const updateTrade = async (id: number, updates: Partial<TradeInput>) => {
    return tradeRepository.update(id, updates);
  };

  const deleteTrade = async (id: number) => {
    return tradeRepository.delete(id);
  };

  const bulkCreateTrades = async (trades: TradeInput[]) => {
    return tradeRepository.bulkCreate(trades);
  };

  return {
    createTrade,
    updateTrade,
    deleteTrade,
    bulkCreateTrades,
  };
}