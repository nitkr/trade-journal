import { db } from '@/lib/db';
import type { Strategy, StrategyInput } from '@/types';

export const strategyRepository = {
  async getAll(): Promise<Strategy[]> {
    return db.strategies.orderBy('name').toArray();
  },

  async getById(id: number): Promise<Strategy | undefined> {
    return db.strategies.get(id);
  },

  async getByName(name: string): Promise<Strategy | undefined> {
    return db.strategies.where('name').equals(name).first();
  },

  async create(input: StrategyInput): Promise<Strategy> {
    const existing = await this.getByName(input.name);
    if (existing) {
      return existing;
    }

    const strategy: Strategy = {
      ...input,
      createdAt: new Date().toISOString(),
    };
    const id = await db.strategies.add(strategy);
    return { ...strategy, id };
  },

  async update(id: number, updates: Partial<StrategyInput>): Promise<Strategy | undefined> {
    const existing = await db.strategies.get(id);
    if (!existing) return undefined;

    const updatedData: Strategy = {
      ...existing,
      ...updates,
    };

    await db.strategies.update(id, updatedData);
    return updatedData;
  },

  async delete(id: number): Promise<void> {
    await db.strategies.delete(id);
  },
};